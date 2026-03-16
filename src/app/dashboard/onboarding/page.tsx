'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, Package, Users, MessageSquare, Wrench,
  ChevronRight, ChevronLeft, Check, AlertCircle, Loader2,
  Plus, Trash2, CheckCircle
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

type OnboardingStep = 1 | 2 | 3 | 4 | 5

interface ProductEntry {
  name: string
  brand: string
  price_range: string
  description: string
}

interface ObjectionEntry {
  objection: string
  response: string
}

interface SavEntry {
  trigger: string
  response: string
}

const STEPS = [
  { num: 1, label: 'Identité', icon: Building2, desc: 'Votre entreprise' },
  { num: 2, label: 'Catalogue', icon: Package, desc: 'Produits & services' },
  { num: 3, label: 'Commercial', icon: Users, desc: 'Clients & vente' },
  { num: 4, label: 'Communication', icon: MessageSquare, desc: 'Ton & style' },
  { num: 5, label: 'SAV & Finance', icon: Wrench, desc: 'Support & marges' },
]

const CERTIFICATIONS = ['RGE', 'QualiPac', 'QualiSol', 'Qualibois', 'QualiPV', 'QualiBat']
const SUBSIDIES = ['MaPrimeRénov', 'CEE', 'TVA 5.5%', 'Éco-PTZ', 'Chèque énergie']
const TONES = [
  { value: 'professionnel', label: 'Professionnel — sérieux et expert' },
  { value: 'chaleureux', label: 'Chaleureux — proche et humain' },
  { value: 'technique', label: 'Technique — précis et détaillé' },
  { value: 'familier', label: 'Familier — décontracté et accessible' },
]

// ============================================
// COMPONENT
// ============================================

