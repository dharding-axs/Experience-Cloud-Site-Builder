# Experience Cloud Site Builder

## Purpose

End-to-end scaffold, generate, deploy, and document a Salesforce Experience Cloud LWR site — including Agentforce chat integration — using Claude Code. Covers project scaffolding, LWC component generation with SLDS-safe CSS, deployment, and Embedded Messaging setup with all known silent blockers pre-handled.

## Trigger

Invoke this skill when the user asks to:

* Build, scaffold, or create an Experience Cloud site
* Generate LWC components for a digital experience
* Deploy an Experience Cloud portal or community
* Embed an Agentforce agent or chat widget on an Experience Cloud site

---

## Phase 1: Gather Requirements

* Ask the user for:
    * Site name and type (LWR vs Aura — default LWR)
    * Pages needed (e.g., Home, Resource Library, Case Submission)
    * Key objects/data to surface (e.g., Cases, Knowledge, Opportunities)
    * Whether Agentforce chat integration is needed (if yes, collect agent API name)
    * GitHub repo URL (optional)
    * Target Salesforce org alias (default: whatever `sf org list` returns as default)
* If a GitHub repo is provided, clone it and scan for reusable LWC components

## Phase 2: Plan the Build

* Output a structured build plan:
    * Site template type
    * Page list with layout descriptions
    * Component inventory (new vs reused)
    * Navigation structure
    * Data bindings and object dependencies
    * If Agentforce integration: messaging channel name, deployment name, and permission set plan
* **Always include in the component inventory:**
    * A global styles loader LWC (`<prefix>GlobalStyles`) — required for full-width layout and embedded messaging CSS fixes
    * A global CSS static resource (`<prefix>Overrides.css`) — the actual CSS loaded globally
* Ask: "Does this look right? Type YES to proceed or describe changes."

## Phase 3: Scaffold the Project

* Run: `sf project generate --name <site-name>`
* Generate folder structure:
    * `force-app/main/default/lwc/` — one folder per component
    * `force-app/main/default/digitalExperiences/` — site config
    * `force-app/main/default/navigationMenus/`
    * `force-app/main/default/customMetadata/`
    * `force-app/main/default/staticresources/` — global CSS overrides
    * `force-app/main/default/permissionsets/` — guest user permissions (if Agentforce integration)
    * `force-app/main/default/corsWhitelistOrigins/` — CORS allowlist for site domain
* For each LWC component generate:
    * `<component>.html` — template with slots and data bindings
    * `<component>.js` — controller with wire adapters
    * `<component>.css` — scoped styles using design tokens, with responsive breakpoints
    * `<component>.js-meta.xml` — targets `lightningCommunity__Page` and `lightningCommunity__Default`

---

### CSS Architecture for LWR Sites

LWR (Lightning Web Runtime) does NOT use Shadow DOM for LWC components. CSS is processed but NOT scoped — bare selectors leak out and affect the entire page, including platform-injected elements like Embedded Messaging. This has major implications for how CSS must be structured.

#### Three-Layer CSS Strategy

Every LWR site needs three CSS layers working together:

1. **Component CSS (per-LWC `.css` file)** — SLDS overrides for the component's own elements. Uses `* { ... !important }` reset and class-based selectors with `!important`.
2. **Global CSS (static resource via `loadStyle`)** — Page-level overrides that affect LWR theme wrappers, layout containers, and third-party injected elements (Embedded Messaging). Loaded via an invisible LWC.
3. **Embedded Messaging counter-rules (inside global CSS)** — Targeted `position: fixed` rules that undo the damage from the `*` reset leaking into the `.embedded-messaging` container.

#### Layer 1: Component CSS Rules

**SLDS Override Rules:**
* Always use `!important` on every property that overrides SLDS
* Never use `color: inherit` — SLDS injects its own default. Use explicit values: `color: #ffffff !important`
* Use bare selectors, not `:host` prefixed — `:host .link` loses to SLDS specificity
* Every LWC needs this reset to defeat SLDS defaults:
  ```css
  * {
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
  }
  ```

**CRITICAL — The `*` reset leaks in LWR.** Because LWR has no Shadow DOM, the `*` selector affects ALL elements on the page, not just the component's children. This is intentional and necessary to override SLDS — but it will collapse any third-party injected containers (Embedded Messaging, analytics widgets, etc.) to `height: 0`. The fix is Layer 3 (counter-rules in the global CSS static resource). **Do NOT try to fix this by modifying the `*` selector** — approaches like `:host *`, `.class *`, or `*:not(...)` all fail:
* `:host *` — LWR doesn't scope `:host` properly, the reset stops working entirely
* `.swa-hero, .swa-hero *` — Loses the cascade battle against SLDS for nested elements
* `*:not(.embedded-messaging):not(...)` — Breaks the `!important` override chain needed for SLDS, layout collapses

**For components already scoped to a unique wrapper class** (e.g., a header with `.swa-header *`), the scoped selector works fine and doesn't need the global `*` reset.

#### Layer 2: Global CSS Static Resource

`<link>` tags in head markup do NOT work for static resources in LWR. Instead:

1. Create a static resource CSS file (e.g., `<prefix>Overrides.css`):
   ```xml
   <!-- <prefix>Overrides.resource-meta.xml -->
   <?xml version="1.0" encoding="UTF-8"?>
   <StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
       <cacheControl>Public</cacheControl>
       <contentType>text/css</contentType>
   </StaticResource>
   ```

2. Create an invisible LWC that injects it globally:
   ```html
   <!-- <prefix>GlobalStyles.html -->
   <template></template>
   ```
   ```javascript
   // <prefix>GlobalStyles.js
   import { LightningElement } from 'lwc';
   import { loadStyle } from 'lightning/platformResourceLoader';
   import overrides from '@salesforce/resourceUrl/<prefix>Overrides';

   export default class <Prefix>GlobalStyles extends LightningElement {
       stylesLoaded = false;

       renderedCallback() {
           if (this.stylesLoaded) return;
           this.stylesLoaded = true;
           loadStyle(this, overrides);
       }
   }
   ```
   ```xml
   <!-- <prefix>GlobalStyles.js-meta.xml -->
   <?xml version="1.0" encoding="UTF-8"?>
   <LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
       <apiVersion>62.0</apiVersion>
       <isExposed>true</isExposed>
       <targets>
           <target>lightningCommunity__Page</target>
           <target>lightningCommunity__Default</target>
       </targets>
       <masterLabel><Prefix> Global Styles</masterLabel>
   </LightningComponentBundle>
   ```

3. **The user must drag this component onto every page in Experience Builder.** It renders nothing visible — it just injects the CSS into the document head.

4. The global CSS file should contain:
   * LWR layout wrapper overrides (full-width, remove side borders)
   * Embedded Messaging counter-rules (Layer 3, below)

**Full-width layout overrides template:**
```css
/* Target LWR content wrapper patterns */
[class*="content-layout"],
[class*="contentRegion"],
[class*="mainContentRegion"],
[class*="content-wrapper"],
[class*="outerContainer"],
[class*="innerContainer"],
[class*="slds-container"],
[class*="comm-content"],
[class*="dxp-content"],
[class*="templateContainer"],
[class*="themeLayout"],
[class*="theme-layout"] {
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    border-left: none !important;
    border-right: none !important;
    gap: 0 !important;
}

/* LWR custom element wrappers */
dxp_template_lwr-content-layout,
dxp_template_lwr-1t-full-width,
community_layout-section,
community_layout-section > div,
community_layout-full-column,
community_layout-full-column > div,
webruntimedesign-component-wrapper,
webruntimedesign-component-wrapper > div {
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    gap: 0 !important;
}

/* Override SLDS grid constraints */
.slds-grid,
.slds-col,
.slds-container_x-large,
.slds-container_large,
.slds-container_medium {
    max-width: 100% !important;
    padding: 0 !important;
}

/* Zero vertical spacing between components in content region */
community_layout-section,
community_layout-full-column,
[class*="contentRegion"],
[class*="content-layout"] {
    row-gap: 0 !important;
}

/* Remove margin/padding from individual component slot wrappers */
webruntimedesign-component-wrapper {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
}

/* Frame layout body — remove any top/bottom padding */
[class*="frameBody"],
[class*="frame-body"],
[class*="body-container"] {
    padding: 0 !important;
    margin: 0 !important;
    gap: 0 !important;
}
```

#### Layer 3: Embedded Messaging Counter-Rules

