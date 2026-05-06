---
name: experience-cloud-site-builder
description: Guided wizard to scaffold, generate, deploy, and iterate a branded Salesforce Experience Cloud LWR site with an embedded Agentforce agent. Guides through brand extraction, agent generation, Knowledge, three ECV2 integration modes (FAB / Inline / Fullscreen), contextual LWC wizard panels, design iteration loop, and documentation. Reference implementation: Southwest Airlines Help Center (Concept D). See BUILD_PROCESS.md for the full reproducible framework.
---

# Experience Cloud Site Builder

## Purpose

A guided, wizard-style skill that takes a user from zero to a deployed, branded Salesforce Experience Cloud LWR site with an embedded Agentforce agent. Covers brand extraction, agent generation, Knowledge setup, three ECV2 integration modes, contextual LWC wizard panels, automated design iteration, and documentation generation.

## Trigger

Invoke this skill when the user asks to:
- Build, scaffold, or create an Experience Cloud site
- Generate LWC components for a digital experience
- Deploy an Experience Cloud portal or community
- Embed an Agentforce agent on an Experience Cloud site
- Build a branded chat experience on a Salesforce site

---

## PHASE 0: Discovery & Plan

**Do not generate any code until Phase 0 is complete and the user confirms the plan.**

### Step 0.1: Gather Core Requirements

Ask the user:

1. **Site name and URL prefix** — e.g., "Southwest Help Center" / `helpcenter`
2. **Org alias** — run `sf org list` if unknown
3. **Site purpose** — one sentence: who uses it and what they do there
4. **Pages needed** — e.g., Home, Topic Index, Search, FAQ (default: Home only)
5. **Agentforce agent** — do they have one already, or do we generate one?

### Step 0.2: Brand Extraction

Ask for brand input using the best available source:

**Option A — URL (preferred):**
If the user provides a brand URL (e.g., `southwest.com`), use WebFetch to extract:
- Primary and secondary colors (parse CSS variables, inline styles, background values)
- Typography (font-family, heading sizes, weights)
- Border radius, shadow styles, spacing scale
- Logo URL

**Option B — Screenshot:**
If the user provides a local file path (PNG/JPG), use the Read tool to load it visually and extract the same values.

**Option C — Manual:**
If no reference is available, ask for:
- Primary color (hex)
- Accent/secondary color (hex)
- Logo file path or URL
- Font preferences

After extraction, output a structured brand summary:

```
Brand Summary
─────────────────────────────
Primary:    #304CB2 (SWA Blue)
Secondary:  #1B2D7B (Navy)
Accent:     #FFBF27 (Gold)
Text:       #1a1a1a
Background: #ffffff
Font:       System (-apple-system, BlinkMacSystemFont, 'Segoe UI')
Logo:       /path/to/logo.svg
Border R:   12px
Shadow:     0 2px 8px rgba(0,0,0,0.10)
─────────────────────────────
```

Ask: "Does this look right? Type YES to proceed or describe corrections."

### Step 0.3: Choose Agent Integration Mode

This is the most important architectural decision. Present the three options:

```
AGENT INTEGRATION MODE — choose one:

A) Standard FAB
   Platform floating button (bottom-right corner). Minimal custom UI.
   Best for: quick deployments, standard platform look, minimal branding needs.
   Effort: ~4 hours.

B) Inline Embedded  ← RECOMMENDED
   ECV2 renders inside a fully branded LWC wrapper. Custom header, search-to-chat
   transition, split panels, utterance injection, chrome hiding.
   Best for: branded experiences, contextual workflows, rich UX demos.
   Effort: ~8 hours.

C) Fullscreen Takeover
   CTA button triggers full-viewport chat experience. Immersive, mobile-native feel.
   Best for: dedicated chat surfaces, mobile-first audiences.
   Effort: ~6 hours.
```

Wait for user selection before proceeding.

### Step 0.4: Contextual Panels (Inline mode only)

If mode B was selected, ask:

"Does your agent need to open a contextual data-collection panel alongside the chat for any topic? For example: a pet travel wizard, a booking form, an eligibility checker.

- YES → ask: What topic triggers it? What data does it collect?
- NO → skip to Phase 1"

### Step 0.5: Present Plan for Confirmation

Output a structured build plan before generating anything:

