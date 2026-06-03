(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;

  function corpusForTips(article) {
    return (article.title + ' ' + (article.description || '') + ' ' + (article.summary || '')).toLowerCase();
  }

  /** Corpus signals for npm / PyPI / CI / dev-token supply-chain risk (shared by generateTips, guards, edition logic). */
  const SUPPLY_CHAIN_CORPUS_MARKERS = [
    'supply chain', 'supply-chain', 'npm package', 'npm packages', 'malicious package', 'compromised package',
    'package.json', 'github actions', 'github action secrets', 'ci/cd', 'ci cd', 'build pipeline',
    'npm registry', 'pypi', 'rubygems', 'typosquat', 'postinstall', 'post-install', 'install script',
    'shai-hulud', 'shai hulud', 'sap bas', 'sap cloud sdk', 'developer credential', 'npm token',
    'registry token', 'kubernetes secret', 'sbom', 'software bill of materials', 'third-party package',
    'malware in npm', 'team pcp', 'teampcp', 'safe dep', 'safedep', 'aikido security', 'wiz research',
    'malicious versions', 'compromised npm', 'javascript ecosystem', 'vsix',
    'vscode extension', 'registry.npmjs', 'install-time code', 'github actions secrets', 'internal registry'
  ];

  function isSoftwareSupplyChainStory(article) {
    if (!article) return false;
    const t = corpusForTips(article);
    return SUPPLY_CHAIN_CORPUS_MARKERS.some((m) => t.includes(m));
  }

  function editionHasSupplyChain(articles = []) {
    const list = Array.isArray(articles) ? articles : [];
    return list.some((a) => a && isSoftwareSupplyChainStory(a));
  }

  const SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS = [
    'Verify dependency updates and lockfiles before production deploys',
    'Never paste repo, CI, npm, or cloud secrets into chat or email',
    'Report odd package installs or CI token alerts to AppSec or IT'
  ];

  /** When no keyword rule matches: align with article.type so tips are not random. */
  function defaultTipsForType(article) {
    if (isSoftwareSupplyChainStory(article)) return [...SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS];
    const typ = String(article.type || 'Security News').toLowerCase();
    if (typ.includes('phish')) {
      return ['Verify odd email requests using a channel you trust', 'Hover or long-press links before you tap them', 'Forward phishing samples to IT using their process'];
    }
    if (typ.includes('smish')) {
      return ['Ignore delivery or bank texts you were not expecting', 'Open shipper or bank sites only from URLs you type', 'Screenshot and report smishing texts to IT'];
    }
    if (typ.includes('breach') || typ.includes('data')) {
      return ['Change passwords you reused on other sites', 'Watch accounts for odd logins or charges', 'Turn on MFA where the breached service allows it'];
    }
    if (typ.includes('malware') || typ.includes('ransomware')) {
      return ['Do not open attachments you did not expect', 'Tell IT if files change extension or look encrypted', 'Keep backups only on approved company storage'];
    }
    if (typ.includes('scam') || typ.includes('fraud')) {
      return ['Slow down when someone pushes fast payment or secrecy', 'Confirm money asks with a separate call you start', 'Report gift-card or wire scams to IT right away'];
    }
    if (typ.includes('password') || typ.includes('mfa')) {
      return ['Turn on MFA on accounts that offer it', 'Use unique passwords with your approved password tool', 'Never share one-time codes with callers or chat'];
    }
    if (typ.includes('vulnerab') || typ.includes('advisory') || typ.includes('security news')) {
      return ['Install patches when IT or your device prompts you', 'Report odd software behavior or install prompts to IT', 'Use only approved stores and packages for work tools'];
    }
    return ['Stay alert — if something feels off, report it', 'Never share passwords or login codes with anyone', 'When in doubt, ask IT before you click'];
  }

  // ── Safety tips in PLAIN ENGLISH (ordered: more specific rules first) ──
  function generateTips(article) {
    const t = corpusForTips(article);
    const rules = [
      {
        match: SUPPLY_CHAIN_CORPUS_MARKERS,
        tips: SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS
      },
      {
        match: ['business email compromise', 'bec', 'ceo fraud', 'vendor email fraud', 'fake vendor', 'supplier fraud', 'wire instruction', 'bank account change'],
        tips: ['Confirm wire or vendor bank changes by phone you dial', 'Ignore pressure to skip normal finance checks', 'Use saved finance numbers, not ones from the email alone']
      },
      {
        match: ['paypal', 'venmo', 'zelle', 'fake invoice', 'invoice scam', 'payment request fraud', 'bogus invoice'],
        tips: ['Log into PayPal or banking from bookmarks you saved', 'Verify odd invoices with finance on a known number', 'Treat payment links in email as suspect until confirmed']
      },
      {
        match: ['tech support scam', 'fake tech support', 'remote access scam', 'anydesk', 'teamviewer', 'pop-up virus', 'fake microsoft'],
        tips: ['Never call support numbers shown only in pop-ups', 'Get help through your employer official IT channel', 'Close fake virus pages and report them to IT if they return']
      },
      {
        match: ['malvertising', 'rogue ad', 'google ads malware', 'search poisoning'],
        tips: ['Download software only from the vendor site you looked up', 'Avoid sponsored download buttons that look unofficial', 'Ask IT before installing helpers found through search ads']
      },
      {
        match: ['deepfake', 'voice clone', 'synthetic media', 'ai-generated voice'],
        tips: ['Verify voice or video payment asks with a callback you start', 'Use an agreed finance code word for large wires if your org has one', 'Report deepfake or fake exec calls to IT right away']
      },
      {
        match: ['fedex', 'dhl', 'ups', 'missed delivery', 'package delivery', 'delivery text', 'parcel scam'],
        tips: ['Ignore delivery texts when you are not expecting a package', 'Track orders only on the store or shipper site you trust', 'Report texts asking for card or login details to IT']
      },
      {
        match: ['smishing', 'sms phish', 'text message scam', 'text scam', 'whatsapp scam', 'telegram scam'],
        tips: ['Do not tap links in unexpected personal texts', 'Never share one-time codes or passwords over SMS or chat', 'Call the company using a number from their official site']
      },
      {
        match: ['vishing', 'voice phish', 'phone scam', 'scam call', 'fake call center'],
        tips: ['Hang up on callers asking for passwords or codes', 'Call back using a number from the company website', 'Never install remote access software for unknown callers']
      },
      {
        match: ['qr code', 'quishing', 'malicious qr'],
        tips: ['Do not scan QR codes from stickers or flyers you do not trust', 'Check the URL after scan before you log in', 'Report odd QR codes in the workplace to IT']
      },
      {
        match: ['session hijack', 'cookie steal', 'oauth token', 'token theft'],
        tips: ['Sign out of sensitive sites on shared or hotel computers', 'Clear site data on borrowed devices after use', 'Report repeated unexpected logouts to IT']
      },
      {
        match: ['gift card', 'itunes card', 'steam wallet', 'prepaid card scam'],
        tips: ['Refuse requests to buy gift cards for strangers or bosses', 'Know your employer will not ask for gift card payment', 'Report gift-card pressure scams to IT immediately']
      },
      {
        match: ['phish', 'fake email', 'suspicious email', 'spoof', 'spear phish'],
        tips: ['Do not click links in unexpected work emails', 'Check the full sender address before you reply', 'Report phishing using your company process']
      },
      {
        match: [
          'data breach', 'breach notification', 'records leaked', 'customer records', 'personal data exposed',
          'database breach', 'user data stolen', 'credential dump', 'password dump', 'data dump of',
          'information leak', 'millions of customers', 'customer data stolen', 'accounts compromised en masse'
        ],
        tips: ['Change passwords for affected services and reused logins', 'Turn on MFA where the service still allows it', 'Watch bank and work accounts for odd activity']
      },
      {
        match: ['password reuse', 'credential stuffing', 'brute force', 'stolen password', 'weak password', 'password dump'],
        tips: ['Use a different password for each important account', 'Turn on two-step login where it is offered', 'Change passwords if a service you use was breached']
      },
      {
        match: [
          'mfa fatigue', 'mfa bombing', 'mfa bypass', 'otp bombing', 'push bombing mfa', 'bypass multi-factor',
          'mandatory mfa', 'enforce mfa', 'mfa enrollment', 'roll out mfa', 'require two-factor',
          'two-factor authentication policy', 'multi-factor authentication policy', 'phishing-resistant mfa'
        ],
        tips: ['Turn on two-step login on accounts that support it', 'Never share login codes with callers or chat agents', 'Prefer an authenticator app over SMS when you can']
      },
      {
        match: ['ransomware', 'encrypt', 'ransom', 'locked files', 'file extension'],
        tips: ['Do not open unexpected email attachments', 'Tell IT right away if files look renamed or encrypted', 'Save important work only to approved backup locations']
      },
      {
        match: ['malware', 'trojan', 'virus', 'spyware', 'infostealer'],
        tips: ['Only install apps from official stores or IT-approved sources', 'Keep your work device updated when prompted', 'Tell IT if the browser or PC acts slow or strange']
      },
      {
        match: ['social engineer', 'impersonat', 'pretexting', 'pig butchering'],
        tips: ['Verify who you are talking to before sharing sensitive info', 'Do not trust callers only because they know your name', 'Check unusual requests with your manager or IT']
      },
      {
        match: ['scam', 'fraud', 'fake website', 'counterfeit shop'],
        tips: ['If an offer feels too good to be true, pause and verify', 'Pay only on sites you reached by typing the address', 'Report fraud attempts to IT using their template']
      },
      {
        match: ['clickfix', 'browser pop', 'fake error', 'paste command', 'powershell scam'],
        tips: ['Never paste commands from pop-up or chat instructions', 'Real IT will not ask you to disable security to fix errors', 'Close the tab and open a ticket with your real IT team']
      },
      {
        match: ['zero-day', '0-day', 'n-day', 'patch tuesday', 'security update'],
        tips: ['Apply security patches on work devices when IT tells you to', 'Restart after updates if your device asks', 'Report crashes after patching so IT can help']
      }
    ];

    for (const rule of rules) {
      if (rule.match.some(m => t.includes(m))) return rule.tips;
    }
    return defaultTipsForType(article);
  }

  function estimateLevel(article) {
    const t = corpusForTips(article);
    let lv = 2;
    if (t.includes('zero-day') || t.includes('0-day')) lv += 2;
    if (t.includes('active') && (t.includes('exploit') || t.includes('attack'))) lv += 1;
    if (t.includes('critical') || t.includes('urgent')) lv += 1;
    if (t.includes('phish') || t.includes('credential')) lv += 1;
    if (t.includes('ransomware')) lv += 1;
    if (t.includes('breach') || t.includes('leak')) lv += 1;
    if (t.includes('patch') && t.includes('available')) lv -= 1;
    return Math.max(1, Math.min(5, lv));
  }

  /** Latin-1–misread UTF-8 repair (common in email copy/paste). */
  function tryRepairMojibakeUtf8(s) {
    const str = String(s || '');
    if (!str.includes('â') && !str.includes('Ã')) return str;
    try {
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
      const fixed = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (fixed.includes('�')) return str;
      if (fixed && fixed !== str) return fixed;
    } catch (_e) { /* ignore */ }
    return str;
  }

  W.AILocalFallbacks = {
    corpusForTips,
    isSoftwareSupplyChainStory,
    editionHasSupplyChain,
    defaultTipsForType,
    generateTips,
    estimateLevel,
    tryRepairMojibakeUtf8,
    SUPPLY_CHAIN_CORPUS_MARKERS,
    SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS
  };
})();
