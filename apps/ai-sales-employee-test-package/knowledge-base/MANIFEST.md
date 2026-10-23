# Knowledge-base manifest

The agent uses **5 text documents** (RAG enabled, embedding model `e5_mistral_7b_instruct`). There are no uploaded files and no URL sources. Document 05 is also attached directly to the workflow node `objection`.

| File | Document name in ElevenLabs | Original source type | Export status | Content recovered | sha256 (first 16) |
|---|---|---|---|---|---|
| `01-product-overview.md` | 01 - Product Overview (AI Sales Employee) (attached as "01 - AI Sales Employee: Product Overview") | text document (`m7gggN4S1LXAjVAthyVO`), usage `auto` | exported | FULL: byte size matches server (2984 B) | `e3c37ab47ac20843` |
| `02-capabilities-current-and-planned.md` | 02 - Capabilities: Current vs Planned (attached as "02 - Capabilities: Current vs Planned") | text document (`B6faafMYfIiC0ynveyxf`), usage `auto` | exported | FULL: byte size matches server (2058 B) | `1f03ddbdabbfc783` |
| `03-onboarding-and-pricing.md` | 03 - Onboarding, Pricing and Commercial Terms (attached as "03 - Onboarding and Pricing") | text document (`jYqlYSLlDqmHRCkRCeex`), usage `auto` | exported | FULL: byte size matches server (1836 B) | `763a765e6c45a655` |
| `04-privacy-compliance-and-company.md` | 04 - Privacy, Compliance and Our Company (attached as "04 - Privacy, Compliance and Company") | text document (`iRhzjTHsbxSZ4VrFkfx9`), usage `auto` | exported | FULL: byte size matches server (1986 B) | `8dbdc795b5e5708e` |
| `05-objection-registry.md` | 05 - Objection Registry (attached as "05 - Objection Registry") | text document (`79t6UeweAfwe0hvAwLI4`), usage `auto` | exported | FULL: byte size matches server (8448 B) | `edf9bc5021d2959f` |

## How the content was recovered

The full text of each document was read through the ElevenLabs Agents API, through the account owner's authorised ElevenLabs connector. Each file here is byte-for-byte the uploaded source text: its length equals the server-reported `size_bytes`, and its text matched the API response on review.

## Knowledge base items NOT included

| Item | Why excluded |
|---|---|
| 5 archived documents from an earlier property-buyer setup (folder "ARCHIVE - Property sales client template") | Not attached to this agent. They belonged to a different, superseded use case (selling properties to consumers). |
| Company facts marked `NOT PROVIDED` inside the documents (company name, contact details, pricing, onboarding duration, certifications) | Do not exist in the source. They are intentionally unknown and were not invented. |

Placeholders such as `NOT PROVIDED` are part of the real source content. They tell the agent never to guess those facts.