```
BUILD PLAN
══════════════════════════════════════════════════════
Site:        Southwest Help Center (/helpcenter)
Org:         southwest-ama
Mode:        Inline Embedded (Concept D)
Agent:       Southwest AMA Agent (generate from scratch)
Knowledge:   Yes — 5 articles (Booking, Baggage, Check-In, Rapid Rewards, Pet Travel)
Panels:      Pet Travel Wizard (triggers on "pet" keywords)

Components to generate:
  swaGlobalStyles          Global CSS injector
  swaHelpCenterHeader      Nav bar + hamburger mobile menu
  swaHelpCenterFooter      Footer + links
  swaHelpCenterTopics      Topic card grid
  swaHelpCenterSearchD     Main ECV2 inline wrapper (FSM + split panel)
  swaPetTravelWizard       Pet travel data collection (3-step wizard)

Apex to generate:
  SwaPetPolicyController   @InvocableMethod + @AuraEnabled

Estimated time: ~10 hours build + 2 hours iteration
══════════════════════════════════════════════════════
Type YES to proceed or describe changes.
```

---

## PHASE 1: Agent Generation

### Step 1.1: Agent Persona

Ask for or infer:
- Agent name and display label
- Persona tone (e.g., "warm, helpful, conversational — like a knowledgeable travel partner")
- What the agent should never say (brand voice anti-patterns)
- Brand-specific terminology the agent should use

### Step 1.2: Topics

Ask the user to list the topics the agent handles. For each topic, collect:
- Topic name and description
- Instructions (what the agent should do/say)
- Any Apex actions needed
- Human escalation trigger (if any)

### Step 1.3: Knowledge Source (Optional)

Ask: "Does this agent answer questions from Knowledge articles?"

**If YES:**
- Ask for the knowledge domain (e.g., "travel policies", "product FAQs")
- Generate 3–5 representative Knowledge articles as `.html` files
- Generate `@AuraEnabled` Apex search class (`without sharing`, two-pass LIKE search)
- Add `search_knowledge` action to the `general_topic` in Agent Script
- Generate permission set granting Knowledge read + Apex access to guest user

**If NO:** Skip to Step 1.4.

### Step 1.4: Generate Agent Script

Generate the `.agent` file with:

```yaml
system:
  instructions: |
    [Persona from 1.1]
  messages:
    welcome: "[Opening message]"

config:
  developer_name: "<AgentAPIName>"
  agent_label: "<Display Label>"

variables:
  EndUserId: linked string
    source: @MessagingSession.MessagingEndUserId
  # ... standard session variables

start_agent topic_selector:
  label: "Topic Selector"
  reasoning:
    actions:
      go_<topic>: @utils.transition to @topic.<topic>_topic

topic <topic>_topic:
  label: "<Label>"
  description: "<Description>"
  reasoning:
    instructions: ->
      | [Instructions from 1.2]
  # ... actions if needed
```

### Step 1.5: Deploy and Activate Agent

```bash
# Deploy agent bundle
sf project deploy start \
  --source-dir force-app/main/default/aiAuthoringBundles/<AgentName> \
  --target-org <alias>

# Publish
sf agent publish authoring-bundle --json --api-name <AgentName> --target-org <alias>

# Activate
sf agent activate --api-name <AgentName> --target-org <alias>

# Verify
sf data query --query "SELECT Id, DeveloperName FROM BotDefinition WHERE DeveloperName = '<AgentName>'" --target-org <alias>
```

---

## PHASE 2: Messaging & Embedded Service Setup

This phase has the most silent failure modes. Walk through each step explicitly.

### Step 2.1: Messaging Channel (Manual — Setup UI)

Guide the user:

> "Open Setup → Messaging Settings → New Channel → Messaging for In-App & Web.
> - Channel Name: `<SiteName>_Chat`
> - Routing Type: Agentforce Service Agent
> - Agent: `<AgentName>`
> - Fallback Queue: select or create one
> Click Save."

Verify:
```bash
sf data query --query "SELECT Id, DeveloperName, IsActive, RoutingType FROM MessagingChannel" --target-org <alias>
# RoutingType must NOT be null
```

### Step 2.2: Embedded Service Deployment (Manual — Setup UI)

> "Open Setup → Embedded Service Deployments → New → Embedded Messaging.
> - Select the Messaging Channel from Step 2.1
> - Select your Experience Cloud site
> - Domain: use `<your-domain>.my.site.com` (NOT `.salesforce-sites.com`)
> Click through the wizard, then click Publish."

Verify backing site was created:
```bash
sf data query --query "SELECT Id, Name, Status FROM Site WHERE Name LIKE 'ESW_%'" --target-org <alias>
# Must show a new ESW_* record — if not, the deployment wasn't created via Setup UI
```

### Step 2.3: Head Markup Update (Manual — Experience Builder)

