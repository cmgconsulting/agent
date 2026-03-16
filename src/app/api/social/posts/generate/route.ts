import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString } from '@/lib/security'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

/**
 * POST /api/social/posts/generate
 * Generate post content using Claude AI.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`social-generate:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    const body = await request.json()
    const { platform, topic, tone, language, context } = body

    if (!platform || !topic) {
      return NextResponse.json({ error: 'Plateforme et sujet requis' }, { status: 400 })
    }

    const platformLimits: Record<string, number> = {
      twitter: 280,
      facebook: 2000,
      instagram: 2200,
      linkedin: 3000,
      tiktok: 150,
    }

    const charLimit = platformLimits[platform] || 2000
    const toneStr = tone ? sanitizeString(tone) : 'professionnel'
    const lang = language || 'francais'

    const systemPrompt = `Tu es un expert en community management pour des entreprises du secteur des energies renouvelables (poeles a bois, panneaux solaires, pompes a chaleur). Tu crees du contenu engageant et professionnel pour les reseaux sociaux.`

    const userPrompt = `Genere un post ${platform} sur le sujet suivant: "${sanitizeString(topic)}"

Contraintes:
- Ton: ${toneStr}
- Langue: ${lang}
- Maximum ${charLimit} caracteres
- Adapte au format ${platform}
- Inclus des emojis pertinents si adapte
- Ajoute des hashtags pertinents (3-5 max)
${context ? `- Contexte supplementaire: ${sanitizeString(context)}` : ''}

Reponds UNIQUEMENT avec le texte du post, sans explication ni formatage supplementaire.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const generatedContent = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({
      content: generatedContent,
      platform,
      charCount: generatedContent.length,
      charLimit,
    })
  } catch (error) {
    console.error('Post generation error:', error)
    return NextResponse.json({ error: 'Erreur generation' }, { status: 500 })
  }
}
