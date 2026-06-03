# Phishing & Security Awareness — Newsletter Generator

Turn **live security news** into **employee-ready awareness content** in minutes. No server required: open the page in a browser, fetch curated feeds, pick stories, and export polished HTML for email or your intranet.

---

## Who it’s for

- **Security / GRC teams** who run weekly or monthly awareness bulletins  
- **IT and SOC** who want timely, credible stories without writing from scratch  
- **MSPs and consultants** who deliver awareness programs for clients  

---

## What it does

| Capability | Why it matters |
|------------|----------------|
| **35 trusted RSS sources** | Government CERTs (CISA, NCSC, ENISA, etc.), major vendors, and security journalism — one place instead of dozens of bookmarks. |
| **Data-privacy & employee filter** | Keeps stories aligned with **people risk**: phishing, scams, MFA, breaches, social engineering, privacy — not raw CVE-only advisories. You see how many items matched vs. total in each feed. |
| **Local database (IndexedDB)** | Articles persist for **up to 90 days** with deduplication. **Load from DB** when you’re offline or want to reuse past pulls. |
| **Smart summaries** | Optional **Claude or OpenAI** for plain-language summaries and tips, or **built-in local summaries** when you don’t use an API key. |
| **14 newsletter templates** | Email-safe layouts aligned with the standalone pack in `templates/imported-standalone/` (warm outer band, elevated card, Arial/Georgia stacks at send time), plus digest and test variants — with your **org name, SOC email, portal link, and classification** baked in. |
| **QR codes & report CTAs** | Optional portal QR and “report suspicious” blocks so every send drives **real behavior**. |

---

## How you use it (workflow)

1. **Configure** — Org name, SOC mailbox, awareness portal URL, frequency, and how many stories per send.  
2. **Fetch Live News** — Parallel fetch with fallbacks (proxies + RSS bridges) for feeds that are hard to reach from the browser.  
3. **Filter by date** — 7 / 14 / 30 / 90 days or all stored.  
4. **Select articles** — Up to your chosen limit; optional type chips (Phishing, Data Breach, etc.).  
5. **Generate** — Preview HTML, copy to clipboard, paste into Outlook, Google Workspace, or your CMS.  

---

## Tech at a glance

- **Single-page app**: `index.html` + vanilla JavaScript modules (no build step).  
- **IndexedDB** for storage and merge-friendly **upserts** (summaries and tips stay saved).  
- **SVG graphics** for threat-type illustrations in the builder.  

---

## Privacy & trust (talking points for promotion)

- **Your API keys** (if used) stay in **your browser**; there is no vendor backend in this repo.  
- **Curation is explicit**: the product is honest that it filters for **employee-relevant** and **data-privacy** angles — so stakeholders trust you’re not spamming staff with patch-only noise.  
- **Portable**: works as a static site; suitable for air-gapped or internal hosting if you add your own fetch path later.  

---

## Quick start

1. Clone or download this folder.  
2. Open **`index.html`** in a modern browser (or serve the folder with any static file server for best results).  
3. Click **Fetch Live News** or **Load from DB** after a first fetch.  

---

## Positioning (one-liner)

**“Credible sources → filtered for real people → ready-to-send awareness — in one screen.”**

Use that line on landing pages, proposals, and LinkedIn when you describe what the tool delivers without overpromising autonomous SOC or compliance certification.

---

*Built for teams who care about clarity, credibility, and speed — not buzzwords.*