export default function ClientOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<OnboardingStep>(1)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [clientId, setClientId] = useState('')
  const [score, setScore] = useState(0)

  // === Étape 1 — Identité ===
  const [companyDescription, setCompanyDescription] = useState('')
  const [foundingYear, setFoundingYear] = useState('')
  const [geographicZone, setGeographicZone] = useState('')
  const [certifications, setCertifications] = useState<string[]>([])
  const [teamSize, setTeamSize] = useState('')
  const [brandValues, setBrandValues] = useState('')

  // === Étape 2 — Catalogue ===
  const [products, setProducts] = useState<ProductEntry[]>([{ name: '', brand: '', price_range: '', description: '' }])
  const [interventionDelays, setInterventionDelays] = useState('')
  const [subsidies, setSubsidies] = useState<string[]>([])
  const [exclusionZones, setExclusionZones] = useState('')

  // === Étape 3 — Commercial ===
  const [clientProfile, setClientProfile] = useState('')
  const [averageTicket, setAverageTicket] = useState('')
  const [salesProcess, setSalesProcess] = useState('')
  const [objections, setObjections] = useState<ObjectionEntry[]>([{ objection: '', response: '' }])
  const [competitors, setCompetitors] = useState('')
  const [differentiators, setDifferentiators] = useState('')

  // === Étape 4 — Communication ===
  const [formalAddress, setFormalAddress] = useState(true)
  const [toneOfVoice, setToneOfVoice] = useState('professionnel')
  const [wordsToAvoid, setWordsToAvoid] = useState('')
  const [exampleMessages, setExampleMessages] = useState(['', '', ''])
  const [emailSignature, setEmailSignature] = useState('')

  // === Étape 5 — SAV & Finance ===
  const [savScripts, setSavScripts] = useState<SavEntry[]>([{ trigger: '', response: '' }])
  const [emergencyContact, setEmergencyContact] = useState('')
  const [responseDelay, setResponseDelay] = useState('')
  const [targetMargin, setTargetMargin] = useState('30')
  const [hourlyRate, setHourlyRate] = useState('')
  const [paymentProcess, setPaymentProcess] = useState('')

  const loadExistingData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: client } = await supabase
      .from('clients')
      .select('id, onboarding_step, onboarding_score')
      .eq('user_id', user.id)
      .single()

    if (!client) { setInitialLoading(false); return }

    setClientId(client.id)
    setScore((client as Record<string, unknown>).onboarding_score as number || 0)
    const savedStep = ((client as Record<string, unknown>).onboarding_step as number) || 0
    if (savedStep > 0 && savedStep < 5) setStep((savedStep + 1) as OnboardingStep)

    const { data: memory } = await supabase
      .from('company_memory')
      .select('*')
      .eq('client_id', client.id)
      .single()

    if (memory) {
      const m = memory as Record<string, unknown>
      if (m.company_description) setCompanyDescription(m.company_description as string)
      if (m.founding_year) setFoundingYear(String(m.founding_year))
      if (m.geographic_zone) setGeographicZone(m.geographic_zone as string)
      if (Array.isArray(m.certifications) && m.certifications.length) setCertifications(m.certifications as string[])
      if (m.team_size) setTeamSize(String(m.team_size))
      if (Array.isArray(m.brand_values) && m.brand_values.length) setBrandValues((m.brand_values as string[]).join(', '))
      if (Array.isArray(m.products) && m.products.length) setProducts(m.products as ProductEntry[])
      if (m.intervention_delays) setInterventionDelays(m.intervention_delays as string)
      if (Array.isArray(m.available_subsidies) && m.available_subsidies.length) setSubsidies(m.available_subsidies as string[])
      if (m.exclusion_zones) setExclusionZones(m.exclusion_zones as string)
      if (m.typical_client_profile) setClientProfile(m.typical_client_profile as string)
      if (m.average_ticket) setAverageTicket(String(m.average_ticket))
      if (m.sales_process) setSalesProcess(m.sales_process as string)
      if (Array.isArray(m.objections) && m.objections.length) setObjections(m.objections as ObjectionEntry[])
      if (Array.isArray(m.competitors) && m.competitors.length) setCompetitors((m.competitors as string[]).join(', '))
      if (Array.isArray(m.differentiators) && m.differentiators.length) setDifferentiators((m.differentiators as string[]).join(', '))
      if (m.formal_address !== undefined) setFormalAddress(m.formal_address as boolean)
      if (m.tone_of_voice) setToneOfVoice(m.tone_of_voice as string)
      if (Array.isArray(m.words_to_avoid) && m.words_to_avoid.length) setWordsToAvoid((m.words_to_avoid as string[]).join(', '))
      if (Array.isArray(m.example_messages) && m.example_messages.length) {
        const msgs = m.example_messages as string[]
        setExampleMessages([msgs[0] || '', msgs[1] || '', msgs[2] || ''])
      }
      if (m.email_signature) setEmailSignature(m.email_signature as string)
      if (Array.isArray(m.sav_scripts) && m.sav_scripts.length) setSavScripts(m.sav_scripts as SavEntry[])
      if (m.emergency_contact) setEmergencyContact(m.emergency_contact as string)
      if (m.response_delay) setResponseDelay(m.response_delay as string)
      if (m.target_margin) setTargetMargin(String(m.target_margin))
      if (m.hourly_rate) setHourlyRate(String(m.hourly_rate))
      if (m.payment_reminder_process) setPaymentProcess(m.payment_reminder_process as string)
    }

    setInitialLoading(false)
  }, [supabase, router])

  useEffect(() => { loadExistingData() }, [loadExistingData])

  function getStepResponses(): Record<string, unknown> {
    switch (step) {
      case 1: return { company_description: companyDescription, founding_year: foundingYear ? parseInt(foundingYear) : null, geographic_zone: geographicZone, certifications, team_size: teamSize ? parseInt(teamSize) : null, brand_values: brandValues.split(',').map(v => v.trim()).filter(Boolean) }
      case 2: return { products: products.filter(p => p.name.trim()), intervention_delays: interventionDelays, available_subsidies: subsidies, exclusion_zones: exclusionZones }
      case 3: return { typical_client_profile: clientProfile, average_ticket: averageTicket ? parseFloat(averageTicket) : null, sales_process: salesProcess, objections: objections.filter(o => o.objection.trim()), competitors: competitors.split(',').map(c => c.trim()).filter(Boolean), differentiators: differentiators.split(',').map(d => d.trim()).filter(Boolean) }
      case 4: return { formal_address: formalAddress, tone_of_voice: toneOfVoice, words_to_avoid: wordsToAvoid.split(',').map(w => w.trim()).filter(Boolean), example_messages: exampleMessages.filter(Boolean), email_signature: emailSignature }
      case 5: return { sav_scripts: savScripts.filter(s => s.trigger.trim()), emergency_contact: emergencyContact, response_delay: responseDelay, target_margin: targetMargin ? parseFloat(targetMargin) : 30, hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null, payment_reminder_process: paymentProcess }
      default: return {}
    }
  }

  async function saveCurrentStep() {
    if (!clientId) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, step, responses: getStepResponses() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde')

      setScore(data.score || score)
      setSuccess(data.summary || `Étape ${step} sauvegardée`)

      if (step < 5) {
        setTimeout(() => { setStep((step + 1) as OnboardingStep); setSuccess('') }, 1500)
      } else {
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function addProduct() { setProducts([...products, { name: '', brand: '', price_range: '', description: '' }]) }
  function removeProduct(idx: number) { setProducts(products.filter((_, i) => i !== idx)) }
  function updateProduct(idx: number, field: keyof ProductEntry, value: string) { setProducts(products.map((p, i) => i === idx ? { ...p, [field]: value } : p)) }
  function addObjection() { setObjections([...objections, { objection: '', response: '' }]) }
  function removeObjection(idx: number) { setObjections(objections.filter((_, i) => i !== idx)) }
  function addSavScript() { setSavScripts([...savScripts, { trigger: '', response: '' }]) }
  function removeSavScript(idx: number) { setSavScripts(savScripts.filter((_, i) => i !== idx)) }
  function toggleCert(cert: string) { setCertifications(prev => prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]) }
  function toggleSubsidy(sub: string) { setSubsidies(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]) }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-700">Configuration de vos agents</h1>
        <p className="text-ink-400 text-sm mt-1">
          Renseignez les informations de votre entreprise pour que vos agents soient performants dès le premier jour.
        </p>
      </div>

      {/* Score bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ink-600">Score d&apos;onboarding</span>
          <span className={`text-sm font-bold ${score >= 80 ? 'text-emerald-600' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
            {score}%
          </span>
        </div>
        <div className="w-full bg-surface-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              score >= 80 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        {score < 80 && (
          <p className="text-xs text-amber-500 mt-2">
            Vos agents seront activés à partir de 80%. Complétez les étapes manquantes.
          </p>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => setStep(s.num as OnboardingStep)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg flex-1 min-w-0 transition text-left ${
                step === s.num ? 'bg-brand-500 text-white' :
                step > s.num ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                'bg-surface-100 text-ink-300'
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4 flex-shrink-0" /> : <s.icon className="w-4 h-4 flex-shrink-0" />}
              <span className="text-xs font-medium truncate hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-ink-200 mx-0.5 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg mb-4">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Step content */}
      <div className="card mb-6">

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-ink-700 mb-1">Identité de votre entreprise</h2>
            <p className="text-sm text-ink-400 mb-6">Ces informations permettent à vos agents de vous représenter fidèlement.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Décrivez votre entreprise en 3 phrases *</label>
                <textarea value={companyDescription} onChange={e => setCompanyDescription(e.target.value)}
                  placeholder="Ex: Nous sommes une entreprise familiale spécialisée dans l'installation de poêles à granulés et pompes à chaleur dans le Rhône..."
                  className="input resize-y" rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Année de création</label>
                  <input type="number" value={foundingYear} onChange={e => setFoundingYear(e.target.value)} placeholder="2015" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Taille de l&apos;équipe</label>
                  <input type="number" value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="5" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Zone géographique d&apos;intervention *</label>
                <input value={geographicZone} onChange={e => setGeographicZone(e.target.value)} placeholder="Ex: Rhône (69), Isère (38), Ain (01)" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Certifications</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CERTIFICATIONS.map(cert => (
                    <button key={cert} onClick={() => toggleCert(cert)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        certifications.includes(cert)
                          ? 'bg-brand-50 text-brand-600 ring-2 ring-brand-300'
                          : 'bg-surface-100 text-ink-500 hover:bg-surface-200'
                      }`}>
                      {certifications.includes(cert) && <Check className="w-3 h-3 inline mr-1" />}
                      {cert}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">3 valeurs principales (séparées par des virgules)</label>
                <input value={brandValues} onChange={e => setBrandValues(e.target.value)} placeholder="Ex: Qualité, Proximité, Transparence" className="input" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-ink-700 mb-1">Catalogue & offres</h2>
            <p className="text-sm text-ink-400 mb-6">Vos agents pourront parler de vos produits avec précision.</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-ink-600">Produits / services proposés</label>
                  <button onClick={addProduct} className="flex items-center gap-1 text-brand-500 text-sm hover:text-brand-600">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {products.map((p, i) => (
                    <div key={i} className="border border-surface-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-300">Produit {i + 1}</span>
                        {products.length > 1 && (
                          <button onClick={() => removeProduct(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} placeholder="Nom du produit" className="input" />
                        <input value={p.brand} onChange={e => updateProduct(i, 'brand', e.target.value)} placeholder="Marque" className="input" />
                        <input value={p.price_range} onChange={e => updateProduct(i, 'price_range', e.target.value)} placeholder="Fourchette de prix (ex: 3000-5000€)" className="input" />
                        <input value={p.description} onChange={e => updateProduct(i, 'description', e.target.value)} placeholder="Description courte" className="input" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Délais moyens d&apos;intervention et de pose</label>
                <input value={interventionDelays} onChange={e => setInterventionDelays(e.target.value)} placeholder="Ex: 2-3 semaines pour la pose, intervention SAV sous 48h" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Aides financières gérées</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUBSIDIES.map(sub => (
                    <button key={sub} onClick={() => toggleSubsidy(sub)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        subsidies.includes(sub)
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
                          : 'bg-surface-100 text-ink-500 hover:bg-surface-200'
                      }`}>
                      {subsidies.includes(sub) && <Check className="w-3 h-3 inline mr-1" />}
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Zones ou cas d&apos;exclusion</label>
                <input value={exclusionZones} onChange={e => setExclusionZones(e.target.value)} placeholder="Ex: Pas d'intervention au-dessus de 1200m, pas de location" className="input" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-ink-700 mb-1">Clients & processus commercial</h2>
            <p className="text-sm text-ink-400 mb-6">Vos agents sauront mieux vendre et répondre aux objections.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Décrivez votre client typique *</label>
                <textarea value={clientProfile} onChange={e => setClientProfile(e.target.value)}
                  placeholder="Ex: Propriétaire de maison individuelle, 40-65 ans, en zone périurbaine, souhaite réduire sa facture énergétique..."
                  className="input resize-y" rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Ticket moyen par chantier (€)</label>
                  <input type="number" value={averageTicket} onChange={e => setAverageTicket(e.target.value)} placeholder="8000" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Processus de vente (de la demande à la signature)</label>
                <textarea value={salesProcess} onChange={e => setSalesProcess(e.target.value)}
                  placeholder="Ex: 1. Demande de devis en ligne → 2. Appel qualif → 3. Visite technique → 4. Envoi devis → 5. Signature"
                  className="input resize-y" rows={3} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-ink-600">Objections fréquentes & réponses</label>
                  <button onClick={addObjection} className="flex items-center gap-1 text-brand-500 text-sm hover:text-brand-600">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {objections.map((o, i) => (
                    <div key={i} className="border border-surface-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-300">Objection {i + 1}</span>
                        {objections.length > 1 && (
                          <button onClick={() => removeObjection(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                      <input value={o.objection} onChange={e => setObjections(objections.map((obj, j) => j === i ? { ...obj, objection: e.target.value } : obj))} placeholder="L'objection du client" className="input" />
                      <input value={o.response} onChange={e => setObjections(objections.map((obj, j) => j === i ? { ...obj, response: e.target.value } : obj))} placeholder="Votre réponse" className="input" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Concurrents locaux (séparés par virgules)</label>
                  <input value={competitors} onChange={e => setCompetitors(e.target.value)} placeholder="Ex: ÉnergieVerte, Chauffage Pro 69" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Ce qui vous différencie (séparés par virgules)</label>
                  <input value={differentiators} onChange={e => setDifferentiators(e.target.value)} placeholder="Ex: SAV 24h, Pose en 1 semaine, Artisan local" className="input" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-ink-700 mb-1">Ton & style de communication</h2>
            <p className="text-sm text-ink-400 mb-6">Vos agents communiqueront exactement comme vous le souhaitez.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Comment vous adressez-vous à vos clients ?</label>
                <div className="flex gap-3 mt-1">
                  <button onClick={() => setFormalAddress(true)}
                    className={`flex-1 py-3 rounded-lg border-2 font-medium transition ${
                      formalAddress ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-surface-200 text-ink-500 hover:border-surface-300'
                    }`}>
                    Vouvoiement
                  </button>
                  <button onClick={() => setFormalAddress(false)}
                    className={`flex-1 py-3 rounded-lg border-2 font-medium transition ${
                      !formalAddress ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-surface-200 text-ink-500 hover:border-surface-300'
                    }`}>
                    Tutoiement
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Ton souhaité</label>
                <div className="space-y-2 mt-1">
                  {TONES.map(t => (
                    <button key={t.value} onClick={() => setToneOfVoice(t.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                        toneOfVoice === t.value ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:border-surface-300'
                      }`}>
                      <span className="text-sm font-medium text-ink-700">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Mots ou formulations à éviter (séparés par virgules)</label>
                <input value={wordsToAvoid} onChange={e => setWordsToAvoid(e.target.value)} placeholder="Ex: pas cher, discount, promo, urgent" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">3 exemples de vrais messages envoyés à vos clients</label>
                <div className="space-y-2 mt-1">
                  {exampleMessages.map((msg, i) => (
                    <textarea key={i} value={msg} onChange={e => setExampleMessages(exampleMessages.map((m, j) => j === i ? e.target.value : m))}
                      placeholder={`Message exemple ${i + 1} (WhatsApp, email, SMS...)`}
                      className="input resize-y" rows={2} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Signature email actuelle</label>
                <textarea value={emailSignature} onChange={e => setEmailSignature(e.target.value)} placeholder="Copiez-collez votre signature email ici" className="input resize-y" rows={3} />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-ink-700 mb-1">SAV & paramètres financiers</h2>
            <p className="text-sm text-ink-400 mb-6">Vos agents géreront le SAV et les relances comme vous le faites.</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-ink-600">Questions SAV fréquentes & réponses types</label>
                  <button onClick={addSavScript} className="flex items-center gap-1 text-brand-500 text-sm hover:text-brand-600">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {savScripts.map((s, i) => (
                    <div key={i} className="border border-surface-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-300">Question SAV {i + 1}</span>
                        {savScripts.length > 1 && (
                          <button onClick={() => removeSavScript(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                      <input value={s.trigger} onChange={e => setSavScripts(savScripts.map((sc, j) => j === i ? { ...sc, trigger: e.target.value } : sc))}
                        placeholder="Situation / question du client" className="input" />
                      <textarea value={s.response} onChange={e => setSavScripts(savScripts.map((sc, j) => j === i ? { ...sc, response: e.target.value } : sc))}
                        placeholder="Votre réponse type" className="input resize-y" rows={2} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Contact urgence chantier</label>
                  <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="Ex: Jean Dupont - 06 12 34 56 78" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Délai de réponse promis</label>
                  <input value={responseDelay} onChange={e => setResponseDelay(e.target.value)} placeholder="Ex: 24h en semaine, 48h le week-end" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Marge cible (%)</label>
                  <input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} placeholder="30" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1">Taux horaire MO (€/h)</label>
                  <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="45" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1">Processus de relance devis et impayés</label>
                <textarea value={paymentProcess} onChange={e => setPaymentProcess(e.target.value)}
                  placeholder="Ex: J+3 relance par email, J+7 relance tél, J+15 mise en demeure..."
                  className="input resize-y" rows={3} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((step - 1) as OnboardingStep)}
          disabled={step === 1}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${
            step === 1 ? 'text-ink-200 cursor-not-allowed' : 'text-ink-600 hover:bg-surface-50'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </button>
        <button
          onClick={saveCurrentStep}
          disabled={loading || !clientId}
          className="btn-brand px-6"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {step === 5 ? 'Terminer l\'onboarding' : 'Sauvegarder & continuer'}
          {step < 5 && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
