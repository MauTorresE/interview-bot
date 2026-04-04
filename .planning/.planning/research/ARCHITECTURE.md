# Architecture Research

**Domain:** AI Voice Interview SaaS (multi-tenant, dual-channel)
**Researched:** 2026-04-04
**Confidence:** HIGH

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │  Next.js     │  │  Respondent  │  │  WhatsApp Cloud API          │   │
│  │  Dashboard   │  │  Interview   │  │  (Webhook Receiver)          │   │
│  │  (Vercel)    │  │  Page        │  │                              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬───────────────┘   │
│         │                 │                          │                   │
├─────────┴─────────────────┴──────────────────────────┴───────────────────┤
│                          API LAYER                                       │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  Supabase Edge Functions     │  │  Python API (Railway)           │   │
│  │  - Auth endpoints            │  │  - WhatsApp webhook handler     │   │
│  │  - Campaign CRUD             │  │  - Report generation trigger    │   │
│  │  - Room token generation     │  │  - Analysis pipeline trigger    │   │
│  │  - Report retrieval          │  │  - LiveKit token mint           │   │
│  └──────────────┬───────────────┘  └────────────────┬────────────────┘   │
│                 │                                    │                   │
├─────────────────┴────────────────────────────────────┴───────────────────┤
│                          REALTIME LAYER                                  │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  LiveKit Cloud (SFU)         │  │  WhatsApp Async Engine          │   │
│  │  - WebRTC rooms              │  │  - Voice message receive/send   │   │
│  │  - Agent dispatch            │  │  - Turn-based state machine     │   │
│  │  - Media routing             │  │  - STT on received audio        │   │
│  └──────────────┬───────────────┘  └────────────────┬────────────────┘   │
│                 │                                    │                   │
├─────────────────┴────────────────────────────────────┴───────────────────┤
│                          AGENT LAYER (Python / Railway)                   │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  Interview Agent (LiveKit Worker)                                  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │   │
│  │  │ Script Engine │ │ STT (Deepgram)│ │ LLM (Claude) │              │   │
│  │  │ (State Mach.) │ │              │ │              │               │   │
│  │  └──────┬───────┘ └──────────────┘ └──────────────┘               │   │
│  │         │         ┌──────────────┐ ┌──────────────┐               │   │
│  │         │         │ TTS Router   │ │ Transcript   │               │   │
│  │         │         │ (Voxtral /   │ │ Writer       │               │   │
│  │         │         │  ElevenLabs) │ │ (Supabase)   │               │   │
│  │         │         └──────────────┘ └──────────────┘               │   │
│  ├─────────┴──────────────────────────────────────────────────────────┤   │
│  │  Analysis Worker                                                   │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │   │
│  │  │ Per-Interview │ │ Cross-Camp.  │ │ PDF Generator│               │   │
│  │  │ Analyzer     │ │ Analyzer     │ │ (WeasyPrint) │               │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘               │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                                      │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  Supabase Postgres           │  │  Supabase Storage               │   │
│  │  - Multi-tenant (RLS)        │  │  - Audio recordings             │   │
│  │  - Campaigns, scripts        │  │  - Generated PDF reports        │   │
│  │  - Transcripts, insights     │  │  - Voice persona files          │   │
│  │  - Job queue (pgmq)          │  │                                 │   │
│  └──────────────────────────────┘  └─────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Next.js Dashboard | Campaign management, reports, respondent tracking, interview monitoring | Next.js App Router on Vercel, Supabase client SDK for auth + data |
| Respondent Interview Page | Public-facing interview room, LiveKit WebRTC connection | Lightweight Next.js page, LiveKit React SDK |
| Python API (Railway) | WhatsApp webhooks, token minting, background job triggers | FastAPI on Railway, Supabase Python client |
| LiveKit Interview Agent | Real-time voice interview via WebRTC, script execution | livekit-agents Python framework, Worker-Job model |
| WhatsApp Async Engine | Async voice interview via WhatsApp voice messages | Part of Python API, webhook-driven state machine |
| Script Engine | Dynamic question flow, branching logic, follow-up selection | Python state machine reading interview scripts from Supabase |
| TTS Router | Selects and calls correct TTS provider per campaign config | Adapter pattern: Voxtral adapter (existing) + ElevenLabs adapter |
| Analysis Worker | Per-interview + cross-campaign analysis, report generation | Background worker consuming from Supabase pgmq queue |
| Supabase Postgres | Multi-tenant data store with RLS, job queue | Postgres with RLS policies keyed on org_id, pgmq for async jobs |
| Supabase Storage | Binary file storage for audio, PDFs, voice assets | Bucket-per-type with RLS policies matching org_id |

