# Experience Cloud Help Center with Agentforce Chat — Build Process

A step-by-step record of everything involved in building an Experience Cloud LWR site with multiple design concept pages and integrated Agentforce agent chat. Written so someone following the same process knows exactly what to expect — what's automated, what's manual, and where time goes.

**Org:** Salesforce SDO/demo org with Experience Cloud, Agentforce, and Knowledge enabled
**Site type:** LWR (Lightning Web Runtime)
**Agent integration tiers:** Simulated (Tier 1) → Knowledge-powered (Tier 2) → Live MIAW (Tier 3, future)
**Total build time:** ~12–16 hours across multiple sessions

---

## Phase 1: Project Setup & Org Authentication

| Step | Method | Time |
|------|--------|------|
| 1.1 Create SFDX project | Automated — `sf project generate --name Southwest-AMA-Agent-v2` | 1 min |
| 1.2 Authenticate to org | Manual — `sf org login web --alias southwest-ama` → browser login | 2 min |
| 1.3 Set target org | Automated — `sf config set target-org southwest-ama` | 1 min |
| 1.4 Verify org capabilities | Automated — `sf org display --json`, query for Experience Cloud license, Knowledge enabled | 2 min |

**Phase total: ~5 min**

---

## Phase 2: LWR Site Creation

| Step | Method | Time |
|------|--------|------|
| 2.1 Create Experience Cloud site | **Manual** — Setup → Digital Experiences → New → select LWR template ("Build Your Own") → name the site → create | 3 min |
| 2.2 Register site domain (if needed) | **Manual** — Setup → Sites (under "Sites and Domains") → Register My Salesforce Site Domain | 2 min |
| 2.3 Verify site exists | Automated — `sf data query --json --query "SELECT Id, Name, Status, UrlPathPrefix FROM Network WHERE Name = 'Southwest Help Center'"` | 1 min |

**Phase total: ~5 min**

> **Why manual:** LWR site creation requires the Setup UI wizard. There is no CLI command to create an Experience Cloud site. The wizard provisions the site's backing infrastructure (guest user, CDN config, URL routing).

---

## Phase 3: Shared Infrastructure — Static Resources & Global Styles

These components are shared across ALL concept pages.

| Step | Method | Time |
|------|--------|------|
| 3.1 Create brand logo static resource | Automated — generate `swaLogoLight.svg` + `.resource-meta.xml` | 5 min |
| 3.2 Create global CSS static resource | Automated — generate `swaHelpCenterOverrides.css` + `.resource-meta.xml` containing: full-width layout overrides, zero-gap rules, Embedded Messaging counter-rules | 15 min |
| 3.3 Create global styles loader LWC | Automated — generate `swaGlobalStyles` (invisible LWC that injects CSS via `loadStyle`) | 5 min |
| 3.4 Deploy shared infrastructure | Automated — `sf project deploy start --json --source-dir <dirs> --target-org southwest-ama` | 2 min |

**Phase total: ~25 min**

### What the global CSS solves

LWR sites have three CSS problems that must be addressed:

1. **LWR content wrappers add padding/max-width** — components don't go full-width. Fixed with wildcard attribute selectors targeting `[class*="contentRegion"]`, `[class*="outerContainer"]`, etc.

2. **LWR injects gaps between components** — `row-gap`, `margin-top/bottom` on wrapper elements create unwanted spacing. Fixed with `row-gap: 0` and `margin: 0` on `webruntimedesign-component-wrapper`.

3. **LWC `* { margin: 0; padding: 0 }` resets leak in LWR** — because LWR has no Shadow DOM, the universal selector collapses every element on the page to `height: 0`, including the Embedded Messaging container. Fixed with counter-rules that use higher-specificity `.embedded-messaging` selectors to `revert` the reset.

> **Critical lesson learned:** Do NOT try to fix #3 by modifying the `*` selector (`:host *`, `.class *`, `*:not()`). All alternatives break the SLDS override chain. The only fix is higher-specificity counter-rules in the global static resource.

---

## Phase 4: Shared LWC Components (Concept A Baseline)

These components appear on all concept pages.