**ALWAYS include these rules in the global CSS static resource when Agentforce chat is integrated.** The LWC `*` reset sets `margin: 0` and `padding: 0` on ALL elements including the `.embedded-messaging` container injected by the platform. This collapses the container to `height: 0` and pushes the chat button off-screen (it exists in the DOM but is invisible). These counter-rules restore it:

```css
/* Embedded Messaging fix — LWC * resets leak in LWR and collapse the
   chat container to height:0. These counter-rules restore it. */
.embedded-messaging,
.embedded-messaging *,
.embeddedMessagingFrame,
.embeddedMessagingConversationButton,
[class*="embeddedMessaging"] {
    margin: revert !important;
    padding: revert !important;
    box-sizing: content-box !important;
}

.embedded-messaging {
    position: fixed !important;
    bottom: 0 !important;
    right: 0 !important;
    width: auto !important;
    height: auto !important;
    z-index: 999999 !important;
    overflow: visible !important;
}
```

**Why this works:** The `.embedded-messaging` class selector has specificity `0,1,0`, which beats the `*` universal selector at `0,0,0`. Even though both use `!important`, the higher-specificity selector wins. The `position: fixed` pulls the container out of normal document flow so the `*` reset on `margin`/`padding` no longer affects its positioning. The `revert` keyword restores the browser's default styles for all child elements inside the messaging container.

**Why other approaches fail:**
* Adding `:not(.embedded-messaging)` to the `*` selector breaks the `!important` cascade needed to override SLDS
* Scoping `*` under `:host` doesn't work because LWR doesn't enforce `:host` scoping
* Scoping `*` under a class (`.my-section, .my-section *`) loses specificity battles against SLDS for nested elements

---

### Responsive Design

All components MUST include responsive CSS with media queries. Every grid, multi-column layout, and fixed-width element must break and stack for smaller screens.

**Breakpoints (use consistently across ALL components):**
* **Tablet/Mobile** `@media (max-width: 768px)` — collapse ALL grids to single column (`1fr`), show hamburger nav, reduce padding from 24px to 16px, stack search input + button vertically
* **Small Mobile** `@media (max-width: 480px)` — further reduce font sizes, tighter padding, flex-row layouts become column

**Critical: At 768px, ALL grids must use `grid-template-columns: 1fr`.** Do NOT use `repeat(2, 1fr)` at tablet — it creates visual inconsistency where some sections stack while others show 2 columns.

