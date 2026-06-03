const vm = require('vm');
const fs = require('fs');

const context = { window: {}, console, Date };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/utils.js', 'utf8'), context);
context.App.RSSFetcher = { classify: () => 'Security News' };
context.App.Graphics = {};
context.App.AISummarizer = {};
vm.runInContext(fs.readFileSync('js/newsletter_builder.js', 'utf8'), context);

const nb = context.App.NewsletterBuilder;

const cfg = {
  org: 'ACME Corp',
  soc: 'security@acme.com',
  freq: 'Weekly',
  issueDate: new Date(2026, 4, 6),
  nlCorporateTopicBlurb: 'This edition focuses on three active threats targeting enterprise environments — phishing campaigns impersonating senior leaders, a new ransomware variant in the healthcare sector, and a surge in password-spraying attacks. Stay alert and report anything unusual.',
  nlTopicBlurb: 'This week we track three active threats targeting enterprise environments.',
  nlTakeaways: [
    'Never share OTPs over the phone',
    'Use MFA on all critical accounts',
    'Report phishing before deleting',
    'Keep software patched promptly',
    'Verify wire transfers via callback',
    'Lock screen when stepping away'
  ]
};

const arts = [
  {
    title: 'Phishing Wave Hits Finance Teams',
    type: 'Phishing',
    summary: 'Attackers are sending fake CFO emails to trick finance staff into authorising fraudulent wire transfers worth millions.',
    threatLevel: 4,
    url: 'https://example.com/1',
    source: 'BleepingComputer',
    watchouts: ['Verify all wire requests via phone callback', 'Check sender domain carefully before replying']
  },
  {
    title: 'Ransomware Gang Targets Healthcare',
    type: 'Ransomware',
    summary: 'A new ransomware variant is encrypting hospital records and demanding payment before releasing access to patient data.',
    threatLevel: 5,
    url: 'https://example.com/2',
    source: 'Krebs on Security',
    watchouts: ['Back up critical data offline regularly', 'Disconnect infected systems immediately and notify IT']
  },
  {
    title: 'Password Spraying Attacks Surge Across Sector',
    type: 'Password & MFA',
    summary: 'Adversaries are attempting to gain access by trying common passwords across thousands of accounts simultaneously.',
    threatLevel: 3,
    url: 'https://example.com/3',
    source: 'SecurityWeek',
    watchouts: ['Enable MFA on all accounts without exception', 'Use a password manager to ensure unique passwords']
  }
];

const opts = { useLinks: true, usePoster: true, useQR: true, useIllus: true, renderChannel: 'email-safe' };

const wrap = (body, title) =>
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' +
  title + '</title></head><body style="margin:0;padding:20px;background:#DDDDDD;">' + body + '</body></html>';

const corpHtml = nb.build('poster', cfg, arts, opts);
fs.writeFileSync('corp_preview2.html', wrap(corpHtml, 'Corporate Alert - Spacing Fixed'));
console.log('Written: corp_preview2.html');

const testHtml = nb.build('testbrief', cfg, arts, opts);
fs.writeFileSync('test_preview.html', wrap(testHtml, 'Security Dispatch Test Template'));
console.log('Written: test_preview.html');
