const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "../..");

function loadScript(context, relativePath) {
  const filename = path.join(rootDir, relativePath);
  const code = readFileSync(filename, "utf8");
  vm.runInContext(code, context, { filename });
}

function createContext() {
  const context = {
    window: {},
    fetch: async () => ({ ok: false }),
    TextDecoder,
    TextEncoder,
    Uint8Array,
    console,
    setTimeout,
    clearTimeout,
  };
  context.window = context;
  context.App = {
    Utils: {
      log() {},
      truncate(value, limit) {
        return String(value || "").slice(0, limit);
      },
      wait(ms) {
        return new Promise((r) => setTimeout(r, ms));
      },
    },
  };
  return vm.createContext(context);
}

test("sanitizeEmployeeTip rejects scam-voice and URLs", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { sanitizeEmployeeTip } = context.App.AISummarizer;
  assert.equal(sanitizeEmployeeTip("Click here now to verify your account"), "");
  assert.equal(sanitizeEmployeeTip("URGENT! Act now on this link"), "");
  assert.equal(sanitizeEmployeeTip("See https://evil.com for details"), "");
  assert.ok(sanitizeEmployeeTip("Report suspicious emails to IT right away").length > 10);
});

test("stripLeadingGreeting removes leading salutation only at start, preserves body", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { stripLeadingGreeting, sanitizeBankPageIntro } = context.App.AISummarizer;
  assert.equal(
    stripLeadingGreeting("Dear Colleague, attackers are sending..."),
    "attackers are sending..."
  );
  assert.equal(
    stripLeadingGreeting("Hello team: scammers impersonate IT to harvest credentials."),
    "scammers impersonate IT to harvest credentials."
  );
  // Mid-string greeting must not be touched.
  assert.equal(
    stripLeadingGreeting("Attackers wrote 'Dear Colleague, click here' in the lure."),
    "Attackers wrote 'Dear Colleague, click here' in the lure."
  );
  // No greeting: passthrough.
  assert.equal(
    stripLeadingGreeting("Attackers are exploiting CVE-2025-1234 in the wild."),
    "Attackers are exploiting CVE-2025-1234 in the wild."
  );
  // End-to-end through sanitizeBankPageIntro: greeting stripped, first letter recapitalized.
  const intro = sanitizeBankPageIntro(
    "Dear Colleague, attackers are sending fake invoices and demanding fast payment."
  );
  assert.equal(
    intro,
    "Attackers are sending fake invoices and demanding fast payment."
  );
});

test("localNewsletterTakeaways returns edition themes not per-story watchout list", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { localNewsletterTakeaways } = context.App.AISummarizer;
  const articles = [
    {
      type: "Smishing",
      title: "Fake delivery texts",
      watchouts: ["Don't click links in unexpected text messages", "Call the company", "Delete texts"],
    },
    {
      type: "Scam & Fraud",
      title: "PayPal abuse",
      watchouts: ["If it sounds too good to be true, it probably is", "Never buy gift cards", "Report to manager"],
    },
  ];
  const lines = localNewsletterTakeaways(articles);
  assert.ok(lines.length >= 4);
  const joined = lines.join(" ");
  assert.ok(!joined.includes("Don't click links in unexpected text messages"));
  assert.ok(joined.includes("SMS") || joined.toLowerCase().includes("fraud"));
  for (const line of lines) {
    assert.ok(line.length <= 48, `line too long (${line.length}): ${line}`);
    assert.ok(line.split(/\s+/).length <= 8, `too many words: ${line}`);
  }
});

test("sanitizeWatchoutsForArticle drops consumer password clichés for supply chain stories", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { sanitizeWatchoutsForArticle } = context.App.AISummarizer;
  const article = {
    title: "SAP npm package attack highlights risks in developer tools and CI/CD pipelines",
    description: "Malicious npm packages added install-time code that could steal GitHub Actions secrets.",
    type: "Password & MFA",
  };
  const out = sanitizeWatchoutsForArticle(
    [
      "Use a different password for each account",
      "Turn on two-step login MFA everywhere",
      "Change your password if there has been a breach",
    ],
    article
  );
  assert.equal(out.length, 3);
  const blob = out.join(" ").toLowerCase();
  assert.ok(!blob.includes("different password"), blob);
  assert.ok(!blob.includes("each account"), blob);
  assert.ok(!blob.includes("mfa everywhere"), blob);
  assert.ok(/package|lockfile|ci|secret|appsec|npm|dependency|paste repo/i.test(blob), blob);
});

