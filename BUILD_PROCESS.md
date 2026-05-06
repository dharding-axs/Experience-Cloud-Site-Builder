# Experience Cloud Help Center with Agentforce Chat — Build Process

A complete, reproducible build process for creating a branded Salesforce Experience Cloud LWR site with an embedded Agentforce agent using ECV2 inline mode and custom LWC wrappers. Written for engineers and architects who want to recreate this approach for any customer.

**Stack:** Experience Cloud LWR · ECV2 Inline Mode · Agentforce Agent Script · LWC · Apex  
**Agent integration tier:** Live ECV2 (Enhanced Conversation V2) inline — real Atlas Reasoning Engine  
**Reference implementation:** Southwest Airlines Help Center (Concept D)  
**Total build time:** ~20–24 hours across multiple sessions  
**Automated: ~90%** · **Manual: ~10%**

---

## Architecture Overview

The key insight that makes this pattern work: **the LWC wrapper owns the entire ECV2 lifecycle.** Head Markup loads the bootstrap script but never calls `init()`. The LWC calls `bootstrap.init()` with `displayMode: 'inline'` and a `targetElement` pointing at a div in the LWC's own template. ECV2 renders its iframe inside that div. The LWC controls the surrounding UI, the conversation lifecycle via FSM, and communicates with the iframe via script injection and `postMessage`.

```
┌─────────────────────────────────────────────────────────────┐
│  Experience Cloud LWR Site                                  │
│  Head Markup: stylesheet links + bootstrap.min.js loader   │
│                                                             │
│  swaGlobalStyles (invisible LWC)                           │
│  └── loadStyle(globalOverrides.css) → fixes ECV2 collapse  │
│                                                             │
│  swaHelpCenterSearchD (main LWC wrapper)                   │
│  ┌─────────────────────┬─────────────────────────────────┐ │
│  │ SEARCH LAYER        │ CHAT LAYER (always in DOM)      │ │
│  │ (CSS hidden)        │ branded header | ECV2 iframe    │ │
│  │                     │ [55% chat] | [45% wizard panel] │ │
│  └─────────────────────┴─────────────────────────────────┘ │
│         ↕ bootstrap events          ↕ script injection     │
│  embeddedservice_bootstrap    ←→   ECV2 iframe              │
│         ↕ invocable method         ↕ postMessage           │
│  Agentforce Agent (Atlas)     ←→   SwaPetPolicyController  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Setup & Org Authentication

| Step | Method | Time |
|------|--------|------|
| 1.1 Create SFDX project | `sf project generate --name <project-name>` | 1 min |
| 1.2 Authenticate to org | `sf org login web --alias <alias>` → browser login | 2 min |
| 1.3 Set default org | `sf config set target-org <alias>` | 1 min |
| 1.4 Verify org capabilities | `sf org display --json` | 1 min |
| 1.5 Verify Experience Cloud license | `sf data query --query "SELECT Id FROM Network LIMIT 1"` | 1 min |

**Phase total: ~5 min**

---

## Phase 2: LWR Site Creation

| Step | Method | Time |
|------|--------|------|
| 2.1 Create Experience Cloud site | **Manual** — Setup → Digital Experiences → New → "Build Your Own (LWR)" → name the site | 3 min |
| 2.2 Register Salesforce Sites domain | **Manual** — Setup → Sites (under "Sites and Domains") → Register (required for Embedded Service Deployment wizard) | 2 min |
| 2.3 Verify site | `sf data query --query "SELECT Id, Name, Status, UrlPathPrefix FROM Network WHERE Name = '<Site Name>'"` | 1 min |

**Phase total: ~5 min**

> **Why manual:** No CLI equivalent for site creation. The Setup wizard provisions the site's backing infrastructure — guest user, CDN config, URL routing.

---

## Phase 3: Global Infrastructure — CSS Overrides and Styles Loader

These solve three LWR-specific CSS problems that affect every component.

| Step | Method | Time |
|------|--------|------|
| 3.1 Create global CSS static resource | Generate `<prefix>HelpCenterOverrides.css` + `.resource-meta.xml` | 15 min |
| 3.2 Create global styles loader LWC | Generate `<prefix>GlobalStyles` — invisible LWC, `loadStyle()` in `renderedCallback` | 5 min |
| 3.3 Deploy | `sf project deploy start --source-dir force-app/main/default/staticresources --source-dir force-app/main/default/lwc/<prefix>GlobalStyles --target-org <alias>` | 2 min |
| 3.4 Add GlobalStyles to Experience Builder Theme Footer | **Manual** — drag onto every page's Theme Footer. Renders nothing; injects CSS. | 2 min/page |

**Phase total: ~25 min**

### The Three CSS Problems and Their Fixes

**Problem 1 — LWR content wrappers constrain width**  
LWR injects `[class*="contentRegion"]`, `[class*="outerContainer"]`, etc. with `max-width` and `padding`. Components don't go full-width.  
Fix: wildcard attribute selectors in global CSS targeting these classes with `max-width: 100% !important`.

**Problem 2 — LWR injects gaps between components**  
`row-gap` and `margin` on `webruntimedesign-component-wrapper` create unwanted spacing.  
Fix: `row-gap: 0 !important; margin: 0 !important` on wrapper elements.

**Problem 3 — `*` CSS reset collapses ECV2 container**  
Every LWC uses `* { margin: 0 !important; padding: 0 !important }` to override SLDS. In LWR (no Shadow DOM), this collapses `.embedded-messaging` to `height: 0` and pushes the chat button off-screen.  
Fix: Higher-specificity counter-rules in the global static resource:
```css
.embedded-messaging {
    position: fixed !important;
    bottom: 0 !important;
    right: 0 !important;
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
    z-index: 999999 !important;
}
```

> **Critical:** Do NOT fix Problem 3 by modifying the `*` selector. `:host *`, `.class *`, `*:not()` all break the SLDS override chain. Counter-rules with higher specificity is the only working approach.

> **Critical:** `<link>` tags in Head Markup do NOT resolve static resource URLs in LWR. Only `loadStyle()` from a LWC component works.

---

## Phase 4: Shared LWC Components (Baseline)

These components appear on all pages.

| Component | Purpose | Time |
|-----------|---------|------|
| `<prefix>HelpCenterHeader` | Nav bar, logo, hamburger mobile menu | 30 min |
| `<prefix>HelpCenterFooter` | Footer links, social, legal | 20 min |
| `<prefix>HelpCenterTopics` | Topic card grid (links to help categories) | 20 min |

Deploy all at once:
```bash
sf project deploy start \
  --source-dir force-app/main/default/lwc \
  --target-org <alias>