## Multi-Tenant Data Model

### Core Schema

```sql
-- Organizations (tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Users belong to organizations
CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT DEFAULT 'member',  -- 'owner', 'admin', 'member'
    UNIQUE(org_id, user_id)
);

-- Campaigns scoped to org
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'completed'
    script_id UUID REFERENCES interview_scripts(id),
    voice_provider TEXT DEFAULT 'voxtral',  -- 'voxtral' | 'elevenlabs'
    voice_id TEXT,
    language TEXT DEFAULT 'es-419',
    duration_target_minutes INT DEFAULT 15,
    channel TEXT DEFAULT 'web',  -- 'web' | 'whatsapp' | 'both'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Interview scripts (reusable across campaigns)
CREATE TABLE interview_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    version INT DEFAULT 1,
    script_data JSONB NOT NULL,  -- structured question tree (see Script Engine section)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual interviews
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) NOT NULL,
    org_id UUID REFERENCES organizations(id) NOT NULL,  -- denormalized for RLS
    respondent_id UUID REFERENCES respondents(id),
    channel TEXT NOT NULL,  -- 'web' | 'whatsapp'
    status TEXT DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'abandoned'
    livekit_room_name TEXT,  -- null for WhatsApp interviews
    whatsapp_phone TEXT,     -- null for web interviews
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Transcript entries
CREATE TABLE transcript_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) NOT NULL,
    org_id UUID REFERENCES organizations(id) NOT NULL,
    role TEXT NOT NULL,  -- 'agent' | 'respondent'
    content TEXT NOT NULL,
    script_node_id TEXT,  -- which question in the script tree
    timestamp_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-interview insights (Claude extraction)
CREATE TABLE interview_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) NOT NULL,
    org_id UUID REFERENCES organizations(id) NOT NULL,
    insight_type TEXT NOT NULL,  -- 'theme', 'pain_point', 'quote', 'sentiment', 'summary'
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cross-campaign analysis results
CREATE TABLE campaign_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) NOT NULL,
    org_id UUID REFERENCES organizations(id) NOT NULL,
    analysis_type TEXT NOT NULL,  -- 'themes', 'sentiment_trends', 'patterns'
    content JSONB NOT NULL,
    interview_count INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Respondents
CREATE TABLE respondents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) NOT NULL,
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    status TEXT DEFAULT 'invited',  -- 'invited', 'started', 'completed'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    campaign_id UUID REFERENCES campaigns(id),
    interview_id UUID REFERENCES interviews(id),
    report_type TEXT NOT NULL,  -- 'per_interview', 'campaign_summary', 'custom'
    status TEXT DEFAULT 'pending',  -- 'pending', 'generating', 'completed', 'failed'
    content JSONB,  -- structured report data
    pdf_path TEXT,  -- Supabase Storage path
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Strategy

Use `org_id` on every tenant-scoped table. Store `org_id` in user's `app_metadata` during signup/invite (set via Supabase admin API, not user-modifiable). RLS policies extract org_id from JWT:

```sql
-- Example RLS policy pattern (apply to all tenant tables)
CREATE POLICY "tenant_isolation" ON campaigns
    FOR ALL
    USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::UUID);