| Step | Component | Method | Time |
|------|-----------|--------|------|
| 4.1 | `swaHelpCenterHeader` — Nav bar with logo, links, hamburger mobile menu | Automated — generate HTML/JS/CSS (326 lines) | 30 min |
| 4.2 | `swaHelpCenterHero` — Hero banner with search bar | Automated — generate HTML/JS/CSS (202 lines) | 20 min |
| 4.3 | `swaHelpCenterSearch` — Basic search component (Concept A) | Automated — generate HTML/JS/CSS (164 lines) | 15 min |
| 4.4 | `swaHelpCenterTopics` — Topic cards grid (8 topic cards with SVG icons) | Automated — generate HTML/JS/CSS (234 lines) | 20 min |
| 4.5 | `swaHelpCenterFooter` — Footer with links, social icons, legal | Automated — generate HTML/JS/CSS (375 lines) | 20 min |
| 4.6 | Deploy all baseline components | Automated — `sf project deploy start` | 2 min |
| 4.7 | Create Concept A page in Experience Builder | **Manual** — create new page with Frame layout, set URL path, drag components into content region | 10 min |
| 4.8 | Place shared components in Theme layout | **Manual** — drag Header into Theme Header, drag Global Styles + Embedded Messaging into Theme Footer | 5 min |

**Phase total: ~2 hours**

### CSS patterns used across all components

- **SLDS override:** `* { box-sizing: border-box !important; margin: 0 !important; padding: 0 !important; }` in every component
- **Full-width bleed:** `margin-left: -24px; margin-right: -24px; width: calc(100% + 48px)` on `:host`, with mobile reset at 768px
- **Responsive breakpoints:** 768px (tablet — all grids to 1fr, show hamburger) and 480px (small mobile — reduce fonts/padding)
- **No Shadow DOM:** LWR doesn't scope CSS. Bare selectors, `!important` on everything, no `:host` scoping
- **SVG constraints:** No `stroke-linecap` or `stroke-linejoin` attributes — LWC HTML parser throws `LWC1052`/`LWC1535`

---

## Phase 5: Concept B — Integrated Agent (Search-to-Chat)

The main innovation — the search bar transforms into a live chat panel.

| Step | Method | Time |
|------|--------|------|
| 5.1 Generate `swaHelpCenterSearchB` LWC | Automated — HTML template with dual-state UI (search vs chat), JS controller with state management, CSS with transition animations (1,301 lines total) | 2–3 hours |
| 5.2 Implement pre-chat state | Automated — search box with gold-border pill input, suggestion chips, title/subtitle | included above |
| 5.3 Implement chat-active state | Automated — expanding chat panel (animation from `translateY(20px)` → `translateY(0)`), dark blue message area (`#304CB2`), header (`#1B2D7B`), transparent agent bubbles, user bubbles in dark navy | included above |
| 5.4 Implement dynamic contextual pills | Automated — initial suggestion pills map to agent topics, follow-up pills per topic, "Something else" for topic switching, keyword-based topic detection | included above |
| 5.5 Implement inline login card | Automated — interactive username/password form rendered inside chat message flow, simulated auth, success state with checkmark, post-login personalized greeting | included above |
| 5.6 Deploy Concept B component | Automated — `sf project deploy start` | 2 min |
| 5.7 Create Concept B page in Experience Builder | **Manual** — create new page with Frame layout, URL path `/concept-b`, drag `swaHelpCenterSearchB` into content region | 5 min |
| 5.8 Iterative styling refinement | Automated — multiple rounds of CSS updates (header size, bubble colors, pill opacity, login card styling, padding alignment) + redeploy after each | 2–3 hours |

**Phase total: ~5–6 hours**

### Key design decisions for Concept B

- **Single LWC, not two.** Search and chat are one component. `chatActive` boolean toggles the state. Avoids cross-component event wiring.
- **Search input IS the chat input.** No duplicate input fields. The search bar transforms: "Search" button becomes a send icon, rounded corners flatten on top.
- **Agent bubbles are transparent** on the blue message area background — only user bubbles have a visible background (`#1B2D7B`).
- **Split-screen login panel** — clicking "Account login" pill slides the chat messages left to 60% width and a login form animates in from the right at 40%. CSS `flex-basis` transition on sibling elements inside a shared flex container. On submit, panel collapses, chat slides back to full width. Replaced inline login card approach.
- **Welcome message appears first**, login prompt appears after the user's first utterance (not on open).
- **Three-tier response architecture** — simulated responses for demo, Knowledge-powered for data-driven demo, MIAW for production (see Phase 7).

