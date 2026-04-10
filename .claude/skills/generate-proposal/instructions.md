# /generate-proposal Instructions

## Step 1: Parse argument

The argument is a campaign ID (UUID) or campaign name (string). Determine which:
- If it matches UUID format → use as `campaign_id` directly
- If it's a string → search campaigns by name

## Step 2: Fetch data from Supabase

Run a Node.js script to pull all data:

```bash
cd <project_root> && node -e "
const { createClient } = require('@supabase/supabase-js');
const c = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xengrpgbrxqwrzmnmllx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {db:{schema:'entrevista'}}
);

async function main() {
  // Find campaign
  const campQuery = '<UUID_OR_NAME_LOGIC>';
  const camp = await c.from('campaigns').select('*').eq('id', CAMPAIGN_ID).single();
  
  // Get research brief
  const brief = await c.from('research_briefs').select('brief_data').eq('campaign_id', camp.data.id).single();
  
  // Get all interviews for this campaign
  const interviews = await c.from('interviews').select('id, status, duration_seconds, started_at')
    .eq('campaign_id', camp.data.id).order('created_at');
  
  // Get all transcripts across all interviews
  for (const int of interviews.data) {
    const t = await c.from('transcript_entries').select('speaker, content, elapsed_ms')
      .eq('interview_id', int.id).order('elapsed_ms');
    int.transcript = t.data;
  }
  
  // Get respondent info
  const respondents = await c.from('respondents').select('name, status')
    .eq('campaign_id', camp.data.id);
  
  console.log(JSON.stringify({
    campaign: camp.data,
    brief: brief.data?.brief_data,
    interviews: interviews.data,
    respondents: respondents.data
  }, null, 2));
}
main();
"
```

Adapt the query based on whether the argument is a UUID or name.

## Step 3: Analyze the transcript

With the full transcript data, perform this analysis:

### 3a. Business Profile
Extract from the transcript:
- Company name and what they do
- Founder/contact name and role
- Team size (internal + external)
- Location(s)
- Products/services
- Sales channels (physical, digital, % split)
- Key numbers (revenue, volume, customers, etc.)
- Growth plans

### 3b. Process Mapping
Identify the key business processes mentioned:
- Map the end-to-end flow (from start to customer)
- Note which steps are manual vs automated
- Note which tools/systems are used at each step
- Identify handoffs between people/systems

### 3c. Pain Points (P1, P2, ...)
For each friction/problem mentioned:
- Give it a numbered ID (P1, P2, ...)
- Name it clearly
- Describe the impact (time wasted, money lost, quality issues)
- Note supporting quotes from the transcript

### 3d. Technology Opportunities (O1, O2, ...)
For each pain point, identify what technology could solve it:
- Give it a numbered ID (O1, O2, ...)
- Name the solution type (dashboard, automation, integration, etc.)
- Link it to the pain point(s) it resolves
- Estimate the impact

### 3e. Phase Grouping
Group opportunities into 2-4 implementation phases:
- Phase 1: Highest impact, quickest win (the "start here" phase)
- Phase 2-3: Building on Phase 1, progressively more complex
- Each phase should deliver standalone value

### 3f. Pricing Estimation
Based on complexity, estimate MXN ranges for each phase:
- Simple dashboard/CRM: $10,000-$18,000 MXN
- Dashboard + integrations (WhatsApp, APIs): $15,000-$25,000 MXN
- Complex system (multi-module, international): $20,000-$35,000 MXN
- Bundle discount: 10-15% off total

These are ESTIMATES. Always include the disclaimer note.

## Step 4: Generate HTML

Use the template at `analysis/ximena-corcuera-proposal.html` as the REFERENCE DESIGN. Read that file and replicate its exact structure, styling, and branding but with the new client's data.

Key design elements to preserve:
- Dark theme (--bg: #0a0a0f)
- Space Grotesk + Inter fonts
- NSS logo: `NOT SO <span style="color:var(--accent)">SOFT(WARE)</span>`
- Violet accent (#8b5cf6)
- Section numbering (01, 02, 03...)
- Pain points with red left border
- Opportunities with green left border + phase badge
- Phase cards with price ranges
- Total box with bundle discount
- Estimate disclaimer notes
- 30/40/30 payment terms
- "Acceso completo" (not "duena de todo")
- Guarantee box
- Methodology section with call details
- WhatsApp CTA (wa.me/5215563165990) + email CTA (mauricio.torres.91@gmail.com)
- Mobile-friendly (viewport meta, clamp(), responsive)
- Print-friendly (@media print with page-break-inside: avoid)

Save to: `analysis/<client-name-slug>-proposal.html`

## Step 5: Open in browser

```bash
start "" "<full_path_to_html>"
```

Tell the user: "Proposal generated. Open in browser → Ctrl+P → Save as PDF with 'Background graphics' checked and margins set to 'None'."

## Important Notes

- ALL text in Spanish
- Use proper HTML entities for accents (e.g., `&oacute;`, `&aacute;`, `&eacute;`, `&iacute;`, `&uacute;`, `&ntilde;`)
- Prices always in MXN with ranges
- Always include the "estimados iniciales" disclaimer
- The "Sobre Nosotros" section is always the same NSS boilerplate
- Contact info: mauricio.torres.91@gmail.com / +52 55 6316 5990
- WhatsApp link: https://wa.me/5215563165990?text=<pre-filled message>
- If transcript data is thin (few entries), note what additional info is needed
- If multiple interviews exist for the campaign, combine all transcripts for richer analysis
