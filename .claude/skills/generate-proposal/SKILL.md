# generate-proposal

Generate a business proposal from interview transcripts stored in Supabase.

## When to use

Use `/generate-proposal` after completing one or more discovery call interviews with a client via the EntrevistaAI platform. The skill pulls transcripts from Supabase, analyzes the business operations, identifies pain points and opportunities, and generates a professionally formatted HTML proposal with NSS branding.

## Usage

```
/generate-proposal <campaign_id_or_name>
```

Examples:
```
/generate-proposal 79681ff2-c888-447d-810b-02ebb29f051e
/generate-proposal "Ximena Corcuera"
```

## What it does

1. **Fetches data from Supabase**: Campaign config, respondent info, all interview transcripts
2. **Analyzes the business**: Maps operations, processes, team structure, tools used
3. **Identifies pain points**: Finds friction, manual processes, bottlenecks, data gaps
4. **Detects opportunities**: Maps technology solutions to each pain point
5. **Generates proposal**: Professional HTML document with NSS branding, ready for PDF export
6. **Opens in browser**: Auto-opens the HTML file for Ctrl+P → Save as PDF

## Output

HTML file saved to `analysis/<client-name>-proposal.html` with:
- Cover page with NSS branding
- Business profile from interview data
- Process flow mapping
- Numbered pain points (P1, P2, ...)
- Technology opportunities linked to pain points and phases (O1→Fase 1, etc.)
- 3-phase implementation proposal with MXN price ranges
- Investment summary with payment terms
- Timeline
- About NSS section
- Methodology/data sources
- WhatsApp + email CTA

## Requirements

- Supabase credentials in `.env.local` (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- At least one completed interview transcript in the campaign
- Node.js (for Supabase client)