---

## Phase 6: Concept C — Fullscreen Concierge

| Step | Method | Time |
|------|--------|------|
| 6.1 Generate `swaHelpCenterHeroC` LWC | Automated — fullscreen hero with prominent CTA, styled for immersive agent takeover (788 lines) | 1.5 hours |
| 6.2 Deploy Concept C component | Automated — `sf project deploy start` | 2 min |
| 6.3 Create Concept C page in Experience Builder | **Manual** — create new page with Frame layout, URL path `/concept-c`, drag component into content region | 5 min |

**Phase total: ~1.5 hours**

---

## Phase 6B: Concept D — Native ECV2 (Platform Chat Repositioned)

The only concept that uses the REAL Agentforce agent runtime. ECV2 iframe is CSS-repositioned from its default floating position into a custom branded panel.

| Step | Method | Time |
|------|--------|------|
| 6B.1 Generate `swaHelpCenterSearchD` LWC | Automated — HTML with conditional rendering (`lwc:if`), JS controller for FAB hiding/ECV2 activation/iframe repositioning/chrome hiding, CSS for chat panel + responsive | 2–3 hours |
| 6B.2 Deploy Concept D component | Automated — `sf project deploy start` | 2 min |
| 6B.3 Create Concept D page in Experience Builder | **Manual** — create new page with Frame layout, URL path `/concept-d`, drag `swaHelpCenterSearchD` into content region | 5 min |
| 6B.4 Verify Embedded Messaging component is on page | **Manual** — Concept D REQUIRES the Embedded Messaging component (it provides the ECV2 iframe that gets repositioned) | 2 min |
| 6B.5 Iterative refinement (padding, chrome hiding, scroll lock) | Automated — multiple rounds of JS/CSS edits + redeploy | 1–2 hours |

**Phase total: ~3–5 hours**

### How Concept D works

1. **Page load:** `hideFabOnLoad()` polls for `.embedded-messaging` container and hides it (`display: none`)
2. **User submits search:** `activateEcv2()` removes search box from DOM (`lwc:if`), shows branded chat panel, locks page scroll (`document.body.style.overflow = 'hidden'`), sets ECV2 to `visibility: hidden`, programmatically clicks the FAB button
3. **600ms later:** `positionEcv2InPanel()` calculates inner rect of `.swa-ecv2-container` using `getBoundingClientRect()` minus `getComputedStyle` padding, overrides ECV2 iframe to `position: fixed` at those coordinates, hides FAB, calls `_hideEcv2Chrome()`
4. **Chrome hiding:** `_hideEcv2Chrome()` accesses `iframe.contentDocument` (same-origin `.my.site.com`), injects CSS hiding platform header/minimize/close buttons. 10-attempt retry loop (300ms intervals) handles iframe DOM readiness race condition.
5. **Close:** Restores ECV2 styles, restores page scroll, shows search box again

### Key technical patterns

- **Scroll lock eliminates jitter.** `position: fixed` + `getBoundingClientRect()` coordinates desync on scroll (1-2 frame lag). Locking scroll removes the problem entirely — only resize listener needed.
- **Padding-aware positioning.** Container has `padding: 0 112px 32px` to match the header. Must subtract padding from bounding rect to position iframe in the content box, not the border box.
- **Visibility vs display.** `visibility: hidden` keeps the element in the layout flow (needed for FAB click to work). `display: none` removes it entirely (used for initial hiding).
- **Same-origin requirement.** Chrome hiding only works when the ECV2 iframe is served from the same `.my.site.com` domain. Cross-origin iframes block `contentDocument` access.
- **`targetConfigs` persistence.** Can't remove `targetConfigs` from `js-meta.xml` while org page instances reference the component — must delete page instances in Experience Builder first.

---

## Phase 7: Agent Chat Integration — Embedded Messaging

Connecting the Agentforce agent to the Experience Cloud site. This phase has the most silent failure modes.

### 7A: Agentforce Agent (prerequisite)