```

Create pages in Experience Builder with **Frame layout**:
- Drag Header into **Theme Header** (appears on all pages)
- Drag Footer, GlobalStyles into **Theme Footer** (appears on all pages)
- Drag page-specific components into **Content Region** only

**Phase total: ~1.5 hours**

---

## Phase 5: Agentforce Agent Setup

### 5A: Agent Configuration

Create the agent using Agent Script (`.agent` file) or Setup UI:

```yaml
# Agent Script structure
system:
  instructions: |
    [Agent persona and behavioral guidelines]

config:
  developer_name: "<Agent_API_Name>"
  agent_label: "<Display Name>"

start_agent topic_selector:
  label: "Topic Selector"
  reasoning:
    actions:
      go_<topic>: @utils.transition to @topic.<topic>_topic

topic <topic>_topic:
  label: "<Topic Label>"
  reasoning:
    instructions: ->
      | [Topic-specific instructions]
    actions:
      <action_name>: @actions.<action_name>
        with <param> = ...

  actions:
    <action_name>:
      target: "apex://<ApexClassName>"
      inputs:
        <param>: string
      outputs:
        <field>: string
```

| Step | Method | Time |
|------|--------|------|
| 5A.1 Create agent | Setup → Agentforce Agents → New, or deploy `.agent` file | 30 min |
| 5A.2 Publish agent | `sf agent publish authoring-bundle --json --api-name <Name>` | 2 min |
| 5A.3 Activate agent | `sf agent activate --api-name <Name>` | 1 min |

### 5B: Messaging Channel

**Manual only** — Setup → Messaging Settings → New Channel → Messaging for In-App & Web:
- Routing Type: Agentforce Service Agent
- Select the agent
- Select a fallback queue for human escalation

> **Critical:** Create a **dedicated channel** per deployment. Never reuse the default `Messaging_for_In_App_Web`. Sharing causes routing conflicts.

### 5C: Embedded Service Deployment

**Manual only** — Setup → Embedded Service Deployments → New → Embedded Messaging:
- Select the Messaging Channel from 5B
- Select the Experience Cloud site
- **Domain:** Use `.my.site.com` domain NOT `.salesforce-sites.com`
- After creation: click **Publish**

> **Critical:** ALWAYS create via Setup UI wizard. Metadata deploy creates the config record but does NOT provision the backing `ESW_*` Force.com site. Without it, Publish silently does nothing.

> **Critical:** After creation, retrieve the config and verify `areGuestUsersAllowed = true`:
```bash
sf project retrieve start --metadata EmbeddedServiceConfig:<DeploymentName> --target-org <alias>
# Edit XML if false, redeploy
```

### 5D: Guest User Permissions (3 layers — all required)

The #1 cause of "chat doesn't appear" with no error messages.

**Layer 1 — Permission set:**
```xml
<!-- Messaging_Guest_Access.permissionset-meta.xml -->
<PermissionSet>
  <objectPermissions>
    <allowCreate>true</allowCreate><allowRead>true</allowRead>
    <object>MessagingSession</object>
  </objectPermissions>
  <objectPermissions>
    <allowCreate>true</allowCreate><allowRead>true</allowRead>
    <object>MessagingEndUser</object>
  </objectPermissions>
  <objectPermissions>
    <allowRead>true</allowRead>
    <object>MessagingChannel</object>
  </objectPermissions>
