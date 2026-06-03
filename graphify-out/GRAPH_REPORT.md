# Graph Report - .  (2026-05-29)

## Corpus Check
- 46 files · ~111,077 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 888 nodes · 2284 edges · 40 communities (37 shown, 3 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 343 edges (avg confidence: 0.8)
- Token cost: 90,000 input · 7,515 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Editor Parent Controller|Editor: Parent Controller]]
- [[_COMMUNITY_Newsletter Engine & Templates|Newsletter Engine & Templates]]
- [[_COMMUNITY_UI Sidebar & Article Search|UI: Sidebar & Article Search]]
- [[_COMMUNITY_Utilities HTMLEmailClipboard|Utilities: HTML/Email/Clipboard]]
- [[_COMMUNITY_UI Settings & DB Actions|UI: Settings & DB Actions]]
- [[_COMMUNITY_AI Summarizer Core & OpenAI|AI: Summarizer Core & OpenAI]]
- [[_COMMUNITY_IndexedDB Data Layer|IndexedDB Data Layer]]
- [[_COMMUNITY_UI Preview & Translation Glue|UI: Preview & Translation Glue]]
- [[_COMMUNITY_Build Dependencies (package.json)|Build: Dependencies (package.json)]]
- [[_COMMUNITY_Editor Iframe Script|Editor: Iframe Script]]
- [[_COMMUNITY_UI Build Pipeline & Sidebar|UI: Build Pipeline & Sidebar]]
- [[_COMMUNITY_RSS Fetching & Feeds|RSS Fetching & Feeds]]
- [[_COMMUNITY_UI Send & Export|UI: Send & Export]]
- [[_COMMUNITY_Graphics Engine (chartsvisuals)|Graphics Engine (charts/visuals)]]
- [[_COMMUNITY_UI Workspace Config Apply|UI: Workspace Config Apply]]
- [[_COMMUNITY_AI Tips & Local Fallbacks|AI: Tips & Local Fallbacks]]
- [[_COMMUNITY_AI Bank-Page Ensemble & Prompts|AI: Bank-Page Ensemble & Prompts]]
- [[_COMMUNITY_Keyword Store|Keyword Store]]
- [[_COMMUNITY_Routing & Page Navigation|Routing & Page Navigation]]
- [[_COMMUNITY_AI Slot Fills (ChaseCybershield)|AI: Slot Fills (Chase/Cybershield)]]
- [[_COMMUNITY_AI Slot Fills (DoDontSpotlight)|AI: Slot Fills (DoDont/Spotlight)]]
- [[_COMMUNITY_Translation Metrics|Translation Metrics]]
- [[_COMMUNITY_Outlook .msg Writer|Outlook .msg Writer]]
- [[_COMMUNITY_AI Newsletter Chrome & Corporate Prompts|AI: Newsletter Chrome & Corporate Prompts]]
- [[_COMMUNITY_UI Page Navigation|UI: Page Navigation]]
- [[_COMMUNITY_AI Ensemble Logger|AI: Ensemble Logger]]
- [[_COMMUNITY_UX Contract (guardsnav)|UX Contract (guards/nav)]]
- [[_COMMUNITY_AI Takeaways & Sanitization|AI: Takeaways & Sanitization]]
- [[_COMMUNITY_UI AI Experiment Controls|UI: AI Experiment Controls]]
- [[_COMMUNITY_Feed Scoring & Keywords|Feed Scoring & Keywords]]
- [[_COMMUNITY_AI Template Slot Prompt Builders|AI: Template Slot Prompt Builders]]
- [[_COMMUNITY_Project Store|Project Store]]
- [[_COMMUNITY_UI Translation Glossary Lock|UI: Translation Glossary Lock]]
- [[_COMMUNITY_Delivery Helpers|Delivery Helpers]]
- [[_COMMUNITY_Config babel.json|Config: babel.json]]
- [[_COMMUNITY_Config ESLint|Config: ESLint]]
- [[_COMMUNITY_Responsive Layout|Responsive Layout]]
- [[_COMMUNITY_Asset Image Library Manifest|Asset: Image Library Manifest]]
- [[_COMMUNITY_Config Playwright|Config: Playwright]]
- [[_COMMUNITY_Health Check Page|Health Check Page]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 41 edges
2. `tbc()` - 36 edges
3. `tbl()` - 31 edges
4. `tblx()` - 31 edges
5. `Editor Page` - 31 edges
6. `Home / Builder Page` - 30 edges
7. `Preview Page` - 30 edges
8. `Send Page` - 30 edges
9. `Config Page` - 29 edges
10. `foot()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Builder Redirect` --references--> `Home / Builder Page`  [EXTRACTED]
  builder.html → index.html
- `scrubTipSurface()` --calls--> `tryRepairMojibakeUtf8()`  [INFERRED]
  js/ai_summarizer.js → js/ai/local_fallbacks.js
- `localDoLinesFromArticles()` --calls--> `generateTips()`  [INFERRED]
  js/ai_summarizer.js → js/ai/local_fallbacks.js
- `aiFillBankPageSlots()` --calls--> `callTemplateSlotsAI()`  [INFERRED]
  js/ai/bank_page_ensemble.js → js/ai_summarizer.js
- `callBankPageSection()` --calls--> `callTemplateSlotsAI()`  [INFERRED]
  js/ai/bank_page_ensemble.js → js/ai_summarizer.js

## Communities (40 total, 3 thin omitted)

### Community 0 - "Editor: Parent Controller"
Cohesion: 0.06
Nodes (86): _addEl(), _addSec(), _applyPreset(), _blobToDataUri(), _buildNav(), _buildSrcdoc(), close(), _commit() (+78 more)

### Community 1 - "Newsletter Engine & Templates"
Cohesion: 0.12
Nodes (74): animFadeIn(), animSlideUp(), applyRenderProfile(), articleCard(), briefingPanel(), build(), campaignStep(), classificationBar() (+66 more)

### Community 2 - "UI: Sidebar & Article Search"
Cohesion: 0.04
Nodes (37): addFeedSource(), addSidebarContextKeyword(), addSidebarCriticalKeyword(), addSidebarNoiseKeyword(), articleMatchesKeywordQuery(), articleSearchHaystack(), fetchWithTranslationRetry(), findVisitPortalHref() (+29 more)

### Community 3 - "Utilities: HTML/Email/Clipboard"
Cohesion: 0.07
Nodes (33): _ancestorBg(), buildEmailSafeHTMLFromElement(), buildEmlMime(), compositeRgbaOverHex(), copyHTML(), downloadSVG(), _elementOwnBg(), _EMAIL_FONT_TAGS (+25 more)

### Community 4 - "UI: Settings & DB Actions"
Cohesion: 0.09
Nodes (37): applyAISettings(), applyCurationMode(), applySMTPConfig(), clearDB(), defaultAIExperimentControl(), deleteArticle(), filteredArticles(), flagCurationFeedback() (+29 more)

### Community 5 - "AI: Summarizer Core & OpenAI"
Cohesion: 0.08
Nodes (32): _articleLogTag(), BANKPAGE_FORBIDDEN_PHRASES, callOpenAI(), CHASE_ATTACK_PROFILES, CHASE_PRECAUTIONS_DEFAULTS, config, configure(), countForbiddenHits() (+24 more)

### Community 6 - "IndexedDB Data Layer"
Cohesion: 0.09
Nodes (16): deleteArticleByUrl(), findImageBySha1(), getAllArticles(), getAllDrafts(), getAllProjects(), getArticlesByDays(), getStats(), hashStr() (+8 more)

### Community 7 - "UI: Preview & Translation Glue"
Cohesion: 0.14
Nodes (33): clearTranslationPipelineState(), copyCurrentHTML(), currentPreviewVariant(), ensureLanguageTranslated(), escapeHtml(), getLanguageLabel(), getLanguageVariant(), getLivePreviewHtml() (+25 more)

### Community 8 - "Build: Dependencies (package.json)"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk, playwright, devDependencies, eslint, @eslint/js, eslint-plugin-no-unsanitized, eslint-plugin-security (+23 more)

### Community 9 - "Editor: Iframe Script"
Cohesion: 0.16
Nodes (27): addPath(), clearMultiSet(), collectBlockTargets(), computeDomPathForEl(), doAddEl(), doAddSec(), doDelete(), doDuplicate() (+19 more)

### Community 10 - "UI: Build Pipeline & Sidebar"
Cohesion: 0.13
Nodes (27): autoProjectTitleFromArticles(), autoSaveAsProject(), beforeWorkspaceSnapshot(), buildAndPreview(), buildAndPreviewEnglishOnly(), buildWorkspaceSnapshot(), editorLoadSelectedProjectVersion(), editorRestoreSelectedVersionAsLatest() (+19 more)

### Community 11 - "RSS Fetching & Feeds"
Cohesion: 0.14
Nodes (27): addCustomFeed(), articlesFromRss2Json(), classify(), CORS_PROXIES, dedup(), FEEDS, fetchAllFeeds(), fetchFeedContent() (+19 more)

### Community 12 - "UI: Send & Export"
Cohesion: 0.14
Nodes (28): callRelay(), clearUnsavedChanges(), collectSMTPDiagnostics(), downloadAllHTML(), downloadCurrentEml(), downloadCurrentHTML(), downloadCurrentMsg(), emptyNewsletterWorkspaceShell() (+20 more)

### Community 13 - "Graphics Engine (charts/visuals)"
Cohesion: 0.13
Nodes (14): changePwCompact(), compact(), dataLeakCompact(), fakeSiteCompact(), FORMAT_THUMB_IMAGES, FORMAT_THUMBS, mfaCompact(), peopleCompact() (+6 more)

### Community 14 - "UI: Workspace Config Apply"
Cohesion: 0.13
Nodes (22): applyAIExperimentControl(), applyCentralConfigBundle(), applyIndexedProjectToWorkspace(), applyMainConfig(), applyMetadata(), applyOptions(), applyRecipients(), defaultProjectTitle() (+14 more)

### Community 15 - "AI: Tips & Local Fallbacks"
Cohesion: 0.16
Nodes (21): corpusForTips(), defaultTipsForType(), estimateLevel(), generateTips(), isSoftwareSupplyChainStory(), buildArticleSummarizeUserPrompt(), buildArticleWatchoutsUserPrompt(), callClaude() (+13 more)

### Community 16 - "AI: Bank-Page Ensemble & Prompts"
Cohesion: 0.24
Nodes (19): aiFillBankPageSlots(), callBankPageSection(), _config(), ensembleSessionId(), postEnsembleLog(), bankPageCompactArticles(), buildBankPageImpactGeneralPrompt(), buildBankPageImpactOrgPrompt() (+11 more)

### Community 17 - "Keyword Store"
Cohesion: 0.24
Nodes (19): addKeyword(), clearAllKeywords(), clearKeywords(), DEFAULT_CONTEXT, DEFAULT_CRITICAL, DEFAULT_NOISE, getContextKeywords(), getCriticalKeywords() (+11 more)

### Community 18 - "Routing & Page Navigation"
Cohesion: 0.23
Nodes (12): SOFTWARE_SUPPLY_CHAIN_WATCHOUT_TIPS, SUPPLY_CHAIN_CORPUS_MARKERS, Builder Redirect, Config Page, Curation Lab Page, Editor Page, Home / Builder Page, goto() (+4 more)

### Community 19 - "AI: Slot Fills (Chase/Cybershield)"
Cohesion: 0.18
Nodes (17): validateArticleCoherence(), aiFillBankPageSlots(), aiFillChasePrecautions(), aiFillCybershieldImpact(), aiFillCybershieldThreatRedFlags(), buildChasePrecautionsUserPrompt(), buildCybershieldImpactUserPrompt(), buildCybershieldThreatRedFlagsUserPrompt() (+9 more)

### Community 20 - "AI: Slot Fills (DoDont/Spotlight)"
Cohesion: 0.23
Nodes (16): aiFillDoDontSlots(), aiFillSpotlightSlots(), callTemplateSlotsAI(), combinedCorpusForSlots(), dedupeTemplateLines(), finalizeShortLine(), isCalmEmployeeTip(), localDoLinesFromArticles() (+8 more)

### Community 21 - "Translation Metrics"
Cohesion: 0.19
Nodes (10): countsTowardCoverageProgress(), decodeEntities(), formatDiagSummary(), hasMeaningfulTextChange(), hasMeaningfulTextChangeAllowingLockedTerms(), hasTranslatableLetters(), letterCoreLength(), normalizedVisibleText() (+2 more)

### Community 22 - "Outlook .msg Writer"
Cohesion: 0.27
Nodes (12): b64bytes(), buildMsgFile(), concat(), hex8(), pBool(), pInt(), propertiesStream(), pVar() (+4 more)

### Community 23 - "AI: Newsletter Chrome & Corporate Prompts"
Cohesion: 0.24
Nodes (12): aiFillCorporateTopicBlurb(), buildCorporateTopicUserPrompt(), buildNewsletterChromeUserPrompt(), buildNewsletterChromeUserPromptFrame(), buildNewsletterChromeUserPromptTakeaways(), clampStr(), finalizeCorporateTopicBlurb(), formatTypePhraseForTopic() (+4 more)

### Community 24 - "UI: Page Navigation"
Cohesion: 0.18
Nodes (12): closePreview(), closeTplPreview(), currentPageId(), goBackToBuilder(), goHome(), goToEditorPage(), goToHomePage(), goToPreviewPage() (+4 more)

### Community 25 - "AI: Ensemble Logger"
Cohesion: 0.27
Nodes (8): beginBuild(), composeContent(), isLocalhost(), log(), logRaw(), makeSessionId(), postPayload(), sanitizeTemplateId()

### Community 26 - "UX Contract (guards/nav)"
Cohesion: 0.26
Nodes (9): attachHomeNavBehavior(), enforceGuard(), hasWorkspace(), init(), injectStyles(), MAJOR_PAGES, PRIMARY_FLOW, renderGuard() (+1 more)

### Community 27 - "AI: Takeaways & Sanitization"
Cohesion: 0.27
Nodes (11): editionHasSupplyChain(), tryRepairMojibakeUtf8(), localNewsletterTakeaways(), mergeNlTakeawaysFromAI(), normalizeTipDedupeKey(), sanitizeBankPageBullet(), sanitizeEmployeeTip(), sanitizeTakeawayLine() (+3 more)

### Community 28 - "UI: AI Experiment Controls"
Cohesion: 0.36
Nodes (9): applyAIExperimentControl(), defaultAIExperimentControl(), exportAIExperimentEvidence(), getAIExperimentControlFromUI(), getAIExperimentReadiness(), normalizeNumberInput(), renderAIExperimentReadiness(), saveAIExperimentControl() (+1 more)

### Community 29 - "Feed Scoring & Keywords"
Cohesion: 0.29
Nodes (9): DEFAULT_CONTEXT, DEFAULT_CRITICAL, DEFAULT_NOISE, hasCveReference(), noiseTermMatches(), normalizeSnapshot(), scoreText(), shouldIncludeItem() (+1 more)

### Community 30 - "AI: Template Slot Prompt Builders"
Cohesion: 0.50
Nodes (8): buildTemplateSlotsUserPromptDefenceOnly(), buildTemplateSlotsUserPromptDoDont(), buildTemplateSlotsUserPromptDontsOnly(), buildTemplateSlotsUserPromptDosOnly(), buildTemplateSlotsUserPromptSpotlight(), buildTemplateSlotsUserPromptTacticsOnly(), previewNewsletterTemplateSlotsPrompts(), templateSlotsCompactStories()

### Community 31 - "Project Store"
Cohesion: 0.43
Nodes (7): buildProjectFromWorkspace(), ensureMigrated(), get(), list(), remove(), saveFromWorkspace(), Projects Page

### Community 32 - "UI: Translation Glossary Lock"
Cohesion: 0.43
Nodes (6): applyGlossaryLock(), GLOSSARY_LOCK, GLOSSARY_LOCK_TERM_LIST, protectTokens(), restoreTokens(), translateHtmlAIFirst()

### Community 33 - "Delivery Helpers"
Cohesion: 0.60
Nodes (5): buildRelayDeliveryPayload(), collectDiagnostics(), isValidEmail(), normalizeMethod(), relayKindLabel()

### Community 34 - "Config: babel.json"
Cohesion: 0.40
Nodes (4): activity, backups, stories, versions

### Community 35 - "Config: ESLint"
Cohesion: 0.40
Nodes (4): globals, js, noUnsanitized, security

### Community 36 - "Responsive Layout"
Cohesion: 0.70
Nodes (4): applyBodyTier(), getTier(), init(), syncViewportVars()

## Knowledge Gaps
- **95 isolated node(s):** `stories`, `versions`, `backups`, `activity`, `js` (+90 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Editor Page` connect `Routing & Page Navigation` to `Editor: Parent Controller`, `Newsletter Engine & Templates`, `UI: Sidebar & Article Search`, `Utilities: HTML/Email/Clipboard`, `AI: Summarizer Core & OpenAI`, `IndexedDB Data Layer`, `Editor: Iframe Script`, `UI: Build Pipeline & Sidebar`, `RSS Fetching & Feeds`, `Graphics Engine (charts/visuals)`, `AI: Bank-Page Ensemble & Prompts`, `Keyword Store`, `Translation Metrics`, `Outlook .msg Writer`, `AI: Ensemble Logger`, `UX Contract (guards/nav)`, `UI: AI Experiment Controls`, `Feed Scoring & Keywords`, `Project Store`, `UI: Translation Glossary Lock`, `Delivery Helpers`, `Responsive Layout`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `Preview Page` connect `Routing & Page Navigation` to `Editor: Parent Controller`, `Newsletter Engine & Templates`, `UI: Sidebar & Article Search`, `Utilities: HTML/Email/Clipboard`, `AI: Summarizer Core & OpenAI`, `IndexedDB Data Layer`, `Editor: Iframe Script`, `UI: Build Pipeline & Sidebar`, `RSS Fetching & Feeds`, `Graphics Engine (charts/visuals)`, `AI: Bank-Page Ensemble & Prompts`, `Keyword Store`, `Translation Metrics`, `Outlook .msg Writer`, `AI: Ensemble Logger`, `UX Contract (guards/nav)`, `UI: AI Experiment Controls`, `Feed Scoring & Keywords`, `Project Store`, `UI: Translation Glossary Lock`, `Delivery Helpers`, `Responsive Layout`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `Send Page` connect `Routing & Page Navigation` to `Editor: Parent Controller`, `Newsletter Engine & Templates`, `UI: Sidebar & Article Search`, `Utilities: HTML/Email/Clipboard`, `AI: Summarizer Core & OpenAI`, `IndexedDB Data Layer`, `Editor: Iframe Script`, `UI: Build Pipeline & Sidebar`, `RSS Fetching & Feeds`, `Graphics Engine (charts/visuals)`, `AI: Bank-Page Ensemble & Prompts`, `Keyword Store`, `Translation Metrics`, `Outlook .msg Writer`, `AI: Ensemble Logger`, `UX Contract (guards/nav)`, `UI: AI Experiment Controls`, `Feed Scoring & Keywords`, `Project Store`, `UI: Translation Glossary Lock`, `Delivery Helpers`, `Responsive Layout`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Are the 36 inferred relationships involving `showToast()` (e.g. with `applyIndexedProjectToWorkspace()` and `clearDB()`) actually correct?**
  _`showToast()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `tbc()` (e.g. with `buildAwarenessScorecard()` and `buildCorporateAlert()`) actually correct?**
  _`tbc()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `tbl()` (e.g. with `buildAwarenessScorecard()` and `buildCorporateAlert()`) actually correct?**
  _`tbl()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `tblx()` (e.g. with `buildAwarenessScorecard()` and `buildCorporateAlert()`) actually correct?**
  _`tblx()` has 19 INFERRED edges - model-reasoned connections that need verification._