**Responsive patterns by component type:**
* **Navigation/Header:** Hide desktop nav at 768px, show hamburger button. Hamburger toggles a slide-down mobile menu using `max-height: 0` → `max-height: 500px` CSS transition (can't animate `height: auto`). Three-line icon animates to X via `transform: translateY + rotate`. Duplicate nav links in mobile menu HTML.
* **Card grids (2x2, 3x3, etc.):** Single column at 768px, reduced card padding at 480px
* **Search bars:** Stack input + button vertically at 768px, reduce outer padding
* **Footer grids (icons + links):** Single column at 768px, copyright flex-row becomes column at 480px
* **Typography:** Reduce heading font sizes at 480px

### Full-Width Bleed in LWR

* LWR content regions add ~24px padding. Bleed past it with: `margin-left: -24px; margin-right: -24px; width: calc(100% + 48px); max-width: 100vw; overflow-x: hidden;` on `:host`, then use inner container with `max-width` + `margin: 0 auto`
* **Critical: Reset the bleed at 768px.** On mobile, the LWR content region padding changes and the viewport is narrower — the negative margins push the component wider than the screen, clipping elements on the right (logo, icons, buttons get cut off). At `@media (max-width: 768px)`, reset `:host` to `margin: 0; width: 100%` and reduce inner container padding to 16px. **Every component using the bleed pattern MUST include this mobile reset.**

### SVG in LWC Templates

* Do NOT use `stroke-linecap` or `stroke-linejoin` attributes — the LWC HTML parser cannot handle them and will throw `LWC1052` / `LWC1535` errors
* Do NOT nest `<a>` tags inside other `<a>` tags — causes the same parser failure
* Keep SVG attributes simple: `width`, `height`, `viewBox`, `fill`, `stroke`, `stroke-width` are safe
* Generate `package.xml` scoped to Experience Cloud metadata types

---

## Phase 4: Deploy & Verify

* Use separate `--source-dir` flags per directory (NOT comma-separated):
  `sf project deploy start --source-dir <dir1> --source-dir <dir2> --target-org <alias>`
* **Deploy uses `rollbackOnError: true` by default** — if ANY component fails, the ENTIRE batch is rolled back, even components that showed "Created" in the response. Always check `"success": true` at the top level before trusting individual component states.
* Use `--source-dir` instead of `--metadata LightningComponentBundle:Name` — the metadata flag often can't resolve source-backed LWC components
* If errors occur:
    * Parse the error output
    * Suggest fixes and ask permission to apply them
    * Re-run deploy after fixes
* After fixing a failed component, redeploy ALL components (not just the fixed one) to ensure the previously rolled-back ones are also persisted
* Run: `sf org open --target-org <alias>` to verify the site is live

## Phase 5: GitHub Push (if repo provided)

* `git add .`
* `git commit -m "feat: scaffold Experience Cloud site - <site-name>"`
* `git push origin main`

## Output

After a successful build, summarize:

* Site name and URL
* Pages created
* Components built (with file paths)
* Deployment status
* GitHub commit link (if applicable)
* Suggested next steps (including Experience Builder steps for global styles loader and Embedded Messaging component)

---

## Phase 6: Agent Chat Integration (Embedded Messaging)

When embedding an Agentforce agent on an Experience Cloud LWR site, follow this sequence precisely. This phase has multiple silent failure modes — each step exists because skipping it causes the chat widget to silently not appear with no error messages.

Steps marked **(Auto)** can be fully automated via CLI. Steps marked **(Manual)** require Setup UI. Steps marked **(Generate)** produce deployable metadata files.

### Step 1: (Auto) Pre-Flight Validation

Validate the environment before starting:
```bash
# Agent exists and has published versions
sf data query --json --query "SELECT Id, DeveloperName FROM BotDefinition WHERE DeveloperName = '<Agent_API_Name>'"
sf data query --json --query "SELECT Id, DeveloperName FROM BotVersion WHERE BotDefinition.DeveloperName = '<Agent_API_Name>'"

# Site exists and is active
sf data query --json --query "SELECT Id, Name, Status, UrlPathPrefix FROM Network WHERE Name = '<Site_Name>'"

# Check for existing messaging channels (avoid conflicts)
sf data query --json --query "SELECT Id, DeveloperName, IsActive, RoutingType FROM MessagingChannel"

# Check for existing embedded service deployments
sf data query --json --query "SELECT Id, DeveloperName, IsEnabled FROM EmbeddedServiceConfig"
```

**Critical check:** If a default `Messaging_for_In_App_Web` channel already exists (common in SDO/demo orgs), do NOT reuse it. Sharing a messaging channel between multiple deployments causes routing conflicts where messages go to the wrong agent. Always create a dedicated channel per deployment.

### Step 2: (Manual) Create Dedicated Messaging Channel

Setup → Messaging Settings → New Channel → **Messaging for In-App & Web**.

* **Name:** Use a descriptive name matching the deployment (e.g., `SWA_Help_Center_Chat`)
* **Routing Type:** "Agentforce Service Agent"
* **Agent:** Select the target agent from the dropdown. If the agent doesn't appear, activate it first: `sf agent activate --json --api-name <Agent_API_Name>`
* **Fallback Queue:** Select or create a queue for human handoff

**One channel per deployment.** Never share channels across deployments.

### Step 3: (Manual) Create Embedded Service Deployment

Setup → Embedded Service Deployments → New → **Embedded Messaging**.

* Select the messaging channel created in Step 2
* Select the Experience Cloud site
* **Domain field:** Use the `.my.site.com` domain (e.g., `storm-44b8abd3c441ff.my.site.com`), NOT the `.salesforce-sites.com` domain. The ESW backing site sets `frame-ancestors` based on this value. If you use the wrong domain, the chat iframe will be blocked by CSP with a `frame-ancestors` violation in the browser console — no error in Setup, just silent failure.

**CRITICAL: Always create the first deployment through Setup UI.** Metadata deploy (`sf project deploy start`) creates the `EmbeddedServiceConfig` record but does NOT provision the backing `ESW_*` Force.com Site. Without the backing site, the Publish button does nothing — no error, no audit trail entry, the timestamp never updates. If you deployed via metadata and publish fails silently, delete the deployment and recreate through the Setup UI wizard.

If the wizard shows "the site needs a valid host domain", register a Salesforce Sites domain first: Setup → Sites (under "Sites and Domains") → Register.

### Step 4: (Manual) Publish the Deployment

Setup → Embedded Service Deployments → click deployment → **Publish**.

The deployment MUST be published before the Experience Builder component activates. The Embedded Messaging component in Experience Builder will be greyed out / non-functional until this is done.

### Step 5: (Auto/Generate) Deploy Guest User Permissions — THREE Layers

This is the #1 cause of "chat doesn't appear" — and the hardest to debug because there are no error messages.

**Layer 1: Permission Set**

Generate and deploy a `Messaging_Guest_Access` permission set:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <description>Grants guest users access to Messaging objects required for Embedded Messaging.</description>
    <hasActivationRequired>false</hasActivationRequired>
    <label>Messaging Guest Access</label>
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>MessagingSession</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>MessagingEndUser</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>
    <objectPermissions>
        <allowCreate>false</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>MessagingChannel</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>
</PermissionSet>
```

Deploy: `sf project deploy start --json --metadata PermissionSet:Messaging_Guest_Access --target-org <alias>`

**Layer 2: Assign to BOTH Guest Users**

Each Embedded Service Deployment creates an ESW backing site with its own guest user. You must assign the permission set to BOTH:
1. The Experience Cloud site guest user
2. The ESW backing site guest user (auto-created, named `ESW_<Deployment_Name>_*`)

Find them:
```bash
# Find all guest users
sf data query --json --query "SELECT Id, Username, Name, Profile.Name FROM User WHERE Profile.UserLicense.Name = 'Guest User License' AND IsActive = true"
```

Assign to each:
```bash
# Get permission set ID
sf data query --json --query "SELECT Id FROM PermissionSet WHERE Name = 'Messaging_Guest_Access'"

# Assign to Experience Cloud site guest user
sf data create record --json --sobject PermissionSetAssignment --values "AssigneeId='<EC_Guest_User_Id>' PermissionSetId='<PermSet_Id>'"

# Assign to ESW backing site guest user
sf data create record --json --sobject PermissionSetAssignment --values "AssigneeId='<ESW_Guest_User_Id>' PermissionSetId='<PermSet_Id>'"
```

**Layer 3: areGuestUsersAllowed must be true**

Every new Embedded Service Deployment defaults `areGuestUsersAllowed` to `false`. This must be set to `true` or the chat silently fails. It resets to `false` every time you recreate a deployment.

```bash
# Retrieve current config
sf project retrieve start --json --metadata EmbeddedServiceConfig:<Deployment_API_Name> --target-org <alias>
```

Check the retrieved XML — if `areGuestUsersAllowed` is `false`, edit it to `true` and redeploy:
```bash
sf project deploy start --json --source-dir force-app/main/default/EmbeddedServiceConfig --target-org <alias>
```

**All three layers must be in place or the chat silently fails with no error messages.**

### Step 6: (Auto/Generate) Deploy CORS Allowlist

Generate a CORS whitelist origin for the site domain:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CorsWhitelistOrigin xmlns="http://soap.sforce.com/2006/04/metadata">
    <urlPattern>https://<your-domain>.my.site.com</urlPattern>
</CorsWhitelistOrigin>
```

Deploy: `sf project deploy start --json --source-dir force-app/main/default/corsWhitelistOrigins --target-org <alias>`

### Step 7: (Auto/Generate) Deploy Embedded Messaging CSS Fix

**This step is REQUIRED for any LWR site that uses the `*` CSS reset in LWC components (which is all of them, per the SLDS Override Rules above).**

The LWC `* { margin: 0 !important; padding: 0 !important; }` reset leaks in LWR and collapses the `.embedded-messaging` container to `height: 0`, pushing the chat button off-screen. The button exists in the DOM but is invisible.

Add the Embedded Messaging counter-rules to the global CSS static resource (see "Layer 3: Embedded Messaging Counter-Rules" in the CSS Architecture section above). The counter-rules must be in the same static resource loaded by the global styles LWC via `loadStyle`.

**Diagnostic if the button doesn't appear:** Open browser DevTools console and run:
```javascript
// Check if the container exists
document.querySelector('.embedded-messaging')

// Check its dimensions — height:0 means CSS collision
document.querySelector('.embedded-messaging').getBoundingClientRect()

// Check if the button exists but is off-screen
document.querySelector('.embeddedMessagingConversationButton')?.getBoundingClientRect()

// Force-fix to confirm CSS is the only issue:
document.querySelector('.embedded-messaging').style.cssText = 'position:fixed !important; bottom:0 !important; right:0 !important; width:auto !important; height:auto !important; z-index:999999 !important; overflow:visible !important;'
// If the button appears after this, the CSS fix is the solution
```

### Step 8: (Manual) Add Components in Experience Builder

In Experience Builder:
1. Search for the global styles loader component (e.g., "SWA Global Styles") in the components panel → drag onto every page. It renders nothing visible — it injects the CSS.
2. Search for "Embedded Messaging" (or "Messaging for In-App and Web") in components panel → drag onto the page.

### Step 9: (Manual) Publish the Experience Cloud Site

Experience Builder → **Publish**.

### Step 10: (Auto) Post-Setup Verification

Run the full diagnostic to confirm all pieces are in place:
```bash
# 1. Messaging channel exists and has routing
sf data query --json --query "SELECT Id, DeveloperName, IsActive, RoutingType FROM MessagingChannel WHERE DeveloperName = '<Channel_API_Name>'"
# RoutingType must NOT be null

# 2. Embedded Service Config is enabled with guest access
sf data query --json --query "SELECT Id, DeveloperName, IsEnabled FROM EmbeddedServiceConfig WHERE DeveloperName = '<Deployment_API_Name>'"

# 3. Verify areGuestUsersAllowed in metadata
sf project retrieve start --json --metadata EmbeddedServiceConfig:<Deployment_API_Name> --target-org <alias>
# Check XML: areGuestUsersAllowed must be true

# 4. Permission set assignments exist for both guest users
sf data query --json --query "SELECT Assignee.Username, PermissionSet.Name FROM PermissionSetAssignment WHERE PermissionSet.Name = 'Messaging_Guest_Access'"
# Must show BOTH guest users

# 5. CORS allowlist
sf data query --json --query "SELECT Id, UrlPattern FROM CorsWhitelistOrigin WHERE UrlPattern LIKE '%my.site.com%'"

# 6. Agent is active
sf data query --json --query "SELECT Id, DeveloperName FROM BotDefinition WHERE DeveloperName = '<Agent_API_Name>'"
```

**Test in an incognito browser** — cached service workers and stale CSP headers can mask fixes. Always verify in a fresh incognito window.

### Troubleshooting Decision Tree

If the chat button doesn't appear after completing all steps:

```
Chat button not visible
├── Open DevTools → Console tab
│   ├── CSP frame-ancestors error?
│   │   └── Wrong domain in deployment. Delete deployment, recreate with .my.site.com domain.
│   ├── 403/401 errors on messaging endpoints?
│   │   └── Guest user permissions missing. Re-run Step 5, all three layers.
│   └── No errors at all?
│       └── Continue to DOM check ↓
├── Open DevTools → Elements tab → search for "embedded-messaging"
│   ├── No .embedded-messaging div found?
│   │   └── Deployment not published (Step 4) or component not added to page (Step 8).
│   ├── .embedded-messaging exists but getBoundingClientRect shows height:0?
│   │   └── CSS collision. Deploy the counter-rules (Step 7). 
│   │       Run the force-fix console command to confirm.
│   └── .embedded-messaging exists with proper dimensions but no button?
│       └── Channel routing not configured. Check Step 2 — RoutingType must not be null.
└── Works in "Test Your Deployment" (Setup) but not on site?
    └── areGuestUsersAllowed is false. Re-run Step 5, Layer 3.
```

### Important Constraints

* **One messaging channel per deployment.** Sharing channels causes routing conflicts.
* **Always create deployments through Setup UI** — metadata deploy does not provision the backing Force.com Site.
* **areGuestUsersAllowed resets to false** every time you create a new deployment. Always check and fix after creation.
* **Each new deployment creates new ESW guest users.** Permission sets must be assigned to each new guest user — old assignments don't carry over.
* **Use `.my.site.com` domain** in the deployment wizard, not `.salesforce-sites.com`. Enhanced domains use `.my.site.com` and the CSP `frame-ancestors` header is set based on the domain you specify.
* **The Experience Builder component handles CSP automatically** — do NOT add messaging scripts to head markup or CSP Trusted Sites for the Embedded Messaging iframe itself.
* **Do NOT put Embedded Messaging scripts in head markup.** The built-in Experience Builder component injects everything needed. Manual script injection causes double-initialization errors.
* **Static resource CSS via `loadStyle` is the only reliable global CSS injection** in LWR. `<link>` tags in head markup do not resolve static resource URLs.

---

---

## Phase 7: Design Concept Variations

When demoing or presenting multiple design approaches for an Experience Cloud site, create separate pages within the same LWR site — each page showcases a different agent integration pattern. This avoids deploying multiple sites while giving stakeholders clear side-by-side comparisons.

### Concept Architecture

Each concept gets:
* Its own page in Experience Builder with a unique URL path (e.g., `/helpcenter/concept-a`, `/concept-b`)
* Its own set of LWC component variants, named with a suffix convention: `<prefix><Component><ConceptLetter>` (e.g., `swaHelpCenterSearchB`, `swaHelpCenterFullscreenC`)
* Shared infrastructure: same header, footer, global styles loader, messaging channel, and agent backend — only the presentation layer changes

### Experience Builder Page Setup

**Use Frame layout for all concept pages.** Frame layout provides fixed header/footer slots with no extra vertical spacing between components. Flexible layout injects padding/margins between sections that are difficult to override.

**Theme layout vs content region — critical distinction:**
* **Theme layout** (Header, Footer) — shared across ALL pages. Anything placed here appears on every page. Use for: site-wide header, global styles loader, Embedded Messaging component.
* **Content region** — page-specific. Components placed here only appear on that page. Use for: hero, search, topic cards, concept-specific LWCs.

**Common mistake:** Placing concept-specific components (Hero, Search, Topics) in the Theme Header instead of the content region. This causes all concept pages to inherit each other's components. If your pages are showing identical content, check whether components are in the theme layout instead of the content region.

**Creating concept pages:**
1. In Experience Builder, create a new page with Frame layout
2. Set the URL path (e.g., `/concept-b`)
3. Drag shared components into Theme Header (header LWC) and Theme Footer (Embedded Messaging, Global Styles)
4. Drag concept-specific components into the Content region only
5. If the footer LWC can't be dragged into Theme Footer (Experience Builder limitation for some layouts), place it in the content region on each page instead

**Home page layout is locked.** The content layout field is deactivated for the Home page in most LWR templates. Instead of modifying the Home page layout, create new pages with Frame layout and use those as concept pages.

**Background color matching:** Set the page background color in Experience Builder's Theme panel to match your LWC section backgrounds, or set it via CSS in the global static resource:
```css
[class*="frameBody"],
[class*="frame-body"],
[class*="body-container"] {
    background: #ffffff !important;
}
```

### Naming Convention

```
Base component:      swaHelpCenterSearch
Concept B variant:   swaHelpCenterSearchB
Concept C variant:   swaHelpCenterFullscreenC
```

All variants target `lightningCommunity__Page` and `lightningCommunity__Default` in their `js-meta.xml`.

### Available Concepts

Offer these three concepts when the user asks for design variations. Adjust naming and specifics to match their brand, but the integration patterns are reusable:

---

#### Concept A: "Current State" (Baseline)

**What it is:** The existing Help Center design preserved as a reference point. Uses the standard Embedded Messaging floating FAB button in the bottom-right corner.

**Components:** No new LWCs — reuses all existing components on a dedicated page.

**Agent integration pattern:** Standard Embedded Messaging — platform-injected floating button, chat opens in a small overlay window. Agent is available but not prominent. The user discovers it by noticing the button.

**When to use:** As a baseline for comparison. Every demo should include this so stakeholders can see what they already have before seeing improvements.

**Technical notes:**
* Create page in Experience Builder, drag existing components onto it
* No additional LWCs needed
* Embedded Messaging component + global styles loader must be on the page

---

#### Concept B: "Integrated Agent" (Embedded Search-to-Chat)

**What it is:** The agent is embedded directly into the page content — the search bar becomes the conversational entry point. Typing a question transitions the search area into a live chat panel that expands upward from the search box. The search input doubles as the chat message input. The floating FAB button is hidden while chat is active.

**Components (single LWC — not two):**
* `<prefix>SearchB` — A single component that handles both search and chat states. Contains the search bar, suggestion pills, chat message area, and contextual follow-up pills. State transitions are managed internally via `chatActive` flag. No separate chat panel component is needed — keeping it in one LWC simplifies state management and avoids cross-component event wiring.

**Agent integration pattern:** The chat IS the search. When a user types "How do I change my flight?" or clicks a suggestion pill, the search box transforms: a chat panel expands upward from it, the search header ("How can we help you today?") disappears, the search input becomes the message input, and the "Search" button becomes a send icon. The experience feels like a smart search bar that naturally evolves into a conversation.

**Key UX principles:**
* Search-first, agent-native — the agent is the search experience
* Conversation stays in-page, not a floating overlay
* The search input IS the chat input — no duplicate input fields
* Suggestion pills appear below the search input in both states (pre-chat and in-chat), maintaining visual continuity
* Dynamic contextual pills update based on conversation topic (see Dynamic Contextual Pills below)
* The floating FAB button is hidden via `document.querySelector('.embedded-messaging').style.display = 'none'` when chat opens, restored on close

**Visual state transitions:**

```
PRE-CHAT STATE:
┌─────────────────────────────────────────┐
│  How can we help you today?             │  ← swa-search-box (blue, rounded)
│  Ask a question or search...            │
│  ┌─────────────────────┬──────────┐     │
│  │ 🔍 Type your question│ Search  │     │
│  └─────────────────────┴──────────┘     │
│  [Book a flight] [Check in] [Baggage]   │  ← suggestion pills (initial)
└─────────────────────────────────────────┘

CHAT ACTIVE STATE:
┌─────────────────────────────────────────┐
│  Ask me anything                    ✕   │  ← swa-chat-header (#1B2D7B dark navy)
│─────────────────────────────────────────│
│                                         │  ← swa-chat-messages (#304CB2 blue)
│         I want to book a flight  12:01  │  ← user bubble (#1B2D7B dark navy)
│                                         │
│  I'd love to help! Southwest has       │  ← agent bubble (transparent, white text)
│  three fare types...             12:02  │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  ┌─────────────────────┬──────┐         │  ← swa-search-box-active (#304CB2 blue)
│  │ 🔍 Type a message... │  ⬆  │         │     gold pill input (#FFBF27)
│  └─────────────────────┴──────┘         │
│  [Compare fares] [EarlyBird] [Points]   │  ← frosted-glass pills (rgba white)
└─────────────────────────────────────────┘
```

**CSS architecture for the transition:**

The component uses two CSS states controlled by getter functions:
* `sectionClass` — toggles between `swa-search-section` (white bg) and `swa-search-chat-active` (light gray bg `#f5f7fa`)
* `searchBoxClass` — toggles between `swa-search-box` (full rounded corners, 112px padding) and `swa-search-box-active` (flat top corners `0 0 12px 12px`, `24px 112px 112px` padding)

The chat header is simplified — just "Ask me anything" title (32px/700 white) and a close X button (24x24 SVG, stroke-width 2.5). No avatar, no status indicator, no subtitle. The send button in the gold input pill uses a paper plane SVG icon.

The chat panel sits above the search box in the DOM and uses `border-radius: 12px 12px 0 0` to visually connect with the flat-topped search box below it. An `expandUp` animation (`translateY(20px)` → `translateY(0)`) creates a smooth upward expansion.

```css
.swa-chat-panel {
    background: #ffffff !important;
    border-radius: 12px 12px 0 0 !important;
    height: 480px !important;
    animation: expandUp 0.3s ease-out !important;
    display: flex !important;
    flex-direction: column !important;
}

.swa-chat-header {
    background: #1B2D7B !important;
    padding: 32px 112px !important;
}

.swa-chat-messages {
    flex: 1 !important;
    background: #304CB2 !important;
    padding: 20px 112px !important;
}

.swa-bubble-user {
    background: #1B2D7B !important;
    color: #ffffff !important;
}

.swa-bubble-agent {
    background: transparent !important;
    color: #ffffff !important;
    padding: 0 !important;
}

.swa-search-box-active {
    background: #304CB2 !important;
    border-radius: 0 0 12px 12px !important;
    padding: 24px 112px 112px !important;
}

@keyframes expandUp {
    from { opacity: 0; max-height: 0; transform: translateY(20px); }
    to { opacity: 1; max-height: 600px; transform: translateY(0); }
}
```

**Use symmetric vertical padding on the search section.** The section container should have equal top and bottom padding (e.g., `32px 42px`). Asymmetric padding (more on top than bottom, or vice versa) creates visual imbalance when the chat panel expands upward — the component visually "jumps" because the expansion eats into different amounts of space above and below.

**Dynamic Contextual Pills:**

The suggestion pills update dynamically based on the conversation topic. This is the key differentiator for Concept B — the pills guide the user through the agent's topic graph without making them type.

**Implementation pattern:**

1. **Initial suggestions** — Pre-chat pills map to the agent's top-level topics (one pill per topic). Each pill has a `query` (the utterance sent to the agent) and a `topic` (for routing):
   ```javascript
   initialSuggestions = [
       { id: 'i1', label: 'Book a flight', query: 'I want to book a flight', topic: 'booking' },
       { id: 'i2', label: 'Check in', query: 'I need to check in', topic: 'checkin' },
       // ... one per agent topic
   ];
   ```

2. **Follow-up pills** — Per-topic pills that appear after the agent responds. Map to the agent's sub-topic actions and common follow-up questions. Include a "Something else" pill that triggers topic switching:
   ```javascript
   followUpPills = {
       booking: [
           { id: 'b1', label: 'Compare fare types', query: 'What is the difference between fare types?' },
           { id: 'b2', label: 'Use Rapid Rewards points', query: 'Can I use my points to book?' },
           { id: 'b3', label: 'Something else', query: 'I have a different question', topic: 'switch' }
       ],
       // ... one array per topic
       switchTopic: [
           { id: 's1', label: 'Book a flight', query: 'I want to book a flight', topic: 'booking' },
           // ... mirrors initial suggestions minus the current topic
       ]
   };
   ```

3. **Topic detection** — Keyword matching on user input to determine which topic's follow-up pills to show:
   ```javascript
   detectTopic(text) {
       const t = text.toLowerCase();
       if (t.includes('book') || t.includes('flight from')) return 'booking';
       if (t.includes('check in') || t.includes('boarding pass')) return 'checkin';
       // ... keyword patterns per topic
       return 'general';
   }
   ```

4. **Pill placement** — Pills always appear below the search input, using the same `swa-suggestion-chip` class in both pre-chat and in-chat states. This creates visual continuity — the pills don't jump to a different location when chat opens. Use a `showContextPills` getter that checks `chatActive && activePills.length > 0 && !isTyping` to hide pills during the typing indicator.

5. **Pill click handling** — Three behaviors based on pill type:
   * **Follow-up pill** (has `id` in `followUpResponses`) — sends the query, shows a detailed response, then loads the next set of follow-up pills for that topic
   * **Topic switch pill** (`topic: 'switch'`) — shows "Of course! What else can I help with?" and loads the `switchTopic` pills (all top-level topics)
   * **New topic pill** (has `topic` property) — routes to that topic's initial response and follow-up pills

**Pill data structure — align with the agent's topic graph.** When building pills for a specific agent, read the `.agent` file to extract topic names and action descriptions. Each agent topic should have 3-4 follow-up pills that reflect its actual capabilities. The "Something else" pill on every topic (except disruptions and general) should use `topic: 'switch'` to enable cross-topic navigation.

**Demo vs production — three tiers of agent response integration:**

1. **Tier 1: Simulated responses (demo-ready, no agent needed)** — Hardcoded topic responses and follow-up maps in the LWC JS. Zero backend dependencies. Good for initial stakeholder demos where the focus is on UX, not AI.

2. **Tier 2: Knowledge-powered responses (demo-ready, data-driven)** — LWC calls an `@AuraEnabled` Apex controller that queries Knowledge articles (`Knowledge__kav`) matching the user's input. Returns real org data formatted as agent-style responses. Falls back to simulated responses if no articles match. Good for demos that need to show real content without requiring Agent Runtime API access.

3. **Tier 3: Live agent via Messaging API (production)** — LWC creates a Messaging session through a dedicated MIAW channel routed to the Agentforce agent. Full Atlas Reasoning Engine processing with topic routing, action execution, and persona enforcement. Requires: dedicated Messaging Channel, Embedded Service Deployment, guest user permissions (3 layers), MIAW REST API integration with async polling, and JWT auth for guest users.

**For all three tiers**, the pill structure and topic routing logic remain the same — only the response generation changes.

**Technical complexity:** Tier 1: trivial. Tier 2: low (30-45 min). Tier 3: high (5-9 hours).

Recommend Tier 2 for demos, Tier 3 for production.

### Tier 2: Knowledge-Powered Response Pattern

Create an `@AuraEnabled` Apex class that queries Knowledge articles. Uses a two-pass search strategy: full phrase match first, then individual keyword fallback.

**CRITICAL: Use `without sharing`.** Guest users on Experience Cloud sites have no sharing rules for Knowledge articles. With `with sharing`, the SOQL query returns zero results for guest users — the LWC silently falls back to simulated responses with no error. `without sharing` skips sharing rule enforcement while still respecting CRUD/FLS from the permission set. This is safe because the query filters to published, public content.

```apex
public without sharing class <Prefix>AgentChatController {

    @AuraEnabled
    public static Map<String, String> getAgentResponse(String userMessage) {
        try {
            String searchTerm = '%' + String.escapeSingleQuotes(userMessage) + '%';

            List<Knowledge__kav> articles = [
                SELECT Title, Summary
                FROM Knowledge__kav
                WHERE (Title LIKE :searchTerm OR Summary LIKE :searchTerm)
                AND UrlName LIKE '<prefix>-%'
                AND PublishStatus = 'Online'
                AND Language = 'en_US'
                ORDER BY LastPublishedDate DESC
                LIMIT 3
            ];

            if (articles.isEmpty()) {
                List<String> keywords = userMessage.toLowerCase().split('\\s+');
                for (String keyword : keywords) {
                    if (keyword.length() < 4) continue;
                    String keywordTerm = '%' + keyword + '%';
                    articles = [
                        SELECT Title, Summary
                        FROM Knowledge__kav
                        WHERE (Title LIKE :keywordTerm OR Summary LIKE :keywordTerm)
                        AND UrlName LIKE '<prefix>-%'
                        AND PublishStatus = 'Online'
                        AND Language = 'en_US'
                        ORDER BY LastPublishedDate DESC
                        LIMIT 3
                    ];
                    if (!articles.isEmpty()) break;
                }
            }

            if (articles.isEmpty()) {
                return new Map<String, String>{
                    'success' => 'false',
                    'response' => ''
                };
            }

            String response = '';
            if (articles.size() == 1) {
                Knowledge__kav article = articles[0];
                response = article.Summary != null ? article.Summary : article.Title;
            } else {
                response = 'Here\'s what I found:\n\n';
                for (Knowledge__kav article : articles) {
                    response += '• ' + article.Title;
                    if (article.Summary != null) {
                        response += ' — ' + article.Summary;
                    }
                    response += '\n';
                }
                response += '\nWould you like more details on any of these?';
            }

            return new Map<String, String>{
                'success' => 'true',
                'response' => response
            };
        } catch (Exception e) {
            return new Map<String, String>{
                'success' => 'false',
                'error' => e.getMessage()
            };
        }
    }
}
```

**Guest user permission set for Apex + Knowledge access:**

Generate and deploy a permission set granting the guest user access to the Apex class and Knowledge object. Do NOT include field-level security for `Title`, `Summary`, or `UrlName` — they are standard/required fields that cannot be deployed via FLS.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <description>Grants guest users access to the chat controller Apex class and Knowledge articles.</description>
    <hasActivationRequired>false</hasActivationRequired>
    <label><Prefix> Chat Guest Access</label>
    <classAccesses>
        <apexClass><Prefix>AgentChatController</apexClass>
        <enabled>true</enabled>
    </classAccesses>
    <objectPermissions>
        <allowCreate>false</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>Knowledge__kav</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>
</PermissionSet>
```

Assign this permission set to the Experience Cloud site guest user (same process as the Messaging guest access perm set in Phase 6, Step 5).

**LWC integration pattern:**

```javascript
import getAgentResponse from '@salesforce/apex/<Prefix>AgentChatController.getAgentResponse';

async fetchAgentResponse(userMessage, appendLogin) {
    this.isTyping = true;
    try {
        const result = await getAgentResponse({ userMessage: userMessage });
        this.isTyping = false;
        if (result.success === 'true' && result.response) {
            this.addMessage(result.response, 'agent');
        } else {
            this.addSimulatedResponse(userMessage);
        }
    } catch (e) {
        this.isTyping = false;
        this.addSimulatedResponse(userMessage);
    }
    // Append login prompt after first user message
    if (appendLogin && !this.isAuthenticated) {
        this.addMessage(
            'To provide personalized assistance, please log in to your account.',
            'agent',
            [{ id: 'login1', label: 'Account login', action: 'login' }]
        );
    }
    const topic = this.currentTopic || this.detectTopic(userMessage);
    this.activePills = this.followUpPills[topic] || this.followUpPills.general;
    this.currentTopic = null;
}
```

Call Apex first, fall back to simulated if `success === 'false'` or if an exception is thrown (guest user permission issues surface as exceptions).

### Tier 3: Live Agent via Messaging API (Future)

**IMPORTANT: The Agentforce Agent Runtime REST API is NOT available as a standard REST endpoint for Apex HTTP callouts.** The `sf agent preview` CLI uses an internal API pathway that cannot be replicated from Apex. The following paths were confirmed 404 on a v66.0 org:
- `/services/data/v66.0/einstein/agent-runtime/sessions`
- `/services/data/v66.0/connect/agent-runtime/sessions`
- `/services/data/v66.0/einstein/ai-agent/sessions`
- `/services/data/v66.0/connect/ai-agent/sessions`
- `/services/data/v66.0/einstein/copilot/sessions`

The following `ConnectApi` types were also confirmed unavailable:
- `ConnectApi.CdpAgent*` — does not compile
- `ConnectApi.AgentRuntime*` — `Type.forName` returns null
- `ConnectApi.EinsteinAgent` — null
- `ConnectApi.CopilotInput/Output` — null

**What IS available:** `ConnectApi.EinsteinLLM` and `ConnectApi.EinsteinPromptTemplateGenerationsInput` exist but are for prompt template generation, not agent runtime sessions.

**The correct production approach is MIAW (Messaging for In-App & Web):**

Steps required:
1. Create dedicated Messaging Channel routed to the Agentforce agent (Setup UI) — 10 min
2. Create Embedded Service Deployment for the channel (Setup UI) — 15 min
3. Publish the deployment — 5 min
4. Configure guest user permissions (3 layers: perm set, assign to both guest users, `areGuestUsersAllowed`) — 15 min
5. Build Apex controller using MIAW REST API — conversation creation, message send, response polling — 2-4 hours
6. Handle auth for guest vs authenticated users — JWT flow for guests — 1-2 hours
7. Update LWC to wire to new Apex methods — 30 min
8. Test and debug end-to-end — 1-2 hours

**Estimated total: 5-9 hours.** The MIAW API is asynchronous (send message, poll for response), and guest user auth requires a JWT exchange. Both add significant complexity.

**Prerequisites:** Remote Site Setting for the org domain (self-referencing callout), dedicated Messaging Channel (never share `Messaging_for_In_App_Web`), and all guest user permission layers from Phase 6.

### Interactive Authentication Patterns

Two patterns for in-chat authentication, chosen per concept:

#### Pattern A: Split-Screen Login Panel (Concept B)

When the user clicks "Account login" pill, the chat messages area slides left to 60% width and a login form animates in from the right at 40%. On submit, the panel collapses and chat slides back to full width. This keeps the conversation visible during authentication.

**Implementation:** Wrap messages and login panel as siblings inside a horizontal flex container (`swa-chat-body`). Use CSS `flex-basis` transition for the slide animation:

```css
.swa-chat-body {
    flex: 1 !important;
    display: flex !important;
    overflow: hidden !important;
}

.swa-chat-messages {
    flex: 1 !important;
    transition: flex 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.swa-chat-body-split .swa-chat-messages {
    flex: 0 0 60% !important;
}

.swa-login-panel {
    flex: 0 0 0% !important;
    overflow: hidden !important;
    transition: flex 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.swa-login-panel-open {
    flex: 0 0 40% !important;
}
```

**HTML structure:**
```html
<div class={chatBodyClass}>
    <div class="swa-chat-messages"><!-- message loop --></div>
    <div class={loginPanelClass}>
        <div class="swa-login-panel-inner">
            <!-- title, subtitle, username, password, submit -->
        </div>
    </div>
</div>
```

**JS state management:** Use `@track loginPanelOpen = false`. Getter `chatBodyClass` returns `'swa-chat-body' + (loginPanelOpen ? ' swa-chat-body-split' : '')`. Getter `loginPanelClass` returns `'swa-login-panel' + (loginPanelOpen ? ' swa-login-panel-open' : '')`. On "Account login" pill click, set `loginPanelOpen = true`. On successful submit, set `loginPanelOpen = false` before posting the welcome-back message.

**Why flex-basis animation works:** The browser's flex layout engine recalculates the split ratio every animation frame, so both the messages area and login panel transition simultaneously — the messages compress as the panel expands, creating a smooth coordinated slide without JavaScript animation.

**Responsive:** At 768px, `.swa-chat-body` switches to `flex-direction: column`. The login panel becomes a bottom drawer: `.swa-login-panel-open { flex: 0 0 auto; max-height: 50%; overflow-y: auto; }`.

**Login panel styling:** White background, centered content via `justify-content: center`. Title "Rapid Rewards Login" at 22px/700 dark, subtitle "Sign in to access your account details" at 14px gray. Input fields: `#f9fafb` background, `#d1d5db` border, gold focus ring (`box-shadow: 0 0 0 3px rgba(255, 191, 39, 0.15)`). Gold submit button (`#FFBF27`). "Forgot password?" link in Southwest blue (`#304CB2`).

#### Pattern B: Inline Login Card (Alternative)

For concepts without a side panel (or when the chat area is too narrow for a split), render the login form as a message card inline in the conversation flow:

```html
<template lwc:if={msg.isLoginCard}>
    <div class="swa-login-card"><!-- interactive card markup --></div>
</template>
<template lwc:else>
    <div class={msg.bubbleClass}>{msg.text}</div>
</template>
```

White card with subtle border (`#e5e7eb`), 16px border-radius. On submit, transforms to success state: "Welcome Back!" title with green checkmark circle (`#22c55e`).

#### Login Prompt Timing (Both Patterns)

The login prompt appears AFTER the first user utterance, not on chat open. Flow: welcome message → user sends question → agent responds → follow-up message offers the login pill: "To provide personalized assistance and access to your booking details, please log in to your account." with an "Account login" pill.

---

#### Concept C: "Fullscreen Concierge" (Immersive Takeover)

**What it is:** The agent takes over the entire viewport as a full-screen conversational experience. A CTA on the Help Center page triggers the takeover. Think Apple Business Chat, Klarna's AI assistant, or a dedicated "Talk to Southwest" experience.

**Components (single LWC — not two):**
* `<prefix>HeroC` — A single component containing both the hero CTA section (visible before activation) and the fullscreen chat overlay (toggled via `isFullscreenOpen` flag). Contains: hero with CTA button + chat mockup visual, fullscreen overlay with header/messages/input/pills/login card. Same architecture as Concept B — keeping it in one LWC simplifies state management.

**Agent integration pattern:** The conversation IS the page. When triggered, the entire viewport becomes the chat interface — edge to edge, top to bottom. No modal, no backdrop, no border-radius — the overlay replaces the page entirely. The three zones (header, messages, input) stack as flex children and fill 100% of the viewport.

**Full feature parity with Concept B:** The fullscreen overlay includes all of Concept B's functionality:
* Knowledge-powered responses (Tier 2) with simulated fallback
* Topic detection and dynamic contextual pills (follow-up + topic switching)
* Inline login card (clean wizard-card pattern, same as Concept B)
* Welcome message → first user utterance → login prompt flow
* Typing indicator with animated dots

**Key UX principles:**
* Immersive — no distractions, no competing UI elements
* Visually identical to Concept B's expanded state — same dark navy header (`#1B2D7B`), blue message area (`#304CB2`), transparent agent bubbles, dark navy user bubbles, gold pill input, frosted-glass pills
* Mobile-native feel — resembles a dedicated messaging app, not a website chat widget
* Easy exit — prominent close button (same 24x24 X with stroke-width 2.5), ESC key support
* `document.body.style.overflow = 'hidden'` prevents background scrolling while fullscreen is open

**CSS approach — true edge-to-edge takeover:**

```css
.swa-fs-overlay {
    position: fixed !important;
    inset: 0 !important;
    z-index: 200000 !important;
    display: flex !important;
    flex-direction: column !important;
}
```

No backdrop, no border-radius, no max-width — the overlay IS the viewport. The three zones fill it:
* **Header** (`flex-shrink: 0`) — `#1B2D7B`, padding `32px 112px`, "Ask me anything" title at 32px/700
* **Messages** (`flex: 1`, `overflow-y: auto`) — `#304CB2`, padding `20px 112px`, scrollable message area
* **Input area** (`flex-shrink: 0`) — `#304CB2`, padding `24px 112px 48px`, gold pill input bar + suggestion pills below

The `flex: 1` on messages ensures it fills all remaining vertical space between the fixed-height header and input bar. Responsive breakpoints reduce horizontal padding to 24px at 768px and 16px at 480px.

**Hero section (pre-activation):** Two-column grid — left side has title, subtitle, and gold CTA button; right side has a chat mockup preview (decorative, showing sample conversation). The mockup hides at 768px. CTA button click opens the fullscreen overlay.

**Hiding Embedded Messaging:** When fullscreen opens, hide the platform's `.embedded-messaging` container via `document.querySelector('.embedded-messaging').style.display = 'none'`. Restore on close.

---

#### Concept D: "Native ECV2" (Platform Chat Repositioned)

**What it is:** Uses the platform's actual Embedded Conversation V2 (ECV2) chat widget but repositions it visually inside a custom-designed panel via CSS. The search bar transforms into a branded chat wrapper that contains the real ECV2 iframe — delivering the platform's full agent runtime (topic routing, action execution, persona enforcement) with custom branding on top.

**Why this pattern exists:** Concepts B and C use simulated or Knowledge-powered responses. Concept D delivers the real agent — full Atlas Reasoning Engine processing — without building a custom MIAW API integration. The ECV2 iframe is CSS-repositioned from its default bottom-right floating position into a branded panel, giving it a native look while preserving all platform functionality.

**Components (single LWC):**
* `<prefix>SearchD` — A single component that handles both search and chat states. Contains: search bar (pre-chat), branded chat panel with custom header, and a placeholder container where the ECV2 iframe is visually positioned. The actual `.embedded-messaging` DOM element stays in the platform's injected position — only its CSS `position: fixed` coordinates are overridden to align with the placeholder container.

**Agent integration pattern:** When the user submits a search query, the component:
1. Hides the search box entirely (removes from DOM via `lwc:if`)
2. Shows a branded chat panel with custom header ("Ask me anything" + close button)
3. Programmatically clicks the ECV2 FAB button to open the chat
4. Repositions the ECV2 iframe into a placeholder container within the panel
5. Hides the ECV2's own header and minimize/close buttons via iframe CSS injection
6. Locks page scrolling to prevent position jitter

The user sees a branded chat experience; the agent runtime is the real platform ECV2.

**Key UX principles:**
* Real agent, branded wrapper — production-grade agent quality with custom visual identity
* Search-to-chat transition — search box disappears, chat panel appears in its place
* Custom close button only — ECV2's native minimize/close are hidden; the custom header X returns to search state
* No scroll jitter — `document.body.style.overflow = 'hidden'` prevents page scrolling while chat is active

**Visual state transitions:**

```
PRE-CHAT STATE:
┌─────────────────────────────────────────┐
│  Ask me anything                        │  ← swa-search-box (blue, rounded)
│  Real answers for your trip...          │
│  ┌─────────────────────┬──────────┐     │
│  │ Ask a question...    │   ⬆    │     │  ← gold pill input
│  └─────────────────────┴──────────┘     │
└─────────────────────────────────────────┘

CHAT ACTIVE STATE (search box removed from DOM):
┌─────────────────────────────────────────┐
│  Ask me anything                    ✕   │  ← swa-chat-header (gradient)
│─────────────────────────────────────────│
│                                         │
│   ┌─────────────────────────────────┐   │  ← swa-ecv2-container (#304CB2)
│   │                                 │   │     with horizontal + bottom padding
│   │   [ECV2 iframe positioned here] │   │  ← position: fixed, coordinates from
│   │   (real platform chat)          │   │     getBoundingClientRect() of container
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Technical implementation — CSS repositioning:**

The ECV2 iframe cannot be moved in the DOM (it's platform-injected and outside the LWC shadow boundary). Instead, use `position: fixed` with coordinates calculated from a placeholder container:

```javascript
positionEcv2InPanel() {
    const container = this.template.querySelector('.swa-ecv2-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cs = window.getComputedStyle(container);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const padLeft = parseFloat(cs.paddingLeft) || 0;

    const innerTop = rect.top + padTop;
    const innerLeft = rect.left + padLeft;
    const innerWidth = rect.width - padLeft - padRight;
    const innerHeight = rect.height - padTop - padBottom;

    const ecv2 = document.querySelector('.embedded-messaging');
    if (!ecv2) return;

    // Hide the FAB button
    const fab = ecv2.querySelector(
        '.embeddedMessagingConversationButton, ' +
        '[class*="ConversationButton"]'
    );
    if (fab) fab.style.display = 'none';

    // Reposition the chat frame
    const chatFrame = ecv2.querySelector(
        '.embeddedMessagingFrame, ' +
        '[class*="embeddedMessagingFrame"], ' +
        'iframe'
    );
    if (chatFrame) {
        chatFrame.style.cssText = `
            position: fixed !important;
            top: ${innerTop}px !important;
            left: ${innerLeft}px !important;
            width: ${innerWidth}px !important;
            height: ${innerHeight}px !important;
            bottom: auto !important;
            right: auto !important;
            max-height: none !important;
            border-radius: 0 0 12px 12px !important;
            box-shadow: none !important;
            z-index: 200001 !important;
        `;
    }

    this._hideEcv2Chrome(ecv2, 0);
    ecv2.style.visibility = 'visible';

    window.addEventListener('resize', this._resizeHandler, { passive: true });
}
```

**Padding-aware positioning:** The container has horizontal and bottom padding to create visual margins matching the header. `getBoundingClientRect()` returns the outer rect (including padding), so `getComputedStyle` padding values must be subtracted to position the iframe within the content box. Without this, the iframe overflows into the padding area.

**Scroll lock pattern:** `position: fixed` elements positioned via `getBoundingClientRect()` use viewport-relative coordinates. If the page scrolls, `getBoundingClientRect()` returns different values, but the iframe position doesn't update until the next scroll event fires — creating 1-2 frame lag visible as jitter. Fix: `document.body.style.overflow = 'hidden'` when chat opens prevents scrolling entirely, eliminating the need for a scroll handler. Only a `resize` listener is needed.

```javascript
activateEcv2() {
    this.chatActive = true;
    this.searchTerm = '';
    this._savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';  // Prevents scroll jitter
    // ... programmatically click FAB, position iframe
}

handleCloseChat() {
    // ... restore ECV2 styles
    document.body.style.overflow = '';  // Restore scrolling
    this.chatActive = false;
}
```

**ECV2 chrome hiding via same-origin iframe CSS injection:**

The ECV2 iframe is same-origin (served from `.my.site.com`), so `iframe.contentDocument` is accessible. Inject CSS to hide the platform header, minimize/close buttons — the custom header provides these controls instead.

```javascript
_hideEcv2Chrome(ecv2, attempt) {
    const iframe = ecv2.querySelector('iframe');
    if (!iframe) {
        if (attempt < 10) {
            setTimeout(() => this._hideEcv2Chrome(ecv2, attempt + 1), 300);
        }
        return;
    }
    try {
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc || !iframeDoc.head) {
            if (attempt < 10) {
                setTimeout(() => this._hideEcv2Chrome(ecv2, attempt + 1), 300);
            }
            return;
        }
        let style = iframeDoc.getElementById('swa-ecv2-overrides');
        if (!style) {
            style = iframeDoc.createElement('style');
            style.id = 'swa-ecv2-overrides';
            style.textContent = `
                [class*="minimizedContainer"],
                [class*="headerContainer"],
                [class*="header_container"],
                [class*="conversationHeader"],
                [class*="Header"]:first-child,
                header,
                [class*="minimizeButton"],
                [class*="closeButton"],
                [class*="endChatButton"] {
                    display: none !important;
                    height: 0 !important;
                    overflow: hidden !important;
                }
            `;
            iframeDoc.head.appendChild(style);
        }
    } catch (e) {
        if (attempt < 10) {
            setTimeout(() => this._hideEcv2Chrome(ecv2, attempt + 1), 300);
        }
    }
}
```

**Why a retry loop is needed:** The iframe DOM isn't ready when `positionEcv2InPanel` first runs. The ECV2 iframe loads its content asynchronously after the FAB is clicked — `contentDocument` may be null or `head` may not exist yet. The retry loop (10 attempts, 300ms apart) handles this race condition. The `getElementById` check prevents duplicate style injection if the function runs again after success.

**FAB hiding and programmatic open:**

On page load, hide the ECV2 FAB so it doesn't appear alongside the custom search UI. When chat activates, programmatically click the FAB to open the ECV2 chat, then reposition the resulting frame:

```javascript
connectedCallback() {
    this.hideFabOnLoad();
}

hideFabOnLoad() {
    if (this._fabHidden) return;
    const ecv2 = document.querySelector('.embedded-messaging');
    if (ecv2) {
        ecv2.style.display = 'none';
        this._fabHidden = true;
    } else {
        setTimeout(() => this.hideFabOnLoad(), 500);
    }
}

activateEcv2() {
    this.chatActive = true;
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const ecv2 = document.querySelector('.embedded-messaging');
        if (!ecv2) return;
        ecv2.style.display = '';
        ecv2.style.visibility = 'hidden';  // Hide during transition

        const fab = ecv2.querySelector('button');
        if (fab) fab.click();  // Programmatic open

        setTimeout(() => {
            this.positionEcv2InPanel();  // Reposition after chat opens
        }, 600);
    }, 100);
}
```

**Key timing:** `ecv2.style.visibility = 'hidden'` before clicking FAB prevents the user from seeing the default floating chat briefly appear. After repositioning, set `ecv2.style.visibility = 'visible'`. The 600ms delay before repositioning gives the ECV2 chat time to render its iframe and initial content.

**Conditional DOM rendering:** Use `lwc:if={chatActive}` for the chat panel and `lwc:if={showSearchBox}` for the search box. Only one is in the DOM at a time. This gives the chat panel full vertical space — no hidden search box consuming layout height.

```html
<template>
    <section class="swa-search-section">
        <div class="swa-search-inner">
            <template lwc:if={chatActive}>
                <div class="swa-chat-panel">
                    <div class="swa-chat-header">
                        <span class="swa-chat-agent-name">Ask me anything</span>
                        <button class="swa-chat-close" onclick={handleCloseChat}>
                            <!-- X SVG -->
                        </button>
                    </div>
                    <div class="swa-ecv2-container"></div>
                </div>
            </template>
            <template lwc:if={showSearchBox}>
                <div class="swa-search-box">
                    <!-- title, subtitle, search input -->
                </div>
            </template>
        </div>
    </section>
</template>
```

**CSS for the chat panel:**

```css
.swa-chat-panel {
    background: #ffffff !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08) !important;
    display: flex !important;
    flex-direction: column !important;
    height: 700px !important;
    animation: expandUp 0.3s ease-out !important;
}

.swa-chat-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 32px 112px !important;
    background: linear-gradient(45deg,
        #1B2D7B 7%, #304CB2 13%, #304CB2 19%,
        #E61C23 19%, #E61C23 26%,
        #FDBC11 26%, #FDBC11 33%, #1B2D7B 33%) !important;
    flex-shrink: 0 !important;
}

.swa-ecv2-container {
    flex: 1 !important;
    position: relative !important;
    overflow: hidden !important;
    background: #304CB2 !important;
    padding: 0 112px 32px !important;
    border-radius: 0 0 12px 12px !important;
}
```

Responsive: `padding: 0 32px 24px` at 768px, `0 20px 20px` at 480px. Panel height: 600px at 768px, 500px at 480px.

**When to use Concept D:**
* Need the REAL agent (full topic routing, action execution, persona enforcement) without building a MIAW API integration
* Have ECV2 already configured and deployed on the site
* Want branded chat experience wrapping the platform widget
* Acceptable trade-off: same-origin requirement (ECV2 iframe must be from same `.my.site.com` domain for chrome hiding to work; cross-origin iframes block `contentDocument` access)

**Limitations:**
* Requires same-origin iframe — cross-origin ECV2 deployments cannot have chrome hidden
* The 600ms positioning delay means the chat doesn't appear instantly (FAB click → iframe render → reposition)
* Page scrolling is locked while chat is active (acceptable UX trade-off to prevent jitter)
* `targetConfigs` in `js-meta.xml` cannot be removed while org page instances reference the component — you must delete page instances in Experience Builder first

---

### Building Design Concepts — Process

1. **Set up the global CSS static resource first.** Before creating concept pages, ensure the global CSS includes: LWR layout wrapper overrides (full-width), zero-gap rules for content regions and component wrappers, Embedded Messaging counter-rules, and frame layout body resets. All concepts share this stylesheet.

2. **Include zero-gap layout overrides in the global CSS.** LWR injects padding, margins, and gap between components in the content region. Override all of them:
   ```css
   /* Zero vertical spacing between components */
   community_layout-section,
   community_layout-full-column,
   [class*="contentRegion"],
   [class*="content-layout"] {
       row-gap: 0 !important;
   }

   /* Remove margin/padding from component slot wrappers */
   webruntimedesign-component-wrapper {
       margin-top: 0 !important;
       margin-bottom: 0 !important;
       padding-top: 0 !important;
       padding-bottom: 0 !important;
   }

   /* Frame layout body — remove spacing */
   [class*="frameBody"],
   [class*="frame-body"],
   [class*="body-container"] {
       padding: 0 !important;
       margin: 0 !important;
       gap: 0 !important;
   }
   ```

3. **Start with Concept A** — Create the baseline page with Frame layout. Drag existing components into the content region. Add the global styles loader and Embedded Messaging to the Theme Footer (shared across all pages). Takes 5 minutes.

4. **Build Concept B, C, or D next** — Build whichever the user is most excited about first. B and C require new LWCs and CSS. D requires a working ECV2 deployment already on the site.

5. **For each new concept:**
    * Generate the variant LWCs with proper naming convention
    * Deploy all new components: `sf project deploy start --json --source-dir force-app/main/default/lwc/<componentName> --target-org <alias>`
    * Create a new page in Experience Builder with Frame layout
    * Drag concept-specific components into the **Content region only** (NOT Theme Header/Footer)
    * Verify shared components (header, global styles, Embedded Messaging) are in the theme layout
    * For Concept D: the Embedded Messaging component MUST be on the page (it provides the ECV2 iframe that gets repositioned)
    * Test in incognito browser

6. **Present to stakeholders** — Each concept has its own URL. Walk through them in sequence: Concept A (baseline) → Concept B (integrated) → Concept C (immersive) → Concept D (native ECV2).

### Concept Selection Guidance

When a user asks "which concept should I use?", recommend based on their goals:

| Goal | Recommended Concept |
|------|-------------------|
| Reduce support friction, deflect tickets | **B (Integrated)** — agent meets users where they're already searching |
| Showcase AI investment, impress stakeholders | **C (Fullscreen)** — most visually dramatic transformation |
| Minimize risk, incremental improvement | **A (Baseline)** — standard deployment, well-understood UX |
| Mobile-first audience | **C (Fullscreen)** — feels native on mobile devices |
| Knowledge-heavy site with existing FAQ content | **B (Integrated)** — blends agent with existing search, doesn't replace it |
| Production-ready with real agent, minimal custom backend | **D (Native ECV2)** — full platform agent with branded wrapper, no MIAW API needed |
| Executive demo / board presentation | **A → D progression** — show the journey from baseline to branded native agent |
| Need real topic routing + action execution in demo | **D (Native ECV2)** — only concept using the actual agent runtime |

---

## Key Principles

* Always confirm the build plan before generating code
* Never deploy without explicit user confirmation
* Use LWR by default unless the user specifies Aura
* Use `@wire` adapters and `lightning-record-*` base components wherever possible
* Follow Salesforce DX project structure strictly
* If the org alias is unknown, run `sf org list` first
* Always include the global styles loader LWC and Embedded Messaging counter-rules when Agentforce chat is in scope
* Test in incognito browser after every deployment — cached service workers mask fixes
* When building design concepts, create all variants in a single SFDX project and use separate pages in Experience Builder — do not create separate sites