> "Open Experience Builder → Administration → Advanced → Head Markup.
> Replace the existing script block with this:"

```html
<!-- SLDS stylesheets — keep all existing <link> tags -->
<!-- Replace ONLY the <script> block with: -->
<script type='text/javascript'>
    function loadEmbeddedMessagingScript() {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = 'https://<your-domain>.my.site.com/<ESWPath>/assets/js/bootstrap.min.js';
        document.body.appendChild(s);
    }
    if (document.readyState === 'complete') {
        loadEmbeddedMessagingScript();
    } else {
        window.addEventListener('load', loadEmbeddedMessagingScript);
    }
</script>
```

> "**IMPORTANT:** No `init()` call in Head Markup — the LWC handles that. After saving, click Publish in Experience Builder."

### Step 2.4: Guest User Permissions (Automated)

Generate and deploy:

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

```bash
# Deploy
sf project deploy start --metadata PermissionSet:Messaging_Guest_Access --target-org <alias>

# Find both guest users
sf data query --query "SELECT Id, Username FROM User WHERE Profile.UserLicense.Name = 'Guest User License' AND IsActive = true" --target-org <alias>

# Get perm set ID
sf data query --query "SELECT Id FROM PermissionSet WHERE Name = 'Messaging_Guest_Access'" --target-org <alias>

# Assign to EC site guest user
sf data create record --sobject PermissionSetAssignment --values "AssigneeId='<EC_Id>' PermissionSetId='<PS_Id>'" --target-org <alias>

# Assign to ESW backing site guest user
sf data create record --sobject PermissionSetAssignment --values "AssigneeId='<ESW_Id>' PermissionSetId='<PS_Id>'" --target-org <alias>
```

### Step 2.5: Verify `areGuestUsersAllowed`

```bash
sf project retrieve start --metadata EmbeddedServiceConfig:<DeploymentName> --target-org <alias>
# Check XML: areGuestUsersAllowed must be true
# If false, edit and redeploy
```

---

## PHASE 3: Global CSS Infrastructure

### Step 3.1: Generate Global CSS Static Resource

Generate `<prefix>HelpCenterOverrides.css` with:

**Full-width LWR layout overrides:**
```css
[class*="content-layout"], [class*="contentRegion"], [class*="outerContainer"],
[class*="innerContainer"], [class*="templateContainer"] {
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
}
community_layout-section, community_layout-full-column,
webruntimedesign-component-wrapper {
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    gap: 0 !important;
}
```

**Zero-gap between components:**
```css
webruntimedesign-component-wrapper { margin: 0 !important; padding: 0 !important; }
community_layout-section { row-gap: 0 !important; }
```

**ECV2 container collapse fix** (counters the `*` reset):
```css
.embedded-messaging {
    position: fixed !important; bottom: 0 !important; right: 0 !important;
    width: auto !important; height: auto !important;
    overflow: visible !important; z-index: 999999 !important;
}
.embedded-messaging * { margin: revert !important; padding: revert !important; }
```

### Step 3.2: Generate GlobalStyles Loader LWC

```javascript
// <prefix>GlobalStyles.js
import { LightningElement } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import overrides from '@salesforce/resourceUrl/<prefix>HelpCenterOverrides';

export default class GlobalStyles extends LightningElement {
    stylesLoaded = false;
    renderedCallback() {
        if (this.stylesLoaded) return;
        this.stylesLoaded = true;
        loadStyle(this, overrides);
    }
}
```

```html
<!-- <prefix>GlobalStyles.html -->
<template></template>
```

```xml
<!-- targets lightningCommunity__Page + lightningCommunity__Default -->
```

### Step 3.3: Deploy

```bash
sf project deploy start \
  --source-dir force-app/main/default/staticresources \
  --source-dir force-app/main/default/lwc/<prefix>GlobalStyles \
  --target-org <alias>
```

Add GlobalStyles to Experience Builder Theme Footer on every page (renders nothing, injects CSS globally).

---

## PHASE 4: LWC Component Generation

Generate components based on the plan from Phase 0.

### Step 4.1: Shared Components

Always generate:
- `<prefix>HelpCenterHeader` — branded nav bar, logo, links, hamburger mobile menu
- `<prefix>HelpCenterFooter` — footer links, social icons, legal
- `<prefix>HelpCenterTopics` — topic card grid linking to help categories

