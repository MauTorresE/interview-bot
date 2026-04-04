# Feature Research

**Domain:** AI-conducted interview and user research SaaS
**Researched:** 2026-04-04
**Confidence:** MEDIUM-HIGH

## Competitor Landscape Summary

The AI-moderated interview space has exploded since 2024. Key competitors and adjacent tools:

| Platform | Type | Key Strength | Pricing Model |
|----------|------|--------------|---------------|
| **Outset** | AI-moderated interviews (video/voice/text) | Scale + screen-share usability testing; $30M Series B; Fortune 500 clients | Enterprise (undisclosed) |
| **Yazi** | WhatsApp AI interviews | WhatsApp-native, voice note support, async-first | Per-interview |
| **GreatQuestion** | All-in-one research platform + AI moderation | Recruitment + AI interviews + repository in one platform; $13M Series A | Tiered SaaS |
| **Dovetail** | Research repository + analysis | AI-powered theme extraction, cross-study insights, 28-language transcription | Tiered SaaS |
| **Maze** | Product research + testing | Figma integration, 121K participant panel, drag-and-drop test builder | Tiered SaaS |
| **UserTesting** | Human insight platform | Massive global panel (60+ countries), enterprise security | Enterprise |
| **Grain** | Meeting recording + research clips | Video clips, playlists, Voice of Customer reports | Freemium |
| **Fireflies.ai** | Transcription + analysis | 60+ languages, sentiment analysis, 50+ integrations | Tiered SaaS |

**Critical observation:** Outset and GreatQuestion are the closest direct competitors -- they do AI-moderated interviews at scale. Yazi is the only competitor doing WhatsApp-based AI interviews. None of them combine WebRTC live voice interviews with WhatsApp async voice in a single platform. That is EntrevistaAI's gap.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Multi-tenant auth with role-based access** | Every SaaS has this; agencies need team accounts | MEDIUM | Supabase Auth covers basics; add org/team layer |
| **Campaign/study creation and management** | Core workflow -- researchers organize work by study/campaign | MEDIUM | Name, description, status, date range, interview script assignment |
| **Interview script builder** | Researchers need to define question flow before interviews | MEDIUM | Questions, ordering, branching logic, follow-up rules |
| **Unique shareable invite links** | Standard for unmoderated/AI-moderated research | LOW | One link per respondent or one reusable campaign link |
| **Real-time transcription** | Every research tool transcribes; researchers need verbatim text | MEDIUM | Deepgram STT already proven in prototype |
| **Per-interview transcript + summary** | Researchers expect to review what was said, not just raw audio | MEDIUM | Auto-generated after interview ends; editable |
| **Theme/tag extraction from interviews** | Dovetail, Outset, GreatQuestion all do this; researchers expect AI tagging | MEDIUM | Claude function calling for structured extraction |
| **Cross-interview thematic analysis** | Researchers need patterns across a campaign, not just per-interview insights | HIGH | Aggregate themes, frequency, sentiment across all interviews in a campaign |
| **PDF/report export** | Clients and stakeholders need deliverables outside the platform | MEDIUM | Per-interview and per-campaign reports |
| **Campaign dashboard with status overview** | Researchers need to see: how many done, pending, in-progress | LOW | Campaign list view with progress indicators |
| **Respondent management** | Track who was invited, who completed, who dropped off | MEDIUM | Status tracking, reminder capability |
| **Audio recording storage** | Researchers need to replay interviews; compliance requires records | MEDIUM | Supabase Storage or S3; retention policies |
| **Search across transcripts** | Researchers need to find specific quotes or topics quickly | MEDIUM | Full-text search across campaign transcripts |
| **Interview scheduling/availability** | Respondents need to know when they can interview | LOW | For live WebRTC: always available (AI is 24/7); for WhatsApp: async by nature |

### Differentiators (Competitive Advantage)