```

**Why `app_metadata` over a profiles join:** Performance. JWT extraction is O(1) per query. Joining profiles on every RLS check adds latency that compounds with complex queries. The tradeoff is that org changes require token refresh, which is acceptable since org changes are rare.

**Denormalize `org_id`** onto interviews, transcript_entries, and insights even though they can be derived via campaign_id joins. This avoids expensive JOIN-based RLS policies that Supabase documentation explicitly warns against.

## Script Engine Architecture

### Script Data Structure (JSONB)

Interview scripts are stored as a directed graph of question nodes:

```json
{
  "version": 1,
  "initial_node": "intro",
  "system_prompt": "You are a professional interviewer conducting a UX research interview...",
  "nodes": {
    "intro": {
      "type": "statement",
      "content": "Thank you for joining. I'd like to ask you about your experience with...",
      "next": "q1"
    },
    "q1": {
      "type": "question",
      "content": "Can you walk me through how you typically handle [topic]?",
      "follow_up_prompt": "Ask a relevant follow-up based on their answer, probing for specific examples.",
      "max_follow_ups": 2,
      "transitions": [
        { "condition": "answered", "next": "q2" },
        { "condition": "off_topic", "next": "q1_redirect" },
        { "condition": "confused", "next": "q1_rephrase" }
      ]
    },
    "q1_redirect": {
      "type": "redirect",
      "content": "That's interesting. Let me bring us back to the main topic...",
      "next": "q1"
    },
    "q2": {
      "type": "question",
      "content": "What was the most frustrating part of that process?",
      "follow_up_prompt": "Dig deeper into the frustration. What caused it? How did they feel?",
      "max_follow_ups": 1,
      "transitions": [
        { "condition": "answered", "next": "q3" }
      ]
    },
    "closing": {
      "type": "statement",
      "content": "Thank you so much for your time. Your insights are very valuable.",
      "next": null
    }
  }
}
```

### How the Agent Uses the Script

The Script Engine is a Python class that the LiveKit agent consults on every turn:

```python
class ScriptEngine:
    """Drives interview flow from a script graph loaded from Supabase."""

    def __init__(self, script_data: dict):
        self.nodes = script_data["nodes"]
        self.current_node_id = script_data["initial_node"]
        self.system_prompt = script_data["system_prompt"]
        self.follow_up_count = 0

    def get_current_instruction(self) -> dict:
        """Returns the current node for the agent to execute."""
        return self.nodes[self.current_node_id]

    def advance(self, condition: str) -> dict | None:
        """Transition to the next node based on condition.
        Returns the new node, or None if interview is complete."""
        node = self.nodes[self.current_node_id]
        for transition in node.get("transitions", []):
            if transition["condition"] == condition:
                self.current_node_id = transition["next"]
                self.follow_up_count = 0
                return self.nodes.get(self.current_node_id)
        # Default: move to first transition
        if node.get("next"):
            self.current_node_id = node["next"]
            self.follow_up_count = 0
            return self.nodes.get(self.current_node_id)
        return None  # Interview complete

    def should_follow_up(self) -> bool:
        node = self.nodes[self.current_node_id]
        max_fu = node.get("max_follow_ups", 0)
        return self.follow_up_count < max_fu

    def record_follow_up(self):
        self.follow_up_count += 1
```

The agent's LLM prompt is dynamically composed each turn:

```
System: {script.system_prompt}

Current question context: {current_node.content}
Follow-up guidance: {current_node.follow_up_prompt}
Conversation so far: {transcript_buffer}

Instructions: Ask the current question naturally. If the respondent has
answered sufficiently, respond with [ADVANCE]. If they seem confused,
respond with [CONFUSED]. If off-topic, respond with [REDIRECT].
```

Claude determines the transition condition via structured output (function calling or tagged responses), and the Script Engine advances accordingly. This keeps the LLM conversational while the script graph provides structure.

## LiveKit Rooms and Multi-Tenant Mapping

### Room Naming Convention

```
room_name = f"interview_{interview.id}"
```

Each interview gets one LiveKit room. The room is ephemeral -- created when the respondent connects, destroyed when the interview ends.

### Dispatch Flow

1. **Respondent clicks invite link** in browser
2. **Next.js API route** validates invite token, looks up campaign + script + voice config
3. **Mints a LiveKit participant token** with embedded agent dispatch:

```python
# Python API (Railway) - token endpoint
from livekit.api import AccessToken, VideoGrants, RoomAgentDispatch, RoomConfiguration

def create_interview_token(interview_id: str, campaign: dict, script: dict):
    token = AccessToken(api_key, api_secret)
    token.identity = f"respondent_{interview_id}"
    token.video_grants = VideoGrants(
        room=f"interview_{interview_id}",
        room_join=True
    )
    # Pass all interview context as metadata for the agent
    token.room_configuration = RoomConfiguration(
        agents=[RoomAgentDispatch(
            agent_name="interview-agent",
            metadata=json.dumps({
                "interview_id": interview_id,
                "campaign_id": campaign["id"],
                "org_id": campaign["org_id"],
                "script_data": script["script_data"],
                "voice_provider": campaign["voice_provider"],
                "voice_id": campaign["voice_id"],
                "language": campaign["language"],
            })
        )]
    )
    return token.to_jwt()
