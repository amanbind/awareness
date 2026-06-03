/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   graphics_engine.js â€” Phishing & security focused SVG graphics
   Visual illustrations for ALL employees (simple, clear, iconic)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
window.App = window.App || {};

App.Graphics = (() => {
  'use strict';

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PHISHING EMAIL (hook in envelope)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const PHISH_EMAIL = `<svg viewBox="0 0 130 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="pe-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A2A2A"/><stop offset="100%" stop-color="#0D0D0D"/></linearGradient></defs>
    <rect x="8" y="18" width="84" height="62" rx="6" fill="url(#pe-g)" stroke="#C09010" stroke-width="2"/>
    <polyline points="8,22 50,54 92,22" fill="none" stroke="#C09010" stroke-width="2"/>
    <line x1="8" y1="80" x2="30" y2="54" stroke="rgba(192,144,16,.15)" stroke-width="1"/>
    <line x1="92" y1="80" x2="70" y2="54" stroke="rgba(192,144,16,.15)" stroke-width="1"/>
    <rect x="20" y="60" width="30" height="3" rx="1.5" fill="rgba(192,144,16,.15)"/>
    <rect x="20" y="66" width="20" height="3" rx="1.5" fill="rgba(192,144,16,.1)"/>
    <!-- Warning badge -->
    <circle cx="82" cy="22" r="12" fill="#C0392B" stroke="#0A0A0A" stroke-width="2">
      <animate attributeName="r" values="11;13;11" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="82" y="27" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="700">!</text>
    <!-- Hook -->
    <path d="M106 8 Q122 8 122 26 Q122 52 106 52 Q100 52 100 46 Q100 40 106 40 Q112 40 112 26 Q112 16 106 16" fill="none" stroke="#C0392B" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="106" cy="56" r="4.5" fill="#C0392B"/>
    <!-- Red X marks -->
    <text x="36" y="48" font-size="8" fill="rgba(192,57,43,.4)" font-family="sans-serif">âœ— âœ— âœ—</text>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  SHIELD WITH LOCK (password & MFA)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const SHIELD_LOCK = `<svg viewBox="0 0 110 125" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sl-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A2A2A"/><stop offset="100%" stop-color="#0D0D0D"/></linearGradient></defs>
    <path d="M55 5 L100 22 L100 62 C100 88 80 108 55 115 C30 108 10 88 10 62 L10 22 Z" fill="url(#sl-g)" stroke="#C09010" stroke-width="2.5"/>
    <path d="M55 15 L90 28 L90 62 C90 83 74 99 55 105 C36 99 20 83 20 62 L20 28 Z" fill="#0A0A0A" stroke="rgba(192,144,16,.2)" stroke-width="1"/>
    <!-- Lock icon in center -->
    <rect x="38" y="55" width="34" height="26" rx="5" fill="none" stroke="#D4A420" stroke-width="2.5"/>
    <path d="M43 55 V44 C43 34 67 34 67 44 V55" fill="none" stroke="#D4A420" stroke-width="2.5"/>
    <circle cx="55" cy="66" r="5" fill="#D4A420">
      <animate attributeName="opacity" values="1;.6;1" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <rect x="53" y="66" width="4" height="7" rx="2" fill="#D4A420"/>
    <!-- Stars (MFA dots) -->
    <circle cx="35" cy="35" r="3" fill="#D4A420" opacity=".5"/><circle cx="55" cy="25" r="3" fill="#D4A420" opacity=".5"/><circle cx="75" cy="35" r="3" fill="#D4A420" opacity=".5"/>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  SMS / SMISHING (phone with warning)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const SMISHING = `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="4" width="56" height="112" rx="10" fill="#1a1a1a" stroke="#C09010" stroke-width="2"/>
    <rect x="16" y="18" width="48" height="76" rx="2" fill="#0A0A0A"/>
    <rect x="30" y="8" width="20" height="4" rx="2" fill="#333"/>
    <circle cx="40" cy="104" r="5" fill="none" stroke="#444" stroke-width="1.5"/>
    <!-- Scam message bubbles -->
    <rect x="20" y="24" width="36" height="18" rx="6" fill="#C0392B" opacity=".9"/>
    <text x="27" y="35" font-size="6" fill="white" font-family="sans-serif" font-weight="600">âš  URGENT!</text>
    <rect x="20" y="46" width="40" height="14" rx="6" fill="#C0392B" opacity=".7"/>
    <text x="24" y="55" font-size="5" fill="white" font-family="sans-serif">Click here now â†’</text>
    <!-- Warning X -->
    <circle cx="64" cy="18" r="10" fill="#C0392B" stroke="#0A0A0A" stroke-width="2">
      <animate attributeName="r" values="9;11;9" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="64" y="23" text-anchor="middle" font-size="12" fill="white" font-family="sans-serif" font-weight="700">âœ—</text>
    <!-- Safe action -->
    <rect x="20" y="66" width="40" height="14" rx="6" fill="#1E7A46" opacity=".9"/>
    <text x="26" y="75" font-size="5" fill="white" font-family="sans-serif">âœ“ Delete & Report</text>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  DATA LEAK (broken database)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const DATA_LEAK = `<svg viewBox="0 0 110 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="dl-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A2A2A"/><stop offset="100%" stop-color="#111"/></linearGradient></defs>
    <!-- Database cylinders -->
    <ellipse cx="42" cy="18" rx="30" ry="10" fill="url(#dl-g)" stroke="#C09010" stroke-width="1.5"/>
    <rect x="12" y="18" width="60" height="22" fill="url(#dl-g)"/>
    <ellipse cx="42" cy="40" rx="30" ry="10" fill="url(#dl-g)" stroke="#C09010" stroke-width="1.5"/>
    <rect x="12" y="40" width="60" height="22" fill="url(#dl-g)"/>
    <ellipse cx="42" cy="62" rx="30" ry="10" fill="url(#dl-g)" stroke="#C09010" stroke-width="1.5"/>
    <line x1="12" y1="18" x2="12" y2="62" stroke="#C09010" stroke-width="1.5"/>
    <line x1="72" y1="18" x2="72" y2="62" stroke="#C09010" stroke-width="1.5"/>
    <!-- Leak drops -->
    <circle cx="58" cy="72" r="3" fill="#C0392B" opacity=".8"><animate attributeName="cy" values="72;86;72" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="48" cy="78" r="2.5" fill="#C0392B" opacity=".6"><animate attributeName="cy" values="78;92;78" dur="2.5s" repeatCount="indefinite" begin=".4s"/></circle>
    <circle cx="38" cy="74" r="2" fill="#C0392B" opacity=".5"><animate attributeName="cy" values="74;88;74" dur="3s" repeatCount="indefinite" begin=".8s"/></circle>
    <!-- Crack -->
    <path d="M55 30 L62 38 L56 46 L64 55" fill="none" stroke="#C0392B" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Warning -->
    <circle cx="90" cy="22" r="14" fill="#C0392B" opacity=".15"/>
    <circle cx="90" cy="22" r="10" fill="#C0392B">
      <animate attributeName="opacity" values="1;.6;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="90" y="27" text-anchor="middle" font-size="12" fill="white" font-family="sans-serif" font-weight="700">!</text>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  MFA / TWO-STEP LOGIN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const MFA_ICON = `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Phone -->
    <rect x="6" y="8" width="42" height="74" rx="7" fill="#1a1a1a" stroke="#C09010" stroke-width="2"/>
    <rect x="10" y="18" width="34" height="50" rx="2" fill="#0A0A0A"/>
    <circle cx="27" cy="78" r="3" fill="none" stroke="#444" stroke-width="1"/>
    <!-- Code on phone -->
    <text x="27" y="43" text-anchor="middle" font-size="13" fill="#D4A420" font-family="monospace" font-weight="700">4 8 2</text>
    <text x="27" y="54" text-anchor="middle" font-size="5" fill="rgba(255,255,255,.3)" font-family="sans-serif">YOUR CODE</text>
    <!-- Arrow -->
    <path d="M52 45 L68 45" stroke="#D4A420" stroke-width="2" stroke-dasharray="4,3"><animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite"/></path>
    <polygon points="68,40 78,45 68,50" fill="#D4A420"/>
    <!-- Computer -->
    <rect x="78" y="20" width="36" height="28" rx="3" fill="#1a1a1a" stroke="#C09010" stroke-width="1.5"/>
    <rect x="82" y="24" width="28" height="20" rx="1" fill="#0A0A0A"/>
    <rect x="86" y="48" width="20" height="3" rx="1" fill="#333"/>
    <rect x="82" y="51" width="28" height="2" rx="1" fill="#222"/>
    <!-- Lock on computer -->
    <rect x="90" y="30" width="12" height="10" rx="2" fill="none" stroke="#1E7A46" stroke-width="1.5"/>
    <path d="M93 30 V27 C93 24 99 24 99 27 V30" fill="none" stroke="#1E7A46" stroke-width="1.5"/>
    <!-- Checkmark -->
    <circle cx="96" cy="35" r="2" fill="#1E7A46"/>
    <!-- SAFE label -->
    <rect x="80" y="60" width="32" height="12" rx="4" fill="#1E7A46" opacity=".9"/>
    <text x="96" y="69" text-anchor="middle" font-size="6" fill="white" font-family="sans-serif" font-weight="700">âœ“ SAFE</text>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PEOPLE TALKING (reporter & security team)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const PEOPLE = `<svg viewBox="0 0 170 110" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="24" r="16" fill="#B8860B"/>
    <circle cx="35.5" cy="20" r="2.8" fill="#0A0A0A"/><circle cx="44.5" cy="20" r="2.8" fill="#0A0A0A"/>
    <path d="M33,28 Q40,33 47,28" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round"/>
    <rect x="20" y="44" width="40" height="48" rx="10" fill="#B8860B"/>
    <rect x="6" y="48" width="16" height="30" rx="8" fill="#B8860B"/>
    <rect x="58" y="48" width="16" height="30" rx="8" fill="#B8860B"/>
    <circle cx="58" cy="14" r="8" fill="#0A0A0A" stroke="#D4A420" stroke-width="1.5"/>
    <path d="M55 14 L57 16 L61 12" fill="none" stroke="#D4A420" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="130" cy="24" r="16" fill="#2E2E2E"/>
    <circle cx="125.5" cy="20" r="2.8" fill="#888"/><circle cx="134.5" cy="20" r="2.8" fill="#888"/>
    <path d="M123,28 Q130,33 137,28" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round"/>
    <rect x="110" y="44" width="40" height="48" rx="10" fill="#242424"/>
    <rect x="96" y="48" width="16" height="30" rx="8" fill="#242424"/>
    <rect x="148" y="48" width="16" height="30" rx="8" fill="#242424"/>
    <path d="M115 20 C115 8 145 8 145 20" fill="none" stroke="#555" stroke-width="2.5"/>
    <rect x="112" y="16" width="6" height="10" rx="3" fill="#444"/><rect x="142" y="16" width="6" height="10" rx="3" fill="#444"/>
    <path d="M68 42 Q85 32 98 42" fill="none" stroke="rgba(212,164,32,.3)" stroke-width="1" stroke-dasharray="3,3"><animate attributeName="stroke-dashoffset" from="0" to="-12" dur="2s" repeatCount="indefinite"/></path>
    <path d="M72 48 Q85 38 98 48" fill="none" stroke="rgba(212,164,32,.2)" stroke-width="1" stroke-dasharray="3,3"><animate attributeName="stroke-dashoffset" from="0" to="-12" dur="2s" repeatCount="indefinite" begin=".3s"/></path>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  VISHING (phone scam)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const VISHING = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Phone handset -->
    <path d="M20 78 C8 66 8 40 20 22 L30 30 C22 42 22 64 30 72 Z" fill="#1a1a1a" stroke="#C09010" stroke-width="2"/>
    <!-- Sound waves from scammer -->
    <path d="M38 44 Q46 50 38 56" fill="none" stroke="#C0392B" stroke-width="2" stroke-linecap="round"><animate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite"/></path>
    <path d="M44 38 Q56 50 44 62" fill="none" stroke="#C0392B" stroke-width="1.5" stroke-linecap="round"><animate attributeName="opacity" values=".7;.1;.7" dur="1.5s" repeatCount="indefinite" begin=".3s"/></path>
    <path d="M50 32 Q66 50 50 68" fill="none" stroke="#C0392B" stroke-width="1" stroke-linecap="round"><animate attributeName="opacity" values=".4;.05;.4" dur="1.5s" repeatCount="indefinite" begin=".6s"/></path>
    <!-- Skull/scammer face -->
    <circle cx="72" cy="40" r="18" fill="#1a1a1a" stroke="#C0392B" stroke-width="2"/>
    <circle cx="66" cy="36" r="3.5" fill="#C0392B"/><circle cx="78" cy="36" r="3.5" fill="#C0392B"/>
    <path d="M64 48 L68 44 L72 48 L76 44 L80 48" fill="none" stroke="#C0392B" stroke-width="1.5"/>
    <!-- Warning text -->
    <text x="72" y="75" text-anchor="middle" font-size="7" fill="#C0392B" font-family="sans-serif" font-weight="700" letter-spacing=".5">SCAM CALL</text>
    <text x="72" y="88" text-anchor="middle" font-size="6" fill="#1E7A46" font-family="sans-serif" font-weight="600">HANG UP!</text>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  WARNING TRIANGLE (generic)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const WARNING = `<svg viewBox="0 0 80 72" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="wn-g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1a1a"/><stop offset="100%" stop-color="#0d0d0d"/></linearGradient></defs>
    <polygon points="40,4 76,66 4,66" fill="url(#wn-g1)" stroke="#C09010" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="37" y="22" width="6" height="22" rx="3" fill="#D4A420"><animate attributeName="opacity" values="1;.6;1" dur="2s" repeatCount="indefinite"/></rect>
    <circle cx="40" cy="53" r="4" fill="#D4A420"><animate attributeName="opacity" values="1;.6;1" dur="2s" repeatCount="indefinite"/></circle>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FAKE WEBSITE (browser with danger)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const FAKE_SITE = `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="112" height="82" rx="6" fill="#1a1a1a" stroke="#C09010" stroke-width="1.5"/>
    <!-- Browser bar -->
    <rect x="4" y="4" width="112" height="16" rx="6" fill="#222"/>
    <circle cx="14" cy="12" r="3" fill="#C0392B"/><circle cx="24" cy="12" r="3" fill="#E67E22"/><circle cx="34" cy="12" r="3" fill="#1E7A46"/>
    <!-- URL bar with warning -->
    <rect x="44" y="7" width="66" height="10" rx="3" fill="#0A0A0A"/>
    <circle cx="50" cy="12" r="2.5" fill="#C0392B"/>
    <text x="56" y="14.5" font-size="5" fill="#C0392B" font-family="monospace">amaz0n-l0gin.xyz</text>
    <!-- Fake login form -->
    <rect x="24" y="30" width="72" height="10" rx="2" fill="#222" stroke="#444" stroke-width=".5"/>
    <text x="28" y="37" font-size="5" fill="#666" font-family="sans-serif">Email address</text>
    <rect x="24" y="44" width="72" height="10" rx="2" fill="#222" stroke="#444" stroke-width=".5"/>
    <text x="28" y="51" font-size="5" fill="#666" font-family="sans-serif">Password â€¢â€¢â€¢â€¢</text>
    <rect x="24" y="58" width="72" height="12" rx="3" fill="#C0392B"/>
    <text x="60" y="67" text-anchor="middle" font-size="6" fill="white" font-family="sans-serif" font-weight="700">âš  FAKE LOGIN</text>
    <!-- Big warning overlay -->
    <path d="M88 72 L100 54 L76 54 Z" fill="none" stroke="#C0392B" stroke-width="2"/>
    <text x="88" y="68" text-anchor="middle" font-size="8" fill="#C0392B" font-family="sans-serif" font-weight="700">!</text>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  CHANGE PASSWORD (key rotation)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const CHANGE_PW = `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Old key (crossed out) -->
    <circle cx="28" cy="35" r="12" fill="none" stroke="#C0392B" stroke-width="2" opacity=".5"/>
    <circle cx="28" cy="35" r="5" fill="none" stroke="#C0392B" stroke-width="2" opacity=".5"/>
    <line x1="38" y1="35" x2="60" y2="35" stroke="#C0392B" stroke-width="2" opacity=".5"/>
    <line x1="52" y1="35" x2="52" y2="42" stroke="#C0392B" stroke-width="2" opacity=".5"/>
    <line x1="56" y1="35" x2="56" y2="42" stroke="#C0392B" stroke-width="2" opacity=".5"/>
    <!-- Red X on old -->
    <line x1="18" y1="25" x2="40" y2="47" stroke="#C0392B" stroke-width="3" stroke-linecap="round"/>
    <line x1="40" y1="25" x2="18" y2="47" stroke="#C0392B" stroke-width="3" stroke-linecap="round"/>
    <!-- Arrow -->
    <path d="M50 55 Q60 50 70 55" fill="none" stroke="#D4A420" stroke-width="2" marker-end="url(#arr)"/>
    <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#D4A420"/></marker></defs>
    <!-- New key (green) -->
    <circle cx="72" cy="65" r="10" fill="none" stroke="#1E7A46" stroke-width="2.5"/>
    <circle cx="72" cy="65" r="4" fill="none" stroke="#1E7A46" stroke-width="2"/>
    <line x1="80" y1="65" x2="96" y2="65" stroke="#1E7A46" stroke-width="2.5"/>
    <line x1="90" y1="65" x2="90" y2="72" stroke="#1E7A46" stroke-width="2"/>
    <line x1="94" y1="65" x2="94" y2="70" stroke="#1E7A46" stroke-width="2"/>
    <!-- Checkmark -->
    <circle cx="72" cy="65" r="4" fill="#1E7A46" opacity=".3"><animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/></circle>
  </svg>`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  THREAT TYPE ICONS (article cards)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function threatIcon(type, size = 28) {
    const s = size;
    const icons = {
      'Phishing': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="8" width="22" height="18" rx="2" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><polyline points="2,10 13,20 24,10" fill="none" stroke="#C09010" stroke-width="1.2"/><path d="M26 4 Q30 4 30 10 Q30 20 26 20 Q23 20 23 17 Q23 14 26 14 Q28 14 28 10 Q28 7 26 7" fill="none" stroke="#C0392B" stroke-width="2" stroke-linecap="round"/></svg>`,
      'Password & MFA': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="16" width="24" height="14" rx="3" fill="#1a1a1a" stroke="#C09010" stroke-width="1.5"/><path d="M9 16 V10 C9 4 23 4 23 10 V16" fill="none" stroke="#C09010" stroke-width="2"/><circle cx="16" cy="22" r="3" fill="#D4A420"/><rect x="14.5" y="22" width="3" height="4" rx="1.5" fill="#D4A420"/></svg>`,
      'Data Breach': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="20" height="8" rx="2" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><rect x="6" y="14" width="20" height="8" rx="2" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><circle cx="10" cy="8" r="1.5" fill="#C0392B"/><circle cx="10" cy="18" r="1.5" fill="#C0392B"/><path d="M20 24 L26 30" stroke="#C0392B" stroke-width="2" stroke-linecap="round"/><path d="M18 26 L22 22" stroke="#C0392B" stroke-width="2.5" stroke-linecap="round"/></svg>`,
      'Ransomware': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="16" width="24" height="14" rx="3" fill="#1a1a1a" stroke="#C0392B" stroke-width="1.5"/><path d="M9 16 V10 C9 4 23 4 23 10 V16" fill="none" stroke="#C0392B" stroke-width="2"/><text x="16" y="27" text-anchor="middle" font-size="10" fill="#C0392B" font-family="sans-serif">$</text></svg>`,
      'Social Engineering': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="10" r="7" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><circle cx="13" cy="8" r="1.5" fill="#D4A420"/><circle cx="19" cy="8" r="1.5" fill="#D4A420"/><rect x="6" y="19" width="20" height="12" rx="4" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><text x="16" y="14" text-anchor="middle" font-size="5" fill="#C0392B" font-family="sans-serif">?!</text></svg>`,
      'Malware': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="10" fill="#1a1a1a" stroke="#C0392B" stroke-width="1.5"/><circle cx="16" cy="16" r="4" fill="#C0392B" opacity=".6"/><line x1="16" y1="2" x2="16" y2="8" stroke="#C0392B" stroke-width="1.5"/><line x1="16" y1="24" x2="16" y2="30" stroke="#C0392B" stroke-width="1.5"/><line x1="2" y1="16" x2="8" y2="16" stroke="#C0392B" stroke-width="1.5"/><line x1="24" y1="16" x2="30" y2="16" stroke="#C0392B" stroke-width="1.5"/></svg>`,
      'Scam & Fraud': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="13" fill="none" stroke="#C0392B" stroke-width="1.5"/><text x="16" y="21" text-anchor="middle" font-size="14" fill="#C0392B" font-family="sans-serif" font-weight="700">$</text><line x1="6" y1="6" x2="26" y2="26" stroke="#C0392B" stroke-width="2.5"/></svg>`,
      'Vulnerability': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><path d="M16 2 L28 8 V18 C28 25 22 30 16 31 C10 30 4 25 4 18 V8 Z" fill="#1a1a1a" stroke="#C09010" stroke-width="1.5"/><text x="16" y="21" text-anchor="middle" font-size="14" fill="#D4A420" font-family="sans-serif" font-weight="700">!</text></svg>`,
      'Advisory': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="2" width="22" height="28" rx="2" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><line x1="10" y1="8" x2="22" y2="8" stroke="rgba(192,144,16,.3)" stroke-width="1"/><line x1="10" y1="13" x2="22" y2="13" stroke="rgba(192,144,16,.2)" stroke-width="1"/><path d="M18 22 L21 25 L26 19" fill="none" stroke="#D4A420" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      'Insider Threat': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="10" r="7" fill="#1a1a1a" stroke="#888" stroke-width="1.2"/><rect x="6" y="19" width="20" height="12" rx="4" fill="#1a1a1a" stroke="#888" stroke-width="1.2"/><circle cx="16" cy="10" r="7" fill="none" stroke="#C0392B" stroke-width="1.5" stroke-dasharray="2,3"/><line x1="6" y1="4" x2="26" y2="28" stroke="#C0392B" stroke-width="2"/></svg>`,
      'Smishing': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="2" width="16" height="28" rx="4" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><rect x="10" y="6" width="12" height="18" rx="1" fill="#0A0A0A"/><rect x="12" y="9" width="8" height="4" rx="2" fill="#C0392B" opacity=".8"/><rect x="12" y="15" width="9" height="3" rx="1.5" fill="#C0392B" opacity=".5"/><circle cx="16" cy="28" r="1.5" fill="#444"/></svg>`,
      'Vishing': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><path d="M8 26 C3 20 3 12 8 6 L13 10 C9 14 9 18 13 22 Z" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><path d="M18 14 Q22 16 18 18" fill="none" stroke="#C0392B" stroke-width="1.5"/><path d="M20 11 Q26 16 20 21" fill="none" stroke="#C0392B" stroke-width="1"/><circle cx="24" cy="12" r="5" fill="#1a1a1a" stroke="#C0392B" stroke-width="1.2"/><circle cx="22.5" cy="10.5" r="1" fill="#C0392B"/><circle cx="25.5" cy="10.5" r="1" fill="#C0392B"/></svg>`,
      'Security Tips': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><path d="M16 2 L28 8 V18 C28 25 22 30 16 31 C10 30 4 25 4 18 V8 Z" fill="#1a1a1a" stroke="#27AE60" stroke-width="1.5"/><path d="M11 16 L14 19 L21 12" fill="none" stroke="#27AE60" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      'Security News': `<svg viewBox="0 0 32 32" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="24" height="24" rx="3" fill="#1a1a1a" stroke="#C09010" stroke-width="1.2"/><line x1="8" y1="10" x2="24" y2="10" stroke="rgba(192,144,16,.3)" stroke-width="1.5"/><line x1="8" y1="16" x2="24" y2="16" stroke="rgba(192,144,16,.2)" stroke-width="1"/><line x1="8" y1="20" x2="20" y2="20" stroke="rgba(192,144,16,.15)" stroke-width="1"/><line x1="8" y1="24" x2="16" y2="24" stroke="rgba(192,144,16,.1)" stroke-width="1"/></svg>`
    };
    return icons[type] || icons['Security News'];
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  THREAT LEVEL GAUGE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function threatGauge(level = 3, size = 120) {
    const angle = -90 + (level / 5) * 180;
    const colors = ['#4CAF7D', '#8BC34A', '#FFC107', '#E67E22', '#C0392B'];
    const labels = ['LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL'];
    const c = colors[Math.min(level - 1, 4)], l = labels[Math.min(level - 1, 4)];
    return `<svg viewBox="0 0 ${size} ${size * 0.7}" width="${size}" height="${size * 0.7}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tg-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4CAF7D"/><stop offset="25%" stop-color="#8BC34A"/><stop offset="50%" stop-color="#FFC107"/><stop offset="75%" stop-color="#E67E22"/><stop offset="100%" stop-color="#C0392B"/></linearGradient></defs>
      <path d="M ${size*.1} ${size*.58} A ${size*.4} ${size*.4} 0 0 1 ${size*.9} ${size*.58}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="${size*.06}" stroke-linecap="round"/>
      <path d="M ${size*.1} ${size*.58} A ${size*.4} ${size*.4} 0 0 1 ${size*.9} ${size*.58}" fill="none" stroke="url(#tg-a)" stroke-width="${size*.06}" stroke-linecap="round" stroke-dasharray="${size*1.26}" stroke-dashoffset="${size*1.26*(1-level/5)}"/>
      <line x1="${size*.5}" y1="${size*.58}" x2="${size*.5+Math.cos(angle*Math.PI/180)*size*.32}" y2="${size*.58+Math.sin(angle*Math.PI/180)*size*.32}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${size*.5}" cy="${size*.58}" r="${size*.035}" fill="${c}"/>
      <text x="${size*.5}" y="${size*.48}" text-anchor="middle" font-size="${size*.22}" fill="${c}" font-family="'DM Serif Display',Georgia,serif" font-weight="700">${level}</text>
      <text x="${size*.5}" y="${size*.68}" text-anchor="middle" font-size="${size*.065}" fill="${c}" font-family="sans-serif" letter-spacing=".12em" font-weight="700">${l}</text>
    </svg>`;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  DONUT CHART
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function donutChart(data, size = 140) {
    const total = data.reduce((s, d) => s + d.count, 0);
    if (!total) return '';
    const cx = size/2, cy = size/2, r = size*.34, sw = size*.08, circ = 2*Math.PI*r;
    let off = 0;
    const defColors = ['#D4A420','#C0392B','#E67E22','#4CAF7D','#3498DB','#9B59B6','#1ABC9C','#E91E63'];
    const arcs = data.map((d,i) => {
      const pct = d.count/total, dash = circ*pct, gap = circ-dash, color = d.color||defColors[i%defColors.length];
      const a = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;
      off += dash; return a;
    });
    const leg = data.slice(0,6).map((d,i) => {
      const color = d.color||defColors[i%defColors.length];
      return `<text x="${size+12}" y="${18+i*16}" font-size="9" fill="rgba(255,255,255,.7)" font-family="sans-serif"><tspan fill="${color}" font-size="11">â—</tspan> ${d.label} (${d.count})</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${size+120} ${Math.max(size,data.length*16+20)}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${size+120}px">${arcs.join('')}<text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="${size*.16}" fill="white" font-family="'DM Serif Display',Georgia,serif" font-weight="700">${total}</text><text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="${size*.06}" fill="rgba(255,255,255,.4)" font-family="sans-serif" letter-spacing=".1em">ARTICLES</text>${leg}</svg>`;
  }

  function feedStatusDot(ok) {
    const c = ok ? '#4CAF7D' : '#C0392B';
    return `<svg viewBox="0 0 12 12" width="12" height="12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4" fill="${c}" opacity=".3"/><circle cx="6" cy="6" r="2.5" fill="${c}">${ok?'<animate attributeName="opacity" values="1;.5;1" dur="3s" repeatCount="indefinite"/>':''}</circle></svg>`;
  }

  function sparkline(vals, w=80, h=24, color='#D4A420') {
    if (!vals||vals.length<2) return '';
    const max=Math.max(...vals),min=Math.min(...vals),range=max-min||1,step=w/(vals.length-1);
    const pts=vals.map((v,i)=>`${i*step},${h-((v-min)/range)*(h-4)-2}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${(vals.length-1)*step}" cy="${h-((vals[vals.length-1]-min)/range)*(h-4)-2}" r="2" fill="${color}"/></svg>`;
  }

  function particleBackground(containerId) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.35';
    const container = document.getElementById(containerId);
    if (!container) return;
    container.style.position = 'relative';
    container.insertBefore(canvas, container.firstChild);
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];
    function resize() { w = canvas.width = container.offsetWidth; h = canvas.height = container.offsetHeight; }
    function create() { return { x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3, r: Math.random()*1.5+.5, a: Math.random()*.5+.1 }; }
    function init() { resize(); particles = Array.from({length:35}, create); }
    function draw() {
      ctx.clearRect(0,0,w,h);
      particles.forEach((p,i) => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>w) p.vx*=-1; if(p.y<0||p.y>h) p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(192,144,16,${p.a})`; ctx.fill();
        for(let j=i+1;j<particles.length;j++){const p2=particles[j],dx=p.x-p2.x,dy=p.y-p2.y,d=Math.sqrt(dx*dx+dy*dy);if(d<100){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=`rgba(192,144,16,${.08*(1-d/100)})`;ctx.lineWidth=.5;ctx.stroke();}}
      });
      requestAnimationFrame(draw);
    }
    init(); draw(); window.addEventListener('resize', resize);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FORMAT THUMBNAIL PREVIEWS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const FORMAT_THUMBS = {
    poster: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="4" fill="#C09010"/><text x="14" y="22" fill="rgba(212,164,32,.75)" font-size="5" font-family="sans-serif" letter-spacing="2" font-weight="700">PHISHING ALERT</text><text x="14" y="40" fill="white" font-size="14" font-family="Georgia,serif" font-style="italic">Stay Safe</text><rect width="200" height="7" y="48" fill="#C09010"/><text x="100" y="54" fill="white" font-size="4" font-weight="700" text-anchor="middle" font-family="sans-serif" letter-spacing="1.2">âš  DON'T CLICK â€” THINK FIRST</text><defs><linearGradient id="pt1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0A0A0A"/><stop offset="100%" stop-color="#F4EFE7"/></linearGradient></defs><rect x="0" y="55" width="200" height="10" fill="url(#pt1)"/><rect x="14" y="68" width="172" height="28" fill="white" rx="2"/><rect x="14" y="68" width="8" fill="#C0392B" height="28"/><text x="28" y="78" fill="#C0392B" font-size="7" font-family="Georgia,serif">âš </text><text x="38" y="87" fill="#0A0A0A" font-size="5.5" font-family="Georgia,serif">Phishing Scam Targets Staff</text><rect x="14" y="100" width="172" height="18" fill="#0A0A0A" rx="2"/><text x="100" y="112" fill="#D4A420" font-size="6" font-family="Georgia,serif" text-anchor="middle">Think Before You Click!</text></svg>`,
    people: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="4" fill="#C09010"/><circle cx="38" cy="30" r="14" fill="#B8860B"/><circle cx="34" cy="26" r="2.5" fill="#0A0A0A"/><circle cx="42" cy="26" r="2.5" fill="#0A0A0A"/><rect x="22" y="48" width="32" height="26" rx="7" fill="#B8860B"/><circle cx="162" cy="30" r="14" fill="#2E2E2E"/><rect x="146" y="48" width="32" height="26" rx="7" fill="#242424"/><rect x="58" y="18" width="84" height="20" rx="4" fill="#FAF0D7"/><text x="100" y="28" fill="#5A3D00" font-size="5" font-family="sans-serif" text-anchor="middle" font-weight="700">âš  Got a suspicious email?</text><text x="100" y="35" fill="#5A3D00" font-size="4" font-family="sans-serif" text-anchor="middle">Don't click â€” report it!</text><rect x="62" y="44" width="76" height="16" rx="4" fill="#0A0A0A"/><text x="100" y="54" fill="#D4A420" font-size="5" font-family="sans-serif" text-anchor="middle">âœ“ Forward to IT Security</text><rect x="0" y="100" width="200" height="20" fill="#111"/><text x="100" y="113" fill="#B8860B" font-size="5.5" text-anchor="middle" font-family="Georgia,serif" font-style="italic">Stay Safe Together</text></svg>`,
    editorial: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#F4EFE7" rx="3"/><rect width="200" height="3" fill="#B8860B"/><rect x="0" y="3" width="200" height="24" fill="#0A0A0A"/><text x="14" y="19" fill="white" font-family="Georgia,serif" font-size="10" font-style="italic">Security Awareness</text><rect x="0" y="27" width="200" height="7" fill="#B8860B"/><text x="100" y="32" fill="white" font-size="4" font-weight="700" text-anchor="middle" font-family="sans-serif" letter-spacing="1.1">PHISHING & SECURITY TIPS</text><text x="14" y="54" fill="#B8860B" font-size="8" font-family="Georgia,serif">01</text><text x="28" y="57" fill="#0A0A0A" font-size="6" font-family="Georgia,serif">New Email Scam Hits Companies</text><text x="14" y="68" fill="#444" font-size="4" font-family="sans-serif">Check the sender. Think before you click.</text><text x="14" y="100" fill="#888" font-size="3.5" font-family="sans-serif">â€º Never share your password with anyone</text><text x="14" y="108" fill="#888" font-size="3.5" font-family="sans-serif">â€º Turn on two-step login (MFA)</text></svg>`,
    knowbe4: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="4" fill="#E74C3C"/><text x="14" y="18" fill="#E74C3C" font-size="5" font-family="sans-serif" letter-spacing="2" font-weight="700">ðŸŽ£ PHISHING ALERT</text><text x="14" y="36" fill="white" font-size="13" font-family="Georgia,serif">Don't Take <tspan fill="#E74C3C">The Bait</tspan></text><rect width="200" height="7" y="46" fill="#E74C3C"/><text x="100" y="52" fill="white" font-size="4" font-weight="700" text-anchor="middle" font-family="sans-serif" letter-spacing="1">STOP Â· LOOK Â· THINK â€” BEFORE YOU CLICK</text><defs><linearGradient id="kb1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0A0A0A"/><stop offset="100%" stop-color="#FAFAFA"/></linearGradient></defs><rect x="0" y="53" width="200" height="8" fill="url(#kb1)"/><rect x="14" y="64" width="172" height="30" fill="white" rx="4" stroke="#E8E2D0" stroke-width=".5"/><rect x="14" y="64" width="172" height="10" fill="#0A0A0A" rx="4"/><text x="20" y="72" font-size="4.5" fill="#D4A420" font-family="sans-serif" font-weight="700">âš  PHISHING</text><rect x="20" y="78" width="12" height="12" rx="6" fill="#FEF3E0"/><text x="26" y="86" text-anchor="middle" font-size="7" fill="#E67E22">âš </text><text x="38" y="86" font-size="5" fill="#333" font-family="sans-serif">Threat details here...</text><rect x="14" y="98" width="172" height="18" fill="#F0FFF0" rx="4" stroke="#C3E6CB" stroke-width=".5"/><rect x="20" y="102" width="12" height="10" rx="6" fill="#27AE60"/><text x="26" y="110" text-anchor="middle" font-size="7" fill="white">âœ“</text><text x="38" y="110" font-size="5" fill="#1B5E20" font-family="sans-serif" font-weight="600">âœ“ What YOU should do</text></svg>`,
    infographic: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="4" fill="#C0392B"/><text x="100" y="20" text-anchor="middle" fill="white" font-size="9" font-family="Georgia,serif" font-weight="700">ðŸŽ£ Spot the <tspan fill="#C0392B">Phish</tspan></text><rect x="10" y="28" width="55" height="40" rx="5" fill="#1a1a1a" stroke="#C0392B" stroke-width="1"/><text x="37" y="42" text-anchor="middle" font-size="18" fill="#C0392B" font-family="Georgia,serif">91%</text><text x="37" y="55" text-anchor="middle" font-size="4" fill="rgba(255,255,255,.5)" font-family="sans-serif">of attacks start</text><text x="37" y="62" text-anchor="middle" font-size="4" fill="rgba(255,255,255,.5)" font-family="sans-serif">with phishing</text><rect x="72" y="28" width="55" height="40" rx="5" fill="#1a1a1a" stroke="#D4A420" stroke-width="1"/><text x="99" y="42" text-anchor="middle" font-size="18" fill="#D4A420" font-family="Georgia,serif">3.4B</text><text x="99" y="55" text-anchor="middle" font-size="4" fill="rgba(255,255,255,.5)" font-family="sans-serif">phishing emails</text><text x="99" y="62" text-anchor="middle" font-size="4" fill="rgba(255,255,255,.5)" font-family="sans-serif">sent daily</text><rect x="134" y="28" width="56" height="40" rx="5" fill="#1a1a1a" stroke="#1E7A46" stroke-width="1"/><text x="162" y="42" text-anchor="middle" font-size="18" fill="#1E7A46" font-family="Georgia,serif">YOU</text><text x="162" y="55" text-anchor="middle" font-size="4" fill="rgba(255,255,255,.5)" font-family="sans-serif">are the best</text><text x="162" y="62" text-anchor="middle" font-size="4" fill="rgba(255,255,255,.5)" font-family="sans-serif">defence!</text><rect x="10" y="76" width="180" height="36" rx="5" fill="#1a1a1a"/><text x="20" y="90" font-size="5" fill="#C0392B" font-family="sans-serif">âœ—</text><text x="28" y="90" font-size="4.5" fill="white" font-family="sans-serif">Unexpected link?</text><text x="100" y="90" font-size="5" fill="#1E7A46" font-family="sans-serif">âœ“</text><text x="108" y="90" font-size="4.5" fill="white" font-family="sans-serif">Report to IT</text><text x="20" y="104" font-size="5" fill="#C0392B" font-family="sans-serif">âœ—</text><text x="28" y="104" font-size="4.5" fill="white" font-family="sans-serif">Urgent request?</text><text x="100" y="104" font-size="5" fill="#1E7A46" font-family="sans-serif">âœ“</text><text x="108" y="104" font-size="4.5" fill="white" font-family="sans-serif">Verify by phone</text></svg>`,
    quicktips: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="4" fill="#1E7A46"/><text x="100" y="22" text-anchor="middle" fill="#1E7A46" font-size="5" font-family="sans-serif" letter-spacing="2" font-weight="700">QUICK SAFETY TIPS</text><text x="100" y="38" text-anchor="middle" fill="white" font-size="10" font-family="Georgia,serif">5 Rules to <tspan fill="#D4A420">Stay Safe</tspan></text><g transform="translate(16,50)"><circle cx="8" cy="8" r="8" fill="#D4A420"/><text x="8" y="12" text-anchor="middle" font-size="9" fill="#0A0A0A" font-family="Georgia,serif" font-weight="700">1</text><text x="22" y="12" font-size="5" fill="white" font-family="sans-serif">Think before you click</text></g><g transform="translate(16,68)"><circle cx="8" cy="8" r="8" fill="#D4A420"/><text x="8" y="12" text-anchor="middle" font-size="9" fill="#0A0A0A" font-family="Georgia,serif" font-weight="700">2</text><text x="22" y="12" font-size="5" fill="white" font-family="sans-serif">Check the sender</text></g><g transform="translate(16,86)"><circle cx="8" cy="8" r="8" fill="#D4A420"/><text x="8" y="12" text-anchor="middle" font-size="9" fill="#0A0A0A" font-family="Georgia,serif" font-weight="700">3</text><text x="22" y="12" font-size="5" fill="white" font-family="sans-serif">Use strong passwords</text></g><g transform="translate(110,50)"><circle cx="8" cy="8" r="8" fill="#D4A420"/><text x="8" y="12" text-anchor="middle" font-size="9" fill="#0A0A0A" font-family="Georgia,serif" font-weight="700">4</text><text x="22" y="12" font-size="5" fill="white" font-family="sans-serif">Turn on MFA</text></g><g transform="translate(110,68)"><circle cx="8" cy="8" r="8" fill="#D4A420"/><text x="8" y="12" text-anchor="middle" font-size="9" fill="#0A0A0A" font-family="Georgia,serif" font-weight="700">5</text><text x="22" y="12" font-size="5" fill="white" font-family="sans-serif">Report anything odd</text></g></svg>`,
    redflags: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="4" fill="#C0392B"/><text x="100" y="22" text-anchor="middle" fill="white" font-size="10" font-family="Georgia,serif">ðŸš© <tspan fill="#C0392B">Red Flags</tspan> Checklist</text><text x="100" y="34" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="5" font-family="sans-serif">Spot a phishing email in seconds</text><g transform="translate(14,42)"><rect width="172" height="14" rx="3" fill="#1a1a1a" stroke="#C0392B" stroke-width=".8"/><rect width="10" height="14" rx="3" fill="#C0392B" opacity=".2"/><text x="5" y="10" text-anchor="middle" font-size="8" fill="#C0392B">âœ—</text><text x="18" y="10" font-size="5" fill="rgba(255,255,255,.8)" font-family="sans-serif">Sender email looks wrong</text></g><g transform="translate(14,60)"><rect width="172" height="14" rx="3" fill="#1a1a1a" stroke="#C0392B" stroke-width=".8"/><rect width="10" height="14" rx="3" fill="#C0392B" opacity=".2"/><text x="5" y="10" text-anchor="middle" font-size="8" fill="#C0392B">âœ—</text><text x="18" y="10" font-size="5" fill="rgba(255,255,255,.8)" font-family="sans-serif">"URGENT" or "ACT NOW"</text></g><g transform="translate(14,78)"><rect width="172" height="14" rx="3" fill="#1a1a1a" stroke="#C0392B" stroke-width=".8"/><rect width="10" height="14" rx="3" fill="#C0392B" opacity=".2"/><text x="5" y="10" text-anchor="middle" font-size="8" fill="#C0392B">âœ—</text><text x="18" y="10" font-size="5" fill="rgba(255,255,255,.8)" font-family="sans-serif">Asks for password or personal info</text></g><rect x="14" y="98" width="172" height="14" rx="5" fill="#1E7A46"/><text x="100" y="108" text-anchor="middle" font-size="6" fill="white" font-family="sans-serif" font-weight="700">âœ“ When in doubt â€” DON'T CLICK, REPORT IT</text></svg>`,
    stoplook: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="6" fill="url(#slg2)"/><defs><linearGradient id="slg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#C0392B"/><stop offset="50%" stop-color="#E67E22"/><stop offset="100%" stop-color="#27AE60"/></linearGradient></defs><text x="100" y="26" text-anchor="middle" fill="white" font-size="11" font-family="Georgia,serif">Stop Â· Look Â· <tspan fill="#D4A420">Report</tspan></text><rect x="5" y="38" width="60" height="44" rx="4" fill="#C0392B"/><text x="35" y="56" text-anchor="middle" font-size="16" fill="white" font-family="Georgia,serif" font-weight="700">1</text><text x="35" y="68" text-anchor="middle" font-size="6" fill="white" font-weight="700">STOP</text><text x="35" y="77" text-anchor="middle" font-size="3.5" fill="rgba(255,255,255,.8)">Don't click</text><rect x="70" y="38" width="60" height="44" rx="4" fill="#E67E22"/><text x="100" y="56" text-anchor="middle" font-size="16" fill="white" font-family="Georgia,serif" font-weight="700">2</text><text x="100" y="68" text-anchor="middle" font-size="6" fill="white" font-weight="700">LOOK</text><text x="100" y="77" text-anchor="middle" font-size="3.5" fill="rgba(255,255,255,.8)">Check sender</text><rect x="135" y="38" width="60" height="44" rx="4" fill="#27AE60"/><text x="165" y="56" text-anchor="middle" font-size="16" fill="white" font-family="Georgia,serif" font-weight="700">3</text><text x="165" y="68" text-anchor="middle" font-size="6" fill="white" font-weight="700">REPORT</text><text x="165" y="77" text-anchor="middle" font-size="3.5" fill="rgba(255,255,255,.8)">Forward to IT</text><rect x="0" y="88" width="200" height="32" fill="#111" rx="3"/><text x="100" y="108" fill="#D4A420" font-size="5" text-anchor="middle" font-family="sans-serif" font-weight="700">STOP Â· THINK Â· REPORT</text></svg>`,
    emaildissect: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#FAF8F5" rx="3"/><rect width="200" height="5" fill="#C0392B"/><rect x="0" y="5" width="200" height="22" fill="#0A0A0A"/><text x="14" y="14" fill="#C0392B" font-size="4" font-family="sans-serif" letter-spacing="1.5" font-weight="700">PHISHING AWARENESS</text><text x="14" y="24" fill="white" font-size="8" font-family="Georgia,serif">Can You Spot the <tspan fill="#C0392B">Scam?</tspan></text><rect x="14" y="32" width="172" height="44" rx="4" fill="white" stroke="#C0392B" stroke-width="1.2"/><rect x="14" y="32" width="172" height="7" rx="4" fill="#C0392B"/><text x="100" y="37" text-anchor="middle" font-size="3" fill="white" font-weight="700" letter-spacing=".8">âš  SPOT THE RED FLAGS</text><text x="20" y="48" font-size="3" fill="#888">From:</text><text x="36" y="48" font-size="3.5" fill="#C0392B" font-weight="600">support@amaz0n.com</text><rect x="120" y="44" width="26" height="5" rx="2" fill="#FFF0F0"/><text x="133" y="48" text-anchor="middle" font-size="2.5" fill="#C0392B" font-weight="700">ðŸš© FAKE</text><text x="20" y="58" font-size="3" fill="#888">Subject:</text><text x="42" y="58" font-size="3.5" fill="#333" font-weight="600">URGENT: Account locked</text><rect x="120" y="54" width="26" height="5" rx="2" fill="#FFF0F0"/><text x="133" y="58" text-anchor="middle" font-size="2.5" fill="#C0392B" font-weight="700">ðŸš© PANIC</text><rect x="20" y="64" width="40" height="6" rx="2" fill="#C0392B"/><text x="40" y="69" text-anchor="middle" font-size="3.5" fill="white" font-weight="600">Click Here â†’</text><rect x="14" y="82" width="82" height="16" rx="3" fill="#FFF5F5" stroke="#F5C6CB" stroke-width=".5"/><text x="18" y="90" font-size="3" fill="#C0392B" font-weight="700">âœ— Red Flags</text><text x="18" y="95" font-size="2.5" fill="#721C24">Wrong domain, urgency...</text><rect x="102" y="82" width="84" height="16" rx="3" fill="#F0FFF0" stroke="#C3E6CB" stroke-width=".5"/><text x="106" y="90" font-size="3" fill="#27AE60" font-weight="700">âœ“ Your Defence</text><text x="106" y="95" font-size="2.5" fill="#155724">Delete, report, verify...</text><rect x="14" y="104" width="172" height="12" rx="3" fill="#0A0A0A"/><text x="100" y="112" text-anchor="middle" font-size="4" fill="#C0392B" font-weight="700">LEARN TO READ EMAILS LIKE A DETECTIVE</text></svg>`,
    dodont: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#F8F5EF" rx="3"/><rect width="200" height="6" fill="url(#ddg2)"/><defs><linearGradient id="ddg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#C0392B"/><stop offset="100%" stop-color="#27AE60"/></linearGradient></defs><rect x="0" y="6" width="200" height="22" fill="#0A0A0A"/><text x="100" y="21" text-anchor="middle" fill="white" font-size="10" font-family="Georgia,serif">The <tspan fill="#C0392B">Don'ts</tspan> &amp; <tspan fill="#27AE60">Dos</tspan></text><rect x="5" y="34" width="93" height="50" rx="4" fill="white" stroke="#F5C6CB" stroke-width=".8"/><rect x="15" y="38" width="73" height="10" rx="3" fill="#C0392B"/><text x="51" y="45" text-anchor="middle" font-size="5" fill="white" font-weight="700">âœ— DON'T</text><text x="15" y="58" font-size="4" fill="#C0392B" font-weight="700">âœ—</text><text x="22" y="58" font-size="3.5" fill="#721C24">Click unexpected links</text><text x="15" y="66" font-size="4" fill="#C0392B" font-weight="700">âœ—</text><text x="22" y="66" font-size="3.5" fill="#721C24">Share your password</text><text x="15" y="74" font-size="4" fill="#C0392B" font-weight="700">âœ—</text><text x="22" y="74" font-size="3.5" fill="#721C24">Open strange attachments</text><rect x="102" y="34" width="93" height="50" rx="4" fill="white" stroke="#C3E6CB" stroke-width=".8"/><rect x="112" y="38" width="73" height="10" rx="3" fill="#27AE60"/><text x="148" y="45" text-anchor="middle" font-size="5" fill="white" font-weight="700">âœ“ DO</text><text x="112" y="58" font-size="4" fill="#27AE60" font-weight="700">âœ“</text><text x="119" y="58" font-size="3.5" fill="#155724">Check sender address</text><text x="112" y="66" font-size="4" fill="#27AE60" font-weight="700">âœ“</text><text x="119" y="66" font-size="3.5" fill="#155724">Hover before clicking</text><text x="112" y="74" font-size="4" fill="#27AE60" font-weight="700">âœ“</text><text x="119" y="74" font-size="3.5" fill="#155724">Report to IT security</text><rect x="14" y="90" width="172" height="24" rx="4" fill="#0A0A0A"/><text x="100" y="106" text-anchor="middle" font-size="5" fill="#D4A420" font-weight="700">Simple rules to stay safe online</text></svg>`,
    spotlight: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#F8F5EF" rx="3"/><rect width="200" height="5" fill="#D4A420"/><rect x="0" y="5" width="200" height="26" fill="#0A0A0A"/><text x="14" y="16" fill="rgba(212,164,32,.7)" font-size="3.5" font-family="sans-serif" letter-spacing="2" font-weight="700">THREAT SPOTLIGHT</text><text x="14" y="27" fill="white" font-size="9" font-family="Georgia,serif">Know Their <tspan fill="#D4A420">Tricks</tspan></text><text x="14" y="42" fill="#C0392B" font-size="3" font-weight="700" letter-spacing=".5">ðŸŽ­ HOW SCAMMERS TRICK YOU</text><rect x="14" y="46" width="82" height="18" rx="3" fill="white" stroke="#E8E2D8" stroke-width=".5"/><text x="20" y="54" font-size="6">ðŸŽ­</text><text x="29" y="54" font-size="3.5" fill="#0A0A0A" font-weight="600">Impersonation</text><text x="29" y="60" font-size="2.5" fill="#888">Fake boss, bank, IT</text><rect x="102" y="46" width="84" height="18" rx="3" fill="white" stroke="#E8E2D8" stroke-width=".5"/><text x="108" y="54" font-size="6">â°</text><text x="117" y="54" font-size="3.5" fill="#0A0A0A" font-weight="600">Urgency &amp; Fear</text><text x="117" y="60" font-size="2.5" fill="#888">"Act now or else!"</text><text x="14" y="74" fill="#27AE60" font-size="3" font-weight="700" letter-spacing=".5">ðŸ›¡ YOUR DEFENCE</text><rect x="14" y="78" width="172" height="18" rx="3" fill="white" stroke="#C3E6CB" stroke-width=".5"/><circle cx="24" cy="84" r="3" fill="#27AE60"/><text x="24" y="86" text-anchor="middle" font-size="3.5" fill="white" font-weight="700">1</text><text x="30" y="86" font-size="3" fill="#1B5E20">Check sender</text><circle cx="80" cy="84" r="3" fill="#27AE60"/><text x="80" y="86" text-anchor="middle" font-size="3.5" fill="white" font-weight="700">2</text><text x="86" y="86" font-size="3" fill="#1B5E20">Hover links</text><circle cx="130" cy="84" r="3" fill="#27AE60"/><text x="130" y="86" text-anchor="middle" font-size="3.5" fill="white" font-weight="700">3</text><text x="136" y="86" font-size="3" fill="#1B5E20">Report to IT</text><rect x="14" y="102" width="172" height="14" rx="3" fill="#0A0A0A"/><text x="100" y="112" text-anchor="middle" font-size="4.5" fill="#D4A420" font-weight="700">KNOW THE TACTICS Â· SPOT THE SCAM</text></svg>`,
    timeline: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#FAFAFA" rx="3"/><rect width="200" height="5" fill="#C0392B"/><rect x="0" y="5" width="200" height="26" fill="#0A0A0A"/><text x="14" y="16" fill="#C0392B" font-size="4" font-family="sans-serif" letter-spacing="2" font-weight="700">âš  ALERT</text><text x="14" y="27" fill="white" font-size="9" font-family="Georgia,serif">Threats <tspan fill="#C0392B">Right Now</tspan></text><rect width="200" height="5" y="31" fill="#C0392B"/><text x="100" y="35" fill="white" font-size="3" font-weight="700" text-anchor="middle" letter-spacing="1">DON'T IGNORE THIS</text><line x1="24" y1="42" x2="24" y2="98" stroke="#D4A420" stroke-width="1.5"/><circle cx="24" cy="48" r="4" fill="#C0392B"/><text x="32" y="48" font-size="4" fill="#C0392B" font-weight="700">ACTIVE</text><text x="32" y="55" font-size="3.5" fill="#1A1A1A">Phishing emails targeting staff</text><circle cx="24" cy="70" r="4" fill="#D4A420"/><text x="32" y="70" font-size="4" fill="#D4A420" font-weight="700">BE ALERT</text><text x="32" y="77" font-size="3.5" fill="#1A1A1A">New scam campaign detected</text><circle cx="24" cy="92" r="4" fill="#27AE60"/><text x="32" y="92" font-size="4" fill="#27AE60" font-weight="700">STAY AWARE</text><text x="32" y="99" font-size="3.5" fill="#1A1A1A">Follow the safety steps below</text><rect x="14" y="104" width="172" height="12" fill="#0A0A0A" rx="3"/><text x="100" y="112" fill="#D4A420" font-size="4" text-anchor="middle" font-weight="700">YOUR ACTION MATTERS â€” REPORT IT</text></svg>`,
    scorecard: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#F5F0E8" rx="3"/><rect width="200" height="5" fill="#D4A420"/><rect x="0" y="5" width="200" height="26" fill="#0A0A0A"/><text x="14" y="16" fill="#D4A420" font-size="4" font-family="sans-serif" letter-spacing="1.5" font-weight="700">ðŸ† SECURITY CHALLENGE</text><text x="14" y="27" fill="white" font-size="9" font-family="Georgia,serif">Would <tspan fill="#D4A420">You</tspan> Spot It?</text><rect width="200" height="5" y="31" fill="#D4A420"/><text x="100" y="35" fill="white" font-size="3" font-weight="700" text-anchor="middle" letter-spacing="1">READ EACH SCENARIO Â· LEARN THE RIGHT RESPONSE</text><rect x="14" y="42" width="172" height="24" rx="5" fill="white" stroke="#E8E2D8" stroke-width=".5"/><rect x="14" y="42" width="172" height="8" rx="5" fill="#0A0A0A"/><text x="20" y="48" font-size="3" fill="rgba(255,255,255,.4)">SCENARIO 1</text><rect x="20" y="54" width="100" height="6" rx="2" fill="#FFF8E1" stroke="#FFCC80" stroke-width=".3"/><text x="24" y="59" font-size="3" fill="#E65100" font-weight="700">ðŸš© The Threat</text><rect x="126" y="54" width="54" height="6" rx="2" fill="#E8F5E9" stroke="#C3E6CB" stroke-width=".3"/><text x="130" y="59" font-size="3" fill="#2E7D32" font-weight="700">âœ“ Right Move</text><rect x="14" y="72" width="82" height="22" rx="5" fill="#0A0A0A"/><text x="22" y="80" font-size="5">ðŸ“§</text><text x="32" y="80" font-size="3.5" fill="#D4A420" font-weight="600">Check sender</text><text x="32" y="87" font-size="2.5" fill="rgba(255,255,255,.5)">Look at the FULL address</text><rect x="102" y="72" width="84" height="22" rx="5" fill="#0A0A0A"/><text x="110" y="80" font-size="5">ðŸ”‘</text><text x="120" y="80" font-size="3.5" fill="#D4A420" font-weight="600">Unique passwords</text><text x="120" y="87" font-size="2.5" fill="rgba(255,255,255,.5)">Different for every account</text><rect x="14" y="100" width="172" height="14" rx="3" fill="#0A0A0A"/><text x="100" y="110" text-anchor="middle" font-size="4" fill="#D4A420" font-weight="700">TEST YOURSELF WITH REAL SCENARIOS</text></svg>`,
    cybertimes: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#f7f5ef" rx="3"/><rect width="200" height="8" y="0" fill="#0b0b0b"/><rect x="10" y="16" width="180" height="92" fill="#fff" stroke="#0b0b0b" stroke-width="1.2" rx="1"/><line x1="14" y1="28" x2="186" y2="28" stroke="#0b0b0b" stroke-width="1"/><text x="100" y="24" text-anchor="middle" font-size="7" font-family="Georgia,serif" fill="#0b0b0b" letter-spacing="1.5">CYBER SECURITY TIMES</text><rect x="18" y="36" width="118" height="6" fill="#c9a24a" opacity=".35"/><text x="20" y="52" font-size="5" font-family="Georgia,serif" fill="#111" font-weight="700">Lead story</text><rect x="18" y="56" width="164" height="22" fill="#f7f5ef" stroke="#0b0b0b" stroke-width=".8"/><text x="20" y="84" font-size="3.5" fill="#333" font-family="sans-serif">Summary text...</text><rect x="18" y="82" width="52" height="18" fill="#fff" stroke="#0b0b0b" stroke-width=".6"/><rect x="74" y="82" width="52" height="18" fill="#fff" stroke="#0b0b0b" stroke-width=".6"/><rect x="130" y="82" width="52" height="18" fill="#fff" stroke="#0b0b0b" stroke-width=".6"/><rect x="18" y="102" width="164" height="14" fill="#0b0b0b"/><text x="24" y="112" font-size="3.5" fill="#c9a24a" font-family="sans-serif" font-weight="700">Security recommendation</text></svg>`,
    gen_cybershield: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect x="0" y="0" width="200" height="14" fill="#1A1A1A"/><text x="8" y="10" fill="#D4A420" font-size="6" font-family="sans-serif" font-weight="700" letter-spacing="1.5">CYBERSHIELD</text><text x="74" y="10" fill="#FFFFFF" font-size="6" font-family="sans-serif" font-weight="700">SHIELD</text><rect x="0" y="14" width="200" height="1" fill="#D4A420"/><rect x="6" y="18" width="22" height="5" fill="#D4A420"/><text x="17" y="22" text-anchor="middle" fill="#0A0A0A" font-size="3" font-family="sans-serif" font-weight="700">ALERT</text><text x="6" y="32" fill="#FFFFFF" font-size="7" font-family="sans-serif" font-weight="700">STAY SAFE</text><text x="6" y="40" fill="#FFFFFF" font-size="7" font-family="sans-serif" font-weight="700">FROM <tspan fill="#D4A420">RISING</tspan></text><text x="6" y="48" fill="#FFFFFF" font-size="7" font-family="sans-serif" font-weight="700">CYBER THREATS</text><rect x="150" y="18" width="44" height="30" fill="#1A1A1A" stroke="#D4A420" stroke-width=".8"/><text x="172" y="36" text-anchor="middle" fill="#D4A420" font-size="14">&#128737;</text><rect x="0" y="50" width="200" height="1" fill="#1A1A1A"/><rect x="6" y="54" width="6" height="6" fill="#D4A420"/><text x="9" y="59" text-anchor="middle" fill="#0A0A0A" font-size="4" font-family="sans-serif" font-weight="700">01</text><rect x="16" y="56" width="80" height="1.5" fill="#888888"/><rect x="16" y="59" width="60" height="1" fill="#888888"/><rect x="6" y="63" width="6" height="6" fill="#D4A420"/><text x="9" y="68" text-anchor="middle" fill="#0A0A0A" font-size="4" font-family="sans-serif" font-weight="700">02</text><rect x="16" y="65" width="76" height="1.5" fill="#888888"/><rect x="16" y="68" width="64" height="1" fill="#888888"/><rect x="100" y="54" width="44" height="22" fill="#1A1A1A" stroke="#D4A420" stroke-width=".5"/><rect x="100" y="54" width="44" height="2" fill="#D4A420"/><rect x="104" y="59" width="36" height="1.5" fill="#D4A420"/><rect x="104" y="63" width="32" height="1.5" fill="#FFFFFF"/><rect x="104" y="67" width="28" height="1.5" fill="#888888"/><rect x="148" y="54" width="44" height="22" fill="#1A1A1A" stroke="#D4A420" stroke-width=".5"/><rect x="148" y="54" width="44" height="2" fill="#D4A420"/><rect x="152" y="59" width="36" height="1.5" fill="#D4A420"/><rect x="152" y="63" width="32" height="1.5" fill="#FFFFFF"/><rect x="152" y="67" width="28" height="1.5" fill="#888888"/><rect x="0" y="80" width="200" height="1" fill="#1A1A1A"/><rect x="6" y="86" width="58" height="26" fill="#1A1A1A" stroke="#888888" stroke-width=".3"/><rect x="6" y="86" width="58" height="2" fill="#D4A420"/><text x="35" y="100" text-anchor="middle" fill="#D4A420" font-size="9" font-family="sans-serif" font-weight="700">91%</text><text x="35" y="108" text-anchor="middle" fill="#888888" font-size="3" font-family="sans-serif">breaches phishing</text><rect x="70" y="86" width="58" height="26" fill="#1A1A1A" stroke="#888888" stroke-width=".3"/><rect x="70" y="86" width="58" height="2" fill="#D4A420"/><text x="99" y="100" text-anchor="middle" fill="#D4A420" font-size="9" font-family="sans-serif" font-weight="700">$4.9M</text><text x="99" y="108" text-anchor="middle" fill="#888888" font-size="3" font-family="sans-serif">avg breach cost</text><rect x="134" y="86" width="60" height="26" fill="#1A1A1A" stroke="#888888" stroke-width=".3"/><rect x="134" y="86" width="60" height="2" fill="#D4A420"/><text x="164" y="100" text-anchor="middle" fill="#D4A420" font-size="9" font-family="sans-serif" font-weight="700">3.4B</text><text x="164" y="108" text-anchor="middle" fill="#888888" font-size="3" font-family="sans-serif">phish daily</text><rect x="0" y="116" width="200" height="4" fill="#D4A420"/></svg>`,
    gen_chase_email: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#FFFFFF" rx="3"/><rect width="200" height="3" fill="#D4A420"/><rect x="0" y="3" width="200" height="14" fill="#0A0A0A"/><text x="100" y="13" text-anchor="middle" fill="#FFFFFF" font-size="6" font-family="sans-serif" font-weight="700" letter-spacing="1.5">AWARENESS</text><rect x="0" y="17" width="200" height="28" fill="#FFFFFF"/><rect x="92" y="20" width="16" height="16" rx="2" fill="#D4A420"/><text x="100" y="32" text-anchor="middle" fill="#FFFFFF" font-size="9">&#128737;</text><text x="100" y="42" text-anchor="middle" fill="#0A0A0A" font-size="5.5" font-family="Georgia,serif">Review the latest scams</text><rect x="0" y="45" width="200" height="1" fill="#E0DAD0"/><rect x="6" y="48" width="10" height="10" fill="#FFFEFA" stroke="#D4A420" stroke-width=".6"/><rect x="20" y="49" width="80" height="2" fill="#0A0A0A"/><rect x="20" y="53" width="60" height="1.5" fill="#888888"/><rect x="104" y="48" width="10" height="10" fill="#FFFEFA" stroke="#D4A420" stroke-width=".6"/><rect x="118" y="49" width="76" height="2" fill="#0A0A0A"/><rect x="118" y="53" width="58" height="1.5" fill="#888888"/><rect x="6" y="60" width="10" height="10" fill="#FFFEFA" stroke="#D4A420" stroke-width=".6"/><rect x="20" y="61" width="80" height="2" fill="#0A0A0A"/><rect x="20" y="65" width="60" height="1.5" fill="#888888"/><rect x="104" y="60" width="32" height="10" fill="#F8F5EF" stroke="#E0DAD0" stroke-width=".5"/><text x="120" y="68" text-anchor="middle" fill="#C09010" font-size="6">&#9993;</text><rect x="140" y="61" width="54" height="2" fill="#0A0A0A"/><rect x="140" y="65" width="40" height="1.5" fill="#888888"/><rect x="6" y="73" width="28" height="6" fill="#C09010"/><text x="20" y="78" text-anchor="middle" fill="#FFFFFF" font-size="4" font-family="sans-serif" font-weight="700">Scam Alert</text><rect x="34" y="73" width="4" height="6" fill="#D4A420"/><rect x="6" y="82" width="120" height="1.5" fill="#0A0A0A"/><rect x="6" y="86" width="100" height="1.5" fill="#888888"/><rect x="0" y="92" width="200" height="20" fill="#F8F5EF"/><rect x="14" y="95" width="50" height="14" fill="#FFFEFA" stroke="#E0DAD0" stroke-width=".5"/><text x="39" y="103" text-anchor="middle" fill="#D4A420" font-size="6">&#128737;</text><rect x="20" y="105" width="38" height="1.5" fill="#222222"/><rect x="74" y="95" width="50" height="14" fill="#FFFEFA" stroke="#E0DAD0" stroke-width=".5"/><text x="99" y="103" text-anchor="middle" fill="#D4A420" font-size="6">&#128274;</text><rect x="80" y="105" width="38" height="1.5" fill="#222222"/><rect x="134" y="95" width="50" height="14" fill="#FFFEFA" stroke="#E0DAD0" stroke-width=".5"/><text x="159" y="103" text-anchor="middle" fill="#D4A420" font-size="6">&#128269;</text><rect x="140" y="105" width="38" height="1.5" fill="#222222"/><rect x="0" y="112" width="200" height="8" fill="#0A0A0A"/><text x="14" y="118" fill="#D4A420" font-size="3.5" font-family="Georgia,serif" font-weight="700">Awareness</text></svg>`,
    phishingbrief: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><rect width="200" height="120" fill="#0A0A0A" rx="3"/><rect width="200" height="3" fill="#C09010"/><text x="14" y="16" fill="rgba(212,164,32,.75)" font-size="4" font-family="sans-serif" letter-spacing="2" font-weight="700">SECURITY AWARENESS</text><text x="14" y="32" fill="white" font-size="11" font-family="Georgia,serif">Think before <tspan fill="#D4A420" font-style="italic">you click.</tspan></text><rect width="200" height="9" y="38" fill="#C09010"/><text x="100" y="44.5" fill="white" font-size="3.8" font-weight="700" text-anchor="middle" font-family="sans-serif" letter-spacing="1.2">ONE BAD CLICK CAN COST EVERYTHING</text><text x="14" y="58" fill="#D4A420" font-size="5" font-family="sans-serif" font-weight="700">How to spot a fraudulent message</text><circle cx="17" cy="64" r="1.4" fill="#D4A420"/><rect x="22" y="63" width="100" height="2" fill="rgba(255,255,255,.45)" rx="1"/><circle cx="17" cy="69" r="1.4" fill="#D4A420"/><rect x="22" y="68" width="120" height="2" fill="rgba(255,255,255,.45)" rx="1"/><text x="14" y="80" fill="#D4A420" font-size="5" font-family="sans-serif" font-weight="700">What you should remember</text><circle cx="17" cy="86" r="1.4" fill="#D4A420"/><rect x="22" y="85" width="110" height="2" fill="rgba(255,255,255,.45)" rx="1"/><circle cx="17" cy="91" r="1.4" fill="#D4A420"/><rect x="22" y="90" width="90" height="2" fill="rgba(255,255,255,.45)" rx="1"/><rect x="0" y="100" width="200" height="20" fill="#0A0A0A"/><rect x="0" y="100" width="6" height="20" fill="#C09010"/><text x="14" y="108" fill="#D4A420" font-size="3.5" font-family="sans-serif" font-weight="700" letter-spacing="1">SEE SOMETHING SUSPICIOUS?</text><text x="14" y="115" fill="white" font-size="4.5" font-family="Georgia,serif" font-weight="700">Don't Click. Don't Reply. Report It.</text></svg>`
  };

  // â”€â”€ Compact helpers â”€â”€
  function compact(svg, vb, w, h) { return svg.replace(`<svg viewBox="${vb}"`, `<svg viewBox="${vb}" width="${w}" height="${h}"`); }
  function phishEmailCompact(w=95,h=72) { return compact(PHISH_EMAIL,'0 0 130 100',w,h); }
  function shieldLockCompact(w=72,h=82) { return compact(SHIELD_LOCK,'0 0 110 125',w,h); }
  function smishingCompact(w=52,h=78) { return compact(SMISHING,'0 0 80 120',w,h); }
  function dataLeakCompact(w=78,h=70) { return compact(DATA_LEAK,'0 0 110 100',w,h); }
  function mfaCompact(w=85,h=64) { return compact(MFA_ICON,'0 0 120 90',w,h); }
  function peopleCompact(w=130,h=85) { return compact(PEOPLE,'0 0 170 110',w,h); }
  function vishingCompact(w=70,h=70) { return compact(VISHING,'0 0 100 100',w,h); }
  function warningCompact(w=50,h=45) { return compact(WARNING,'0 0 80 72',w,h); }
  function fakeSiteCompact(w=85,h=64) { return compact(FAKE_SITE,'0 0 120 90',w,h); }
  function changePwCompact(w=72,h=65) { return compact(CHANGE_PW,'0 0 100 90',w,h); }

  // Per-template real-image thumbnails. id -> relative path (zip-portable).
  // Any id listed here renders the supplied image; everything else keeps its SVG thumbnail.
  const FORMAT_THUMB_IMAGES = {
    gen_cybershield: 'templates/gen_cybershield/design/thumb.png',
    gen_chase_email: 'templates/gen_chase_email/design/thumb.jpeg',
    bankpage1_dynamic: 'templates/bankpage1_dynamic/design/thumb.jpeg',
    bankpage1_static: 'templates/bankpage1_static/design/thumb.jpeg',
    poster: 'templates/poster/design/thumb.jpeg',
  };

  // If a registered image fails to load (file not dropped in yet, wrong name, etc.), swap the
  // broken <img> for the SVG thumbnail instead of collapsing to an empty card.
  function thumbFallback(img) {
    const id = img.getAttribute('data-thumb-id');
    img.outerHTML = FORMAT_THUMBS[id] || FORMAT_THUMBS.poster;
  }

  // Resolve a picker-card thumbnail: a real image when one is registered, else the SVG (poster fallback).
  function formatThumb(id) {
    if (FORMAT_THUMB_IMAGES[id]) {
      return `<img src="${FORMAT_THUMB_IMAGES[id]}" alt="" loading="lazy" data-thumb-id="${id}" onerror="App.Graphics.thumbFallback(this)">`;
    }
    return FORMAT_THUMBS[id] || FORMAT_THUMBS.poster;
  }

  return {
    PHISH_EMAIL, SHIELD_LOCK, SMISHING, DATA_LEAK, MFA_ICON, PEOPLE, VISHING, WARNING, FAKE_SITE, CHANGE_PW,
    phishEmailCompact, shieldLockCompact, smishingCompact, dataLeakCompact, mfaCompact,
    peopleCompact, vishingCompact, warningCompact, fakeSiteCompact, changePwCompact,
    threatIcon, threatGauge, donutChart, feedStatusDot, sparkline,
    FORMAT_THUMBS, FORMAT_THUMB_IMAGES, formatThumb, thumbFallback, particleBackground
  };
})();