Features that set EntrevistaAI apart. These are where the product competes.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-conducted live voice interviews (WebRTC)** | No competitor offers real-time voice AI interviews via browser -- Outset does video but with text-chat AI, not voice-first | HIGH | Core product; LiveKit + Claude + Voxtral pipeline already proven |
| **WhatsApp async voice interviews** | Only Yazi does this; massive reach in LATAM where WhatsApp is dominant | HIGH | Respondents answer voice messages at their pace; dramatically higher completion rates in LATAM markets |
| **Dual-channel (WebRTC + WhatsApp) in one platform** | No competitor offers both channels; researchers pick the best channel per audience | MEDIUM | Unified campaign management across both channels |
| **Adaptive follow-up questioning** | AI probes deeper based on responses; goes beyond scripted surveys | HIGH | Claude analyzes response context and selects follow-ups; already in prototype |
| **Voice persona selection** | Different AI voices for different contexts (formal, casual, regional accent) | MEDIUM | Voxtral default + ElevenLabs premium; custom voice cloning |
| **Spanish-first / LATAM focus** | No major competitor targets Spanish-speaking markets first | LOW | Mexican Spanish voice clone exists; LATAM UX research is underserved |
| **24/7 always-available interviewer** | No scheduling overhead; respondents interview when convenient | LOW | Inherent to AI -- just needs to be marketed as a feature |
| **Real-time response monitoring** | Watch live as AI conducts interviews; intervene if needed | HIGH | WebSocket-based live dashboard showing ongoing interviews |
| **Custom report templates** | Agencies need reports matching their deliverable format, not generic output | MEDIUM | Template system for report structure + auto-fill with extracted data |
| **Cost per interview transparency** | At ~$1.25-2.50/interview vs $150+ for human moderators, price is a weapon | LOW | Show cost breakdown in dashboard; usage-based billing model |

### Anti-Features (Deliberately NOT Building)

Features that seem good but create problems for EntrevistaAI specifically.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Built-in participant recruitment panel** | Outset/GreatQuestion have panels; seems essential | Massive cold-start problem; panel quality is a full business; $Ms to build | Integrate with User Interviews API or Respondent.io; let clients bring their own respondents via invite links |
| **Video interviews (face-on-camera)** | UserTesting/Outset support video | Adds massive complexity (video processing, storage costs, bandwidth); AI voice is the differentiator, not video | Audio-only with transcript is the product; add screen-share later if validated |
| **Synthetic/simulated user interviews** | Synthetic Users platform exists; seems innovative | Undermines core value prop of real human insights; research professionals distrust synthetic data | Position explicitly as "real humans, AI moderator" -- the opposite of synthetic |
| **Real-time collaborative editing of transcripts** | Google Docs-like collaboration seems modern | Enormous engineering complexity for a v1; transcripts are reference material, not living documents | View-only transcripts with export; add commenting later |
| **Survey builder / quantitative research** | Maze and others have surveys; broadens TAM | Dilutes focus; surveys are a different product category; Typeform/Google Forms are free | Stay qualitative-first; if needed, integrate with survey tools |
| **Native mobile app** | Mobile access seems important | Web app works on mobile browsers; native app is a second codebase to maintain | Responsive web design; PWA if needed |
| **Multi-language within same campaign** | Global companies want this | Massively increases complexity (multi-language analysis, mixed transcripts) | One language per campaign; support multiple campaigns in different languages |
| **Custom AI personality/tone fine-tuning** | "Make the AI sound more empathetic" | Prompt engineering rabbit hole; diminishing returns; risks uncanny valley | Offer 3-4 preset interviewer styles (Professional, Casual, Empathetic, Direct) instead of freeform customization |
| **Zapier/API integrations** | Every SaaS has integrations | Engineering overhead for v1 with near-zero users; premature optimization | Build when customers ask; PDF export covers 80% of "get data out" needs |
| **White-labeling / custom branding** | Agencies want their brand on deliverables | Significant frontend complexity; auth flow complications | Add agency logo to PDF reports only; full white-label is a future enterprise tier |

## Feature Dependencies