</PermissionSet>
```

**Layer 2 — Assign to BOTH guest users:**
```bash
# Find all guest users
sf data query --query "SELECT Id, Username FROM User WHERE Profile.UserLicense.Name = 'Guest User License' AND IsActive = true"

# Get permission set ID
sf data query --query "SELECT Id FROM PermissionSet WHERE Name = 'Messaging_Guest_Access'"

# Assign to Experience Cloud site guest user
sf data create record --sobject PermissionSetAssignment --values "AssigneeId='<EC_User_Id>' PermissionSetId='<PermSet_Id>'"

# Assign to ESW backing site guest user (auto-created with deployment)
sf data create record --sobject PermissionSetAssignment --values "AssigneeId='<ESW_User_Id>' PermissionSetId='<PermSet_Id>'"
```

**Layer 3 — `areGuestUsersAllowed = true`** in EmbeddedServiceConfig XML (see above).

**Phase 5 total: ~1 hour (agent already configured)**

---

## Phase 6: The LWC Wrapper — `swaHelpCenterSearchD` (Concept D)

This is the architectural core. Do not use Head Markup for `bootstrap.init()`.

### 6A: Head Markup Setup

Head Markup should contain **only** stylesheet links and the bootstrap script loader — **no `init()` call**:

```html
<!-- SLDS stylesheets -->
<link rel="stylesheet" href="{ basePath }/assets/styles/slds/salesforce-lightning-design-system-part1.css?{ versionKey }"/>
<!-- ... parts 2-4, DXP hooks ... -->

<!-- Bootstrap script loader only — NO init() call -->
<script type='text/javascript'>
    function loadEmbeddedMessagingScript() {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = 'https://<your-domain>.my.site.com/<ESWDeploymentPath>/assets/js/bootstrap.min.js';
        document.body.appendChild(s);
    }
    if (document.readyState === 'complete') {
        loadEmbeddedMessagingScript();
    } else {
        window.addEventListener('load', loadEmbeddedMessagingScript);
    }
</script>
```

> **After updating Head Markup: republish the Experience Builder site.**

### 6B: LWC Architecture

#### Why the LWC owns `bootstrap.init()`

If Head Markup calls `init()` first (with default settings), `displayMode` is floating and `targetElement` is `body`. Any subsequent LWC call is ignored. The LWC must own the full initialization.

#### The `refs.chatContainer` constraint

`bootstrap.init()` requires `targetElement` to be a live DOM element. **Never use `lwc:if`** on the container element — it removes it from the DOM during the search state, making `targetElement` null when `init()` runs. Use CSS `display: none/flex` on sibling layers:

```html
<!-- Both layers always in DOM -->
<div class={promptLayerClass}>  <!-- CSS: display:block / display:none -->
    <!-- Search UI -->
</div>
<div class={chatLayerClass}>    <!-- CSS: display:none / display:flex -->
    <!-- Branded header -->
    <!-- ECV2 container (always in DOM) -->
    <div lwc:ref="chatContainer" class={iframeClass}></div>
    <!-- Split wizard panel -->
</div>
```

#### The Finite State Machine

```javascript
const STATE = { PROMPT, PRIMED, LOADING, LAUNCHING, SENDING, ACTIVE, ERROR }
const EVT   = { SUBMIT, BOOTSTRAP_READY, CONV_OPENED, BOT_MESSAGE, MSG_SENT,
                CONV_CLOSED, SESSION_ACTIVE, INIT_ERROR, LAUNCH_FALLBACK,
                SEND_FALLBACK, TIMEOUT, RETRY }