test("mergeNlTakeawaysFromAI filters generic attachment and password lines in supply editions", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { mergeNlTakeawaysFromAI } = context.App.AISummarizer;
  const articles = [
    {
      title: "SAP npm package attack",
      description: "Malicious npm packages in CI/CD pipelines stole tokens.",
      type: "Security News",
    },
    { title: "Ransomware wave", description: "Encryption hits clinics.", type: "Ransomware" },
  ];
  const out = mergeNlTakeawaysFromAI(
    [
      "Avoid unexpected attachments and links",
      "Use different passwords on every account",
      "Review npm dependencies before production deploy",
    ],
    articles
  );
  const joined = out.join(" | ").toLowerCase();
  assert.ok(!joined.includes("attachments"), joined);
  assert.ok(!joined.includes("different password"), joined);
  assert.ok(joined.includes("npm") || joined.includes("depend"), joined);
});

test("localNewsletterTakeaways prefers supply-chain lines when any story is supply chain", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { localNewsletterTakeaways } = context.App.AISummarizer;
  const articles = [
    {
      type: "Ransomware",
      title: "Vect 2.0 wiper",
      description: "Deployed after TeamPCP supply chain incidents.",
    },
    {
      type: "Password & MFA",
      title: "SAP npm package attack highlights CI/CD risks",
      description: "Malicious npm packages stole GitHub Actions secrets.",
    },
  ];
  const lines = localNewsletterTakeaways(articles);
  assert.ok(lines.length >= 4);
  const joined = lines.join(" ").toLowerCase();
  assert.ok(joined.includes("package") || joined.includes("ci") || joined.includes("registry"), joined);
  assert.ok(!joined.includes("avoid unexpected attachments"), joined);
  for (const line of lines) {
    assert.ok(line.length <= 48, line);
    assert.ok(line.split(/\s+/).length <= 8, line);
  }
});

test("sanitizeWatchoutsForArticle replaces unsafe AI tips with safe fallbacks", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { sanitizeWatchoutsForArticle } = context.App.AISummarizer;
  const article = { title: "Phishing campaign", description: "fake email asks users to click", type: "Phishing" };
  const out = sanitizeWatchoutsForArticle(["Click here NOW!!!", "Verify your account immediately", "https://x.com"], article);
  assert.equal(out.length, 3);
  assert.ok(out.every((t) => !/click here/i.test(t)));
});

test("sanitizeTakeawayLine enforces short imperative cap", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { sanitizeTakeawayLine } = context.App.AISummarizer;
  const long = "You should really consider enabling multi-factor authentication on every single account you use for work and personal life";
  const out = sanitizeTakeawayLine(long);
  assert.ok(out.length <= 48);
  assert.ok(out.split(/\s+/).length <= 8);
});

test("generateTips matches story topic for payment abuse", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { generateTips } = context.App.AISummarizer;
  const tips = generateTips({
    title: "PayPal invoices abused to push tech support scams",
    description: "Attackers send fake PayPal invoices so victims call rogue support numbers.",
    type: "Scam & Fraud",
  });
  const blob = tips.join(" ").toLowerCase();
  assert.ok(blob.includes("paypal") || blob.includes("invoice") || blob.includes("payment"));
});

test("finalizeEmployeeSummary strips filler and respects character cap", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { finalizeEmployeeSummary } = context.App.AISummarizer;
  const raw =
    "It is important to note that attackers used fake invoices. Remember that staff should verify payment requests.";
  const out = finalizeEmployeeSummary(raw, { summaryMaxChars: 120 });
  assert.ok(!/it is important to note/i.test(out));
  assert.ok(!/remember that/i.test(out));
  assert.ok(out.length <= 120);
});

