---
name: generate-proposal
description: "Generate a professional business proposal (HTML) from EntrevistaAI interview transcripts. Use this skill whenever the user wants to create a proposal, quote, or analysis document for a client based on discovery call recordings. Triggers on: 'generate proposal', 'create proposal', 'make a proposal for', 'proposal for [client]', 'analyze interviews for [client]', 'create quote', or any mention of turning interview transcripts into a deliverable document. Also use when the user says things like 'prepare the proposal for Ximena' or 'I need to send the client a proposal'."
---

# generate-proposal

Generate a professional business proposal from interview transcripts stored in Supabase. Analyzes business operations, identifies pain points, maps technology opportunities, and outputs a branded HTML document ready for PDF export.

## How it works

The skill takes a campaign ID or name, fetches all interview transcripts from Supabase, then uses Claude to analyze the business and generate a comprehensive proposal document.

**Input:** Campaign ID (UUID) or campaign name (string)
**Output:** HTML file at `analysis/<client-name>-proposal.html`, auto-opened in browser

## Instructions

Read and follow `instructions.md` in this skill directory for the complete step-by-step process.

The high-level flow:
1. Parse the argument (UUID or campaign name)
2. Fetch from Supabase: campaign config, research brief, all interview transcripts, respondent info
3. Analyze: business profile, process mapping, pain points (P1, P2...), technology opportunities (O1, O2...)
4. Group opportunities into 2-4 implementation phases with MXN price ranges
5. Generate HTML using the reference template design at `analysis/ximena-corcuera-proposal.html`
6. Open in browser for Ctrl+P → PDF export

## Key design elements (from reference template)

- Dark theme (#0a0a0f background, #8b5cf6 violet accent)
- Space Grotesk + Inter fonts
- NSS logo: "NOT SO SOFT(WARE)" with violet accent on "SOFT(WARE)"
- Numbered sections (01, 02, 03...)
- Pain points: red left border cards
- Opportunities: green left border cards with phase badge
- Phase cards with MXN price ranges (always ranges, never fixed prices)
- Estimate disclaimer: "Los precios son estimados iniciales..."
- Payment: 30/40/30 structure
- Access model: "Acceso completo: tu plataforma, tus datos, tus cuentas. Licencia de uso permanente."
- CTA: WhatsApp (wa.me/5215563165990) + Email (mauricio.torres.91@gmail.com)
- All text in Spanish with proper HTML entities for accents
- Mobile-friendly (viewport meta, clamp() fonts, responsive)
- Print-friendly (@media print with page-break-inside: avoid)

## Pricing guidelines

| Complexity | Range |
|-----------|-------|
| Simple dashboard/CRM | $10,000 - $18,000 MXN |
| Dashboard + integrations (WhatsApp, APIs) | $15,000 - $25,000 MXN |
| Complex system (multi-module, international) | $20,000 - $35,000 MXN |
| Bundle discount | 10-15% off total |

Always present as estimated ranges. Include the disclaimer note.

## Requirements

- Supabase credentials in `.env.local`
- At least one interview transcript in the campaign
- Node.js available (for Supabase client queries)