```

All side effects happen in `_onTransition(event)`. `_dispatch(event)` is the only way state changes — invalid transitions are no-ops.

#### `connectedCallback` pattern

```javascript
connectedCallback() {
    // Head Markup loaded the script — check if already available
    if (typeof window.embeddedservice_bootstrap !== 'undefined') {
        this._scriptLoaded = true;
        setTimeout(() => this._initChat(), 0); // defer for refs
        return;
    }
    // Otherwise load it ourselves
    const script = document.createElement('script');
    script.src = `${this.siteUrl}/assets/js/bootstrap.min.js`;
    script.onload = () => { this._scriptLoaded = true; this._initChat(); };
    document.body.appendChild(script);
}
```

#### `_initChat()` pattern

```javascript
_initChat() {
    if (this._bootstrapInited) return;
    const chatEl = this.refs.chatContainer;   // must exist in DOM
    if (!chatEl) { this._dispatch(EVT.INIT_ERROR, ...); return; }

    const bootstrap = window.embeddedservice_bootstrap;
    bootstrap.settings.language                = 'en_US';
    bootstrap.settings.displayMode             = 'inline';
    bootstrap.settings.disableInlineAutoLaunch = true;
    bootstrap.settings.targetElement           = chatEl;

    this._attachListeners();   // BEFORE init() — never miss events
    this._bootstrapInited = true;

    bootstrap.init(orgId, deploymentApiName, siteUrl, { scrt2URL });
}
```

#### Critical utterance timing

```
launchChat() called
  → onEmbeddedMessagingConversationOpened   ← ⚠️ WAIT — agent not joined yet
  → onEmbeddedMessagingFirstBotMessageSent  ← ✅ SEND utterance here
  → sendTextMessage(userQuery)
```

#### Event listeners to attach

```javascript
window.addEventListener('onEmbeddedMessagingReady',               () => this._onReady());
window.addEventListener('onEmbeddedMessagingButtonCreated',       () => this._onButtonCreated());
window.addEventListener('onEmbeddedMessagingConversationOpened',  () => this._dispatch(EVT.CONV_OPENED));
window.addEventListener('onEmbeddedMessagingFirstBotMessageSent', () => this._dispatch(EVT.BOT_MESSAGE));
window.addEventListener('onEmbeddedMessagingSessionStatusUpdate', (e) => this._onSessionStatus(e));
window.addEventListener('onEmbeddedMessagingWindowClosed',        () => this._dispatch(EVT.CONV_CLOSED));
```

#### Close and reopen pattern

```javascript
handleCloseChat() {
    try { bootstrap.utilAPI.endChat(); } catch(e) {}
    // Clear session storage (miaw, embeddedmessaging, esw_, messagingjwt, conversationid)
    this._state = STATE.PROMPT;    // set directly, not via dispatch
    this._softReset();             // resets _chatRevealed, _iframeReady, _pendingQuery
}

handleSubmit() {
    this._chatRevealed = false;   // show loading indicator on every open
    this._iframeReady  = false;   // hide iframe until chrome re-injects
    this._dispatch(EVT.SUBMIT);
}
```

### 6C: ECV2 Chrome Hiding (Agent Header Removal)

The ECV2 agent header element is `cwcmessaging-cwc-header-block`. LWS blocks shadow root access from LWC code. Workaround: inject a `<script>` into `iframeDoc.head` — it runs natively in the iframe's context outside LWS:

```javascript
_hideEcv2Chrome(ecv2, attempt) {
    const iframe = ecv2.querySelector('iframe');
    const iframeDoc = iframe.contentDocument;
    // Always re-inject — do NOT use getElementById guard to skip
    const script = iframeDoc.createElement('script');
    script.textContent = `(function() {
        var css = 'cwcmessaging-cwc-header-block { display:none !important; }';
        var id = 'swa-hdr-hide';
        function injectOnce(root) {
            if (!root) return;
            var t = root.head || root;
            if (!t.querySelector('#' + id)) {
                var s = document.createElement('style');
                s.id = id; s.textContent = css;
                t.appendChild(s);
            }
            root.querySelectorAll('*').forEach(function(el) {
                if (el.shadowRoot) injectOnce(el.shadowRoot);
            });
        }
        injectOnce(document);
        setTimeout(function() { injectOnce(document); }, 1000);
    })();`;
    iframeDoc.head.appendChild(script);
    // Reveal iframe 100ms after CSS injects
    setTimeout(() => { this._iframeReady = true; }, 100);
}
```

> **Call on `CONV_OPENED`, not `BOT_MESSAGE`.** Chrome hide script runs while agent joins. Never use an `getElementById` guard — after `endChat()`, the new session needs a fresh injection.

### 6D: Utterance Injection

**Primary path (production orgs):**
```javascript
bootstrap.utilAPI.sendTextMessage(text)
    .then(() => this._dispatch(EVT.MSG_SENT))
    .catch(() => this._injectViaTextarea(text));