| Step | Method | Time |
|------|--------|------|
| 7A.1 Create/configure agent in Agentforce Setup | **Manual** or Automated via Agent Script authoring bundle | varies |
| 7A.2 Publish agent | Automated — `sf agent publish authoring-bundle --json --api-name <Name>` | 2 min |
| 7A.3 Activate agent | Automated — `sf agent activate --json --api-name <Name>` | 1 min |
| 7A.4 Verify agent exists and is active | Automated — `sf data query --json --query "SELECT Id, DeveloperName FROM BotDefinition WHERE DeveloperName = '<Name>'"` | 1 min |

### 7B: Messaging Channel

| Step | Method | Time |
|------|--------|------|
| 7B.1 Create dedicated Messaging Channel | **Manual** — Setup → Messaging Settings → New Channel → "Messaging for In-App & Web" → Routing Type: "Agentforce Service Agent" → select agent → select fallback queue | 5 min |
| 7B.2 Verify channel created | Automated — `sf data query --json --query "SELECT Id, DeveloperName, IsActive, RoutingType FROM MessagingChannel"` | 1 min |

> **Critical:** NEVER reuse the default `Messaging_for_In_App_Web` channel. Create a dedicated channel per deployment. Sharing channels causes routing conflicts.

### 7C: Embedded Service Deployment

| Step | Method | Time |
|------|--------|------|
| 7C.1 Create Embedded Service Deployment | **Manual** — Setup → Embedded Service Deployments → New → Embedded Messaging → select channel → select site → enter `.my.site.com` domain | 5 min |
| 7C.2 Publish the deployment | **Manual** — Setup → Embedded Service Deployments → click deployment → Publish | 2 min |
| 7C.3 Verify deployment | Automated — `sf data query --json --query "SELECT Id, DeveloperName, IsEnabled FROM EmbeddedServiceConfig WHERE DeveloperName = '<Name>'"` | 1 min |

> **Critical:** Always create deployments through the Setup UI wizard. Metadata deploy (`sf project deploy start`) creates the record but does NOT provision the backing `ESW_*` Force.com Site. Without it, Publish silently does nothing.

> **Critical:** Use the `.my.site.com` domain, NOT `.salesforce-sites.com`. The ESW backing site sets `frame-ancestors` based on this value. Wrong domain = CSP blocks the chat iframe with no visible error.

### 7D: Guest User Permissions (3 layers — all required)

This is the #1 cause of "chat doesn't appear" with no error messages.

| Step | Method | Time |
|------|--------|------|
| 7D.1 Generate `Messaging_Guest_Access` permission set | Automated — XML with Create/Read on `MessagingSession`, `MessagingEndUser`; Read on `MessagingChannel` | 5 min |
| 7D.2 Deploy permission set | Automated — `sf project deploy start --json --metadata PermissionSet:Messaging_Guest_Access` | 2 min |
| 7D.3 Find both guest users | Automated — `sf data query --json --query "SELECT Id, Username FROM User WHERE Profile.UserLicense.Name = 'Guest User License' AND IsActive = true"` | 1 min |
| 7D.4 Assign perm set to Experience Cloud site guest user | Automated — `sf data create record --json --sobject PermissionSetAssignment --values "..."` | 1 min |
| 7D.5 Assign perm set to ESW backing site guest user | Automated — `sf data create record --json --sobject PermissionSetAssignment --values "..."` | 1 min |
| 7D.6 Set `areGuestUsersAllowed` to `true` | Semi-automated — retrieve EmbeddedServiceConfig metadata, edit XML, redeploy | 5 min |
| 7D.7 Verify all assignments | Automated — `sf data query --json --query "SELECT Assignee.Username, PermissionSet.Name FROM PermissionSetAssignment WHERE PermissionSet.Name = 'Messaging_Guest_Access'"` | 1 min |

> **Critical:** `areGuestUsersAllowed` defaults to `false` on every new deployment and resets if you recreate the deployment. Always check after creation.

### 7E: CORS Allowlist

| Step | Method | Time |
|------|--------|------|
| 7E.1 Generate CORS whitelist origin for site domain | Automated — XML with `https://<domain>.my.site.com` | 2 min |
| 7E.2 Deploy CORS entry | Automated — `sf project deploy start --json --source-dir force-app/main/default/corsWhitelistOrigins` | 2 min |