```
[Multi-tenant Auth]
    |
    +--requires--> [Campaign Management]
    |                  |
    |                  +--requires--> [Interview Script Builder]
    |                  |                  |
    |                  |                  +--enables--> [AI Voice Interview (WebRTC)]
    |                  |                  |                 |
    |                  |                  |                 +--produces--> [Real-time Transcription]
    |                  |                  |                                    |
    |                  |                  |                                    +--enables--> [Per-Interview Analysis]
    |                  |                  |                                                     |
    |                  |                  |                                                     +--enables--> [Cross-Interview Analysis]
    |                  |                  |                                                                       |
    |                  |                  |                                                                       +--enables--> [PDF Report Export]
    |                  |                  |
    |                  |                  +--enables--> [WhatsApp Voice Interview]
    |                  |                                    |
    |                  |                                    +--produces--> [Async Transcription]
    |                  |                                                       |
    |                  |                                                       +--feeds--> [Per-Interview Analysis] (same as above)
    |                  |
    |                  +--requires--> [Respondent Management]
    |                                     |
    |                                     +--enables--> [Invite Links]
    |                                     +--enables--> [Campaign Dashboard]

[Voice Persona Library] --enhances--> [AI Voice Interview (WebRTC)]
[Voice Persona Library] --enhances--> [WhatsApp Voice Interview]

[Custom Report Templates] --enhances--> [PDF Report Export]

[Real-time Monitoring] --enhances--> [AI Voice Interview (WebRTC)]
    (only makes sense for live interviews, not async WhatsApp)
```

### Dependency Notes

- **Campaign Management requires Auth:** Users must be scoped to their own campaigns; multi-tenancy is foundational
- **Interview Script Builder requires Campaign:** Scripts are attached to campaigns; a script without a campaign has no context
- **AI Voice Interview requires Script:** The AI needs a question flow to follow; no script = no interview
- **Per-Interview Analysis requires Transcription:** Analysis is derived from transcript text; no transcript = no analysis
- **Cross-Interview Analysis requires Per-Interview:** Aggregate analysis depends on individual interview extractions existing first
- **WhatsApp and WebRTC are independent channels:** Both connect to the same campaign/script/analysis pipeline but can be built separately
- **Real-time Monitoring only applies to WebRTC:** WhatsApp is async; there is nothing to monitor live

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to validate with 3-5 pilot agencies.

- [ ] **Multi-tenant auth** -- foundational; without it, no SaaS
- [ ] **Campaign creation + management dashboard** -- researchers need to organize their work
- [ ] **Interview script builder** (questions + ordering + follow-up rules) -- the AI needs a guide
- [ ] **AI voice interview via WebRTC** -- the core differentiator; prove the AI can conduct real interviews
- [ ] **Real-time transcription** -- researchers must see what was said
- [ ] **Per-interview analysis** (themes, sentiment, key quotes, summary) -- the "so what" after each interview
- [ ] **Cross-interview thematic analysis** -- the real value; patterns across a whole campaign
- [ ] **PDF report export** -- clients need deliverables
- [ ] **Respondent management with invite links** -- researchers need to send people to interviews
- [ ] **Single voice persona** (Voxtral Mexican Spanish) -- keep it simple; one great voice

### Add After Validation (v1.x)

Features to add once core is working and 5+ agencies are active.