```

**Fallback path (SDO orgs where `sendTextMessage` is undefined):**
LWS blocks shadow root access from LWC code, but not from scripts injected into the same-origin iframe:

```javascript
_injectViaTextarea(text, sessionId) {
    const script = iframeDoc.createElement('script');
    script.textContent = `(function() {
        function dq(root, sel) { /* deep shadow DOM query */ }
        function trySend(attempt) {
            var ta = dq(document, 'textarea');
            if (!ta || ta.disabled) {
                if (attempt < 20) setTimeout(function() { trySend(attempt+1); }, 500);
                return;
            }
            // Use native setter to bypass React synthetic events
            var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
            setter.call(ta, ${escaped});
            ta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            // Poll for send button (only appears after textarea has content)
            var poll = setInterval(function() {
                var btn = dq(document, 'button[class*="sendButton"],button[aria-label="Send"]');
                if (btn && !btn.disabled) {
                    clearInterval(poll);
                    btn.click();
                    window.parent.postMessage({ type:'swa-msg-sent', sessionId:${sid} }, '*');
                }
            }, 300);
        }
        trySend(0);
    })();`;
    iframeDoc.head.appendChild(script);
}
```

**Session ID guard:** Include a timestamp-based `sessionId` in `swa-msg-sent`. Parent only processes messages where `event.data.sessionId === this._sendSessionId`. Prevents stale scripts from prior sessions triggering `MSG_SENT`.

### 6E: Custom ECV2 Action Menu

The 3-dots menu button is `.header-menu-button` inside `cwcmessaging-cwc-header-block`:

1. Inject script: temporarily un-hide header, click `.header-menu-button`, wait 400ms
2. Collect `[role="menuitem"]` labels, `window.parent.postMessage({ type: 'swa-menu-items', items: [...] })`
3. Parent builds custom dropdown from labels
4. On item click: inject script to re-open native menu and click matching item

Custom menu CSS:
```css
.swa-menu-wrap    { position: relative !important; }
.swa-menu-dropdown { position: absolute !important; top: calc(100% + 8px) !important;
                     right: 0 !important; z-index: 100 !important; }
.swa-chat-header  { position: relative !important; z-index: 10 !important; }
```

### 6F: Deploy

```bash
sf project deploy start \
  --source-dir force-app/main/default/lwc/swaHelpCenterSearchD \
  --target-org <alias> \
  --ignore-conflicts    # always use this flag — source tracking diverges after retrieves
```

**Phase 6 total: ~4–6 hours (first build)**

---

## Phase 7: Contextual LWC Panel (Pet Travel Wizard Pattern)

This phase documents the pattern for opening a contextual data-collection panel alongside the agent chat when the agent detects a specific topic.

### 7A: Topic Detection Architecture

The LWC detects pet-related content in two ways:

**Turn 1 (initial query):** `_checkQueryForPetTopic()` runs on `BOT_MESSAGE`, checks `_submittedQuery` for keywords.

**Subsequent turns:** `_checkIframeForPetResponse()` runs on `BOT_MESSAGE` in `ACTIVE` state — injects a script that scans agent response text for keywords and fires `postMessage('swa-pet-response-detected')` if matched.

### 7B: Apex Action — `@InvocableMethod` + `@AuraEnabled`

Two methods on the same class:

```java
public without sharing class SwaPetPolicyController {
    // Called by Agentforce agent action
    @InvocableMethod(label='Get Pet Travel Policy')
    public static List<PolicyResult> getPetPolicy(List<PolicyRequest> requests) { ... }

    // Called directly by LWC (guest user via @AuraEnabled)
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getPetPolicyForLwc(String petType) { ... }
}
```

> **Why two methods:** CLT cards from `@InvocableMethod` do not render in the ECV2 iframe on Experience Cloud. The LWC calls `@AuraEnabled` directly to get policy data. Both call the same private `buildResult()` method.

> **`without sharing` required:** Guest users have no sharing rules. `with sharing` returns zero results silently.

Add Apex class to guest user permission set:
```xml
<classAccesses>
    <apexClass>SwaPetPolicyController</apexClass>
    <enabled>true</enabled>
</classAccesses>
```

### 7C: CLT (Custom Lightning Type) — Know the Limitation

CLT (Custom Lightning Type) cards with custom LWC renderers work in the Agentforce desktop console. They do **not** render inside the ECV2 iframe on Experience Cloud LWR sites. The platform limitation (broken `EvfSdkController.getEventTypes` on SDO orgs) means the iframe never receives CLT output as a visual card.

**Workaround:** Detect the agent's text response keywords → call `@AuraEnabled` Apex → open wizard panel in LWC DOM.

### 7D: Split Panel Implementation

```css
.swa-chat-body     { display: flex !important; flex: 1 !important; }
.swa-chat-pane     { flex: 1; transition: flex 0.3s linear !important; }
.swa-wizard-pane   { flex: 0 0 45%; animation: swa-slide-in 0.3s linear; }
.swa-chat-split .swa-chat-pane { flex: 0 0 55% !important; }