### 7F: Experience Builder Wiring

| Step | Method | Time |
|------|--------|------|
| 7F.1 Add Global Styles loader to every page | **Manual** — drag `swaGlobalStyles` component onto page in Experience Builder (renders nothing visible, injects CSS) | 2 min |
| 7F.2 Add Embedded Messaging component to page | **Manual** — drag "Embedded Messaging" (or "Messaging for In-App and Web") from components panel onto page | 2 min |
| 7F.3 Publish the Experience Cloud site | **Manual** — Experience Builder → Publish | 2 min |
| 7F.4 Test in incognito browser | **Manual** — open site URL in incognito to bypass cached service workers | 2 min |

**Phase 7 total: ~45 min (assuming agent already exists)**

### Troubleshooting the chat button not appearing

If the chat button doesn't show after all steps:

1. **Open DevTools → Console** — CSP `frame-ancestors` error? Wrong domain in deployment. 403/401? Guest permissions missing.
2. **Elements tab → search "embedded-messaging"** — no div? Deployment not published or component not on page. Div exists but `height: 0`? CSS collision — deploy counter-rules.
3. **Works in Setup "Test Your Deployment" but not on site?** `areGuestUsersAllowed` is `false`.

---

## Phase 8: Knowledge-Powered Responses (Tier 2)

Replacing hardcoded simulated responses with real Knowledge article data.

| Step | Method | Time |
|------|--------|------|
| 8.1 Create Knowledge articles | **Manual** — Setup → Knowledge → create articles with `swa-` URL prefix, publish in English | 30–60 min |
| 8.2 Generate `SwaAgentChatController` Apex class | Automated — `@AuraEnabled` method that queries `Knowledge__kav` with two-pass search (full phrase LIKE, then keyword fallback) | 15 min |
| 8.3 Deploy Apex class | Automated — `sf project deploy start --json --metadata ApexClass:SwaAgentChatController` | 2 min |
| 8.4 Update LWC to call Apex | Automated — import `getAgentResponse`, add `fetchAgentResponse` method with simulated fallback | 15 min |
| 8.5 Deploy updated LWC | Automated — `sf project deploy start` | 2 min |
| 8.6 Generate `SWA_Chat_Guest_Access` permission set | Automated — XML granting Apex class access + Knowledge__kav object read | 5 min |
| 8.7 Deploy permission set | Automated — `sf project deploy start --json --metadata PermissionSet:SWA_Chat_Guest_Access` | 2 min |
| 8.8 Assign perm set to site guest user | Automated — `sf data create record --json --sobject PermissionSetAssignment` | 2 min |
| 8.9 Change Apex to `without sharing` | Automated — edit class declaration, redeploy | 2 min |
| 8.10 Verify in incognito browser | **Manual** — test that Knowledge responses appear instead of simulated fallbacks | 5 min |

**Phase total: ~1.5–2 hours**

### Why `without sharing` is required

The Apex class originally used `with sharing`, which enforces the running user's sharing rules. Guest users have no sharing rules for Knowledge articles — they rely on object-level CRUD permissions only. Changing to `without sharing` tells the platform to skip sharing rule enforcement. This is safe because the SOQL query already filters to published, English, `swa-%` articles — the data exposed is intentionally public content.

### What we tried that didn't work (Agent Runtime API)

Before settling on Knowledge-powered responses, we attempted to connect directly to the Agentforce Agent Runtime API from Apex:

- **ConnectApi types:** `ConnectApi.CdpAgent*`, `ConnectApi.AgentRuntime*`, `ConnectApi.EinsteinAgent`, `ConnectApi.CopilotInput/Output` — all return null from `Type.forName()` or fail to compile
- **REST endpoints (v62.0–v66.0):** `/services/data/vXX.0/einstein/agent-runtime/sessions`, `/connect/agent-runtime/sessions`, `/einstein/ai-agent/sessions`, `/connect/ai-agent/sessions`, `/einstein/copilot/sessions` — all return 404
- **What IS available:** `ConnectApi.EinsteinLLM` and `ConnectApi.EinsteinPromptTemplateGenerationsInput` exist but are for prompt template generation, not agent runtime