CSS rules for all components:
```css
:host { display: block; }
* { box-sizing: border-box !important; margin: 0 !important; padding: 0 !important; }
/* Full-width bleed for header/footer */
:host {
    margin-left: -24px !important; margin-right: -24px !important;
    width: calc(100% + 48px) !important;
}
/* Mobile reset at 768px — critical: prevents content clipping on right */
@media (max-width: 768px) {
    :host { margin: 0 !important; width: 100% !important; }
}
```

### Step 4.2: Main Chat LWC — Mode Dependent

#### Mode A: Standard FAB

Generate a simple search hero component. ECV2 uses the platform's default floating widget. No custom wrapper needed.

Head Markup handles `init()` normally. No FSM required.

#### Mode B: Inline Embedded (Concept D)

Generate `<prefix>HelpCenterSearchD` with:

**HTML structure — always-in-DOM layers:**
```html
<template>
    <section class={sectionClass}>
        <div class="<prefix>-inner">
            <!-- Search layer — CSS hidden when chat active, always in DOM -->
            <div class={promptLayerClass}>
                <!-- Branded search box, gold pill input, send button -->
            </div>
            <!-- Chat layer — always in DOM so refs.chatContainer exists -->
            <div class={chatLayerClass}>
                <!-- Branded header with diagonal band gradient -->
                <div class="<prefix>-chat-header">...</div>
                <!-- Chat body — flex split for wizard panel -->
                <div class={chatBodyClass}>
                    <div class="<prefix>-chat-pane">
                        <!-- Loading dots -->
                        <template lwc:if={isLoading}>...</template>
                        <!-- ECV2 container — targetElement for bootstrap.init() -->
                        <div lwc:ref="chatContainer" class={iframeClass}></div>
                    </div>
                    <!-- Wizard panel — lwc:if is OK here (not the ECV2 container) -->
                    <template lwc:if={isWizardOpen}>
                        <div class="<prefix>-wizard-pane">...</div>
                    </template>
                </div>
            </div>
        </div>
    </section>
</template>
```

**JS FSM structure:**
```javascript
const STATE = Object.freeze({
    PROMPT, PRIMED, LOADING, LAUNCHING, SENDING, ACTIVE, ERROR
});
const EVT = Object.freeze({
    SUBMIT, BOOTSTRAP_READY, CONV_OPENED, BOT_MESSAGE, MSG_SENT,
    CONV_CLOSED, SESSION_ACTIVE, INIT_ERROR, LAUNCH_FALLBACK, SEND_FALLBACK,
    TIMEOUT, RETRY
});
const TRANSITIONS = Object.freeze({
    [STATE.PROMPT]:    { SUBMIT: LOADING, BOOTSTRAP_READY: PRIMED, INIT_ERROR: ERROR },
    [STATE.PRIMED]:    { SUBMIT: LAUNCHING, CONV_OPENED: PRIMED, INIT_ERROR: ERROR },
    [STATE.LOADING]:   { BOOTSTRAP_READY: LAUNCHING, CONV_OPENED: SENDING, ... },
    [STATE.LAUNCHING]: { CONV_OPENED: SENDING, BOT_MESSAGE: SENDING, LAUNCH_FALLBACK: ACTIVE, ... },
    [STATE.SENDING]:   { BOT_MESSAGE: SENDING, MSG_SENT: ACTIVE, SEND_FALLBACK: ACTIVE, ... },
    [STATE.ACTIVE]:    { CONV_CLOSED: PROMPT, CONV_OPENED: ACTIVE, BOT_MESSAGE: ACTIVE },
    [STATE.ERROR]:     { RETRY: PROMPT }
});
```

**Critical `_initChat()` pattern:**
```javascript
_initChat() {
    if (this._bootstrapInited) return;
    const chatEl = this.refs.chatContainer;      // must exist — never lwc:if this element
    const bootstrap = window.embeddedservice_bootstrap;
    bootstrap.settings.language                = 'en_US';
    bootstrap.settings.displayMode             = 'inline';
    bootstrap.settings.disableInlineAutoLaunch = true;
    bootstrap.settings.targetElement           = chatEl;
    this._attachListeners();                     // BEFORE init()
    this._bootstrapInited = true;
    bootstrap.init(orgId, deploymentApiName, siteUrl, { scrt2URL });
}
```

**Utterance injection — critical timing:**
```
launchChat()
  → onEmbeddedMessagingConversationOpened   ← WAIT — agent not joined
  → onEmbeddedMessagingFirstBotMessageSent  ← SEND HERE
  → sendTextMessage(userQuery)
```

