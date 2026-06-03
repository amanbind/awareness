const fixtureArticles = [
  {
    title: "Employees targeted by QR phishing campaign",
    source: "Fixture Security News",
    sourceId: "fixture",
    url: "https://example.test/qr-phishing",
    description: "Attackers used QR codes in fake email messages to steal credentials from employees.",
    summary: "A QR phishing campaign is targeting employee credentials.",
    watchouts: ["Verify QR links before scanning.", "Report suspicious login prompts."],
    pubDate: "2026-04-20",
    type: "Phishing",
    threatLevel: 4,
    relevanceScore: 35,
    tier: 1,
    aiProcessed: false,
  },
  {
    title: "Password reset scam impersonates IT help desk",
    source: "Fixture Awareness Feed",
    sourceId: "fixture",
    url: "https://example.test/password-reset-scam",
    description: "A fake help desk message asks staff to reset passwords through a look-alike page.",
    summary: "A fake IT help desk flow is harvesting passwords.",
    watchouts: ["Use the official portal.", "Check the sender before acting."],
    pubDate: "2026-04-19",
    type: "Password & MFA",
    threatLevel: 3,
    relevanceScore: 30,
    tier: 2,
    aiProcessed: false,
  },
];

module.exports = { fixtureArticles };

