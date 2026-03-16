'use client'

import type { AgentType } from '@/types/database'

interface AgentAvatarProps {
  type: AgentType
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showName?: boolean
}

const sizeMap = {
  sm: { width: 48, height: 60 },
  md: { width: 80, height: 100 },
  lg: { width: 160, height: 200 },
  xl: { width: 260, height: 320 },
}

/* ═══════════════════════════════════════════
   EVA — Réseaux sociaux — Rose #E91E63
   Blazer pro, smartphone, lunettes fines
   ═══════════════════════════════════════════ */
function EvaAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="evaBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F48FB1"/><stop offset="100%" stopColor="#C2185B"/>
        </radialGradient>
        <radialGradient id="evaHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#FCE4EC"/><stop offset="100%" stopColor="#F8BBD0"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#evaBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#evaBody)"/>
      {/* Professional shoes */}
      <ellipse cx="107" cy="304" rx="22" ry="10" fill="#4A1028"/>
      <ellipse cx="153" cy="304" rx="22" ry="10" fill="#4A1028"/>
      <ellipse cx="103" cy="301" rx="10" ry="5" fill="#6D1B3D"/>
      <ellipse cx="149" cy="301" rx="10" ry="5" fill="#6D1B3D"/>
      {/* Body — blazer */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#evaBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#F48FB1" opacity="0.4"/>
      {/* Blazer lapels */}
      <path d="M108 174 L120 192 L130 174" fill="#AD1457" opacity="0.9"/>
      <path d="M152 174 L140 192 L130 174" fill="#AD1457" opacity="0.9"/>
      {/* White shirt collar visible */}
      <path d="M112 172 L130 180 L148 172" fill="white" opacity="0.85"/>
      {/* Blazer button */}
      <circle cx="130" cy="198" r="3" fill="#880E4F"/>
      <circle cx="130" cy="212" r="3" fill="#880E4F"/>
      {/* Left arm + phone */}
      <ellipse cx="68" cy="210" rx="18" ry="36" fill="url(#evaBody)" transform="rotate(12 68 210)"/>
      <circle cx="58" cy="244" r="13" fill="#FCE4EC"/>
      {/* Smartphone — pro */}
      <rect x="32" y="212" width="28" height="48" rx="5" fill="#263238"/>
      <rect x="35" y="217" width="22" height="36" rx="2" fill="#4FC3F7"/>
      {/* App UI on phone */}
      <rect x="37" y="219" width="18" height="4" rx="1" fill="white" opacity="0.8"/>
      <rect x="37" y="225" width="12" height="3" rx="1" fill="white" opacity="0.5"/>
      <rect x="37" y="230" width="18" height="8" rx="1" fill="#E91E63" opacity="0.6"/>
      <rect x="37" y="240" width="8" height="3" rx="1" fill="white" opacity="0.4"/>
      <rect x="47" y="240" width="8" height="3" rx="1" fill="white" opacity="0.4"/>
      {/* Right arm */}
      <ellipse cx="192" cy="208" rx="18" ry="36" fill="url(#evaBody)" transform="rotate(-15 192 208)"/>
      <circle cx="200" cy="240" r="13" fill="#FCE4EC"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#evaHead)"/>
      {/* Professional bob hairstyle */}
      <ellipse cx="130" cy="82" rx="58" ry="28" fill="#5D1433"/>
      <ellipse cx="76" cy="108" rx="13" ry="28" fill="#5D1433"/>
      <ellipse cx="184" cy="108" rx="13" ry="28" fill="#5D1433"/>
      <ellipse cx="130" cy="74" rx="46" ry="22" fill="#7B1A45"/>
      {/* Hair highlight */}
      <ellipse cx="110" cy="72" rx="14" ry="6" fill="#9C2760" opacity="0.5"/>
      {/* Cheeks — subtle */}
      <circle cx="101" cy="138" r="12" fill="#F48FB1" opacity="0.35"/>
      <circle cx="159" cy="138" r="12" fill="#F48FB1" opacity="0.35"/>
      {/* Eyes */}
      <ellipse cx="112" cy="124" rx="14" ry="16" fill="white"/>
      <ellipse cx="148" cy="124" rx="14" ry="16" fill="white"/>
      <circle cx="114" cy="126" r="9" fill="#5D1433"/>
      <circle cx="150" cy="126" r="9" fill="#5D1433"/>
      <circle cx="115" cy="127" r="5.5" fill="#1A1A1A"/>
      <circle cx="151" cy="127" r="5.5" fill="#1A1A1A"/>
      <circle cx="117" cy="123" r="2.5" fill="white"/>
      <circle cx="153" cy="123" r="2.5" fill="white"/>
      {/* Thin professional eyebrows */}
      <path d="M100 112 Q112 107 124 112" stroke="#5D1433" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M136 112 Q148 107 160 112" stroke="#5D1433" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Professional thin glasses */}
      <rect x="97" y="116" width="30" height="20" rx="10" fill="none" stroke="#5D1433" strokeWidth="1.8"/>
      <rect x="133" y="116" width="30" height="20" rx="10" fill="none" stroke="#5D1433" strokeWidth="1.8"/>
      <line x1="127" y1="125" x2="133" y2="125" stroke="#5D1433" strokeWidth="1.5"/>
      {/* Nose */}
      <ellipse cx="130" cy="140" rx="5.5" ry="4.5" fill="#F8BBD0"/>
      {/* Confident professional smile */}
      <path d="M118 155 Q130 165 142 155" stroke="#C2185B" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Ears */}
      <ellipse cx="72" cy="124" rx="7" ry="11" fill="#F8BBD0"/>
      <ellipse cx="188" cy="124" rx="7" ry="11" fill="#F8BBD0"/>
      {/* Small professional earrings */}
      <circle cx="72" cy="136" r="2.5" fill="#E91E63"/>
      <circle cx="188" cy="136" r="2.5" fill="#E91E63"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   LUDO — SAV Client — Bleu #2196F3
   Polo pro, casque audio, badge nominatif
   ═══════════════════════════════════════════ */
function LudoAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ludoBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#64B5F6"/><stop offset="100%" stopColor="#1565C0"/>
        </radialGradient>
        <radialGradient id="ludoHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#E3F2FD"/><stop offset="100%" stopColor="#BBDEFB"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#ludoBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#ludoBody)"/>
      {/* Clean shoes */}
      <ellipse cx="107" cy="304" rx="22" ry="10" fill="#0A3060"/>
      <ellipse cx="153" cy="304" rx="22" ry="10" fill="#0A3060"/>
      <ellipse cx="103" cy="301" rx="10" ry="5" fill="#0D47A1"/>
      <ellipse cx="149" cy="301" rx="10" ry="5" fill="#0D47A1"/>
      {/* Body — polo shirt */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#ludoBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#64B5F6" opacity="0.4"/>
      {/* Polo collar */}
      <path d="M110 172 L122 180 L130 174 L138 180 L150 172" fill="#0D47A1" opacity="0.8"/>
      {/* Polo buttons */}
      <circle cx="130" cy="184" r="2" fill="#0D47A1"/>
      <circle cx="130" cy="192" r="2" fill="#0D47A1"/>
      {/* Name badge with lanyard */}
      <line x1="130" y1="174" x2="148" y2="196" stroke="#455A64" strokeWidth="1.5"/>
      <rect x="140" y="196" width="36" height="22" rx="3" fill="white" stroke="#90CAF9" strokeWidth="1"/>
      <rect x="143" y="199" width="30" height="4" rx="1" fill="#1565C0"/>
      <text fontSize="6" fill="#0D47A1" x="146" y="213" fontFamily="sans-serif" fontWeight="600">LUDO</text>
      <text fontSize="4.5" fill="#546E7A" x="146" y="215.5" fontFamily="sans-serif">Support client</text>
      {/* Left arm — thumbs up */}
      <ellipse cx="68" cy="210" rx="18" ry="36" fill="url(#ludoBody)" transform="rotate(15 68 210)"/>
      <circle cx="58" cy="246" r="14" fill="#E3F2FD"/>
      <ellipse cx="52" cy="234" rx="6" ry="10" fill="#BBDEFB" transform="rotate(20 52 234)"/>
      {/* Right arm */}
      <ellipse cx="192" cy="208" rx="18" ry="36" fill="url(#ludoBody)" transform="rotate(-12 192 208)"/>
      <circle cx="200" cy="240" r="13" fill="#E3F2FD"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#ludoHead)"/>
      {/* Clean short hair */}
      <ellipse cx="130" cy="78" rx="52" ry="24" fill="#0A3060"/>
      <ellipse cx="130" cy="72" rx="42" ry="18" fill="#0D47A1"/>
      {/* Professional headset */}
      <path d="M74 108 Q74 62 130 57 Q186 62 186 108" stroke="#37474F" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* Headset ear pads — sleek */}
      <rect x="62" y="104" rx="6" width="18" height="28" fill="#263238"/>
      <rect x="65" y="108" rx="4" width="12" height="20" fill="#455A64"/>
      <rect x="180" y="104" rx="6" width="18" height="28" fill="#263238"/>
      <rect x="183" y="108" rx="4" width="12" height="20" fill="#455A64"/>
      {/* Mic boom — professional */}
      <path d="M72 128 Q58 150 76 158" stroke="#37474F" strokeWidth="2.5" fill="none"/>
      <ellipse cx="78" cy="159" rx="5" ry="4" fill="#263238"/>
      <circle cx="78" cy="159" r="2.5" fill="#455A64"/>
      {/* Cheeks — subtle */}
      <circle cx="101" cy="138" r="12" fill="#90CAF9" opacity="0.35"/>
      <circle cx="159" cy="138" r="12" fill="#90CAF9" opacity="0.35"/>
      {/* Eyes — friendly and professional */}
      <ellipse cx="112" cy="124" rx="14" ry="16" fill="white"/>
      <ellipse cx="148" cy="124" rx="14" ry="16" fill="white"/>
      <circle cx="113" cy="125" r="9" fill="#0D47A1"/>
      <circle cx="149" cy="125" r="9" fill="#0D47A1"/>
      <circle cx="114" cy="126" r="5.5" fill="#1A1A1A"/>
      <circle cx="150" cy="126" r="5.5" fill="#1A1A1A"/>
      <circle cx="116" cy="122" r="2.5" fill="white"/>
      <circle cx="152" cy="122" r="2.5" fill="white"/>
      {/* Eyebrows — confident */}
      <path d="M98 110 Q112 105 124 110" stroke="#0A3060" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M136 110 Q148 105 162 110" stroke="#0A3060" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <ellipse cx="130" cy="140" rx="6" ry="5" fill="#BBDEFB"/>
      {/* Warm professional smile */}
      <path d="M114 156 Q130 170 146 156" stroke="#1565C0" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M120 158 Q130 166 140 158" fill="#E3F2FD" opacity="0.7"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   MARC — Emails — Orange #FF9800
   Gilet + nœud papillon, enveloppe, lunettes
   ═══════════════════════════════════════════ */
function MarcAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="marcBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFB74D"/><stop offset="100%" stopColor="#E65100"/>
        </radialGradient>
        <radialGradient id="marcHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#FFF3E0"/><stop offset="100%" stopColor="#FFE0B2"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#marcBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#marcBody)"/>
      {/* Polished shoes */}
      <ellipse cx="107" cy="304" rx="22" ry="10" fill="#4E2600"/>
      <ellipse cx="153" cy="304" rx="22" ry="10" fill="#4E2600"/>
      <ellipse cx="103" cy="301" rx="10" ry="5" fill="#7F3D00"/>
      <ellipse cx="149" cy="301" rx="10" ry="5" fill="#7F3D00"/>
      {/* Body */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#marcBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#FFB74D" opacity="0.4"/>
      {/* Vest overlay */}
      <ellipse cx="130" cy="218" rx="34" ry="40" fill="#BF360C" opacity="0.3"/>
      {/* White shirt collar */}
      <path d="M112 172 L130 180 L148 172" fill="white" opacity="0.85"/>
      {/* Bow tie — refined */}
      <polygon points="120,177 130,183 140,177 140,188 130,184 120,188" fill="#7F3D00"/>
      <circle cx="130" cy="183" r="3.5" fill="#BF360C"/>
      {/* Vest buttons */}
      <circle cx="130" cy="198" r="2.5" fill="#BF360C"/>
      <circle cx="130" cy="210" r="2.5" fill="#BF360C"/>
      <circle cx="130" cy="222" r="2.5" fill="#BF360C"/>
      {/* Left arm — holding envelope */}
      <ellipse cx="68" cy="212" rx="18" ry="36" fill="url(#marcBody)" transform="rotate(10 68 212)"/>
      <circle cx="58" cy="246" r="13" fill="#FFF3E0"/>
      {/* Envelope — professional */}
      <rect x="18" y="220" width="48" height="32" rx="3" fill="white" stroke="#E0E0E0" strokeWidth="1"/>
      <path d="M20 222 L42 240 L64 222" stroke="#FF9800" strokeWidth="1.5" fill="none"/>
      {/* Wax seal on envelope */}
      <circle cx="42" cy="244" r="5" fill="#BF360C" opacity="0.7"/>
      <circle cx="42" cy="244" r="3" fill="#E65100" opacity="0.8"/>
      {/* Right arm */}
      <ellipse cx="192" cy="208" rx="18" ry="36" fill="url(#marcBody)" transform="rotate(-18 192 208)"/>
      <circle cx="200" cy="238" r="13" fill="#FFF3E0"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#marcHead)"/>
      {/* Well-groomed hair with side part */}
      <ellipse cx="130" cy="78" rx="54" ry="26" fill="#4E2600"/>
      <ellipse cx="130" cy="72" rx="44" ry="20" fill="#7F3D00"/>
      <path d="M82 82 Q100 68 118 74" fill="#4E2600"/>
      {/* Round professional glasses */}
      <circle cx="112" cy="124" r="16" fill="none" stroke="#4E2600" strokeWidth="2"/>
      <circle cx="148" cy="124" r="16" fill="none" stroke="#4E2600" strokeWidth="2"/>
      <line x1="128" y1="124" x2="132" y2="124" stroke="#4E2600" strokeWidth="1.8"/>
      <line x1="72" y1="120" x2="96" y2="122" stroke="#4E2600" strokeWidth="1.5"/>
      <line x1="164" y1="122" x2="188" y2="120" stroke="#4E2600" strokeWidth="1.5"/>
      {/* Cheeks — subtle */}
      <circle cx="100" cy="140" r="12" fill="#FFCC80" opacity="0.35"/>
      <circle cx="160" cy="140" r="12" fill="#FFCC80" opacity="0.35"/>
      {/* Eyes — wise */}
      <ellipse cx="112" cy="124" rx="12" ry="14" fill="white"/>
      <ellipse cx="148" cy="124" rx="12" ry="14" fill="white"/>
      <circle cx="113" cy="125" r="8" fill="#7F3D00"/>
      <circle cx="149" cy="125" r="8" fill="#7F3D00"/>
      <circle cx="114" cy="126" r="5" fill="#1A1A1A"/>
      <circle cx="150" cy="126" r="5" fill="#1A1A1A"/>
      <circle cx="116" cy="122" r="2" fill="white"/>
      <circle cx="152" cy="122" r="2" fill="white"/>
      {/* Distinguished eyebrows */}
      <path d="M98 109 Q112 103 124 109" stroke="#4E2600" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M136 109 Q148 103 162 109" stroke="#4E2600" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <ellipse cx="130" cy="140" rx="6" ry="5" fill="#FFE0B2"/>
      {/* Neat mustache */}
      <path d="M118 152 Q124 156 130 155 Q136 156 142 152" stroke="#4E2600" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Professional smile */}
      <path d="M118 158 Q130 168 142 158" stroke="#E65100" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Ears */}
      <ellipse cx="72" cy="124" rx="7" ry="11" fill="#FFE0B2"/>
      <ellipse cx="188" cy="124" rx="7" ry="11" fill="#FFE0B2"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   LEO — Opérationnel — Vert #4CAF50
   Casque chantier, gilet hi-vis, clipboard devis
   ═══════════════════════════════════════════ */
function LeoAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="leoBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#81C784"/><stop offset="100%" stopColor="#2E7D32"/>
        </radialGradient>
        <radialGradient id="leoHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#E8F5E9"/><stop offset="100%" stopColor="#C8E6C9"/>
        </radialGradient>
        <radialGradient id="leoHelmet" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FDD835"/><stop offset="100%" stopColor="#F57F17"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#leoBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#leoBody)"/>
      {/* Safety boots */}
      <ellipse cx="107" cy="304" rx="24" ry="12" fill="#1B1B1B"/>
      <ellipse cx="153" cy="304" rx="24" ry="12" fill="#1B1B1B"/>
      <ellipse cx="103" cy="300" rx="12" ry="6" fill="#333"/>
      <ellipse cx="149" cy="300" rx="12" ry="6" fill="#333"/>
      {/* Steel toe cap shine */}
      <ellipse cx="100" cy="302" rx="6" ry="3" fill="#555" opacity="0.4"/>
      <ellipse cx="146" cy="302" rx="6" ry="3" fill="#555" opacity="0.4"/>
      {/* Body */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#leoBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#81C784" opacity="0.4"/>
      {/* Hi-vis vest stripes */}
      <path d="M94 184 Q130 176 166 184 L168 240 Q130 248 92 240Z" fill="#FDD835" opacity="0.25"/>
      <rect x="86" y="205" width="88" height="5" rx="2" fill="#E0E0E0" opacity="0.5"/>
      <rect x="86" y="215" width="88" height="5" rx="2" fill="#E0E0E0" opacity="0.5"/>
      {/* Tool belt — professional */}
      <rect x="74" y="248" width="112" height="14" rx="7" fill="#4E342E"/>
      {/* Belt buckle */}
      <rect x="123" y="249" width="14" height="12" rx="3" fill="#3E2723"/>
      <rect x="126" y="251" width="8" height="8" rx="2" fill="#FDD835"/>
      {/* Belt pouches */}
      <rect x="80" y="252" width="16" height="10" rx="3" fill="#3E2723"/>
      <rect x="164" y="252" width="16" height="10" rx="3" fill="#3E2723"/>
      {/* Tools — ruler + screwdriver */}
      <rect x="83" y="244" width="3" height="14" rx="1.5" fill="#FDD835"/>
      <rect x="168" y="244" width="3" height="14" rx="1.5" fill="#EF4444"/>
      {/* Chest pocket with pen */}
      <rect x="112" y="186" width="22" height="16" rx="3" fill="#2E7D32" opacity="0.6"/>
      <rect x="118" y="182" width="2.5" height="10" rx="1" fill="#1565C0"/>
      {/* Left arm + clipboard */}
      <ellipse cx="66" cy="210" rx="18" ry="38" fill="url(#leoBody)" transform="rotate(15 66 210)"/>
      <circle cx="56" cy="246" r="14" fill="#E8F5E9"/>
      {/* Professional clipboard */}
      <rect x="14" y="192" width="44" height="56" rx="4" fill="#F5F5F5" stroke="#BDBDBD" strokeWidth="1"/>
      {/* Clip */}
      <rect x="28" y="186" width="16" height="10" rx="3" fill="#78909C"/>
      <rect x="31" y="184" width="10" height="6" rx="2" fill="#546E7A"/>
      {/* Document lines */}
      <line x1="20" y1="206" x2="52" y2="206" stroke="#81C784" strokeWidth="1.5"/>
      <line x1="20" y1="213" x2="46" y2="213" stroke="#81C784" strokeWidth="1.5"/>
      <line x1="20" y1="220" x2="52" y2="220" stroke="#81C784" strokeWidth="1.5"/>
      <line x1="20" y1="227" x2="40" y2="227" stroke="#81C784" strokeWidth="1.5"/>
      {/* Total amount */}
      <rect x="32" y="234" width="22" height="8" rx="2" fill="#2E7D32" opacity="0.2"/>
      <text fontSize="6" fill="#2E7D32" x="34" y="241" fontFamily="monospace">3 450€</text>
      {/* Right arm — thumbs up */}
      <ellipse cx="194" cy="205" rx="18" ry="36" fill="url(#leoBody)" transform="rotate(-20 194 205)"/>
      <circle cx="202" cy="238" r="13" fill="#E8F5E9"/>
      <ellipse cx="208" cy="230" rx="6" ry="9" fill="#C8E6C9" transform="rotate(-30 208 230)"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#leoHead)"/>
      {/* Hard hat — pro grade */}
      <ellipse cx="130" cy="84" rx="56" ry="28" fill="url(#leoHelmet)"/>
      <rect x="72" y="90" width="116" height="12" rx="6" fill="#F57F17"/>
      {/* Hat highlight */}
      <ellipse cx="112" cy="76" rx="16" ry="7" fill="#FFF9C4" opacity="0.4" transform="rotate(-18 112 76)"/>
      {/* Safety stripe */}
      <rect x="74" y="86" width="6" height="16" rx="3" fill="#D32F2F" opacity="0.6"/>
      <rect x="180" y="86" width="6" height="16" rx="3" fill="#D32F2F" opacity="0.6"/>
      {/* Cheeks — subtle */}
      <circle cx="101" cy="136" r="13" fill="#A5D6A7" opacity="0.35"/>
      <circle cx="159" cy="136" r="13" fill="#A5D6A7" opacity="0.35"/>
      {/* Eyes */}
      <ellipse cx="112" cy="124" rx="16" ry="17" fill="white"/>
      <ellipse cx="148" cy="124" rx="16" ry="17" fill="white"/>
      <circle cx="113" cy="125" r="10" fill="#1B5E20"/>
      <circle cx="149" cy="125" r="10" fill="#1B5E20"/>
      <circle cx="114" cy="126" r="6" fill="#1A1A1A"/>
      <circle cx="150" cy="126" r="6" fill="#1A1A1A"/>
      <circle cx="116" cy="122" r="3" fill="white"/>
      <circle cx="152" cy="122" r="3" fill="white"/>
      {/* Confident eyebrows */}
      <path d="M96 108 Q112 103 126 108" stroke="#1B5E20" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <path d="M134 108 Q148 103 164 108" stroke="#1B5E20" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <ellipse cx="130" cy="140" rx="6.5" ry="5.5" fill="#C8E6C9"/>
      {/* Short professional mustache */}
      <path d="M119 153 Q124 157 130 156 Q136 157 141 153" stroke="#1B5E20" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Confident smile */}
      <path d="M116 160 Q130 172 144 160" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M122 162 Q130 169 138 162" fill="#E8F5E9" opacity="0.7"/>
      {/* Ears */}
      <ellipse cx="72" cy="124" rx="8" ry="12" fill="#C8E6C9"/>
      <ellipse cx="188" cy="124" rx="8" ry="12" fill="#C8E6C9"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   HUGO — Marketing & Acquisition — Violet #9C27B0
   Veste trendy, mégaphone, plan marketing
   ═══════════════════════════════════════════ */
function HugoAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="hugoBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#CE93D8"/><stop offset="100%" stopColor="#6A1B9A"/>
        </radialGradient>
        <radialGradient id="hugoHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#F3E5F5"/><stop offset="100%" stopColor="#E1BEE7"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#hugoBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#hugoBody)"/>
      {/* Smart shoes */}
      <ellipse cx="107" cy="304" rx="22" ry="10" fill="#2A0845"/>
      <ellipse cx="153" cy="304" rx="22" ry="10" fill="#2A0845"/>
      <ellipse cx="103" cy="301" rx="10" ry="5" fill="#4A148C"/>
      <ellipse cx="149" cy="301" rx="10" ry="5" fill="#4A148C"/>
      {/* Body — trendy blazer */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#hugoBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#CE93D8" opacity="0.4"/>
      {/* Blazer lapels */}
      <path d="M106 174 L120 194 L130 176" fill="#4A148C" opacity="0.7"/>
      <path d="M154 174 L140 194 L130 176" fill="#4A148C" opacity="0.7"/>
      {/* White shirt visible */}
      <path d="M114 174 L130 182 L146 174" fill="white" opacity="0.8"/>
      {/* Pocket square */}
      <path d="M100 195 L106 190 L112 195 L106 198Z" fill="#CE93D8" opacity="0.8"/>
      {/* Target/strategy badge */}
      <circle cx="152" cy="202" r="10" fill="white" opacity="0.9"/>
      <circle cx="152" cy="202" r="7" fill="none" stroke="#9C27B0" strokeWidth="1.5"/>
      <circle cx="152" cy="202" r="4" fill="none" stroke="#9C27B0" strokeWidth="1"/>
      <circle cx="152" cy="202" r="1.5" fill="#9C27B0"/>
      {/* Left arm + megaphone */}
      <ellipse cx="66" cy="205" rx="18" ry="36" fill="url(#hugoBody)" transform="rotate(20 66 205)"/>
      <circle cx="52" cy="238" r="13" fill="#F3E5F5"/>
      {/* Professional megaphone */}
      <path d="M12 200 L42 212 L42 228 L12 240 Z" fill="#4A148C"/>
      <ellipse cx="12" cy="220" rx="9" ry="20" fill="#6A1B9A"/>
      <rect x="40" y="210" width="8" height="20" rx="3" fill="#9C27B0"/>
      <ellipse cx="10" cy="220" rx="5" ry="14" fill="#7B1FA2"/>
      {/* Sound waves — subtle */}
      <path d="M-4 212 Q-12 220 -4 228" stroke="#CE93D8" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <path d="M-10 206 Q-22 220 -10 234" stroke="#CE93D8" strokeWidth="1.5" fill="none" opacity="0.3"/>
      {/* Right arm */}
      <ellipse cx="194" cy="210" rx="18" ry="36" fill="url(#hugoBody)" transform="rotate(-10 194 210)"/>
      <circle cx="200" cy="242" r="13" fill="#F3E5F5"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#hugoHead)"/>
      {/* Modern styled hair — no cap, more pro */}
      <ellipse cx="130" cy="78" rx="54" ry="26" fill="#2A0845"/>
      <ellipse cx="130" cy="72" rx="44" ry="20" fill="#4A148C"/>
      {/* Modern quiff style */}
      <path d="M88 80 Q110 56 150 62 Q170 66 180 84" fill="#2A0845"/>
      <path d="M92 78 Q115 60 148 66 Q165 70 175 82" fill="#4A148C" opacity="0.7"/>
      {/* Cheeks — subtle */}
      <circle cx="101" cy="138" r="12" fill="#CE93D8" opacity="0.3"/>
      <circle cx="159" cy="138" r="12" fill="#CE93D8" opacity="0.3"/>
      {/* Eyes — sharp, professional */}
      <ellipse cx="112" cy="124" rx="15" ry="16" fill="white"/>
      <ellipse cx="148" cy="124" rx="15" ry="16" fill="white"/>
      <circle cx="114" cy="124" r="9" fill="#4A148C"/>
      <circle cx="150" cy="124" r="9" fill="#4A148C"/>
      <circle cx="115" cy="125" r="5.5" fill="#1A1A1A"/>
      <circle cx="151" cy="125" r="5.5" fill="#1A1A1A"/>
      <circle cx="117" cy="121" r="2.5" fill="white"/>
      <circle cx="153" cy="121" r="2.5" fill="white"/>
      {/* Confident eyebrows */}
      <path d="M96 108 Q112 102 126 108" stroke="#2A0845" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M134 108 Q148 102 164 108" stroke="#2A0845" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <ellipse cx="130" cy="140" rx="6" ry="5" fill="#E1BEE7"/>
      {/* Confident professional grin */}
      <path d="M114 156 Q130 172 146 156" stroke="#6A1B9A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M120 158 Q130 168 140 158" fill="#F3E5F5" opacity="0.7"/>
      {/* Ears */}
      <ellipse cx="72" cy="124" rx="7" ry="11" fill="#E1BEE7"/>
      <ellipse cx="188" cy="124" rx="7" ry="11" fill="#E1BEE7"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   SOFIA — Structuration & SOP — Teal #009688
   Tailleur, chignon, organigramme, lunettes fines
   ═══════════════════════════════════════════ */
function SofiaAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sofiaBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#80CBC4"/><stop offset="100%" stopColor="#00695C"/>
        </radialGradient>
        <radialGradient id="sofiaHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#E0F2F1"/><stop offset="100%" stopColor="#B2DFDB"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#sofiaBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#sofiaBody)"/>
      {/* Professional heels */}
      <ellipse cx="107" cy="304" rx="20" ry="9" fill="#00332B"/>
      <ellipse cx="153" cy="304" rx="20" ry="9" fill="#00332B"/>
      <ellipse cx="103" cy="301" rx="9" ry="5" fill="#004D40"/>
      <ellipse cx="149" cy="301" rx="9" ry="5" fill="#004D40"/>
      {/* Body — tailleur */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#sofiaBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#80CBC4" opacity="0.4"/>
      {/* Tailleur collar/lapels */}
      <path d="M108 172 L122 190 L130 174" fill="#004D40" opacity="0.7"/>
      <path d="M152 172 L138 190 L130 174" fill="#004D40" opacity="0.7"/>
      {/* White blouse visible */}
      <path d="M114 172 L130 180 L146 172" fill="white" opacity="0.8"/>
      {/* Buttons */}
      <circle cx="130" cy="196" r="2.5" fill="#004D40"/>
      <circle cx="130" cy="208" r="2.5" fill="#004D40"/>
      {/* Left arm + org chart */}
      <ellipse cx="66" cy="210" rx="18" ry="36" fill="url(#sofiaBody)" transform="rotate(12 66 210)"/>
      <circle cx="56" cy="244" r="13" fill="#E0F2F1"/>
      {/* Org chart board — clean */}
      <rect x="16" y="198" width="44" height="48" rx="4" fill="white" stroke="#B2DFDB" strokeWidth="1.5"/>
      {/* Org chart nodes */}
      <rect x="30" y="204" width="16" height="8" rx="2" fill="#009688"/>
      <line x1="38" y1="212" x2="38" y2="218" stroke="#009688" strokeWidth="1.5"/>
      <line x1="26" y1="218" x2="50" y2="218" stroke="#009688" strokeWidth="1.5"/>
      <rect x="20" y="220" width="12" height="7" rx="2" fill="#4DB6AC"/>
      <rect x="44" y="220" width="12" height="7" rx="2" fill="#4DB6AC"/>
      <line x1="26" y1="227" x2="26" y2="232" stroke="#80CBC4" strokeWidth="1"/>
      <line x1="50" y1="227" x2="50" y2="232" stroke="#80CBC4" strokeWidth="1"/>
      <rect x="21" y="232" width="10" height="6" rx="1.5" fill="#B2DFDB"/>
      <rect x="45" y="232" width="10" height="6" rx="1.5" fill="#B2DFDB"/>
      {/* Right arm + pen */}
      <ellipse cx="194" cy="210" rx="18" ry="36" fill="url(#sofiaBody)" transform="rotate(-15 194 210)"/>
      <circle cx="202" cy="242" r="13" fill="#E0F2F1"/>
      {/* Professional pen */}
      <rect x="200" y="226" width="2.5" height="20" rx="1.2" fill="#004D40" transform="rotate(-15 201 236)"/>
      <polygon points="199,247 203,247 201,253" fill="#009688" transform="rotate(-15 201 250)"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#sofiaHead)"/>
      {/* Elegant bun hairstyle */}
      <ellipse cx="130" cy="78" rx="54" ry="26" fill="#00332B"/>
      <ellipse cx="130" cy="72" rx="44" ry="20" fill="#004D40"/>
      {/* Neat bun */}
      <circle cx="130" cy="55" r="16" fill="#00332B"/>
      <circle cx="130" cy="55" r="12" fill="#004D40"/>
      <ellipse cx="130" cy="52" rx="6" ry="4" fill="#00695C" opacity="0.5"/>
      {/* Side hair */}
      <ellipse cx="76" cy="100" rx="10" ry="22" fill="#00332B"/>
      <ellipse cx="184" cy="100" rx="10" ry="22" fill="#00332B"/>
      {/* Fine professional glasses */}
      <rect x="97" y="117" width="28" height="16" rx="8" fill="none" stroke="#004D40" strokeWidth="1.5"/>
      <rect x="135" y="117" width="28" height="16" rx="8" fill="none" stroke="#004D40" strokeWidth="1.5"/>
      <line x1="125" y1="124" x2="135" y2="124" stroke="#004D40" strokeWidth="1.2"/>
      {/* Cheeks — subtle */}
      <circle cx="101" cy="138" r="12" fill="#80CBC4" opacity="0.3"/>
      <circle cx="159" cy="138" r="12" fill="#80CBC4" opacity="0.3"/>
      {/* Eyes — focused, intelligent */}
      <ellipse cx="111" cy="124" rx="13" ry="15" fill="white"/>
      <ellipse cx="149" cy="124" rx="13" ry="15" fill="white"/>
      <circle cx="112" cy="125" r="8.5" fill="#004D40"/>
      <circle cx="150" cy="125" r="8.5" fill="#004D40"/>
      <circle cx="113" cy="126" r="5" fill="#1A1A1A"/>
      <circle cx="151" cy="126" r="5" fill="#1A1A1A"/>
      <circle cx="115" cy="122" r="2" fill="white"/>
      <circle cx="153" cy="122" r="2" fill="white"/>
      {/* Refined eyebrows */}
      <path d="M100 113 Q111 108 123 113" stroke="#00332B" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M137 113 Q149 108 161 113" stroke="#00332B" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <ellipse cx="130" cy="139" rx="5" ry="4.5" fill="#B2DFDB"/>
      {/* Poised smile */}
      <path d="M118 155 Q130 164 142 155" stroke="#00695C" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Ears */}
      <ellipse cx="72" cy="124" rx="7" ry="11" fill="#B2DFDB"/>
      <ellipse cx="188" cy="124" rx="7" ry="11" fill="#B2DFDB"/>
      {/* Elegant pearl earrings */}
      <circle cx="72" cy="137" r="3.5" fill="white" opacity="0.9"/>
      <circle cx="72" cy="137" r="2" fill="#E0F2F1"/>
      <circle cx="188" cy="137" r="3.5" fill="white" opacity="0.9"/>
      <circle cx="188" cy="137" r="2" fill="#E0F2F1"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   FELIX — Finance & Marges — Rouge-orangé #FF5722
   Costume-cravate, calculatrice, graphique
   ═══════════════════════════════════════════ */
function FelixAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="felixBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FF8A65"/><stop offset="100%" stopColor="#BF360C"/>
        </radialGradient>
        <radialGradient id="felixHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#FBE9E7"/><stop offset="100%" stopColor="#FFCCBC"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#felixBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#felixBody)"/>
      {/* Formal shoes */}
      <ellipse cx="107" cy="304" rx="22" ry="10" fill="#3E0C00"/>
      <ellipse cx="153" cy="304" rx="22" ry="10" fill="#3E0C00"/>
      <ellipse cx="103" cy="301" rx="10" ry="5" fill="#5D1800"/>
      <ellipse cx="149" cy="301" rx="10" ry="5" fill="#5D1800"/>
      {/* Body — formal suit */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#felixBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#FF8A65" opacity="0.4"/>
      {/* Suit jacket lapels */}
      <path d="M104 174 L120 198 L130 176" fill="#7F1D00" opacity="0.7"/>
      <path d="M156 174 L140 198 L130 176" fill="#7F1D00" opacity="0.7"/>
      {/* White shirt */}
      <path d="M114 174 L130 184 L146 174" fill="white" opacity="0.85"/>
      {/* Professional tie */}
      <polygon points="127,178 133,178 135,216 130,220 125,216" fill="#7F1D00"/>
      <polygon points="128,178 132,178 130,184" fill="#3E0C00"/>
      {/* Tie stripe detail */}
      <line x1="128" y1="195" x2="132" y2="193" stroke="#BF360C" strokeWidth="1" opacity="0.5"/>
      <line x1="128" y1="203" x2="132" y2="201" stroke="#BF360C" strokeWidth="1" opacity="0.5"/>
      {/* Left arm + calculator */}
      <ellipse cx="68" cy="210" rx="18" ry="36" fill="url(#felixBody)" transform="rotate(12 68 210)"/>
      <circle cx="56" cy="244" r="13" fill="#FBE9E7"/>
      {/* Professional calculator */}
      <rect x="24" y="208" width="34" height="44" rx="4" fill="#263238"/>
      <rect x="27" y="212" width="28" height="12" rx="2" fill="#A5D6A7"/>
      <text fontSize="7" fill="#1B5E20" x="30" y="222" fontFamily="monospace">12.5K</text>
      {/* Calculator buttons — clean grid */}
      <rect x="27" y="228" width="7" height="5" rx="1" fill="#546E7A"/>
      <rect x="36" y="228" width="7" height="5" rx="1" fill="#546E7A"/>
      <rect x="45" y="228" width="10" height="5" rx="1" fill="#FF5722"/>
      <rect x="27" y="236" width="7" height="5" rx="1" fill="#546E7A"/>
      <rect x="36" y="236" width="7" height="5" rx="1" fill="#546E7A"/>
      <rect x="45" y="236" width="10" height="5" rx="1" fill="#FF5722"/>
      <rect x="27" y="244" width="16" height="5" rx="1" fill="#546E7A"/>
      <rect x="45" y="244" width="10" height="5" rx="1" fill="#4CAF50"/>
      {/* Right arm + trending chart */}
      <ellipse cx="194" cy="210" rx="18" ry="36" fill="url(#felixBody)" transform="rotate(-15 194 210)"/>
      <circle cx="202" cy="242" r="13" fill="#FBE9E7"/>
      {/* Mini chart */}
      <rect x="196" y="210" width="42" height="28" rx="3" fill="white" stroke="#FFAB91" strokeWidth="1"/>
      <polyline points="200,232 210,226 218,228 228,218 234,214" stroke="#4CAF50" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="234" cy="214" r="2.5" fill="#4CAF50"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#felixHead)"/>
      {/* Slicked back professional hair */}
      <ellipse cx="130" cy="80" rx="54" ry="28" fill="#3E0C00"/>
      <ellipse cx="130" cy="74" rx="46" ry="22" fill="#5D1800"/>
      <path d="M78 95 Q130 62 182 95" fill="#3E0C00"/>
      {/* Hair highlight */}
      <path d="M100 72 Q120 64 140 68" fill="#7F1D00" opacity="0.4"/>
      {/* Cheeks — subtle */}
      <circle cx="101" cy="138" r="12" fill="#FFAB91" opacity="0.3"/>
      <circle cx="159" cy="138" r="12" fill="#FFAB91" opacity="0.3"/>
      {/* Eyes — sharp, analytical */}
      <ellipse cx="112" cy="124" rx="14" ry="15" fill="white"/>
      <ellipse cx="148" cy="124" rx="14" ry="15" fill="white"/>
      <circle cx="114" cy="125" r="9" fill="#5D1800"/>
      <circle cx="150" cy="125" r="9" fill="#5D1800"/>
      <circle cx="115" cy="126" r="5.5" fill="#1A1A1A"/>
      <circle cx="151" cy="126" r="5.5" fill="#1A1A1A"/>
      <circle cx="117" cy="122" r="2.5" fill="white"/>
      <circle cx="153" cy="122" r="2.5" fill="white"/>
      {/* Strong confident eyebrows */}
      <path d="M96 108 Q112 101 128 108" stroke="#3E0C00" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <path d="M132 108 Q148 101 164 108" stroke="#3E0C00" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <ellipse cx="130" cy="140" rx="6" ry="5.5" fill="#FFCCBC"/>
      {/* Confident smile */}
      <path d="M118 156 Q130 166 142 156" stroke="#BF360C" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Ears */}
      <ellipse cx="72" cy="124" rx="7" ry="11" fill="#FFCCBC"/>
      <ellipse cx="188" cy="124" rx="7" ry="11" fill="#FFCCBC"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   IRIS — Data & Reporting — Indigo #3F51B5
   Blazer pro, tablette analytics, lunettes modernes
   ═══════════════════════════════════════════ */
function IrisAvatar() {
  return (
    <svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="irisBody" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#9FA8DA"/><stop offset="100%" stopColor="#283593"/>
        </radialGradient>
        <radialGradient id="irisHead" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#E8EAF6"/><stop offset="100%" stopColor="#C5CAE9"/>
        </radialGradient>
      </defs>
      {/* Legs */}
      <ellipse cx="107" cy="282" rx="20" ry="26" fill="url(#irisBody)"/>
      <ellipse cx="153" cy="282" rx="20" ry="26" fill="url(#irisBody)"/>
      {/* Elegant shoes */}
      <ellipse cx="107" cy="304" rx="20" ry="9" fill="#0D1542"/>
      <ellipse cx="153" cy="304" rx="20" ry="9" fill="#0D1542"/>
      <ellipse cx="103" cy="301" rx="9" ry="5" fill="#1A237E"/>
      <ellipse cx="149" cy="301" rx="9" ry="5" fill="#1A237E"/>
      {/* Body — professional blazer */}
      <ellipse cx="130" cy="225" rx="56" ry="62" fill="url(#irisBody)"/>
      <ellipse cx="130" cy="218" rx="38" ry="44" fill="#9FA8DA" opacity="0.4"/>
      {/* Blazer lapels */}
      <path d="M108 172 L122 190 L130 174" fill="#1A237E" opacity="0.7"/>
      <path d="M152 172 L138 190 L130 174" fill="#1A237E" opacity="0.7"/>
      {/* White blouse */}
      <path d="M114 172 L130 180 L146 172" fill="white" opacity="0.8"/>
      {/* Pendant necklace */}
      <path d="M118 174 Q130 186 142 174" stroke="#7C4DFF" strokeWidth="1" fill="none" opacity="0.6"/>
      <circle cx="130" cy="186" r="3.5" fill="#7C4DFF"/>
      {/* Buttons */}
      <circle cx="130" cy="200" r="2.5" fill="#1A237E"/>
      <circle cx="130" cy="212" r="2.5" fill="#1A237E"/>
      {/* Left arm + tablet */}
      <ellipse cx="66" cy="210" rx="18" ry="36" fill="url(#irisBody)" transform="rotate(10 66 210)"/>
      <circle cx="56" cy="244" r="13" fill="#E8EAF6"/>
      {/* Professional tablet */}
      <rect x="16" y="198" width="46" height="52" rx="5" fill="#1A237E"/>
      <rect x="19" y="202" width="40" height="42" rx="3" fill="#E8EAF6"/>
      {/* Bar chart on tablet */}
      <rect x="23" y="230" width="5" height="10" rx="1" fill="#7C4DFF"/>
      <rect x="30" y="224" width="5" height="16" rx="1" fill="#3F51B5"/>
      <rect x="37" y="228" width="5" height="12" rx="1" fill="#9FA8DA"/>
      <rect x="44" y="218" width="5" height="22" rx="1" fill="#283593"/>
      <rect x="51" y="222" width="5" height="18" rx="1" fill="#5C6BC0"/>
      {/* Trend line */}
      <polyline points="25,226 33,220 40,224 47,214 54,218" stroke="#FF4081" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="54" cy="218" r="2" fill="#FF4081"/>
      {/* Chart title area */}
      <rect x="22" y="205" width="20" height="3" rx="1" fill="#9FA8DA" opacity="0.5"/>
      <rect x="22" y="210" width="14" height="2" rx="1" fill="#C5CAE9" opacity="0.5"/>
      {/* Right arm */}
      <ellipse cx="194" cy="210" rx="18" ry="36" fill="url(#irisBody)" transform="rotate(-12 194 210)"/>
      <circle cx="202" cy="242" r="13" fill="#E8EAF6"/>
      {/* Head */}
      <circle cx="130" cy="120" r="58" fill="url(#irisHead)"/>
      {/* Professional long hair */}
      <ellipse cx="130" cy="80" rx="56" ry="28" fill="#0D1542"/>
      <ellipse cx="130" cy="74" rx="46" ry="22" fill="#1A237E"/>
      {/* Side falls */}
      <ellipse cx="76" cy="106" rx="12" ry="26" fill="#0D1542"/>
      <ellipse cx="184" cy="106" rx="12" ry="26" fill="#0D1542"/>
      <ellipse cx="78" cy="128" rx="9" ry="16" fill="#1A237E"/>
      <ellipse cx="182" cy="128" rx="9" ry="16" fill="#1A237E"/>
      {/* Hair highlight */}
      <ellipse cx="115" cy="70" rx="12" ry="5" fill="#283593" opacity="0.5"/>
      {/* Modern angular glasses */}
      <rect x="97" y="116" width="28" height="18" rx="4" fill="none" stroke="#1A237E" strokeWidth="2"/>
      <rect x="135" y="116" width="28" height="18" rx="4" fill="none" stroke="#1A237E" strokeWidth="2"/>
      <line x1="125" y1="124" x2="135" y2="124" stroke="#1A237E" strokeWidth="1.5"/>
      {/* Subtle data reflection on lenses */}
      <line x1="103" y1="120" x2="108" y2="120" stroke="#7C4DFF" strokeWidth="0.8" opacity="0.4"/>
      <line x1="141" y1="120" x2="146" y2="120" stroke="#7C4DFF" strokeWidth="0.8" opacity="0.4"/>
      {/* Cheeks — subtle */}
      <circle cx="100" cy="138" r="12" fill="#9FA8DA" opacity="0.3"/>
      <circle cx="160" cy="138" r="12" fill="#9FA8DA" opacity="0.3"/>
      {/* Eyes — analytical */}
      <ellipse cx="112" cy="124" rx="13" ry="15" fill="white"/>
      <ellipse cx="148" cy="124" rx="13" ry="15" fill="white"/>
      <circle cx="113" cy="125" r="8.5" fill="#1A237E"/>
      <circle cx="149" cy="125" r="8.5" fill="#1A237E"/>
      <circle cx="114" cy="126" r="5" fill="#1A1A1A"/>
      <circle cx="150" cy="126" r="5" fill="#1A1A1A"/>
      <circle cx="116" cy="122" r="2" fill="white"/>
      <circle cx="152" cy="122" r="2" fill="white"/>
      {/* Refined eyebrows */}
      <path d="M100 112 Q112 107 124 112" stroke="#0D1542" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M136 112 Q148 107 160 112" stroke="#0D1542" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <ellipse cx="130" cy="139" rx="5" ry="4.5" fill="#C5CAE9"/>
      {/* Professional smile */}
      <path d="M118 155 Q130 164 142 155" stroke="#283593" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Ears */}
      <ellipse cx="72" cy="124" rx="7" ry="11" fill="#C5CAE9"/>
      <ellipse cx="188" cy="124" rx="7" ry="11" fill="#C5CAE9"/>
      {/* Elegant drop earrings */}
      <circle cx="72" cy="136" r="2" fill="#7C4DFF"/>
      <ellipse cx="72" cy="141" rx="2.5" ry="3.5" fill="#7C4DFF" opacity="0.7"/>
      <circle cx="188" cy="136" r="2" fill="#7C4DFF"/>
      <ellipse cx="188" cy="141" rx="2.5" ry="3.5" fill="#7C4DFF" opacity="0.7"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════
   MAPPING & EXPORT
   ═══════════════════════════════════════════ */

const avatarComponents: Record<AgentType, () => JSX.Element> = {
  eva: EvaAvatar,
  ludo: LudoAvatar,
  marc: MarcAvatar,
  leo: LeoAvatar,
  hugo: HugoAvatar,
  sofia: SofiaAvatar,
  felix: FelixAvatar,
  iris: IrisAvatar,
}

export function AgentAvatar({ type, size = 'md', className = '', showName = false }: AgentAvatarProps) {
  const AvatarSvg = avatarComponents[type]
  const s = sizeMap[size]

  if (!AvatarSvg) return null

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      style={{ width: s.width, height: showName ? 'auto' : s.height }}
    >
      <div style={{ width: s.width, height: s.height }}>
        <AvatarSvg />
      </div>
    </div>
  )
}

// Export individual avatars for standalone use
export { EvaAvatar, LudoAvatar, MarcAvatar, LeoAvatar, HugoAvatar, SofiaAvatar, FelixAvatar, IrisAvatar }