```

4. **LiveKit dispatches the agent** to the room with the metadata
5. **Agent worker** receives the job, reads metadata, initializes ScriptEngine and TTS adapter:

```python
# Agent worker (Railway)
from livekit.agents import Agent, AgentSession, RoomIO, JobContext

class InterviewAgent(Agent):
    def __init__(self, script_engine, tts_adapter):
        super().__init__(instructions=script_engine.system_prompt)
        self.script = script_engine
        self.tts = tts_adapter

async def entrypoint(ctx: JobContext):
    metadata = json.loads(ctx.room.metadata or "{}")
    script = ScriptEngine(metadata["script_data"])
    tts = create_tts_adapter(metadata["voice_provider"], metadata["voice_id"])

    agent = InterviewAgent(script, tts)
    session = AgentSession(stt=deepgram_stt, llm=claude_llm, tts=tts)
    await session.start(agent=agent, room=ctx.room)
```

### Key Design Decisions

- **One room per interview.** No room sharing. Simple, isolated, auditable.
- **Metadata carries all context.** The agent worker is stateless -- it reads everything from dispatch metadata. No database lookup needed at agent startup (reduces latency).
- **Agent name `interview-agent`** is the single registered agent. All customization comes from metadata, not different agent types.
- **Workers scale horizontally.** Railway can run multiple worker instances. LiveKit load-balances job dispatch across available workers automatically.

## WhatsApp Async Interview Architecture

### Why It Is Fundamentally Different

| Aspect | WebRTC (LiveKit) | WhatsApp |
|--------|-------------------|----------|
| Timing | Real-time, synchronous | Async, minutes/hours between turns |
| Audio | Streaming bidirectional | Discrete voice message files |
| Session | Single continuous session | Multiple webhook events over time |
| State | In-memory (agent process) | Must persist to database between turns |
| TTS output | Streaming audio to WebRTC | Pre-rendered audio file sent as WhatsApp voice message |

### WhatsApp Flow Architecture

```
Respondent sends voice msg
        │
        ▼
WhatsApp Cloud API ──webhook──▶ Python API (Railway)
                                       │
                                       ▼
                               1. Verify webhook signature
                               2. Download voice message media
                               3. Look up interview state from DB
                                       │
                                       ▼
                               4. STT: transcribe voice message (Deepgram)
                               5. Load ScriptEngine state from DB
                               6. LLM: Claude generates response + transition
                               7. Update ScriptEngine state in DB
                               8. TTS: Generate response audio file
                                       │
                                       ▼
                               9. Upload audio to WhatsApp via API
                              10. Save transcript entry to DB
                              11. Respond 200 to webhook (or use async pattern)
```

### State Persistence for WhatsApp

Since WhatsApp interviews span hours/days, interview state must be persisted:

```sql
-- WhatsApp interview state (extends interviews table)
-- Store in interviews.whatsapp_state JSONB column
{
    "current_node_id": "q2",
    "follow_up_count": 1,
    "conversation_history": [...],  -- last N turns for LLM context
    "last_activity_at": "2026-04-04T10:30:00Z"
}
```

### Critical Webhook Pattern

WhatsApp webhooks MUST return 200 within 5 seconds or WhatsApp retries (causing duplicates). Use the async processing pattern:

```python
@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    body = await request.json()
    # Validate, extract message
    if is_voice_message(body):
        # Enqueue for async processing -- return immediately
        await enqueue_whatsapp_turn(body)
    return Response(status_code=200)

async def enqueue_whatsapp_turn(message_data: dict):
    """Insert into Supabase pgmq queue for background processing."""
    await supabase.rpc("pgmq_send", {
        "queue_name": "whatsapp_turns",
        "message": json.dumps(message_data)
    })
