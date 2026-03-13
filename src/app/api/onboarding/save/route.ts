import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { regenerateAgentPrompts, calculateOnboardingScore } from '@/lib/onboarding/prompt-builder'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'
import type { CompanyMemory } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

// Structuring prompt for Claude API
function getStructuringPrompt(step: number, rawResponses: Record<string, unknown>): string {
  const stepInstructions: Record<number, string> = {
    1: `Transforme ces reponses d'identite entreprise en JSON structure :
{
  "company_description": "description courte et professionnelle en 3 phrases",
  "founding_year": nombre ou null,
  "geographic_zone": "liste des departements/zones",
  "certifications": ["RGE", "QualiPac", etc.],
  "team_size": nombre ou null,
  "brand_values": ["valeur1", "valeur2", "valeur3"]
}`,
    2: `Transforme ces reponses catalogue en JSON structure :
{
  "products": [{"name": "", "brand": "", "price_range": "", "description": ""}],
  "intervention_delays": "delais moyens",
  "available_subsidies": ["MaPrimeRenov", "CEE", "TVA 5.5%", etc.],
  "exclusion_zones": "zones ou cas d'exclusion"
}`,
    3: `Transforme ces reponses commerciales en JSON structure :
{
  "typical_client_profile": "description du client type",
  "sales_process": "etapes du processus de vente",
  "average_ticket": nombre ou null,
  "objections": [{"objection": "", "response": ""}],
  "competitors": ["concurrent1", "concurrent2"],
  "differentiators": ["atout1", "atout2"]
}`,
    4: `Transforme ces reponses communication en JSON structure :
{
  "tone_of_voice": "professionnel" ou "chaleureux" ou "technique" ou "familier",
  "formal_address": true (vouvoiement) ou false (tutoiement),
  "words_to_avoid": ["mot1", "mot2"],
  "example_messages": ["message1", "message2", "message3"],
  "email_signature": "signature email ou null"
}`,
    5: `Transforme ces reponses SAV/Finance en JSON structure :
{
  "sav_scripts": [{"trigger": "situation", "response": "reponse type"}],
  "faq": [{"question": "", "answer": ""}],
  "emergency_contact": "nom et tel contact urgence",
  "response_delay": "delai promis (ex: 24h, 48h)",
  "target_margin": nombre (pourcentage),
  "hourly_rate": nombre ou null,
  "payment_reminder_process": "description du processus de relance"
}`,
  }

  return `Tu recois les reponses brutes d'un entrepreneur ENR lors de son onboarding (etape ${step}/5).
${stepInstructions[step] || ''}

Reponses brutes :
${JSON.stringify(rawResponses, null, 2)}

Retourne UNIQUEMENT un JSON valide, sans commentaires ni texte autour. Si une information manque, utilise null ou un tableau vide.`
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(`onboarding:${user.id}`, RATE_LIMITS.api)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })
    }

    const body = await request.json()
    const { client_id, step, responses } = body as {
      client_id: string
      step: number
      responses: Record<string, unknown>
    }

    // Validate input
    if (!client_id || !step || !responses || step < 1 || step > 5) {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 })
    }

    // Verify ownership: client must belong to the user, or user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('user_id', user.id)
        .single()

      if (!client) {
        return NextResponse.json({ error: 'Client non autorise' }, { status: 403 })
      }
    }

    const serviceClient = createServiceRoleClient()

    // 1. Save raw responses (merge with existing)
    const { data: existingMemory } = await serviceClient
      .from('company_memory')
      .select('raw_responses')
      .eq('client_id', client_id)
      .single()

    const existingRaw = (existingMemory?.raw_responses as Record<string, unknown>) || {}
    const mergedRaw = { ...existingRaw, [`step_${step}`]: responses }

    await serviceClient
      .from('company_memory')
      .update({ raw_responses: mergedRaw })
      .eq('client_id', client_id)

    // 2. Call Claude API to structure the responses
    let structuredData: Record<string, unknown> = {}
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: getStructuringPrompt(step, responses),
        }],
      })

      const textBlock = message.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        structuredData = JSON.parse(textBlock.text)
      }
    } catch (parseErr) {
      console.error('Claude structuring error:', parseErr)
      // Fallback: use raw responses directly
      structuredData = responses
    }

    // 3. Update company_memory with structured data
    await serviceClient
      .from('company_memory')
      .update(structuredData)
      .eq('client_id', client_id)

    // 4. Calculate onboarding score
    const { data: updatedMemory } = await serviceClient
      .from('company_memory')
      .select('*')
      .eq('client_id', client_id)
      .single()

    const score = updatedMemory
      ? calculateOnboardingScore(updatedMemory as unknown as CompanyMemory)
      : step * 20

    // 5. Update client onboarding step and score
    await serviceClient
      .from('clients')
      .update({
        onboarding_step: step,
        onboarding_score: score,
      })
      .eq('id', client_id)

    // 6. Regenerate system prompts for active agents
    const agentsUpdated = await regenerateAgentPrompts(client_id)

    // 7. Return summary
    return NextResponse.json({
      success: true,
      step,
      score,
      agents_updated: agentsUpdated,
      structured_fields: Object.keys(structuredData),
      summary: `Etape ${step}/5 sauvegardee. Score onboarding : ${score}%. ${agentsUpdated} agent(s) mis a jour.`,
    })
  } catch (err) {
    console.error('Onboarding save error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
