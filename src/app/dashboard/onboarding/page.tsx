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
  { num: 1, label: 'Identite', icon: Building2, desc: 'Votre entreprise' },
  { num: 2, label: 'Catalogue', icon: Package, desc: 'Produits & services' },
  { num: 3, label: 'Commercial', icon: Users, desc: 'Clients & vente' },
  { num: 4, label: 'Communication', icon: MessageSquare, desc: 'Ton & style' },
  { num: 5, label: 'SAV & Finance', icon: Wrench, desc: 'Support & marges' },
]

const CERTIFICATIONS = ['RGE', 'QualiPac', 'QualiSol', 'Qualibois', 'QualiPV', 'QualiBat']
const SUBSIDIES = ['MaPrimeRenov', 'CEE', 'TVA 5.5%', 'Eco-PTZ', 'Cheque energie']
const TONES = [
  { value: 'professionnel', label: 'Professionnel — serieux et expert' },
  { value: 'chaleureux', label: 'Chaleureux — proche et humain' },
  { value: 'technique', label: 'Technique — precis et detaille' },
  { value: 'familier', label: 'Familier — decontracte et accessible' },
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

  // === Etape 1 — Identite ===
  const [companyDescription, setCompanyDescription] = useState('')
  const [foundingYear, setFoundingYear] = useState('')
  const [geographicZone, setGeographicZone] = useState('')
  const [certifications, setCertifications] = useState<string[]>([])
  const [teamSize, setTeamSize] = useState('')
  const [brandValues, setBrandValues] = useState('')

  // === Etape 2 — Catalogue ===
  const [products, setProducts] = useState<ProductEntry[]>([{ name: '', brand: '', price_range: '', description: '' }])
  const [interventionDelays, setInterventionDelays] = useState('')
  const [subsidies, setSubsidies] = useState<string[]>([])
  const [exclusionZones, setExclusionZones] = useState('')

  // === Etape 3 — Commercial ===
  const [clientProfile, setClientProfile] = useState('')
  const [averageTicket, setAverageTicket] = useState('')
  const [salesProcess, setSalesProcess] = useState('')
  const [objections, setObjections] = useState<ObjectionEntry[]>([{ objection: '', response: '' }])
  const [competitors, setCompetitors] = useState('')
  const [differentiators, setDifferentiators] = useState('')

  // === Etape 4 — Communication ===
  const [formalAddress, setFormalAddress] = useState(true)
  const [toneOfVoice, setToneOfVoice] = useState('professionnel')
  const [wordsToAvoid, setWordsToAvoid] = useState('')
  const [exampleMessages, setExampleMessages] = useState(['', '', ''])
  const [emailSignature, setEmailSignature] = useState('')

  // === Etape 5 — SAV & Finance ===
  const [savScripts, setSavScripts] = useState<SavEntry[]>([{ trigger: '', response: '' }])
  const [emergencyContact, setEmergencyContact] = useState('')
  const [responseDelay, setResponseDelay] = useState('')
  const [targetMargin, setTargetMargin] = useState('30')
  const [hourlyRate, setHourlyRate] = useState('')
  const [paymentProcess, setPaymentProcess] = useState('')

  // ============================================
  // Load existing data
  // ============================================

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

    // Load company memory
    const { data: memory } = await supabase
      .from('company_memory')
      .select('*')
      .eq('client_id', client.id)
      .single()

    if (memory) {
      const m = memory as Record<string, unknown>
      // Etape 1
      if (m.company_description) setCompanyDescription(m.company_description as string)
      if (m.founding_year) setFoundingYear(String(m.founding_year))
      if (m.geographic_zone) setGeographicZone(m.geographic_zone as string)
      if (Array.isArray(m.certifications) && m.certifications.length) setCertifications(m.certifications as string[])
      if (m.team_size) setTeamSize(String(m.team_size))
      if (Array.isArray(m.brand_values) && m.brand_values.length) setBrandValues((m.brand_values as string[]).join(', '))
      // Etape 2
      if (Array.isArray(m.products) && m.products.length) setProducts(m.products as ProductEntry[])
      if (m.intervention_delays) setInterventionDelays(m.intervention_delays as string)
      if (Array.isArray(m.available_subsidies) && m.available_subsidies.length) setSubsidies(m.available_subsidies as string[])
      if (m.exclusion_zones) setExclusionZones(m.exclusion_zones as string)
      // Etape 3
      if (m.typical_client_profile) setClientProfile(m.typical_client_profile as string)
      if (m.average_ticket) setAverageTicket(String(m.average_ticket))
      if (m.sales_process) setSalesProcess(m.sales_process as string)
      if (Array.isArray(m.objections) && m.objections.length) setObjections(m.objections as ObjectionEntry[])
      if (Array.isArray(m.competitors) && m.competitors.length) setCompetitors((m.competitors as string[]).join(', '))
      if (Array.isArray(m.differentiators) && m.differentiators.length) setDifferentiators((m.differentiators as string[]).join(', '))
      // Etape 4
      if (m.formal_address !== undefined) setFormalAddress(m.formal_address as boolean)
      if (m.tone_of_voice) setToneOfVoice(m.tone_of_voice as string)
      if (Array.isArray(m.words_to_avoid) && m.words_to_avoid.length) setWordsToAvoid((m.words_to_avoid as string[]).join(', '))
      if (Array.isArray(m.example_messages) && m.example_messages.length) {
        const msgs = m.example_messages as string[]
        setExampleMessages([msgs[0] || '', msgs[1] || '', msgs[2] || ''])
      }
      if (m.email_signature) setEmailSignature(m.email_signature as string)
      // Etape 5
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

  // ============================================
  // Save step
  // ============================================

  function getStepResponses(): Record<string, unknown> {
    switch (step) {
      case 1:
        return {
          company_description: companyDescription,
          founding_year: foundingYear ? parseInt(foundingYear) : null,
          geographic_zone: geographicZone,
          certifications,
          team_size: teamSize ? parseInt(teamSize) : null,
          brand_values: brandValues.split(',').map(v => v.trim()).filter(Boolean),
        }
      case 2:
        return {
          products: products.filter(p => p.name.trim()),
          intervention_delays: interventionDelays,
          available_subsidies: subsidies,
          exclusion_zones: exclusionZones,
        }
      case 3:
        return {
          typical_client_profile: clientProfile,
          average_ticket: averageTicket ? parseFloat(averageTicket) : null,
          sales_process: salesProcess,
          objections: objections.filter(o => o.objection.trim()),
          competitors: competitors.split(',').map(c => c.trim()).filter(Boolean),
          differentiators: differentiators.split(',').map(d => d.trim()).filter(Boolean),
        }
      case 4:
        return {
          formal_address: formalAddress,
          tone_of_voice: toneOfVoice,
          words_to_avoid: wordsToAvoid.split(',').map(w => w.trim()).filter(Boolean),
          example_messages: exampleMessages.filter(Boolean),
          email_signature: emailSignature,
        }
      case 5:
        return {
          sav_scripts: savScripts.filter(s => s.trigger.trim()),
          emergency_contact: emergencyContact,
          response_delay: responseDelay,
          target_margin: targetMargin ? parseFloat(targetMargin) : 30,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          payment_reminder_process: paymentProcess,
        }
      default:
        return {}
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
        body: JSON.stringify({
          client_id: clientId,
          step,
          responses: getStepResponses(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde')

      setScore(data.score || score)
      setSuccess(data.summary || `Etape ${step} sauvegardee`)

      // Go to next step
      if (step < 5) {
        setTimeout(() => {
          setStep((step + 1) as OnboardingStep)
          setSuccess('')
        }, 1500)
      } else {
        // Onboarding complete
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // Dynamic list helpers
  // ============================================

  function addProduct() {
    setProducts([...products, { name: '', brand: '', price_range: '', description: '' }])
  }
  function removeProduct(idx: number) {
    setProducts(products.filter((_, i) => i !== idx))
  }
  function updateProduct(idx: number, field: keyof ProductEntry, value: string) {
    setProducts(products.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  function addObjection() {
    setObjections([...objections, { objection: '', response: '' }])
  }
  function removeObjection(idx: number) {
    setObjections(objections.filter((_, i) => i !== idx))
  }

  function addSavScript() {
    setSavScripts([...savScripts, { trigger: '', response: '' }])
  }
  function removeSavScript(idx: number) {
    setSavScripts(savScripts.filter((_, i) => i !== idx))
  }

  function toggleCert(cert: string) {
    setCertifications(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    )
  }
  function toggleSubsidy(sub: string) {
    setSubsidies(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    )
  }

  // ============================================
  // RENDER
  // ============================================

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
  const textareaCls = `${inputCls} resize-y`
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuration de vos agents</h1>
        <p className="text-gray-500 text-sm mt-1">
          Renseignez les informations de votre entreprise pour que vos agents soient performants des le premier jour.
        </p>
      </div>

      {/* Score bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Score d&apos;onboarding</span>
          <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
            {score}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              score >= 80 ? 'bg-green-500' : score >= 40 ? 'bg-orange-400' : 'bg-red-400'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        {score < 80 && (
          <p className="text-xs text-orange-500 mt-2">
            Vos agents seront actives a partir de 80%. Completez les etapes manquantes.
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
                step === s.num ? 'bg-blue-600 text-white' :
                step > s.num ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                'bg-gray-100 text-gray-400'
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4 flex-shrink-0" /> : <s.icon className="w-4 h-4 flex-shrink-0" />}
              <span className="text-xs font-medium truncate hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 mx-0.5 flex-shrink-0" />}
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
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

        {/* =================== ETAPE 1: IDENTITE =================== */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Identite de votre entreprise</h2>
            <p className="text-sm text-gray-500 mb-6">Ces informations permettent a vos agents de vous representer fidelement.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Decrivez votre entreprise en 3 phrases *</label>
                <textarea value={companyDescription} onChange={e => setCompanyDescription(e.target.value)}
                  placeholder="Ex: Nous sommes une entreprise familiale specialisee dans l'installation de poeles a granules et pompes a chaleur dans le Rhone..."
                  className={textareaCls} rows={3} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Annee de creation</label>
                  <input type="number" value={foundingYear} onChange={e => setFoundingYear(e.target.value)}
                    placeholder="2015" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Taille de l&apos;equipe</label>
                  <input type="number" value={teamSize} onChange={e => setTeamSize(e.target.value)}
                    placeholder="5" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Zone geographique d&apos;intervention *</label>
                <input value={geographicZone} onChange={e => setGeographicZone(e.target.value)}
                  placeholder="Ex: Rhone (69), Isere (38), Ain (01)" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Certifications</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CERTIFICATIONS.map(cert => (
                    <button key={cert} onClick={() => toggleCert(cert)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        certifications.includes(cert)
                          ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {certifications.includes(cert) && <Check className="w-3 h-3 inline mr-1" />}
                      {cert}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>3 valeurs principales (separees par des virgules)</label>
                <input value={brandValues} onChange={e => setBrandValues(e.target.value)}
                  placeholder="Ex: Qualite, Proximite, Transparence" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* =================== ETAPE 2: CATALOGUE =================== */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Catalogue & offres</h2>
            <p className="text-sm text-gray-500 mb-6">Vos agents pourront parler de vos produits avec precision.</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Produits / services proposes</label>
                  <button onClick={addProduct} className="flex items-center gap-1 text-blue-600 text-sm hover:text-blue-700">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {products.map((p, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">Produit {i + 1}</span>
                        {products.length > 1 && (
                          <button onClick={() => removeProduct(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)}
                          placeholder="Nom du produit" className={inputCls} />
                        <input value={p.brand} onChange={e => updateProduct(i, 'brand', e.target.value)}
                          placeholder="Marque" className={inputCls} />
                        <input value={p.price_range} onChange={e => updateProduct(i, 'price_range', e.target.value)}
                          placeholder="Fourchette de prix (ex: 3000-5000€)" className={inputCls} />
                        <input value={p.description} onChange={e => updateProduct(i, 'description', e.target.value)}
                          placeholder="Description courte" className={inputCls} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Delais moyens d&apos;intervention et de pose</label>
                <input value={interventionDelays} onChange={e => setInterventionDelays(e.target.value)}
                  placeholder="Ex: 2-3 semaines pour la pose, intervention SAV sous 48h" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Aides financieres gerees</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUBSIDIES.map(sub => (
                    <button key={sub} onClick={() => toggleSubsidy(sub)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        subsidies.includes(sub)
                          ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {subsidies.includes(sub) && <Check className="w-3 h-3 inline mr-1" />}
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Zones ou cas d&apos;exclusion</label>
                <input value={exclusionZones} onChange={e => setExclusionZones(e.target.value)}
                  placeholder="Ex: Pas d'intervention au-dessus de 1200m, pas de location" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* =================== ETAPE 3: COMMERCIAL =================== */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Clients & processus commercial</h2>
            <p className="text-sm text-gray-500 mb-6">Vos agents sauront mieux vendre et repondre aux objections.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Decrivez votre client typique *</label>
                <textarea value={clientProfile} onChange={e => setClientProfile(e.target.value)}
                  placeholder="Ex: Proprietaire de maison individuelle, 40-65 ans, en zone periurbaine, souhaite reduire sa facture energetique..."
                  className={textareaCls} rows={3} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ticket moyen par chantier (€)</label>
                  <input type="number" value={averageTicket} onChange={e => setAverageTicket(e.target.value)}
                    placeholder="8000" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Processus de vente (de la demande a la signature)</label>
                <textarea value={salesProcess} onChange={e => setSalesProcess(e.target.value)}
                  placeholder="Ex: 1. Demande de devis en ligne → 2. Appel qualif → 3. Visite technique → 4. Envoi devis → 5. Signature"
                  className={textareaCls} rows={3} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Objections frequentes & reponses</label>
                  <button onClick={addObjection} className="flex items-center gap-1 text-blue-600 text-sm hover:text-blue-700">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {objections.map((o, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Objection {i + 1}</span>
                        {objections.length > 1 && (
                          <button onClick={() => removeObjection(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input value={o.objection}
                        onChange={e => setObjections(objections.map((obj, j) => j === i ? { ...obj, objection: e.target.value } : obj))}
                        placeholder="L'objection du client" className={inputCls} />
                      <input value={o.response}
                        onChange={e => setObjections(objections.map((obj, j) => j === i ? { ...obj, response: e.target.value } : obj))}
                        placeholder="Votre reponse" className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Concurrents locaux (separes par virgules)</label>
                  <input value={competitors} onChange={e => setCompetitors(e.target.value)}
                    placeholder="Ex: EnergieVerte, Chauffage Pro 69" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ce qui vous differencie (separes par virgules)</label>
                  <input value={differentiators} onChange={e => setDifferentiators(e.target.value)}
                    placeholder="Ex: SAV 24h, Pose en 1 semaine, Artisan local" className={inputCls} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================== ETAPE 4: COMMUNICATION =================== */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Ton & style de communication</h2>
            <p className="text-sm text-gray-500 mb-6">Vos agents communiqueront exactement comme vous le souhaitez.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Comment vous adressez-vous a vos clients ?</label>
                <div className="flex gap-3 mt-1">
                  <button onClick={() => setFormalAddress(true)}
                    className={`flex-1 py-3 rounded-lg border-2 font-medium transition ${
                      formalAddress ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    Vouvoiement
                  </button>
                  <button onClick={() => setFormalAddress(false)}
                    className={`flex-1 py-3 rounded-lg border-2 font-medium transition ${
                      !formalAddress ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    Tutoiement
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Ton souhaite</label>
                <div className="space-y-2 mt-1">
                  {TONES.map(t => (
                    <button key={t.value} onClick={() => setToneOfVoice(t.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                        toneOfVoice === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className="text-sm font-medium text-gray-900">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Mots ou formulations a eviter (separes par virgules)</label>
                <input value={wordsToAvoid} onChange={e => setWordsToAvoid(e.target.value)}
                  placeholder="Ex: pas cher, discount, promo, urgent" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>3 exemples de vrais messages envoyes a vos clients</label>
                <div className="space-y-2 mt-1">
                  {exampleMessages.map((msg, i) => (
                    <textarea key={i} value={msg}
                      onChange={e => setExampleMessages(exampleMessages.map((m, j) => j === i ? e.target.value : m))}
                      placeholder={`Message exemple ${i + 1} (WhatsApp, email, SMS...)`}
                      className={textareaCls} rows={2} />
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Signature email actuelle</label>
                <textarea value={emailSignature} onChange={e => setEmailSignature(e.target.value)}
                  placeholder="Copiez-collez votre signature email ici" className={textareaCls} rows={3} />
              </div>
            </div>
          </div>
        )}

        {/* =================== ETAPE 5: SAV & FINANCE =================== */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">SAV & parametres financiers</h2>
            <p className="text-sm text-gray-500 mb-6">Vos agents gereront le SAV et les relances comme vous le faites.</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Questions SAV frequentes & reponses types</label>
                  <button onClick={addSavScript} className="flex items-center gap-1 text-blue-600 text-sm hover:text-blue-700">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {savScripts.map((s, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Question SAV {i + 1}</span>
                        {savScripts.length > 1 && (
                          <button onClick={() => removeSavScript(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input value={s.trigger}
                        onChange={e => setSavScripts(savScripts.map((sc, j) => j === i ? { ...sc, trigger: e.target.value } : sc))}
                        placeholder="Situation / question du client" className={inputCls} />
                      <textarea value={s.response}
                        onChange={e => setSavScripts(savScripts.map((sc, j) => j === i ? { ...sc, response: e.target.value } : sc))}
                        placeholder="Votre reponse type" className={textareaCls} rows={2} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Contact urgence chantier</label>
                  <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)}
                    placeholder="Ex: Jean Dupont - 06 12 34 56 78" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Delai de reponse promis</label>
                  <input value={responseDelay} onChange={e => setResponseDelay(e.target.value)}
                    placeholder="Ex: 24h en semaine, 48h le week-end" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Marge cible (%)</label>
                  <input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)}
                    placeholder="30" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Taux horaire MO (€/h)</label>
                  <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
                    placeholder="45" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Processus de relance devis et impayes</label>
                <textarea value={paymentProcess} onChange={e => setPaymentProcess(e.target.value)}
                  placeholder="Ex: J+3 relance par email, J+7 relance tel, J+15 mise en demeure..."
                  className={textareaCls} rows={3} />
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
            step === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Precedent
        </button>
        <button
          onClick={saveCurrentStep}
          disabled={loading || !clientId}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {step === 5 ? 'Terminer l\'onboarding' : 'Sauvegarder & continuer'}
          {step < 5 && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