test("dedupeWatchoutsAcrossArticles avoids repeating the same line across stories", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { dedupeWatchoutsAcrossArticles } = context.App.AISummarizer;
  const dup = "Do not click links in unexpected work emails";
  const a1 = {
    title: "Phish A",
    description: "email scam",
    type: "Phishing",
    watchouts: [dup, "Check the full sender address before you reply", "Report phishing using your company process"],
  };
  const a2 = {
    title: "Phish B",
    description: "another campaign",
    type: "Phishing",
    watchouts: [dup, "Hover or long-press links before you tap them", "Forward phishing samples to IT using their process"],
  };
  dedupeWatchoutsAcrossArticles([a1, a2]);
  assert.equal(a1.watchouts.filter((w) => w === dup).length, 1);
  assert.equal(a2.watchouts.filter((w) => w === dup).length, 0);
  assert.equal(a2.watchouts.length, 3);
});

test("generateTips falls back to type-aligned tips when corpus is vague", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { generateTips } = context.App.AISummarizer;
  const tips = generateTips({
    title: "Weekly digest q7f9k2",
    description: "Miscellaneous items without specific threat keywords.",
    type: "Smishing",
  });
  const blob = tips.join(" ").toLowerCase();
  assert.ok(blob.includes("text") || blob.includes("sms") || blob.includes("ignore"));
});

test("finalizeEmployeeSummary removes hype marks and respects length cap", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { finalizeEmployeeSummary } = context.App.AISummarizer;
  const cfg = { summaryMaxChars: 90 };
  const out = finalizeEmployeeSummary("Attackers use fake invoices! Staff should verify requests calmly. Extra filler sentence here.", cfg);
  assert.ok(!out.includes("!"), out);
  assert.ok(out.length <= 90, String(out.length));
});

test("generateTips matches developer supply chain stories not consumer password churn", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { generateTips } = context.App.AISummarizer;
  const tips = generateTips({
    title: "SAP npm package attack highlights risks in developer tools and CI/CD pipelines",
    description:
      "Malicious versions added installation-time code that could steal developer credentials, GitHub and npm tokens, GitHub Actions secrets, and cloud credentials from AWS, Azure, GCP, and Kubernetes environments.",
    type: "Password & MFA",
  });
  const blob = tips.join(" ").toLowerCase();
  assert.ok(
    /lockfile|package|secret|deploy|appsec|ci\/cd|pipeline|npm|github action|dependency/.test(blob),
    `expected engineering-oriented tips, got: ${tips.join(" | ")}`
  );
  assert.ok(!/change your password for that service|two-step login on your accounts|unusual activity on your accounts/i.test(blob));
});

test("previewArticleCurationPrompts exposes system and user strings for the live summarize contract", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { previewArticleCurationPrompts } = context.App.AISummarizer;
  const pre = previewArticleCurationPrompts(
    { title: "T", source: "S", pubDate: "2026-01-01", description: "Body text for the lab.", type: "Security News" },
    { mode: "balanced" }
  );
  assert.ok(pre.systemPrompt.includes("WATCHOUTS"));
  assert.ok(pre.userPrompt.includes("Body text for the lab."));
  assert.ok(pre.userPrompt.includes("balanced"));
  assert.equal(pre.mode, "balanced");
});

test("mojibake repair restores arrow from common UTF-8 misread", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { sanitizeEmployeeTip } = context.App.AISummarizer;
  const utf8ArrowAsLatin1 = `Go here ${String.fromCharCode(0xe2, 0x86, 0x92)} then stop`;
  const fixed = sanitizeEmployeeTip(utf8ArrowAsLatin1, 120);
  assert.ok(fixed.includes("\u2192"), `expected arrow in: ${fixed}`);
});

test("fillNewsletterTextSlots (dodont, local) biases donts to supply chain when stories mention npm CI", async () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { fillNewsletterTextSlots } = context.App.AISummarizer;
  const slots = await fillNewsletterTextSlots(
    "dodont",
    [
      {
        type: "Security News",
        title: "Malicious npm versions target CI secrets",
        description:
          "Attackers published compromised npm packages that run install scripts to harvest GitHub Actions tokens and registry credentials.",
        watchouts: ["Review dependency PRs before merge", "Use vault-backed CI secrets only", "Report odd package installs to AppSec"],
      },
    ],
    { forceLocal: true, mode: "balanced" }
  );
  assert.equal(slots.nlDoDontDos.length, 6);
  assert.equal(slots.nlDoDontDonts.length, 6);
  const blob = slots.nlDoDontDonts.join(" ").toLowerCase();
  assert.ok(/lockfile|token|npm|ci|secret|package|install|registry/.test(blob), blob);
});