**The correct production approach is MIAW (Messaging for In-App & Web)** — creating a Messaging session routed to the agent, sending messages via the MIAW REST API, and polling for responses. Estimated effort: 5–9 hours. This is documented for future implementation.

---

## Phase 9: Iterative Styling & Refinement

Ongoing throughout the build — styling adjustments based on review.

| Area | Examples | Method | Time |
|------|----------|--------|------|
| Chat panel colors | Dark blue theme (#304CB2 messages, #1B2D7B header), transparent agent bubbles | Automated — CSS edits + redeploy | 30 min per round |
| Login card redesign | Removed colored header, added title/subtitle pattern, rounded inputs, gold focus ring, step indicator (later removed) | Automated — HTML restructure + CSS rewrite + redeploy | 45 min |
| Header/close button sizing | Enlarged close X to 24x24 with stroke-width 2.5, simplified header to "Ask me anything" | Automated — HTML/CSS edits + redeploy | 15 min |
| Responsive testing | Mobile breakpoints, padding adjustments, hamburger nav | Automated — CSS media query updates + redeploy | 30 min |
| Welcome message flow | Moved login prompt to after first utterance, added AI assistant greeting | Automated — JS logic change + redeploy | 15 min |

**Phase total: ~3–4 hours (cumulative across sessions)**

> **Tip:** Each styling round is: edit CSS/HTML locally → deploy via CLI (~30 sec) → hard-refresh incognito browser → evaluate. Budget 2–3 min per iteration cycle. A complex visual redesign can take 10–15 iterations.

---

## Complete File Inventory

```
force-app/main/default/
├── classes/
│   ├── SwaAgentChatController.cls              # Knowledge search Apex (Tier 2)
│   ├── SwaAgentChatController.cls-meta.xml
│   ├── SouthwestKnowledgeSearch.cls            # Additional Knowledge search utility
│   └── SouthwestKnowledgeSearch.cls-meta.xml
├── corsWhitelistOrigins/
│   └── https_storm_44b8abd3c441ff_my_site_com.corsWhitelistOrigin-meta.xml
├── lwc/
│   ├── swaGlobalStyles/                        # Invisible LWC — injects global CSS
│   ├── swaHelpCenterHeader/                    # Shared — nav bar (326 lines)
│   ├── swaHelpCenterHero/                      # Concept A — hero banner (202 lines)
│   ├── swaHelpCenterSearch/                    # Concept A — basic search (164 lines)
│   ├── swaHelpCenterSearchB/                   # Concept B — search-to-chat with split-screen login
│   ├── swaHelpCenterHeroC/                     # Concept C — fullscreen concierge (788 lines)
│   ├── swaHelpCenterSearchD/                   # Concept D — ECV2 CSS repositioned into branded panel
│   ├── swaHelpCenterTopics/                    # Shared — topic card grid (234 lines)
│   └── swaHelpCenterFooter/                    # Shared — footer (375 lines)
├── permissionsets/
│   ├── Messaging_Guest_Access.permissionset-meta.xml    # Embedded Messaging guest perms
│   ├── SWA_Chat_Guest_Access.permissionset-meta.xml     # Apex + Knowledge guest perms
│   └── Southwest_AMA_Agent_Access.permissionset-meta.xml # Agent access
├── remoteSiteSettings/
│   └── SWA_Org_Self.remoteSite-meta.xml        # Self-referencing (from API exploration)
└── staticresources/
    ├── swaHelpCenterOverrides.css               # Global CSS (layout + Embedded Messaging fix)
    ├── swaHelpCenterOverrides.resource-meta.xml
    ├── swaLogoLight.svg                         # Brand logo
    └── swaLogoLight.resource-meta.xml
```

---

## Time Summary

| Phase | Automated | Manual | Total |
|-------|-----------|--------|-------|
| 1. Project Setup | 4 min | 2 min | ~5 min |
| 2. LWR Site Creation | 1 min | 5 min | ~5 min |
| 3. Shared Infrastructure | 25 min | — | ~25 min |
| 4. Baseline Components (Concept A) | 1.5 hr | 15 min | ~2 hr |
| 5. Concept B (Search-to-Chat) | 5 hr | 10 min | ~5.5 hr |
| 6. Concept C (Fullscreen) | 1.5 hr | 5 min | ~1.5 hr |
| 6B. Concept D (Native ECV2) | 3.5 hr | 10 min | ~4 hr |
| 7. Embedded Messaging Integration | 25 min | 20 min | ~45 min |
| 8. Knowledge-Powered Responses | 1.5 hr | 35 min | ~2 hr |
| 9. Styling Refinement | 3.5 hr | — | ~3.5 hr |
| **Total** | **~17 hr** | **~1.7 hr** | **~19 hr** |

**Automated: ~90%** — code generation, deployment, Apex, CSS, permission sets, CORS, queries
**Manual: ~10%** — site creation, Experience Builder page setup, Embedded Service Deployment wizard, publishing, browser testing

---

## What You Must Do in the Setup UI (Cannot Be Automated)

1. **Create the Experience Cloud LWR site** — no CLI equivalent
2. **Create pages in Experience Builder** — Frame layout, URL paths, drag components
3. **Place components in Theme Header/Footer vs Content Region** — determines shared vs page-specific
4. **Create Messaging Channel** — Setup → Messaging Settings → New Channel
5. **Create Embedded Service Deployment** — Setup → Embedded Service Deployments → New
6. **Publish the Embedded Service Deployment** — must be done before the chat component activates
7. **Publish the Experience Cloud site** — Experience Builder → Publish
8. **Create Knowledge articles** — if using Tier 2 Knowledge-powered responses
9. **Test in incognito browser** — cached service workers and stale CSP headers mask fixes

---

## Lessons Learned

1. **The `*` CSS reset is unavoidable AND destructive.** You need it to override SLDS. It breaks Embedded Messaging. The fix is counter-rules, not modifying the selector.

2. **Guest user permissions have 3 layers, all silent.** Permission set, assignment to BOTH guest users, and `areGuestUsersAllowed: true`. Missing any one = chat silently doesn't appear.

3. **`with sharing` blocks guest user data access.** Guest users have no sharing rules. Use `without sharing` for Apex classes that serve public content to guest users.

4. **The Agent Runtime REST API is not available from Apex.** The `sf agent preview` CLI uses an internal pathway. For production agent integration, use MIAW (Messaging for In-App & Web).

5. **Always create Embedded Service Deployments via Setup UI.** Metadata deploy doesn't provision the backing Force.com site. Publish will silently fail.

6. **One Messaging Channel per deployment.** Never share the default channel — it causes routing conflicts between agents.

7. **Use `.my.site.com` domain, not `.salesforce-sites.com`.** The CSP `frame-ancestors` header is set based on the domain in the deployment wizard.

8. **LWR has no Shadow DOM.** CSS leaks everywhere. Plan for it. `!important` on everything. Bare selectors, not `:host`-scoped.

9. **Experience Builder: Theme layout vs Content Region matters.** Components in the Theme layout appear on EVERY page. Concept-specific components go in the Content Region only.

10. **Test in incognito after every deployment.** Service workers and cached CSP headers will show you stale behavior.

11. **`position: fixed` + `getBoundingClientRect()` = scroll jitter.** Viewport-relative coordinates change on every scroll pixel. The iframe position updates 1-2 frames behind, creating visible jitter. Fix: lock `document.body.style.overflow = 'hidden'` when the fixed element is active. Only a resize listener is needed.

12. **Padding-aware positioning is required.** `getBoundingClientRect()` returns the border box (includes padding). To position an element inside a padded container's content box, subtract padding values via `getComputedStyle`. Without this, the element overflows into padding area.

13. **Same-origin iframe access enables chrome hiding.** ECV2 iframes served from the same `.my.site.com` domain allow `contentDocument` access. Use this to inject CSS hiding platform headers and buttons. Needs a retry loop — iframe DOM isn't ready immediately after the FAB is clicked.

14. **CSS flex-basis transitions animate coordinated slides.** For split-screen effects, put both panels as siblings in a flex container and transition their `flex` shorthand. The browser recalculates the split ratio every frame — no JavaScript animation needed.

15. **`targetConfigs` can't be removed while page instances exist.** If you deployed a component with `targetConfigs` properties and created page instances in Experience Builder, you must delete those page instances before removing the `targetConfigs` from `js-meta.xml`.