**Fallback for SDO orgs** (where `sendTextMessage` is undefined):
```javascript
// Inject via iframe script — runs outside LWS
const script = iframeDoc.createElement('script');
script.textContent = `(function() {
    function dq(root,sel) { /* shadow DOM deep query */ }
    var ta = dq(document,'textarea');
    var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    setter.call(ta, ${escaped});
    ta.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    var poll = setInterval(function() {
        var btn = dq(document,'button[class*="sendButton"],button[aria-label="Send"]');
        if (btn && !btn.disabled) { clearInterval(poll); btn.click();
            window.parent.postMessage({type:'swa-msg-sent',sessionId:${sid}},'*'); }
    }, 300);
})();`;
iframeDoc.head.appendChild(script);
```

**ECV2 chrome hiding** (call on every `CONV_OPENED`):
```javascript
// Inject CSS into every shadow root via same-origin iframe script
// Target: cwcmessaging-cwc-header-block
// Never use getElementById guard — re-inject every session
```

**Close + reopen pattern:**
```javascript
handleCloseChat() {
    try { bootstrap.utilAPI.endChat(); } catch(e) {}
    // clear session storage keys: miaw, embeddedmessaging, esw_, conversationid
    this._state = STATE.PROMPT;   // set directly
    this._softReset();            // resets _chatRevealed, _iframeReady, _pendingQuery
}
handleSubmit() {
    this._chatRevealed = false;   // always reset — shows loading on every open
    this._iframeReady  = false;   // always reset — re-runs chrome hide
    this._dispatch(EVT.SUBMIT);
}
```

**CSS split panel:**
```css
.swa-chat-body  { display: flex !important; flex: 1 !important; }
.swa-chat-pane  { flex: 1; transition: flex 0.3s linear !important; }
/* Use linear — cubic-bezier causes bounce artifact */
.swa-chat-split .swa-chat-pane { flex: 0 0 55% !important; }
.swa-wizard-pane { flex: 0 0 45%; animation: slide-in 0.3s linear; }
@keyframes slide-in { from { opacity: 0; } to { opacity: 1; } }
```

#### Mode C: Fullscreen Takeover

Generate `<prefix>HelpCenterHeroC` with:
- Hero section with prominent CTA button
- `isFullscreenOpen` boolean toggle
- Full-viewport overlay (`position: fixed; inset: 0; z-index: 200000`)
- `document.body.style.overflow = 'hidden'` when open
- Dark navy (`#1B2D7B`) header, blue message area (`#304CB2`), gold pill input

### Step 4.3: Deploy All Components

```bash
sf project deploy start \
  --source-dir force-app/main/default/lwc \
  --target-org <alias> \
  --ignore-conflicts
```

> **Always use `--ignore-conflicts`.** Source tracking diverges after any retrieve.

### Step 4.4: Experience Builder Page Setup (Manual)

Guide the user through:

1. Create new page with **Frame layout** for each concept page
2. Set URL path (e.g., `/helpcenter`)
3. Drag `<prefix>HelpCenterHeader` into **Theme Header** — shared across all pages
4. Drag `<prefix>GlobalStyles` + Embedded Messaging into **Theme Footer**
5. Drag page-specific components into **Content Region only**
6. Publish the site

---

## PHASE 5: Contextual Panel Generation (Optional)

Skip this phase if no contextual panels were requested in Phase 0.

### Step 5.1: Apex Action

Generate `<Prefix><Topic>Controller.cls` with:

```java
public without sharing class <Prefix><Topic>Controller {
    // For agent action
    @InvocableMethod(label='<Label>' category='<Category>')
    public static List<Result> getPolicy(List<Request> requests) { ... }

    // For LWC direct call (CLT cards don't render in ECV2 iframe)
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getPolicyForLwc(String input) { ... }

    // Both call the same private buildResult() — no logic duplication
    private static Result buildResult(String input) { ... }
}
```

Add to permission set:
```xml
<classAccesses>
    <apexClass><Prefix><Topic>Controller</apexClass>
    <enabled>true</enabled>
</classAccesses>
```

### Step 5.2: Agent Topic Update

Add topic to `.agent` file:

```yaml
topic <topic>_topic:
  label: "<Topic Label>"
  description: "<When this topic fires>"
  reasoning:
    instructions: ->
      | When user mentions <trigger keywords>, call show_<topic>_panel immediately.
      | After calling, say: "<Opening message>"
      | When user says "<closing utterance>":
      | Respond with specific verification including [field 1], [field 2], [field 3].
    actions:
      show_panel: @actions.show_<topic>_panel
        with input = ...

  actions:
    show_<topic>_panel:
      target: "apex://<Prefix><Topic>Controller"
      inputs:
        input: string (required)
      outputs:
        title: string
        content: string
        note: string
```