@keyframes swa-slide-in {
    from { opacity: 0; }   /* No translateX — avoid bounce */
    to   { opacity: 1; }
}
```

> **Use `linear` not `cubic-bezier`.** Easing functions cause a bounce artifact during the flex transition.

### 7E: Wizard LWC Pattern

The wizard renders in the LWC's own DOM (not the ECV2 iframe):
- 3-step wizard: type selection + input fields → file upload → summary
- `dispatchEvent(new CustomEvent('wizardsubmit'))` to close panel from step 3
- File upload via `<input type="file">` with drag-and-drop zone
- No X button — "Save information" on step 3 is the only close trigger (ensures closing utterance fires)

### 7F: Closing Utterance + Agent Verification

When wizard closes, inject closing utterance via textarea:
```javascript
_injectWizardClose(petType) {
    const utterance = 'I have reviewed the pet travel requirements for my ' + petType + '.';
    this._injectViaTextarea(utterance, Date.now());
}
```

Update agent topic instructions to respond to this utterance with pet-specific verification including carrier requirements, health certificate, fee, and restrictions.

### 7G: postMessage Bridge — Full Reference

| Message | Direction | Purpose | Guard |
|---------|-----------|---------|-------|
| `swa-msg-sent` | iframe → LWC | Utterance sent via textarea injection | `sessionId` must match current `_sendSessionId` |
| `swa-pet-response-detected` | iframe → LWC | Agent responded with pet keywords | `!_wizardOpen && !_wizardJustClosed` |
| `swa-pet-wizard-trigger` | iframe → LWC | User clicked chip to reopen wizard | `STATE.ACTIVE && !_wizardJustClosed` |
| `swa-menu-items` | iframe → LWC | ECV2 menu items collected | `_menuOpen` not already true |

**Phase 7 total: ~3–4 hours**

---

## Phase 8: Embedded Service Configuration

### 8A: Guest User Permissions for Apex

Every `@AuraEnabled` Apex class called by the LWC needs guest user access:

```bash
# Add to permission set XML, redeploy
<classAccesses>
    <apexClass>YourApexClass</apexClass>
    <enabled>true</enabled>
</classAccesses>

sf project deploy start --metadata PermissionSet:YourPermSetName --target-org <alias>
```

If the permission set is already assigned to the guest user, the new class access takes effect immediately after deploy.

### 8B: CORS Allowlist

```xml
<!-- https_<your-domain>_my_site_com.corsWhitelistOrigin-meta.xml -->
<CorsWhitelistOrigin>
    <urlPattern>https://<your-domain>.my.site.com</urlPattern>
</CorsWhitelistOrigin>
```

### 8C: Publish Requirements

| Change type | Requires republish? |
|------------|-------------------|
| LWC JS/HTML/CSS changes | **No** — hard refresh in incognito |
| Static resource CSS changes | **No** — hard refresh in incognito |
| Head Markup changes | **Yes** — republish Experience Builder site |
| Embedded Service Deployment changes | **Yes** — republish ESW deployment, then EB site |
| New LWC dragged onto page | **Yes** — republish EB site |
| Agent Script changes | **No** — `sf agent publish + activate` only |

---

## Phase 9: Agent Configuration for Contextual Responses

### Agent Script Topic Pattern

```yaml
topic pet_travel_topic:
  label: "Pet Travel"
  description: "Handle pet travel policy questions"
  reasoning:
    instructions: ->
      | When customer mentions pets, call show_pet_wizard immediately.
      | After calling, say: "I've pulled up our pet travel guide..."
      | When customer says "I have reviewed the pet travel requirements for my [pet]":
      | Respond with specific verification including carrier size, health cert timing,
      | fee, restrictions — all specific to their pet type.
    actions:
      show_pet_wizard: @actions.show_pet_wizard
        with petType = ...

  actions:
    show_pet_wizard:
      target: "apex://YourPetPolicyController"
      inputs:
        petType: string (required)
      outputs:
        petType: string
        policyTitle: string
        policyContent: string
        vaccinationNote: string