```

### Shared Code Between Channels

The **ScriptEngine** and **Claude LLM interaction** are identical for both channels. The difference is only in I/O:

| Component | WebRTC | WhatsApp |
|-----------|--------|----------|
| Audio input | LiveKit streaming | Downloaded voice file |
| STT | Deepgram streaming | Deepgram file transcription |
| Script Engine | Same | Same |
| LLM (Claude) | Same | Same |
| TTS | Streaming to LiveKit | File generation, upload to WhatsApp |
| State | In-memory (agent process) | Persisted in Supabase JSONB |

## Analysis Pipeline Architecture

### Two-Tier Analysis

**Tier 1: Per-Interview Analysis** (runs immediately after interview completes)

```
Interview completes
        │
        ▼
  Supabase trigger / API call
        │
        ▼
  Enqueue job: { type: "analyze_interview", interview_id: "..." }
        │
        ▼
  Analysis Worker picks up job
        │
        ▼
  1. Fetch full transcript from DB
  2. Claude API call with structured output:
     - Executive summary
     - Key themes (array)
     - Notable quotes (array with context)
     - Sentiment assessment
     - Pain points identified
  3. Store results in interview_insights table
  4. Update interview status
  5. Trigger per-interview report generation
```

**Tier 2: Cross-Campaign Analysis** (runs on-demand or after N interviews complete)

```
User clicks "Generate Campaign Analysis"
  OR auto-trigger after every 5th completed interview
        │
        ▼
  Enqueue job: { type: "analyze_campaign", campaign_id: "..." }
        │
        ▼
  Analysis Worker picks up job
        │
        ▼
  1. Fetch all interview_insights for campaign
  2. Fetch all transcripts (or summaries if too large)
  3. Claude Batch API for cost efficiency:
     - Theme extraction across interviews
     - Sentiment trends
     - Pattern identification
     - Contradictions and outliers
     - Key recommendations
  4. Store results in campaign_analyses table
  5. Trigger campaign report generation
```

### Why Claude Batch API for Cross-Analysis

For a campaign with 50 interviews, cross-analysis might require processing 50+ transcript summaries. The Claude Message Batches API provides:
- **50% cost reduction** vs standard API
- **Up to 10,000 requests per batch**
- **Most batches complete in under 1 hour**
- No real-time requirement -- users expect cross-analysis to take minutes

Use standard (synchronous) Claude API for per-interview analysis (users want it fast). Use Batch API for cross-campaign analysis (users expect a delay).

### Job Queue Architecture (Supabase pgmq)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  Triggers     │     │  pgmq Queue  │     │  Analysis Worker     │
│              │     │              │     │  (Python / Railway)  │
│ - Interview  │────▶│ analyze_     │────▶│                      │
│   completed  │     │ interview    │     │  Poll queue every    │
│              │     │              │     │  10 seconds          │
│ - User click │────▶│ analyze_     │     │                      │
│   "Analyze"  │     │ campaign     │     │  Process job:        │
│              │     │              │     │  - Fetch data        │
│ - User click │────▶│ generate_    │     │  - Call Claude       │
│   "Report"   │     │ report       │     │  - Store results     │
│              │     │              │     │  - Generate PDF      │
│ - WhatsApp   │────▶│ whatsapp_    │     │                      │
│   voice msg  │     │ turns        │     │                      │
└──────────────┘     └──────────────┘     └──────────────────────┘
```

Use **separate queues** for different job types so they can be processed with different concurrency and priority:
- `whatsapp_turns` -- high priority, process immediately (user is waiting)
- `analyze_interview` -- medium priority, process within minutes
- `analyze_campaign` -- low priority, batch processing acceptable
- `generate_report` -- low priority, PDF generation is CPU-bound

## Report Generation Architecture

### Pipeline

```
Analysis complete (insights stored)
        │
        ▼
  Enqueue: { type: "generate_report", report_id: "..." }
        │
        ▼
  Report Worker:
  1. Fetch insights + transcript from DB
  2. Render HTML report from Jinja2 template
  3. Convert HTML to PDF (WeasyPrint)
  4. Upload PDF to Supabase Storage
  5. Update report record with pdf_path
  6. Notify frontend via Supabase Realtime (status change)
```

### Why WeasyPrint over alternatives

- **Pure Python** -- no headless Chrome, no Puppeteer, no external service
- **CSS-based layout** -- design reports with HTML/CSS, convert to PDF
- **Runs on Railway** -- no special system dependencies beyond what pip provides
- **Production-proven** for document generation at moderate scale

### Report Types