test("fillNewsletterTextSlots (spotlight, local) returns tactics and defence lines", async () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { fillNewsletterTextSlots } = context.App.AISummarizer;
  const slots = await fillNewsletterTextSlots(
    "spotlight",
    [{ title: "Ransomware wave hits clinics", description: "Encryption and recovery guidance for staff.", type: "Ransomware" }],
    { forceLocal: true }
  );
  assert.equal(slots.nlSpotlightTactics.length, 4);
  assert.ok(slots.nlSpotlightTactics[0].tactic.length > 3);
  assert.equal(slots.nlSpotlightDefenceLines.length, 6);
});

test("fillNewsletterTextSlots (poster, local) sets nlCorporateTopicBlurb from edition themes", async () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { fillNewsletterTextSlots } = context.App.AISummarizer;
  const slots = await fillNewsletterTextSlots(
    "poster",
    [
      {
        type: "Ransomware",
        title: "Regional hospitals see Conti-style encryption surge",
        description: "Incident response teams report faster lateral movement before payload deployment.",
      },
    ],
    { forceLocal: true }
  );
  assert.ok(slots.nlCorporateTopicBlurb.length > 40);
  assert.ok(/ransomware/i.test(slots.nlCorporateTopicBlurb));
  assert.ok(/\./.test(slots.nlCorporateTopicBlurb));
  assert.ok(/edition focuses on|priority themes for this send/i.test(slots.nlCorporateTopicBlurb), slots.nlCorporateTopicBlurb);
  assert.equal(slots.nlCorporateTopicHeading, "Edition focus");
});

test("previewNewsletterTemplateSlotsPrompts returns split Do vs Don't user prompts for dodont", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { previewNewsletterTemplateSlotsPrompts } = context.App.AISummarizer;
  const pre = previewNewsletterTemplateSlotsPrompts(
    "dodont",
    [{ title: "T", type: "Phishing", summary: "S", description: "" }],
    { mode: "balanced" }
  );
  assert.ok(pre.userPrompt.includes('"dos"'));
  assert.ok(pre.userPrompt.includes('"donts"'));
  assert.ok(pre.userPromptDos.includes("request 1 of 2"));
  assert.ok(pre.userPromptDos.includes('"dos"'));
  assert.ok(pre.userPromptDonts.includes("request 2 of 2"));
  assert.ok(pre.userPromptDonts.includes('"donts"'));
  assert.ok(pre.systemPrompt.length > 20);
});

test("previewNewsletterTemplateSlotsPrompts returns split spotlight user prompts", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { previewNewsletterTemplateSlotsPrompts } = context.App.AISummarizer;
  const pre = previewNewsletterTemplateSlotsPrompts(
    "spotlight",
    [{ title: "T", type: "Ransomware", summary: "S", description: "" }],
    { mode: "balanced" }
  );
  assert.ok(pre.userPromptTactics.includes("request 1 of 2"));
  assert.ok(pre.userPromptTactics.includes('"tactics"'));
  assert.ok(pre.userPromptDefence.includes("request 2 of 2"));
  assert.ok(pre.userPromptDefence.includes('"defenceLines"'));
});

test("previewNewsletterTemplateSlotsPrompts poster requests nlCorporateTopicBlurb JSON", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { previewNewsletterTemplateSlotsPrompts } = context.App.AISummarizer;
  const pre = previewNewsletterTemplateSlotsPrompts(
    "poster",
    [{ title: "Clinic ransomware wave", type: "Ransomware", summary: "Encryption and recovery.", description: "" }],
    { mode: "balanced" }
  );
  assert.ok(pre.userPrompt.includes("nlCorporateTopicBlurb"));
  assert.ok(pre.userPrompt.includes("Edition focus"));
  assert.ok(pre.userPrompt.includes("edition focus"));
  assert.ok(pre.userPrompt.includes("Corporate Alert"));
});