```

Deploy and activate after changes:
```bash
sf agent publish authoring-bundle --json --api-name <AgentName> --target-org <alias>
sf agent activate --api-name <AgentName> --target-org <alias>
```

---

## Phase 10: Testing

### Test Checklist

| Test | Method |
|------|--------|
| Search screen displays correctly | Incognito browser |
| Submitting query opens chat with loading indicator | Incognito browser |
| Loading indicator closes when agent joins | Verify `BOT_MESSAGE` in console |
| Initial utterance appears in chat | Check `[SWA]` console log |
| Agent responds to utterance | Chat conversation |
| Pet topic triggers split panel | Submit pet query |
| Wizard opens with correct policy | Check pet type + content |
| Wizard steps navigate correctly | Click through all 3 steps |
| Save information closes wizard | Verify full-width chat returns |
| Closing utterance appears in chat | Chat conversation |
| Agent verification response correct | Verify pet-specific details |
| Close X resets to search screen | Click close button |
| Second pet query reopens wizard | Submit new pet query in same session |
| Incognito test after deploy | Always test in new incognito window |

### Debugging Tips

**Agent not loading:** Check console for `[EVT]` logs from bootstrap events. If `onEmbeddedMessagingReady` never fires, bootstrap script didn't load.

**Utterance not sending:** Add `console.log('[SWA] dispatch', event)` in `_dispatch()` to trace FSM state. `swa-msg-sent` postMessage should appear in console.

**Wizard not opening:** Check `[SWA] _checkQueryForPetTopic` log in console. Verify query contains pet keywords.

**Everything broke after retrieve:** Always use `--ignore-conflicts` after `sf project retrieve start`. Source tracking diverges.

---

## Complete File Inventory

```
force-app/main/default/
├── aiAuthoringBundles/
│   └── <AgentName>/                           # Agent Script bundle
│       ├── <AgentName>.agent                  # Agent Script DSL
│       └── <AgentName>.bundle-meta.xml
├── classes/
│   ├── <Prefix>PetPolicyController.cls        # @InvocableMethod + @AuraEnabled
│   ├── <Prefix>KnowledgeSearch.cls            # Knowledge article search
│   └── *.cls-meta.xml
├── corsWhitelistOrigins/
│   └── https_<domain>_my_site_com.corsWhitelistOrigin-meta.xml
├── EmbeddedServiceConfig/
│   └── <DeploymentName>.embeddedServiceConfig (retrieved after UI creation)
├── lightningTypes/
│   └── <TypeName>/
│       ├── schema.json                        # CLT schema
│       └── lightningDesktopGenAi/
│           └── renderer.json                  # CLT renderer config
├── lwc/
│   ├── <prefix>GlobalStyles/                  # Invisible CSS injector
│   ├── <prefix>HelpCenterHeader/              # Shared nav
│   ├── <prefix>HelpCenterFooter/              # Shared footer
│   ├── <prefix>HelpCenterTopics/              # Topic cards
│   ├── <prefix>HelpCenterSearchD/             # Main ECV2 wrapper (Concept D)
│   └── <prefix>PetTravelWizard/               # Contextual wizard panel
├── permissionsets/
│   ├── Messaging_Guest_Access.permissionset-meta.xml
│   └── <Prefix>_Chat_Guest_Access.permissionset-meta.xml
└── staticresources/
    ├── <prefix>HelpCenterOverrides.css        # Global CSS fixes
    └── <prefix>HelpCenterOverrides.resource-meta.xml