| Report Type | Trigger | Data Source | Template |
|-------------|---------|-------------|----------|
| Per-interview | Auto after interview analysis | interview_insights + transcript | interview_report.html |
| Campaign summary | Manual or auto after N interviews | campaign_analyses + aggregated insights | campaign_report.html |
| Custom | Manual with user-defined focus | Subset of insights filtered by user criteria | custom_report.html |

## Recommended Project Structure

```
interview-bot/
├── apps/
│   └── web/                       # Next.js dashboard + interview pages
│       ├── app/
│       │   ├── (dashboard)/       # Authenticated dashboard routes
│       │   │   ├── campaigns/     # Campaign CRUD, overview
│       │   │   ├── interviews/    # Interview monitoring, results
│       │   │   ├── reports/       # Report viewing, export
│       │   │   ├── scripts/       # Script builder UI
│       │   │   └── settings/      # Org settings, voice personas
│       │   ├── interview/[token]/ # Public respondent interview page
│       │   └── api/               # Next.js API routes (token mint, etc.)
│       ├── components/
│       ├── lib/                   # Supabase client, utils
│       └── styles/
│
├── agent/                         # Python agent (Railway)
│   ├── interview_agent/
│   │   ├── agent.py               # LiveKit agent entrypoint + worker
│   │   ├── script_engine.py       # Script graph state machine
│   │   ├── tts_router.py          # TTS provider adapter (Voxtral/ElevenLabs)
│   │   └── transcript_writer.py   # Write transcript entries to Supabase
│   ├── whatsapp/
│   │   ├── webhook.py             # WhatsApp webhook handler (FastAPI)
│   │   ├── media.py               # Download/upload WhatsApp media
│   │   └── state.py               # WhatsApp interview state persistence
│   ├── analysis/
│   │   ├── worker.py              # Queue consumer (pgmq polling)
│   │   ├── interview_analyzer.py  # Per-interview Claude analysis
│   │   ├── campaign_analyzer.py   # Cross-campaign Claude batch analysis
│   │   └── report_generator.py    # HTML-to-PDF pipeline (WeasyPrint)
│   ├── shared/
│   │   ├── supabase_client.py     # Supabase connection
│   │   ├── claude_client.py       # Anthropic API wrapper
│   │   └── models.py              # Shared data models
│   ├── templates/
│   │   ├── interview_report.html  # Jinja2 report templates
│   │   └── campaign_report.html
│   ├── main.py                    # FastAPI app + LiveKit worker startup
│   └── requirements.txt
│
├── supabase/
│   ├── migrations/                # SQL migrations
│   ├── functions/                 # Edge Functions (if needed)
│   └── seed.sql                   # Dev seed data
│
└── .planning/                     # Project planning
```

### Structure Rationale

- **`apps/web`**: Isolates the Next.js frontend. Could become a monorepo app later if needed.
- **`agent/`**: All Python code in one deployable unit on Railway. The LiveKit worker, WhatsApp webhook handler, and analysis workers all run as processes in the same Railway service (or split into separate services for independent scaling later).
- **`supabase/`**: Database migrations and edge functions, managed via Supabase CLI.

## Data Flow

### Flow 1: Web Interview (Real-Time)

```
Respondent clicks invite link
    ▼
Next.js validates token → calls Python API for LiveKit token
    ▼
Browser connects to LiveKit room with token (agent auto-dispatched)
    ▼
Agent reads metadata → loads script → starts interview
    ▼
Respondent speaks → Deepgram STT → text → Script Engine + Claude → response text
    ▼
Response text → TTS Router (Voxtral or ElevenLabs) → audio → LiveKit → Respondent hears
    ▼
Each turn: transcript_entry written to Supabase
    ▼
Interview ends → enqueue analyze_interview job
    ▼
Analysis worker: Claude extracts insights → stored in interview_insights
    ▼
Report worker: generates PDF → stored in Supabase Storage
    ▼
Dashboard shows results via Supabase Realtime subscription
```

### Flow 2: WhatsApp Interview (Async)

```
Respondent receives WhatsApp invite message with campaign link
    ▼
Respondent sends first voice message
    ▼
WhatsApp Cloud API → webhook → Python API (Railway)
    ▼
Enqueue to whatsapp_turns queue → return 200 immediately
    ▼
Worker: download voice → Deepgram STT → load state from DB
    ▼
Script Engine + Claude → response text → TTS → audio file
    ▼
Send audio as WhatsApp voice message → save state + transcript to DB
    ▼
(Respondent replies minutes/hours later → repeat)
    ▼
Interview complete → same analysis pipeline as web
```

