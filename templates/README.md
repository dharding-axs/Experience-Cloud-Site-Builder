# Experience Cloud Site Builder — Templates

Production-ready reference templates extracted from the Southwest Airlines AMA Help Center build. Use as the starting point for any new LWR Help Center site with Agentforce chat integration.

## Placeholder Convention

All templates use these placeholders. Find-and-replace across the `templates/` directory before deploying.

| Placeholder | Replace with | Example |
|---|---|---|
| `{{prefix}}` | Lowercase CSS/resource prefix | `swa` → `acme` |
| `{{Prefix}}` | PascalCase Apex/JS class prefix | `Swa` → `Acme` |
| `{{PREFIX}}` | Uppercase label prefix | `SWA` → `ACME` |
| `{{ClientName}}` | Client display name | `Southwest Airlines` → `Acme Corp` |

## Component Inventory

### Foundation (required on every site)
| Template | Purpose | Deploy first? |
|---|---|---|
| `lwc/GlobalStyles/` | Invisible LWC that injects global CSS via `loadStyle`. Drag onto every page in Experience Builder. | Yes |
| `staticresources/HelpCenterOverrides.css` | LWR layout fixes + Embedded Messaging counter-rules. Loaded by GlobalStyles. | Yes |

### Page Components
| Template | Concept | Notes |
|---|---|---|
| `lwc/HelpCenterHeader/` | All | Navigation with hamburger mobile menu. Uses full-width bleed pattern. |
| `lwc/HelpCenterHero/` | A | Static 2×2 topic card grid. |
| `lwc/HelpCenterSearch/` | A | Basic search bar, dispatches `search` event. |
| `lwc/HelpCenterTopics/` | All | 3-column topic tile grid with SVG icons. |
| `lwc/HelpCenterFooter/` | All | 4-column link grid + social icons + copyright bar. |
| `lwc/HelpCenterSearchB/` | B | **Search-to-Chat.** Single LWC: search transforms into inline chat panel with Knowledge-powered responses, dynamic contextual pills, and split-screen login. |
| `lwc/HelpCenterHeroC/` | C | **Fullscreen Concierge.** CTA hero + full-screen chat overlay. Same feature set as B. |
| `lwc/HelpCenterSearchD/` | D | **Native ECV2.** CSS-repositions platform ECV2 iframe into a branded panel. Requires working ECV2 deployment. No custom Apex needed. |

### Backend
| Template | Purpose |
|---|---|
| `classes/AgentChatController.cls` | `@AuraEnabled` Knowledge search for Concept B/C (Tier 2 responses). Uses `without sharing` — required for guest user access. |
| `classes/KnowledgeSearch.cls` | `@InvocableMethod` for Agentforce agent to search Knowledge directly. |

### Permission Sets (deploy all three)
| Template | Assign to |
|---|---|
| `permissionsets/Messaging_Guest_Access.permissionset-meta.xml` | Both guest users: EC site + ESW backing site |
| `permissionsets/Chat_Guest_Access.permissionset-meta.xml` | EC site guest user only |
| `permissionsets/Agent_Access.permissionset-meta.xml` | Agent runtime user |

## Customer-Specific Sections

These sections require client-specific updates before any demo is production-ready:

**`HelpCenterSearchB.js` / `HelpCenterHeroC.js`:**
- `initialSuggestions` — top-level topic pills (one per agent topic)
- `followUpPills` — per-topic follow-up suggestions  
- `topicResponses` — simulated fallback text per topic
- `followUpResponses` — per-pill detailed text
- `detectTopic()` — keyword patterns for routing user input to topics

**`AgentChatController.cls`:**
- `TOPIC_URLS` map — Knowledge article UrlNames per topic
- `queryByKeywords` filter — `UrlName LIKE '{{prefix}}-%'`

**`HelpCenterHero.html` / `HelpCenterTopics.html` / `HelpCenterFooter.html`:**
- Card titles, topic tile labels, footer link columns, copyright text

## Design Concepts

| Concept | Component | Agent Integration | When to use |
|---|---|---|---|
| A | HelpCenterHero + HelpCenterSearch | Standard floating FAB | Baseline for comparison |
| B | HelpCenterSearchB | Search bar transforms to chat (Knowledge-powered) | Reduce friction, search-native audience |
| C | HelpCenterHeroC | CTA-triggered fullscreen takeover | Executive demos, mobile-first |
| D | HelpCenterSearchD | CSS-repositioned real ECV2 | Need real agent runtime, have ECV2 deployed |

## Deployment Order

```bash
# 1. Deploy Apex (required before LWC that calls it)
sf project deploy start --source-dir templates/classes --target-org <alias>

# 2. Deploy permission sets
sf project deploy start --source-dir templates/permissionsets --target-org <alias>

# 3. Deploy static resources
sf project deploy start --source-dir templates/staticresources --target-org <alias>

# 4. Deploy LWC components
sf project deploy start --source-dir templates/lwc --target-org <alias>

# 5. Assign permission sets to guest users (CLI)
# See CLAUDE.md Phase 6 Step 5 for full instructions

# 6. Configure Experience Builder (manual):
#    - Drag GlobalStyles onto every page
#    - Drag concept-specific components into Content region (NOT theme layout)
#    - Publish site
```

## Critical Reminders

- The `*` CSS reset in LWC components **leaks in LWR** (no Shadow DOM). The Embedded Messaging counter-rules in `HelpCenterOverrides.css` fix this — never remove them.
- Always create Embedded Service Deployments through the **Setup UI wizard**, not metadata deploy. Metadata deploy does not provision the ESW backing site.
- `areGuestUsersAllowed` resets to `false` every time you create a new deployment. Always check and redeploy the `EmbeddedServiceConfig` after creation.
- Test in **incognito** — cached service workers mask fixes.