```

---

## Time Summary

| Phase | Automated | Manual | Total |
|-------|-----------|--------|-------|
| 1. Project Setup | 4 min | 2 min | ~5 min |
| 2. LWR Site Creation | 1 min | 5 min | ~5 min |
| 3. Global CSS Infrastructure | 20 min | 5 min | ~25 min |
| 4. Shared LWC Components | 1 hr | 15 min | ~1.5 hr |
| 5. Agentforce Agent + Messaging | 30 min | 30 min | ~1 hr |
| 6. LWC Wrapper (Concept D) | 4 hr | 15 min | ~4.5 hr |
| 7. Contextual Wizard Panel | 2.5 hr | 15 min | ~3 hr |
| 8. Permissions + CORS | 20 min | 5 min | ~25 min |
| 9. Agent Script Tuning | 1 hr | — | ~1 hr |
| 10. Testing + Iteration | 2 hr | — | ~2 hr |
| **Total** | **~12 hr** | **~1.5 hr** | **~13.5 hr** |

**Automated: ~88%** — deployments, Apex, LWC, agent script, permission sets  
**Manual: ~12%** — site creation, Experience Builder pages, ESD wizard, publishing

---

## What Cannot Be Automated

1. **Create the Experience Cloud LWR site** — no CLI equivalent
2. **Create pages in Experience Builder** — Frame layout, URL paths, drag components
3. **Create Messaging Channel** — Setup → Messaging Settings → New Channel
4. **Create Embedded Service Deployment** — Setup UI provisions backing Force.com site
5. **Publish the Embedded Service Deployment** — required before chat activates
6. **Publish the Experience Cloud site** — after any Head Markup or page layout changes
7. **Test in incognito browser** — cached service workers mask every change

---

## Lessons Learned

### CSS
1. **The `*` CSS reset is unavoidable AND destructive.** You need it to override SLDS. It collapses ECV2 to zero height. Fix with higher-specificity counter-rules in a global static resource — never modify the `*` selector itself.
2. **`<link>` in Head Markup doesn't resolve static resources in LWR.** Use `loadStyle()` from a LWC component.
3. **`!important` on everything.** LWR has no Shadow DOM. Bare selectors, not `:host`-scoped. CSS leaks everywhere.
4. **Use `linear` easing for flex split transitions.** `cubic-bezier` easing causes a visible bounce during flex value transitions.
5. **Never use `lwc:if` on `refs.chatContainer`.** Use CSS `display:none/flex` instead — the element must always be in the DOM for `bootstrap.init()`.

### ECV2 Inline Mode
6. **Head Markup: load script, never call `init()`.** If Head Markup calls `init()` first, the LWC's inline settings are ignored. Remove `initEmbeddedMessaging` from Head Markup entirely.
7. **Head Markup changes require Experience Builder republish.** LWC JS/CSS changes do not.
8. **Always `--ignore-conflicts` when deploying.** After any `retrieve`, source tracking diverges and deploys push stale files without this flag.
9. **`CONV_OPENED` fires before the agent joins.** Never send utterance at `CONV_OPENED`. Wait for `onEmbeddedMessagingFirstBotMessageSent`.
10. **Never pre-warm the session.** `launchChat()` before user submit causes `BOT_MESSAGE` to fire in background. It fires only once per session — utterance injection silently fails on real submit.
11. **`_chatRevealed = false` in `handleSubmit`.** Never set to `true` in submit — it skips the loading indicator on every subsequent open.
12. **Re-inject chrome hide CSS on every `CONV_OPENED`.** Remove `getElementById` guards. After `endChat()`, new session needs fresh injection.
13. **Session ID on `swa-msg-sent` postMessage.** Old injected scripts from prior sessions persist in the iframe DOM. Without a session token, they trigger `MSG_SENT` prematurely.
14. **`without sharing` for all Apex serving guest users.** Guest users have no sharing rules. `with sharing` returns zero rows silently.

### Script Injection Pattern
15. **LWS blocks `shadowRoot` on external elements — use script injection.** Create `<script>` in `iframeDoc.head`. The script runs natively in the iframe's context outside LWS. Use `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set` for textarea injection.
16. **ECV2 send button only appears after textarea has content.** Poll for it with `setInterval` after setting the textarea value — don't look for it immediately.
17. **`swa-msg-sent` from injected script needs session guard.** Old sessions' scripts remain in iframe DOM. `window.parent.postMessage({ sessionId: timestamp })` and check on receipt.

### Agentforce + CLT
18. **CLT cards don't render in ECV2 iframe on Experience Cloud.** They work in the Agentforce desktop console. Use keyword detection + `@AuraEnabled` Apex direct call from LWC instead.
19. **`@InvocableMethod` + `@AuraEnabled` on same class.** Agent calls invocable method; LWC calls `@AuraEnabled` method. Both call same `buildResult()` private method — no logic duplication.
20. **`BOT_MESSAGE` fires on every agent response in `ACTIVE` state.** Use it for keyword detection on subsequent turns — not just the first one.

### Permissions
21. **Guest user permissions have 3 layers, all silent.** Permission set + assignment to BOTH guest users + `areGuestUsersAllowed = true` in EmbeddedServiceConfig. Missing any one = chat silently fails.
22. **`areGuestUsersAllowed` resets to `false` on every new deployment.** Always check and fix after creating or recreating a deployment.
23. **Two guest users need the permission set.** The Experience Cloud site guest user AND the auto-created ESW backing site guest user.

### UX Patterns
24. **Wizard panel: no X button.** Force completion to step 3 so closing utterance fires and agent provides verification response. Save information is the only close trigger.
25. **`_wizardJustClosed` guard (3s).** Prevents immediate re-open after wizard close while `swa-pet-wizard-trigger` postMessage might still be in flight.
26. **Loading indicator on every open.** Set `_chatRevealed = false` and `_iframeReady = false` in `handleSubmit` — not just on first open. Both reopen and first open should show the loading state.