### Flow 3: Cross-Campaign Analysis

```
User clicks "Generate Analysis" on campaign with 30 completed interviews
    ▼
Enqueue analyze_campaign job
    ▼
Worker fetches all 30 interview insights from DB
    ▼
Constructs batch of Claude API requests (theme extraction, patterns, sentiment)
    ▼
Submits to Claude Message Batches API (50% cost savings)
    ▼
Polls for batch completion (typically < 1 hour, usually minutes)
    ▼
Stores campaign_analyses records
    ▼
Enqueue generate_report job → PDF generation → Supabase Storage
    ▼
Dashboard notified via Realtime subscription
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 interviews/month | Single Railway service runs agent worker + API + analysis worker as processes. Single Supabase instance. pgmq queues are plenty. |
| 100-1,000 interviews/month | Split agent workers from analysis workers into separate Railway services. Add connection pooling (Supavisor). Consider dedicated queue for WhatsApp if volume is high. |
| 1,000-10,000 interviews/month | Multiple agent worker replicas (LiveKit handles dispatch). Dedicated analysis worker with higher concurrency. May need to move cross-analysis to use document summaries instead of full transcripts to manage Claude token costs. |
| 10,000+ interviews/month | Evaluate moving off pgmq to dedicated queue (Redis/BullMQ). Shard storage by org. Consider Supabase branching or read replicas. |

### Scaling Priorities

1. **First bottleneck: Agent workers.** Each concurrent WebRTC interview requires one agent process. Railway auto-scaling or multiple service instances solve this. LiveKit handles the dispatch.
2. **Second bottleneck: Claude API rate limits.** Cross-campaign analysis with many interviews can hit token limits. Use Batch API, summarize before analyzing, cache intermediate results.
3. **Third bottleneck: Database connections.** Many agent workers + analysis workers + dashboard all hitting Supabase. Use Supavisor connection pooling early.

## Anti-Patterns

### Anti-Pattern 1: Hardcoded Interview Logic in Agent Code

**What people do:** Embed question sequences, branching logic, and follow-up rules directly in Python agent code.
**Why it is wrong:** Every new interview script requires a code deployment. Clients cannot create their own campaigns. No A/B testing of scripts.
**Do this instead:** Store scripts as structured JSONB in the database. Agent reads script at dispatch time via metadata. Script Engine interprets the graph at runtime.

### Anti-Pattern 2: Synchronous WhatsApp Webhook Processing

**What people do:** Process the voice message (download, STT, LLM, TTS, send reply) inside the webhook handler before returning 200.
**Why it is wrong:** WhatsApp requires 200 response within 5 seconds. STT + LLM + TTS easily takes 10-30 seconds. WhatsApp retries, causing duplicate messages.
**Do this instead:** Return 200 immediately. Enqueue the message for async processing. Use idempotency keys (WhatsApp message IDs) to deduplicate.

### Anti-Pattern 3: JOIN-Based RLS Policies

**What people do:** Write RLS policies that join through campaign to check org_id, like `USING (campaign_id IN (SELECT id FROM campaigns WHERE org_id = ...))`.
**Why it is wrong:** This sub-select runs on every single row access. On tables with thousands of transcript entries, it destroys query performance.
**Do this instead:** Denormalize `org_id` onto every tenant-scoped table. RLS checks a simple column equality against the JWT claim. Fast and predictable.

### Anti-Pattern 4: Storing Full Interview State in LiveKit Room Metadata

**What people do:** Try to update LiveKit room metadata as the interview progresses to track state.
**Why it is wrong:** Room metadata is not designed for frequent updates. Race conditions with multiple participants. Lost if room crashes.
**Do this instead:** For WebRTC interviews, keep state in the agent process memory (it lives for the duration of the interview). Write transcript entries to Supabase as they happen for durability. For WhatsApp, persist state in the database between every turn.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| LiveKit Cloud | WebRTC SFU + Agent dispatch via server SDK | Room creation implicit via token. Agent workers register on startup. |
| Deepgram | STT via LiveKit plugin (streaming) + REST API (file transcription for WhatsApp) | Use `es-419` model for Mexican Spanish. |
| Claude API (Anthropic) | Standard Messages API for real-time + Batch API for cross-analysis | Function calling for structured insight extraction. |
| Voxtral (Mistral) | Custom SSE streaming TTS adapter (existing `voxtral_tts.py`) | Reuse from prototype. Cheapest option. |
| ElevenLabs | Official Python SDK, streaming TTS | Premium voice quality. Per-campaign opt-in. |
| WhatsApp Cloud API | Webhook receiver + REST API for sending messages | Requires Meta Business verification. Webhook must return 200 fast. |
| Supabase | Postgres (data) + Auth (users) + Storage (files) + Realtime (notifications) | Single Supabase project, new schema. Use service role key for agent/worker access. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js frontend <-> Supabase | Supabase JS client (direct DB via RLS) | Most CRUD goes direct. No custom API needed for reads. |
| Next.js frontend <-> Python API | HTTP REST calls | Only for: token minting, triggering analysis, WhatsApp setup. Keep thin. |
| Python API <-> LiveKit | LiveKit Server SDK | Token generation, explicit dispatch (if needed), room management. |
| Agent Worker <-> Supabase | Supabase Python client (service role) | Transcript writes, state reads. Service role bypasses RLS (agent is trusted). |
| Analysis Worker <-> Supabase | Supabase Python client (service role) | Read transcripts/insights, write analysis results, update job status. |
| Analysis Worker <-> Claude | Anthropic Python SDK | Standard + Batch API. |
| Dashboard <-> Agent status | Supabase Realtime | Subscribe to interview status changes. Agent updates interview row; dashboard gets notified. |

## Build Order (Dependencies)

The build order is driven by what depends on what:

```
Phase 1: Foundation
  ├── Supabase schema + RLS policies (everything depends on this)
  ├── Auth flow (org creation, user signup, JWT with org_id)
  └── Basic dashboard shell (Next.js + Supabase client)