```bash
sf agent publish authoring-bundle --json --api-name <AgentName> --target-org <alias>
sf agent activate --api-name <AgentName> --target-org <alias>
```

### Step 5.3: Wizard LWC

Generate `<prefix><Topic>Wizard` with:

**Step 1** — Selection grid + input fields (name, relevant data fields, custom type if "Other")
- Selection cards (2–4 options with emoji/icon and label)
- Input fields appear after selection
- Confirm button advances to step 2

**Step 2** — File upload (optional)
- Drag-and-drop zone + click-to-upload
- File list with remove buttons
- Back / Continue buttons

**Step 3** — Summary
- Icon at top
- Summary table: all collected fields + document count
- Back / Save information buttons
- Save fires `dispatchEvent(new CustomEvent('wizardsubmit'))` — no X button needed

**CSS split panel:**
```css
.wizard-card { background:#fff; border-radius:12px; border:1px solid #e5e7eb;
               padding:20px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
.step-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.upload-zone { border:2px dashed #d1d5db; border-radius:12px; padding:28px;
               text-align:center; cursor:pointer; }
.upload-zone:hover { border-color:#304CB2; background:#f0f4ff; }
```

### Step 5.4: Topic Detection in LWC

Add to `swaHelpCenterSearchD`:

**Initial query detection** (runs on `BOT_MESSAGE`):
```javascript
_checkQueryForTopic() {
    const q = (this._submittedQuery || '').toLowerCase();
    const KEYWORDS = ['<keyword1>', '<keyword2>'];
    if (!KEYWORDS.some(w => q.includes(w))) return;
    // Call @AuraEnabled Apex, open wizard 1s after BOT_MESSAGE
    setTimeout(() => {
        getPolicyForLwc({ input: detectedInput })
            .then(result => this.openWizard(...))
            .catch(() => this.openWizard(detectedInput, 'Policy', '', ''));
    }, 1000);
}
```

**Subsequent turn detection** (runs on `BOT_MESSAGE` in `ACTIVE` state):
```javascript
_checkIframeForTopicResponse() {
    // Inject script to scan agent response text for keywords
    // postMessage('swa-<topic>-response-detected') if matched
    // Fires openWizard() from parent postMessage handler
}
```

**postMessage bridge listener:**
```javascript
window.addEventListener('message', (event) => {
    if (event.data?.type === 'swa-<topic>-response-detected' &&
        !this._wizardOpen && !this._wizardJustClosed) {
        getPolicyForLwc({ input: event.data.input })
            .then(result => this.openWizard(...));
    }
});
```

**Closing utterance injection** (fires when wizard Save button clicked):
```javascript
handleWizardSubmit() {
    this._wizardOpen = false;
    this._wizardJustClosed = true;
    setTimeout(() => { this._wizardJustClosed = false; }, 3000);
    setTimeout(() => {
        const utterance = 'I have completed the ' + this._topicLabel + ' process.';
        this._injectViaTextarea(utterance, Date.now());
    }, 600);
}
```

---

## PHASE 6: Design Iteration Loop

This is where the real value compounds. Each iteration takes ~90 seconds.

### Iteration Cycle

```
1. User previews site in incognito browser
2. User describes desired change (text, color, spacing, layout)
3. Claude applies change to CSS/HTML
4. Deploy: sf project deploy start --source-dir force-app/main/default/lwc/<component> --target-org <alias> --ignore-conflicts
5. "Hard refresh your incognito window (Cmd+Shift+R)"
6. Evaluate and repeat
```

### Common Iteration Types

**Color changes:**
- "Make the search box match the nav header" → update background hex in LWC CSS
- "Use a darker gradient on the chat header" → adjust gradient stops

**Layout/spacing:**
- "Add more breathing room above the search box" → adjust padding on section class
- "The chat panel needs to be taller" → change height in `.swa-chat-layer`

**Typography:**
- "The title should be bigger" → increase `font-size` on title class
- "Use a lighter weight for the subtitle" → adjust `font-weight`

**Animation:**
- "The wizard slide-in has a bounce" → change `cubic-bezier` to `linear`
- "Make the transition faster" → reduce `0.3s` to `0.2s`

### Deploy Command Reference