test("scoreBankPageIntro rewards 2-3 sentences in the target word range with a capital start", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { scoreBankPageIntro } = context.App.AISummarizer;
  const good = scoreBankPageIntro(
    "Attackers are sending fake delivery texts to harvest login details. The links lead to lookalike sites that steal information. Verify any unexpected text directly with the company."
  );
  const onlyOneSentence = scoreBankPageIntro(
    "Attackers are sending fake delivery texts to harvest login details and other personal information from staff this week."
  );
  assert.ok(good.score > onlyOneSentence.score, `good=${good.score} onlyOne=${onlyOneSentence.score}`);
  assert.ok(good.value.startsWith("Attackers"));
});

test("scoreBankPageIntro penalises forbidden phrases and URLs", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { scoreBankPageIntro } = context.App.AISummarizer;
  const clean = scoreBankPageIntro(
    "Attackers are sending fake delivery texts to harvest login details. Verify any unexpected text directly."
  );
  const withForbidden = scoreBankPageIntro(
    "Attackers are sending fake delivery texts to harvest credentials. Verify any unexpected text directly."
  );
  const withUrl = scoreBankPageIntro(
    "Attackers are sending fake delivery texts to harvest login details. See https://evil.example.com for details."
  );
  assert.ok(clean.score > withForbidden.score, `clean=${clean.score} forbidden=${withForbidden.score}`);
  assert.ok(clean.score > withUrl.score, `clean=${clean.score} url=${withUrl.score}`);
});

test("scoreBankPageIntro returns 0 score for empty or unparseable input", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { scoreBankPageIntro } = context.App.AISummarizer;
  assert.equal(scoreBankPageIntro("").score, 0);
  assert.equal(scoreBankPageIntro(null).score, 0);
  assert.equal(scoreBankPageIntro("too short").score, 0);
});

test("scoreBankPageBullets rewards exact count and short bullets under the cap", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { scoreBankPageBullets } = context.App.AISummarizer;
  const fourGood = scoreBankPageBullets(
    [
      "Sender address does not match the company domain it claims",
      "Message demands you reply within an hour or lose access",
      "Link preview shows a lookalike domain, not the real site",
      "Attachment is a generic invoice you did not request"
    ],
    4,
    110
  );
  const threeOnly = scoreBankPageBullets(
    [
      "Sender address does not match the claimed domain",
      "Message demands urgent reply within one hour",
      "Link preview shows lookalike domain not real site"
    ],
    4,
    110
  );
  assert.ok(fourGood.score > threeOnly.score, `four=${fourGood.score} three=${threeOnly.score}`);
  assert.equal(fourGood.value.length, 4);
});

test("scoreBankPageBullets penalises duplicates within a group", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { scoreBankPageBullets } = context.App.AISummarizer;
  const distinct = scoreBankPageBullets(
    [
      "Verify any unexpected delivery text with the courier directly",
      "Report suspicious texts through the IT security channel",
      "Block unknown senders on your mobile carrier app"
    ],
    3,
    110
  );
  const withDupes = scoreBankPageBullets(
    [
      "Verify any unexpected delivery text with the courier directly",
      "Verify any unexpected delivery text with the courier directly",
      "Block unknown senders on your mobile carrier app"
    ],
    3,
    110
  );
  assert.ok(distinct.score > withDupes.score, `distinct=${distinct.score} dupes=${withDupes.score}`);
});

test("scoreBankPageBullets penalises forbidden phrases across the group", () => {
  const context = createContext();
  loadScript(context, "js/ai/prompts.js");
  loadScript(context, "js/ai/local_fallbacks.js");
  loadScript(context, "js/ai_summarizer.js");
  const { scoreBankPageBullets } = context.App.AISummarizer;
  const clean = scoreBankPageBullets(
    [
      "Sender address does not match the company domain it claims",
      "Message demands urgent reply within one hour",
      "Link preview shows lookalike domain not real site",
      "Attachment is a generic invoice you did not request"
    ],
    4,
    110
  );
  const withForbidden = scoreBankPageBullets(
    [
      "Stay vigilant against suspicious emails from threat actors today",
      "Message demands urgent reply within one hour",
      "Link preview shows lookalike domain not real site",
      "Attachment is a generic invoice you did not request"
    ],
    4,
    110
  );
  assert.ok(clean.score > withForbidden.score, `clean=${clean.score} forbidden=${withForbidden.score}`);
});