- [ ] **WhatsApp voice interview channel** -- add when Meta Business API access secured; massive reach amplifier for LATAM
- [ ] **Voice persona library** (multiple Voxtral + ElevenLabs voices) -- add when users request variety
- [ ] **Custom report templates** -- add when agencies complain about generic report format
- [ ] **Real-time interview monitoring** -- add when agencies want to observe ongoing interviews
- [ ] **Campaign-level settings** (duration targets, max interviews, auto-close) -- add when campaigns get larger
- [ ] **Search across transcripts** -- add when data volume makes manual review painful
- [ ] **Respondent reminders** (email/WhatsApp nudges to complete) -- add when completion rates are a problem
- [ ] **English language support** -- add when first English-speaking customer arrives

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Screen-share during interviews** -- Outset's differentiator; adds usability testing capability
- [ ] **Cross-campaign/cross-study insights repository** -- Dovetail's core product; requires significant architecture
- [ ] **API for third-party integrations** -- only when enterprise customers demand it
- [ ] **Team collaboration features** (comments, shared highlights, @mentions) -- when team usage patterns emerge
- [ ] **Agency logo on reports / basic white-labeling** -- when enterprise tier pricing justifies it
- [ ] **Billing/payments with Stripe** -- when free beta ends
- [ ] **Interviewer style presets** (Professional, Casual, Empathetic, Direct) -- when agencies articulate style needs
- [ ] **Interview quality scoring** -- detect low-quality interviews (too short, off-topic, disengaged respondent)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multi-tenant auth | HIGH | MEDIUM | P1 |
| Campaign management | HIGH | MEDIUM | P1 |
| Interview script builder | HIGH | MEDIUM | P1 |
| AI voice interview (WebRTC) | HIGH | HIGH (but prototype exists) | P1 |
| Real-time transcription | HIGH | LOW (Deepgram proven) | P1 |
| Per-interview analysis | HIGH | MEDIUM | P1 |
| Cross-interview analysis | HIGH | HIGH | P1 |
| PDF report export | MEDIUM | MEDIUM | P1 |
| Respondent management + invite links | MEDIUM | LOW | P1 |
| Campaign dashboard | MEDIUM | LOW | P1 |
| WhatsApp voice interviews | HIGH | HIGH | P2 |
| Voice persona library | MEDIUM | MEDIUM | P2 |
| Custom report templates | MEDIUM | MEDIUM | P2 |
| Real-time monitoring | MEDIUM | HIGH | P2 |
| Transcript search | MEDIUM | MEDIUM | P2 |
| English language support | MEDIUM | LOW | P2 |
| Screen-share interviews | MEDIUM | HIGH | P3 |
| Research repository | MEDIUM | HIGH | P3 |
| API / integrations | LOW | HIGH | P3 |
| Team collaboration | LOW | HIGH | P3 |
| Billing / Stripe | HIGH (eventually) | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (validate core product)
- P2: Add when core is validated and users request
- P3: Future consideration after PMF

## Competitor Feature Analysis

| Feature | Outset | Yazi | GreatQuestion | Dovetail | EntrevistaAI Plan |
|---------|--------|------|---------------|----------|-------------------|
| AI-moderated interviews | Video/voice/text | WhatsApp text + voice notes | Video/voice/text | No (analysis only) | WebRTC voice + WhatsApp voice |
| Live voice AI interviewer | No (text-based AI) | No (async only) | No (text-based AI) | No | **YES -- core differentiator** |
| WhatsApp channel | No | Yes (primary) | No | No | Yes (v1.x) |
| Adaptive follow-ups | Yes | Yes | Yes | N/A | Yes |
| Transcription | Yes | Yes | Yes | Yes (28 langs) | Yes (Deepgram) |
| Theme extraction | Yes (auto) | Yes (auto) | Yes (auto) | Yes (auto) | Yes (Claude-based) |
| Cross-study analysis | Yes (Explore) | Limited | Yes | Yes (repository) | Yes (per-campaign) |
| Participant panel | Via integrations | No | 6M via User Interviews | No | No -- BYOP (bring your own) |
| Report export | Dashboard | PDF | PDF/dashboard | Multiple formats | PDF |
| Video recording | Yes | No | Yes | Yes (import) | No (audio-only) |
| Screen share | Yes | No | No | No | No (v2+) |
| Multi-language | 40+ languages | Limited | Multiple | 28 languages | Spanish-first; English v2 |
| Sentiment analysis | Yes | Yes | Yes | Yes | Yes (Claude-based) |
| Pricing transparency | Opaque/enterprise | ~$20/interview | Tiered | Tiered | ~$1.25-2.50/interview |

## Campaign Management Patterns (from competitor analysis)

Research tools consistently implement these campaign management patterns:

1. **Study/Campaign as top-level object:** Everything is organized under a study or campaign. Contains: name, description, goals, methodology, date range, status.