```bash
# Single component (fastest)
sf project deploy start --source-dir force-app/main/default/lwc/<component> --target-org <alias> --ignore-conflicts

# Multiple components
sf project deploy start \
  --source-dir force-app/main/default/lwc/<comp1> \
  --source-dir force-app/main/default/lwc/<comp2> \
  --target-org <alias> --ignore-conflicts

# CSS static resource
sf project deploy start --source-dir force-app/main/default/staticresources --target-org <alias> --ignore-conflicts

# Agent + LWC together
sf project deploy start \
  --source-dir force-app/main/default/lwc \
  --source-dir force-app/main/default/aiAuthoringBundles \
  --target-org <alias> --ignore-conflicts
```

---

## PHASE 7: Verification & Testing

Run after every major phase and before declaring the build complete.

### Bootstrap Verification

Run in browser console after page load:

```javascript
// Verify bootstrap loaded and in inline mode
console.log('bootstrap:', typeof window.embeddedservice_bootstrap);
console.log('displayMode:', window.embeddedservice_bootstrap?.settings?.displayMode);
console.log('targetElement:', window.embeddedservice_bootstrap?.settings?.targetElement);
// Expected: 'object', 'inline', <div element>
```

### FSM Event Verification

Run before submitting a query:

```javascript
['onEmbeddedMessagingReady','onEmbeddedMessagingButtonCreated',
 'onEmbeddedMessagingConversationOpened','onEmbeddedMessagingFirstBotMessageSent']
.forEach(evt => window.addEventListener(evt, e => console.log('[EVT]', evt)));
```

Then submit — confirm all four events fire in order.

### Test Checklist

| Test | Pass criteria |
|------|--------------|
| Search screen renders | Branded colors, correct padding, gold pill input |
| Submit triggers loading indicator | "Connecting to agent..." dots appear |
| Loading closes when agent joins | `BOT_MESSAGE` fires, dots disappear |
| Initial utterance appears in chat | User bubble appears after welcome message |
| Agent responds to utterance | Agent bubble appears with relevant content |
| Wizard opens for topic queries | Split panel slides in with wizard |
| Wizard steps navigate correctly | All 3 steps work, Back/Confirm/Save function |
| Closing utterance sends correctly | User bubble appears after Save |
| Agent verification response | Pet-specific or topic-specific response |
| Close returns to search screen | X click resets state cleanly |
| Reopen after close works | Second query opens fresh conversation |
| Second topic query reopens wizard | Wizard opens in same session |
| Incognito test passes | No stale cache artifacts |

> **Always test in a new incognito window.** Cached service workers mask every change.

---

## PHASE 8: Documentation Generation

After the build is approved, generate:

### Step 8.1: BUILD_PROCESS.md

Generate a site-specific `BUILD_PROCESS.md` capturing:
- Decisions made in Phase 0 (brand, mode, agent config)
- All manual steps the user completed
- All automated commands run
- Time taken per phase
- Lessons learned specific to this build

### Step 8.2: Architecture Diagram

Generate a Mermaid sequence diagram showing:
- Page load → bootstrap → init flow
- User submit → FSM transitions → agent response
- Topic detection → wizard open → closing utterance loop
- postMessage bridge messages

### Step 8.3: Deployment Runbook

Generate a concise runbook for re-deploying to a new org:
- Prerequisites checklist
- Manual steps in order with verification commands
- Automated deployment sequence
- Rollback steps

---

## REFERENCE: Critical Rules

These rules prevent the most common silent failures. Enforce them on every build.

### CSS Rules
- `*` reset is required (SLDS) and destructive (collapses ECV2). Fix with counter-rules, never modify `*`.
- `<link>` in Head Markup doesn't load static resources in LWR. Use `loadStyle()`.
- Always `!important`. LWR has no Shadow DOM — CSS leaks everywhere.
- Use `linear` easing on flex split transitions. `cubic-bezier` causes bounce.
- Full-width bleed components need mobile reset at 768px or content clips on right.

### ECV2 Inline Mode Rules
- Head Markup: load script only, never call `init()`.
- `refs.chatContainer` must always be in DOM. Use CSS `display:none/flex`, never `lwc:if`.
- Set `_chatRevealed = false` and `_iframeReady = false` in `handleSubmit` every time.
- Send utterance on `BOT_MESSAGE`, never on `CONV_OPENED`. Agent hasn't joined yet.
- Never pre-warm. `launchChat()` before submit causes `BOT_MESSAGE` to fire and expire before user submits.
- Re-inject chrome hide CSS on every `CONV_OPENED`. Never use `getElementById` guard.
- Always deploy with `--ignore-conflicts`.
- Head Markup changes require Experience Builder republish. LWC changes do not.