Phase 2: Core Interview (Web)
  ├── Script Engine (Python) -- needed before agent can be dynamic
  ├── TTS Router with Voxtral adapter (copy from prototype)
  ├── LiveKit agent with ScriptEngine integration
  ├── Token minting endpoint
  └── Respondent interview page (LiveKit React)

Phase 3: Analysis + Reports
  ├── pgmq queue setup
  ├── Per-interview analysis worker
  ├── Report generation (WeasyPrint PDF)
  └── Dashboard: interview results + report viewing

Phase 4: Campaign Management
  ├── Campaign CRUD in dashboard
  ├── Script builder UI
  ├── Respondent management + invite links
  └── Campaign overview with status tracking

Phase 5: WhatsApp Channel
  ├── WhatsApp Cloud API setup + webhook
  ├── Async interview state machine
  ├── Voice message download/send
  └── Shared ScriptEngine for WhatsApp flow

Phase 6: Cross-Analysis + Polish
  ├── Cross-campaign analysis (Claude Batch API)
  ├── Campaign-level reports
  ├── ElevenLabs TTS adapter
  └── Real-time interview monitoring
```

**Ordering rationale:**
- Schema and auth first because every other component reads/writes tenant-scoped data.
- Web interview before WhatsApp because the prototype already has LiveKit working; WhatsApp requires Meta Business API setup (long lead time).
- Analysis after core interview because you need real transcripts to test analysis.
- Campaign management UI can come after core interview works end-to-end (can seed campaigns manually for testing).
- Cross-analysis last because it requires multiple completed interviews to be meaningful.

## Sources

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [LiveKit Agent Dispatch](https://docs.livekit.io/agents/build/dispatch/)
- [LiveKit Agent Sessions](https://docs.livekit.io/agents/logic/sessions/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Queues (pgmq)](https://supabase.com/docs/guides/queues)
- [Supabase Multi-Tenant RLS Patterns](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Claude Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [WhatsApp Cloud API Webhook Architecture](https://dev.to/achiya-automation/building-whatsapp-business-bots-with-the-official-api-architecture-webhooks-and-automation-1ce4)
- [Supabase Background Jobs with pgmq](https://supabase.com/blog/processing-large-jobs-with-edge-functions)
- [LiveKit Multi-Agent Architecture](https://kb.livekit.io/articles/9330389701-building-multi-agent-architectures-with-livekit-agents)

---
*Architecture research for: AI Voice Interview SaaS (EntrevistaAI)*
*Researched: 2026-04-04*