2. **Interview script attached to campaign:** One script per campaign (not shared across campaigns). Script defines: questions, order, branching, follow-up rules, time targets.

3. **Respondent pool per campaign:** Respondents are managed per-campaign with statuses: invited, scheduled, in-progress, completed, no-show, dropped.

4. **Campaign lifecycle:** Draft -> Active -> Paused -> Completed -> Archived. Campaigns can be paused (stop accepting new interviews) and archived (read-only).

5. **Progress tracking:** Dashboard shows: total target interviews, completed, in-progress, average duration, completion rate.

6. **Invite link patterns:** Two models -- (a) unique link per respondent (trackable, prevents sharing) or (b) single campaign link (easier distribution, harder to track). Most platforms support both.

## Report/Analysis Features That Researchers Actually Use

Based on competitor analysis and research trends:

1. **Executive summary** (2-3 paragraphs) -- the most-read section; AI-generated overview of findings
2. **Key themes with supporting quotes** -- themes ranked by frequency/importance; each backed by verbatim quotes
3. **Sentiment breakdown** -- positive/neutral/negative distribution across interviews and per-theme
4. **Participant-level summaries** -- quick view of each interview's key points
5. **Highlight reels / key quotes** -- curated list of most impactful verbatim quotes with context
6. **Recommendations** -- AI-generated actionable recommendations based on findings (controversial -- some researchers prefer to write their own)
7. **Data visualizations** -- theme frequency charts, sentiment distributions, word clouds (simple charts beat complex dashboards)
8. **Methodology section** -- auto-generated description of how interviews were conducted (important for credibility)
9. **Raw transcript access** -- always available as appendix; searchable

**What researchers do NOT use:** Overly complex dashboards with too many filters, real-time analytics that change constantly (researchers want a snapshot), sentiment scoring at the sentence level (too granular; paragraph/theme level is sufficient).

## Sources

- [Dovetail Reviews - G2](https://www.g2.com/products/dovetail-research-pty-ltd-dovetail/reviews)
- [Dovetail AI Review - Looppanel](https://www.looppanel.com/blog/dovetail-ai)
- [UserTesting Platform](https://www.usertesting.com/platform)
- [Maze User Research Platform](https://maze.co/)
- [Maze Future of User Research 2026](https://maze.co/resources/user-research-report/)
- [Outset AI-Moderated Research Platform](https://outset.ai/)
- [Outset Interviews Feature](https://outset.ai/platform/interviews)
- [Outset $30M Series B](https://www.cmswire.com/customer-experience/outset-raises-30m-series-b-for-ai-native-cx-platform/)
- [GreatQuestion AI Moderated Interviews](https://greatquestion.co/features/ai-moderated-interviews)
- [GreatQuestion 2025 Year-in-Review](https://cms.greatquestion.co/blog/2025-review)
- [Yazi WhatsApp AI Interviewer](https://www.askyazi.com/product/whatsapp-ai-interviewer)
- [Yazi WhatsApp Research White Paper](https://www.askyazi.com/articles/white-paper-ai-moderated-interviews-in-whatsapp--a-superior-market-research-methodology)
- [Best AI Moderated Interview Tools 2025](https://www.askyazi.com/articles/best-ai-moderated-interview-idi-tools-in-2025)
- [AI User Research Complete Guide 2026 - Parallel](https://www.parallelhq.com/blog/ai-ux-research)
- [5 Best AI Moderated Interview Platforms 2026](https://weframetech.com/blog/top-ai-moderated-interview-platforms-2026)
- [Grain AI Notetaker](https://grain.com)
- [Fireflies vs Otter Comparison 2026](https://thebusinessdive.com/fireflies-ai-vs-otter-ai)
- [Great Question UX Research Recruitment](https://greatquestion.co/features/research-recruitment)
- [User Interviews AI Moderation Guide](https://www.userinterviews.com/ai-moderation-for-ux-research-guide)

---
*Feature research for: AI-conducted interview and user research SaaS (EntrevistaAI)*
*Researched: 2026-04-04*