### Agentforce Rules
- CLT cards don't render in ECV2 iframe on Experience Cloud. Use `@AuraEnabled` + keyword detection instead.
- `without sharing` for all Apex serving guest users.
- Guest permissions have 3 layers: perm set + assign to BOTH guest users + `areGuestUsersAllowed = true`.
- `areGuestUsersAllowed` resets on every new deployment. Always check.
- One Messaging Channel per deployment. Never share the default channel.
- Always create ESW Deployment via Setup UI — metadata deploy doesn't provision the backing site.

### Deployment Rules
- Always `--ignore-conflicts` — source tracking diverges after retrieves.
- Test in incognito after every deploy. Service workers cache aggressively.
- After agent Script changes: `sf agent publish authoring-bundle --json` + `sf agent activate`.

---

## REFERENCE: Timing Constants

```javascript
const DEFAULT_TIMEOUT_MS = 60000;   // Production: reduce to 30000
const LAUNCH_FALLBACK_MS = 15000;   // Production: reduce to 8000
const SEND_FALLBACK_MS   = 25000;   // Production: reduce to 15000
```

SDO demo orgs: 15–30s agent join time. Production orgs: 3–5s.

---

## REFERENCE: postMessage Bridge

| Message | Direction | Purpose | Guard |
|---------|-----------|---------|-------|
| `swa-msg-sent` | iframe → LWC | Utterance delivered via textarea injection | `sessionId` must match `_sendSessionId` |
| `swa-<topic>-response-detected` | iframe → LWC | Agent responded with topic keywords | `!_wizardOpen && !_wizardJustClosed` |
| `swa-<topic>-wizard-trigger` | iframe → LWC | Re-open wizard (chip click) | `STATE.ACTIVE && !_wizardJustClosed` |
| `swa-menu-items` | iframe → LWC | ECV2 action menu items collected | `_menuOpen` not already set |

Filter out ECV2's internal `rpc-call` messages — only process known `type` values.

---

## REFERENCE: Publish Requirements

| Change | Requires EB republish? |
|--------|----------------------|
| LWC JS/HTML/CSS deploy | **No** — hard incognito refresh |
| Static resource CSS | **No** — hard incognito refresh |
| Head Markup change | **Yes** |
| New LWC added to EB page | **Yes** |
| ESD config change | **Yes** (ESW deployment + EB site) |
| Agent Script publish/activate | **No** |

---

## REFERENCE: Troubleshooting

### ECV2 shows as floating FAB instead of inline
Head Markup still has `init()` call. Remove `initEmbeddedMessaging` from Head Markup entirely. Only the script loader should remain. Republish EB site after.

### ECV2 container exists but iframe never renders
`bootstrap.init()` ran before `refs.chatContainer` was in the DOM. This happens when `lwc:if` conditionally renders the container. Remove `lwc:if` from the container element. Both layers must always be in the DOM.

### Chat loads but stays on "Connecting to agent..."
Bootstrap events fired before listeners were attached. Add guard: check if `bootstrap.utilAPI.launchChat` already exists in `connectedCallback` and dispatch `BOOTSTRAP_READY` immediately if so.

### Utterance appears before agent welcome message
`sendTextMessage` is being called too early — at `CONV_OPENED` or immediately on `BOT_MESSAGE`. Wait for `BOT_MESSAGE` then add a delay for the send to account for `utilAPI.sendTextMessage` availability. Use 8s delay for SDO orgs.

### `sendTextMessage` is undefined (SDO orgs)
This is a platform infrastructure issue (`EvfSdkController.getEventTypes` failure). Fall back to script injection: find textarea via shadow DOM traversal, use native property setter, poll for send button.

### Wizard doesn't reopen for second query
`BOT_MESSAGE` only fires once during first agent join. For subsequent turns, run `_checkIframeForTopicResponse()` on every `BOT_MESSAGE` in `ACTIVE` state. This injects a keyword scanner script and fires a `postMessage` on match.

### Everything broke after `sf project retrieve`
Source tracking diverged. Always `--ignore-conflicts` on subsequent deploys. If code reverted to old version, re-apply your changes and redeploy.

### ECV2 agent header still visible after chrome hide
The `cwcmessaging-cwc-header-block` element is inside shadow roots. Style tags in `iframeDoc.head` can't pierce them. Use the script injection pattern — inject CSS into every shadow root via a `<script>` tag in `iframeDoc.head`. Remove `getElementById` dedup guard — re-inject every session.

### `areGuestUsersAllowed` error silently blocks chat
Retrieve the `EmbeddedServiceConfig` metadata and check the XML. Set to `true`, redeploy. This resets on every new deployment creation.
