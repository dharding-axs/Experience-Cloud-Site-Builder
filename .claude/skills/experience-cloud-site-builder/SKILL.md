---
name: experience-cloud-site-builder
description: End-to-end scaffold, generate, deploy, and document a Salesforce Experience Cloud site using Claude Code. Gathers requirements, plans the build, scaffolds LWC components, deploys to org, and pushes to GitHub.
---

# Experience Cloud Site Builder

## Purpose

End-to-end scaffold, generate, deploy, and document a Salesforce Experience Cloud site using Claude Code.

## Trigger

Invoke this skill when the user asks to:

* Build, scaffold, or create an Experience Cloud site
* Generate LWC components for a digital experience
* Deploy an Experience Cloud portal or community

## Phase 1: Gather Requirements

* Ask the user for:
    * **Site name and type** (LWR vs Aura)
    * **Pages needed** (e.g., Home, Resource Library, Case Submission)
    * **Key objects/data** to surface (e.g., Cases, Knowledge, Opportunities)
    * **Design Reference** (optional - highly recommended for styling accuracy):
        * **Screenshots**: Local file paths to PNG/JPG images of existing sites or mockups
        * **URLs**: Live website URLs to extract styling from (use WebFetch to capture page)
        * **Figma**: Figma file URLs (requires Figma API access via MCP or manual export to images)
        * If provided, extract styling automatically: colors, spacing, typography, layout patterns
        * If none provided, fall back to manual branding input below
    * **Branding/Theme** (optional - can be auto-populated from design references):
        * Primary brand color (hex code, e.g., #304CB2 for Southwest blue)
        * Secondary/accent color
        * Logo file path or URL
        * Font preferences (if specific fonts required)
        * Custom CSS requirements
    * **Page layout preferences** (optional):
        * Header style (full-width hero, compact, with/without search)
        * Content layout (1-column, 2-column, grid)
        * Footer content and links
    * **GitHub repo URL** (optional)
    * **Target Salesforce org alias** (default: whatever `sf org list` returns as default)
* If a GitHub repo is provided, clone it and scan for reusable LWC components

## Phase 1.5: Design Reference Processing (Optional)

**Trigger:** Only execute if user provided screenshots, URLs, or Figma files in Phase 1.

### Processing Different Reference Types

#### Option A: Screenshot Files (Local PNG/JPG)

**When to use:** User provides local file paths to screenshots

**Process:**
1. Use Read tool to load image files (Claude has multimodal vision)
2. Analyze screenshots for:
   - Color palette (primary, secondary, accent, text, background colors)
   - Typography (font sizes, weights, line heights)
   - Spacing patterns (padding, margins, gaps)
   - Layout structure (max-width, grid patterns, header height)
   - Border radius and shadow styles
3. Extract hex codes and measurements
4. Generate structured styling JSON
5. Present to user for verification

**Example:**
```bash
# User provides
"/Users/dave/screenshots/help-center-header.png"
"/Users/dave/screenshots/help-center-content.png"

# Use Read tool on each file
Read(file_path="/Users/dave/screenshots/help-center-header.png")
# Analyze visually and extract styling
```

#### Option B: Live Website URLs

**When to use:** User provides URLs to existing websites to match

**Process:**
1. Use WebFetch tool to capture the live page HTML/CSS
2. Extract computed styles from HTML:
   - Parse inline styles and style tags
   - Identify CSS variables and design tokens
   - Extract color values from backgrounds, text, borders
3. Screenshot the page if additional visual analysis needed:
   - Use browser automation (if available via MCP)
   - Or ask user to provide screenshot of the URL
4. Combine extracted CSS with visual analysis
5. Generate structured styling JSON

**Example:**
```bash
# User provides
"https://www.southwest.com/help/"

# Fetch the page
WebFetch(url="https://www.southwest.com/help/")

# Analyze HTML/CSS for:
# - <style> tags with CSS variables
# - Inline styles on elements
# - Background colors, text colors
# - Layout dimensions

# If CSS alone insufficient, request screenshot:
"I've extracted some styling from the HTML. For complete accuracy, 
please provide a screenshot of this page so I can verify colors and spacing."
```

**HTML/CSS Extraction Patterns:**
```html
<!-- Look for design tokens in HTML -->
<style>
:root {
  --primary-color: #2F4BB1;
  --secondary-color: #FFBF29;
}
</style>

<!-- Extract from inline styles -->
<div style="background-color: #2F4BB1; padding: 1.5rem;">

<!-- Parse class-based styling -->
<div class="bg-blue-600 text-white p-6">
```

#### Option C: Figma Files

**When to use:** User provides Figma file URLs or mentions Figma designs

**Process:**

**If Figma MCP Server Available:**
1. Use Figma MCP tools to fetch design tokens and styles
2. Extract color styles, text styles, spacing from Figma API
3. Convert Figma units to CSS (Figma px → rem)

**If No Figma MCP (Manual Export):**
1. Ask user to export Figma frames as PNG/JPG
2. Process as screenshots (Option A above)
3. Or ask user to share Figma "Inspect" panel values:
   ```
   "Please open Figma, select elements, and share the Inspect panel values:
   - Colors (hex codes)
   - Typography (font size, weight, line height)
   - Spacing (padding, margins in px)
   - Border radius, shadows"
   ```

**Figma URL Patterns:**
```
https://www.figma.com/file/ABC123/Design-System
https://www.figma.com/design/ABC123/Help-Center-Mockup
```

**Example Dialogue:**
```
User: "Use this Figma file: https://www.figma.com/file/ABC123/Southwest-Help-Center"

Claude: "I don't have direct Figma API access. Two options:
1. Export key frames from Figma as PNG/JPG and provide file paths
2. Share Inspect panel values for colors, typography, and spacing

Which would you prefer?"
```

### Styling Extraction Workflow (All Reference Types)

After extracting styling from any reference type, follow this workflow:

**Step 1: Generate Structured JSON**

Create `/tmp/design-reference-{site-name}.json`:

```json
{
  "source_type": "screenshot|url|figma",
  "source_location": "/path/to/file or URL",
  "extracted_date": "2026-04-25T14:30:00Z",
  "colors": {
    "primary": "#2F4BB1",
    "secondary": "#FFBF29",
    "accent": "#D5152F",
    "text_default": "#161619",
    "text_secondary": "#737382",
    "background": "#FFFFFF",
    "background_alt": "#F9FAFB"
  },
  "typography": {
    "base_size": "16px",
    "scale": [12, 14, 16, 18, 20, 24, 32, 40],
    "weights": {"normal": 400, "medium": 500, "semibold": 600, "bold": 700},
    "line_heights": {"tight": 1.2, "normal": 1.5, "relaxed": 1.75}
  },
  "spacing": {
    "xs": "0.25rem", "sm": "0.5rem", "md": "1rem", 
    "lg": "1.5rem", "xl": "2rem", "xxl": "3rem"
  },
  "layout": {
    "max_content_width": "1200px",
    "header_height": "64px"
  },
  "borders": {
    "radius_sm": "4px", "radius_md": "8px", "radius_lg": "12px"
  },
  "shadows": {
    "sm": "0 1px 3px rgba(26, 44, 128, 0.1)",
    "md": "0 2px 8px rgba(26, 44, 128, 0.1)"
  }
}
```

**Step 2: Present to User for Verification**

```markdown
## Extracted Styling from [Source Type]

**Source:** [screenshot path / URL / Figma file]

### Colors
- Primary: #2F4BB1 (buttons, headers, links)
- Secondary: #FFBF29 (accents, highlights)
- Text: #161619 (default) / #737382 (secondary)
- Background: #FFFFFF / #F9FAFB (alt)

### Typography
- Base Size: 16px
- Scale: 12, 14, 16, 18, 20, 24, 32, 40px
- Weights: 400, 500, 600, 700

### Spacing
- Scale: 4px, 8px, 16px, 24px, 32px, 48px

### Layout
- Max Content Width: 1200px
- Header Height: 64px

**Options:**
- Type **YES** to use these values
- Type **REFINE** to adjust specific values
- Type **MANUAL** to enter values manually instead
```

**Step 3: Refinement (If User Types REFINE)**

Offer category-specific refinement:
```
Which category to adjust?
  - COLORS - modify color palette
  - TYPOGRAPHY - adjust font sizes/weights
  - SPACING - change spacing scale
  - LAYOUT - update layout dimensions
```

**Step 4: Proceed to Phase 2**

Once user confirms (YES) or refines, use extracted JSON in Phase 3 for component generation.

### URL-Specific: WebFetch Analysis Pattern

When using WebFetch on live URLs, look for these patterns:

**CSS Variables in <style> tags:**
```css
:root {
  --brand-primary: #2F4BB1;
  --spacing-md: 1rem;
}
```

**Tailwind/Utility Classes:**
```html
<div class="bg-blue-600 text-white p-6 rounded-lg">
<!-- Translate: background: blue-600, text: white, padding: 1.5rem, border-radius: 0.5rem -->
```

**Inline Styles:**
```html
<button style="background-color: #FFBF29; padding: 0 1rem; font-weight: 700;">
```

**Computed Styles (if browser automation available):**
```javascript
window.getComputedStyle(element).backgroundColor // "rgb(47, 75, 177)"
// Convert to hex: #2F4BB1
```

## Phase 2: Plan the Build

* Output a structured build plan:
    * Site template type
    * Page list with layout descriptions
    * Component inventory (new vs reused)
    * Navigation structure
    * Data bindings and object dependencies
* Ask: "Does this look right? Type YES to proceed or describe changes."

## Phase 3: Scaffold the Project

* Run: `sf project generate --name <site-name>` (or use existing repo structure)
* Generate folder structure:
    * `force-app/main/default/lwc/` — one folder per component
    * `force-app/main/default/experiences/` — ExperienceBundle metadata
    * `force-app/main/default/digitalExperiences/site/<SiteName>/` — site views and routes
    * `force-app/main/default/networks/` — Network metadata (for site creation)
    * `force-app/main/default/navigationMenus/` — navigation menus
    * `force-app/main/default/classes/` — Apex controllers
* For each LWC component generate:
    * `<component>.html` — template with slots and data bindings
    * `<component>.js` — controller with wire adapters and @api properties for customization
    * `<component>.css` — scoped styles using design tokens AND brand colors from requirements
    * `<component>.js-meta.xml` — targets `lightningCommunity__Page` with configurable properties:
        * Text properties (titles, labels, placeholders)
        * Color properties (brandColor, accentColor)
        * Boolean toggles (showFeature, enableX)
        * Number properties (maxItems, columnCount)
* For each Apex controller generate:
    * `<Controller>.cls` — with `@AuraEnabled(cacheable=true)` methods
    * `<Controller>_Test.cls` — comprehensive test coverage (85%+)
* Generate Experience Cloud site metadata:
    * `<SiteName>.network-meta.xml` — Network configuration (creates the site)
    * `<SiteName>.site-meta.xml` — ExperienceBundle configuration
    * `<SiteName>_Navigation.navigationMenu-meta.xml` — Site navigation
    * `digitalExperiences/site/<SiteName>/mainAppPage/content.json` — App page layout
    * `digitalExperiences/site/<SiteName>/sfdc_cms__view/home/content.json` — Home page view
* Generate `package.xml` including all metadata types

## Phase 4: Deploy & Verify

* Deploy in sequential phases to handle dependencies:
    1. **Apex Controllers**: `sf project deploy start --source-dir force-app/main/default/classes/ --target-org <alias>`
        * Run tests to verify: `sf apex run test --class-names <TestClass> --target-org <alias>`
    2. **LWC Components**: `sf project deploy start --source-dir force-app/main/default/lwc/ --target-org <alias>`
    3. **Navigation Menus**: `sf project deploy start --source-dir force-app/main/default/navigationMenus/ --target-org <alias>`
    4. **Network (Site Creation)**: `sf project deploy start --source-dir force-app/main/default/networks/ --target-org <alias>`
        * This creates the actual Experience Cloud site in the org
    5. **Experience Bundle**: `sf project deploy start --source-dir force-app/main/default/experiences/ --target-org <alias>`
* If errors occur:
    * Parse the error output (common issues: invalid fields, API version mismatches, missing permissions)
    * Fix the code automatically or suggest fixes
    * Re-deploy the failed component
* Verify deployment:
    * Run: `sf org open --target-org <alias> --path lightning/setup/SetupNetworks/home`
    * Check that site appears in "All Sites" list
* **Important**: Site will be created but NOT activated - user must activate in Experience Builder

## Phase 5: GitHub Push (if repo provided)

* `git add .`
* `git commit -m "feat: scaffold Experience Cloud site - <site-name>"`
* `git push origin main`

## Phase 5: Post-Deployment Configuration

* Provide instructions for:
    * Opening the site in Experience Builder
    * Activating the site (cannot be done via metadata)
    * Setting Guest User permissions for Knowledge or other objects
    * Creating sample content (Knowledge Articles, Cases, etc.)
    * Testing the site as a guest user

## Phase 6: GitHub Push (if repo provided)

* `git add .`
* `git commit -m "feat: scaffold Experience Cloud site - <site-name>"`
* `git push origin main`

## Output

After a successful build, summarize:

* Site name and status (Created but not activated)
* Pages/views created
* Components built (with file paths)
* Apex controllers deployed (with test results)
* Deployment status for each phase
* Next steps for activation and content creation
* GitHub commit link (if applicable)

## Key Principles

* Always confirm the build plan before generating code
* Never deploy without explicit user confirmation
* Use LWR by default unless the user specifies Aura
* Use `@wire` adapters and `lightning-record-*` base components wherever possible
* Follow Salesforce DX project structure strictly
* If the org alias is unknown, run `sf org list` first
* **Deploy in phases**: Apex → LWC → Navigation → Network → Experience Bundle
* Handle deployment errors gracefully by fixing and re-deploying

## Network Metadata Template (for site creation)

Create `force-app/main/default/networks/<SiteName>.network-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Network xmlns="http://soap.sforce.com/2006/04/metadata">
    <allowInternalUserLogin>false</allowInternalUserLogin>
    <allowMembersToFlag>false</allowMembersToFlag>
    <changePasswordTemplate>unfiled$public/CommunityChangePasswordEmailTemplate</changePasswordTemplate>
    <communityRoles/>
    <disableReputationRecordConversations>true</disableReputationRecordConversations>
    <emailSenderAddress>noreply@salesforce.com</emailSenderAddress>
    <emailSenderName>{Site Name}</emailSenderName>
    <enableCustomVFErrorPageOverrides>false</enableCustomVFErrorPageOverrides>
    <enableDirectMessages>true</enableDirectMessages>
    <enableExperienceBundleBasedSnaOverrideEnabled>true</enableExperienceBundleBasedSnaOverrideEnabled>
    <enableGuestChatter>false</enableGuestChatter>
    <enableGuestFileAccess>false</enableGuestFileAccess>
    <enableInvitation>false</enableInvitation>
    <enableKnowledgeable>false</enableKnowledgeable>
    <enableMemberVisibility>false</enableMemberVisibility>
    <enableNicknameDisplay>false</enableNicknameDisplay>
    <enablePrivateMessages>false</enablePrivateMessages>
    <enableReputation>false</enableReputation>
    <enableShowAllNetworkSettings>false</enableShowAllNetworkSettings>
    <enableSiteAsContainer>true</enableSiteAsContainer>
    <forgotPasswordTemplate>unfiled$public/CommunityForgotPasswordEmailTemplate</forgotPasswordTemplate>
    <lockoutTemplate>unfiled$public/CommunityAccountLockedEmailTemplate</lockoutTemplate>
    <logoutUrl>{Logout URL}</logoutUrl>
    <maxFileSizeKb>10240</maxFileSizeKb>
    <navigationLinkSet>
        <navigationMenuItem>
            <defaultListViewId></defaultListViewId>
            <label>Home</label>
            <position>1</position>
            <publiclyAvailable>true</publiclyAvailable>
            <target>Home</target>
            <type>NavigationalTopic</type>
        </navigationMenuItem>
    </navigationLinkSet>
    <networkMemberGroups/>
    <networkPageOverrides/>
    <newSenderAddress>{New Sender Address}</newSenderAddress>
    <picassoSite>{Site API Name}</picassoSite>
    <selfRegProfile>{Profile Name}</selfRegProfile>
    <selfRegistration>false</selfRegistration>
    <sendWelcomeEmail>true</sendWelcomeEmail>
    <site>{Site API Name}</site>
    <siteArchiveStatus>NotArchived</siteArchiveStatus>
    <status>UnderConstruction</status>
    <tabs/>
    <urlPathPrefix>{site-url-prefix}</urlPathPrefix>
    <verificationTemplate>unfiled$public/CommunityEmailVerificationEmailTemplate</verificationTemplate>
    <welcomeTemplate>unfiled$public/CommunityWelcomeEmailTemplate</welcomeTemplate>
</Network>
```

**Note**: Network metadata creates the site but it will be in "UnderConstruction" status - user must activate via Experience Builder UI.

## CSS & Branding Customization Guidelines

### CSS Variable Strategy

Generate a shared CSS file with brand-specific custom properties:

**`force-app/main/default/staticresources/siteTheme.css`:**

```css
:root {
    /* Brand Colors */
    --brand-primary: #304CB2;           /* From requirements */
    --brand-secondary: #1B4596;
    --brand-accent: #F7931E;
    --brand-text-on-primary: #FFFFFF;
    
    /* Semantic Colors */
    --color-background: #FFFFFF;
    --color-background-alt: #F3F3F3;
    --color-text-default: #181818;
    --color-text-secondary: #706E6B;
    --color-border: #C9C9C9;
    
    /* Spacing Scale */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-xxl: 3rem;
    
    /* Typography */
    --font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --font-family-heading: var(--font-family-base);
    --font-size-base: 1rem;
    --font-size-sm: 0.875rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 2rem;
    
    /* Borders & Radius */
    --border-radius-sm: 4px;
    --border-radius-md: 8px;
    --border-radius-lg: 12px;
    
    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    
    /* Layout */
    --max-content-width: 1200px;
    --header-height: 64px;
}
```

### Component CSS Pattern

Each LWC component should use both SLDS tokens (for compatibility) AND custom brand variables:

```css
.hero-section {
    /* Use custom property with SLDS fallback */
    background: linear-gradient(135deg, 
        var(--brand-primary, var(--lwc-brandPrimary, #0176d3)) 0%, 
        var(--brand-secondary, var(--lwc-brandPrimaryDark, #014486)) 100%
    );
    padding: var(--spacing-xxl, 3rem) var(--spacing-lg, 1.5rem);
    color: var(--brand-text-on-primary, white);
}

.card-title {
    color: var(--color-text-default, var(--lwc-colorTextDefault, #181818));
    font-family: var(--font-family-heading);
    font-size: var(--font-size-xl, 1.25rem);
}
```

### Lightning Component CSS Override Strategy

**Problem:** Lightning Web Components have aggressive default styling that often overrides custom CSS, especially for `lightning-button`, `lightning-input`, and other base components.

**Solution:** Use a three-layer override strategy:

#### Layer 1: SLDS Design Tokens (Preferred)

Set design tokens at the component level to control Lightning's internal styling system:

```css
/* For buttons */
.custom-button {
    --slds-c-button-color-background: #FFBF29;
    --slds-c-button-color-border: #FFBF29;
    --slds-c-button-text-color: #161619;
    --slds-c-button-text-font-weight: 700;
    --slds-c-button-color-background-hover: #E5AC24;
    --slds-c-button-color-border-hover: #E5AC24;
}

/* For inputs */
.custom-input {
    --slds-c-input-color-background: transparent;
    --slds-c-input-color-border: transparent;
    --slds-c-input-shadow: none;
    --slds-c-input-sizing-border: 0;
    --slds-c-input-radius-border: 0;
}
```

#### Layer 2: Direct Element Overrides with !important

Target the rendered HTML elements inside Lightning components:

```css
.custom-button button {
    background-color: #FFBF29 !important;
    border: none !important;
    color: #161619 !important;
    font-weight: 700 !important;
    padding: 0 1rem !important;
}
```

#### Layer 3: Wildcard Overrides for Nested Elements

Use wildcards to catch ALL nested elements that Lightning might inject:

```css
/* Catches any nested elements preventing font-weight/color inheritance */
.custom-button *,
.custom-button button,
.custom-button button *,
.custom-button button span,
.custom-button button span * {
    color: #161619 !important;
    font-weight: 700 !important;
}
```

#### Lightning Component Variant Selection

**Choose the right variant** to minimize override battles:

- `variant="base"` - Minimal default styling, easiest to override
- `variant="neutral"` - Medium styling, moderate override difficulty
- `variant="brand"` - Uses brand colors, hard to override
- `variant="destructive"` - Red theme, very hard to override

**Rule of thumb:** Use `variant="base"` for components requiring heavy customization.

#### Common Override Scenarios

**Scenario 1: Custom Button Color**
```html
<lightning-button variant="base" class="custom-button"></lightning-button>
```
```css
.custom-button {
    --slds-c-button-color-background: #FFBF29;
    --slds-c-button-text-color: #161619;
    --slds-c-button-text-font-weight: 700;
}
.custom-button button {
    background-color: #FFBF29 !important;
    color: #161619 !important;
    font-weight: 700 !important;
}
.custom-button button * {
    color: #161619 !important;
    font-weight: 700 !important;
}
```

**Scenario 2: Transparent Input in Custom Container**
```html
<div class="input-wrapper">
    <lightning-input variant="label-hidden" class="custom-input"></lightning-input>
</div>
```
```css
.input-wrapper {
    background-color: #FFFFFF;
    border-radius: 8px;
    padding: 8px;
}
.custom-input {
    --slds-c-input-color-background: transparent;
    --slds-c-input-color-border: transparent;
    --slds-c-input-shadow: none;
}
.custom-input input {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
}
```

**Scenario 3: Vertical Centering in Flex Container**
```css
.search-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
}
.search-input lightning-input,
.search-input .slds-form-element,
.search-input .slds-form-element__control {
    display: flex;
    align-items: center;
    height: 40px;
}
```

#### Testing Override Success

After applying overrides, verify in browser DevTools:

1. **Inspect element** and check Computed styles
2. Look for **strikethrough** styles (indicates successful override)
3. Check if **!important** is present on your custom rules
4. Verify **design token values** in the Styles panel under `:root` or component class

**Common failure signs:**
- Text not bold → Check for nested `<span>` elements without wildcard overrides
- Color not applying → Check button variant (switch to `base`)
- Input border visible → Missing `--slds-c-input-color-border: transparent`
- Height/padding wrong → Check for `.slds-form-element` overrides

### Configurable Properties in js-meta.xml

Make components highly configurable through Experience Builder:

```xml
<targetConfig targets="lightningCommunity__Default">
    <!-- Text Properties -->
    <property name="title" type="String" default="Welcome" 
              label="Title" description="Main heading text"/>
    <property name="subtitle" type="String" default="Find what you need" 
              label="Subtitle" description="Subheading text"/>
    
    <!-- Color Properties -->
    <property name="backgroundColor" type="String" default="#304CB2" 
              label="Background Color" description="Hex color code (e.g., #304CB2)"/>
    <property name="textColor" type="String" default="#FFFFFF" 
              label="Text Color" description="Hex color code for text"/>
    
    <!-- Boolean Toggles -->
    <property name="showLogo" type="Boolean" default="true" 
              label="Show Logo" description="Display company logo"/>
    <property name="enableSearch" type="Boolean" default="true" 
              label="Enable Search" description="Show search functionality"/>
    
    <!-- Number Properties -->
    <property name="maxItems" type="Integer" default="9" 
              label="Max Items" description="Maximum number of items to display"/>
    <property name="columnCount" type="Integer" default="3" 
              label="Columns" description="Number of columns in grid (1-4)"/>
</targetConfig>
```

### Logo & Image Handling

For logos and custom images:

1. **Static Resource Approach**:
   - Upload logo to Static Resources: `force-app/main/default/staticresources/siteLogo.png`
   - Reference in component: `import logoUrl from '@salesforce/resourceUrl/siteLogo';`

2. **Content Management System (CMS) Approach**:
   - Use CMS for dynamic images
   - Reference via CMS API

3. **External URL Approach**:
   - Make logo URL a configurable property
   - Use `<img src={logoUrl} alt="Company Logo" />`

### Page Layout Customization

Generate page layouts with configurable regions in `digitalExperiences/`:

```json
{
  "type": "sfdc_cms__view",
  "title": "Home",
  "regions": [
    {
      "id": "header",
      "regionName": "Header",
      "components": [
        {
          "componentName": "c:siteHeader",
          "componentAttributes": {
            "logoUrl": "/resource/siteLogo",
            "showSearch": true,
            "backgroundColor": "#304CB2"
          }
        }
      ]
    },
    {
      "id": "hero",
      "regionName": "Hero",
      "components": [
        {
          "componentName": "c:homePageHero",
          "componentAttributes": {
            "title": "Southwest Ask Me Anything",
            "backgroundColor": "#304CB2",
            "textColor": "#FFFFFF"
          }
        }
      ]
    },
    {
      "id": "content",
      "regionName": "Main Content",
      "type": "grid",
      "columns": 3,
      "components": []
    }
  ]
}
```

### Responsive Design Requirements

**All components MUST include responsive CSS with media queries.** Every grid, multi-column layout, and fixed-width element must break and stack for smaller screens. Use two breakpoints consistently.

#### Standard Breakpoints

- **Desktop**: Default (no media query) — 3+ column grids, full navigation, standard padding
- **Tablet/Mobile**: `@media (max-width: 768px)` — **single-column stacking for ALL grids**, hamburger nav, reduced padding (24px → 16px), vertically stacked search inputs
- **Small Mobile**: `@media (max-width: 480px)` — further reduced font sizes, tighter padding

**Critical rule:** At 768px, ALL grids collapse to `grid-template-columns: 1fr`. Do NOT use `repeat(2, 1fr)` at tablet — it creates inconsistency where some sections stack while others don't. Single-column at 768px is the standard for help center / support site layouts.

#### CSS Reset Pattern for LWR

Every LWC component in an LWR site needs this reset to prevent SLDS defaults from interfering:

```css
:host {
    display: block;
}

* {
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 0 !important;
}
```

#### Full-Width Bleed Pattern

LWR content regions add ~24px padding on each side. To make a component (like a header or footer) span the full viewport width:

```css
:host {
    display: block;
    margin-left: -24px !important;
    margin-right: -24px !important;
    width: calc(100% + 48px) !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
}

.inner-container {
    max-width: 960px !important;
    margin: 0 auto !important;
    padding: 0 24px !important;
}
```

This bleeds the component past the content region padding, then uses an inner container to constrain content to the desired max-width.

**Critical: Reset the bleed at mobile breakpoints.** On mobile, the LWR content region padding changes and the viewport is narrower, so the negative-margin technique pushes the component wider than the screen — clipping elements on the right side (logo, icons, buttons get cut off). Reset to natural width at 768px:

```css
@media (max-width: 768px) {
    :host {
        margin-left: 0 !important;
        margin-right: 0 !important;
        width: 100% !important;
    }

    .inner-container {
        padding: 0 16px !important;
    }
}
```

**Always pair the desktop bleed with a mobile reset.** Every component using the negative-margin bleed pattern MUST include the 768px `:host` reset or content will be clipped on mobile.

#### SLDS Override Rules

LWR sites have aggressive SLDS defaults. Follow these rules:

1. **Always use `!important`** on every property that overrides SLDS
2. **Never use `color: inherit`** — SLDS will inject its own default (usually black). Always use explicit color values: `color: #ffffff !important`
3. **Use bare selectors, not `:host` prefixed** — `:host .my-link { color: white }` loses to SLDS specificity. Use `.my-link { color: #ffffff !important }` directly
4. **Target specific classes** — Blanket `a { color: inherit !important }` will pick up SLDS defaults. Use `.header-link { color: #ffffff !important }` instead

#### Global CSS Injection via loadStyle

LWR ignores `<link>` tags in head markup for static resources. To inject global CSS that overrides LWR theme layout wrappers (e.g., removing side borders, making content full-width):

**1. Create a static resource CSS file** (`siteOverrides.css`):
```css
[class*="content-layout"],
[class*="contentRegion"],
[class*="mainContentRegion"],
[class*="outerContainer"],
[class*="innerContainer"],
[class*="slds-container"],
[class*="templateContainer"],
[class*="themeLayout"] {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    border-left: none !important;
    border-right: none !important;
}

dxp_template_lwr-content-layout,
community_layout-section,
community_layout-section > div,
community_layout-full-column,
community_layout-full-column > div,
webruntimedesign-component-wrapper,
webruntimedesign-component-wrapper > div {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    border: none !important;
}
```

**2. Create an invisible LWC utility component** to load it:
```javascript
import { LightningElement } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import overrides from '@salesforce/resourceUrl/siteOverrides';

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
<template></template>
```

**3. Drop this component on the page** in Experience Builder. It renders nothing but injects the CSS globally.

#### Component-Specific Responsive Patterns

##### Header with Hamburger Menu

Desktop: horizontal nav links with separators. At 768px: hide nav, show hamburger button that toggles a slide-down mobile menu.

**JS — toggle state:**
```javascript
import { LightningElement, track } from 'lwc';

export default class SiteHeader extends LightningElement {
    @track menuOpen = false;

    get mobileMenuClass() {
        return this.menuOpen ? 'mobile-menu mobile-menu-open' : 'mobile-menu';
    }

    get hamburgerClass() {
        return this.menuOpen ? 'hamburger hamburger-open' : 'hamburger';
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }
}
```

**HTML — duplicate nav links in mobile menu:**
```html
<button class={hamburgerClass} aria-label="Menu" onclick={toggleMenu}>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
</button>
<!-- After the nav-bar div, inside the header -->
<div class={mobileMenuClass}>
    <ul class="mobile-nav-list">
        <li><a href="#">LINK 1</a></li>
        <li><a href="#">LINK 2</a></li>
    </ul>
</div>
```

**CSS — hamburger button with X animation:**
```css
/* Hidden on desktop */
.hamburger {
    display: none !important;
    background: none !important;
    border: none !important;
    cursor: pointer !important;
    padding: 6px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 5px !important;
    box-shadow: none !important;
}

.hamburger-line {
    display: block !important;
    width: 20px !important;
    height: 2px !important;
    background: #ffffff !important;
    border-radius: 1px !important;
    transition: transform 0.3s, opacity 0.3s !important;
}

/* Animate to X when open */
.hamburger-open .hamburger-line:first-child {
    transform: translateY(7px) rotate(45deg) !important;
}
.hamburger-open .hamburger-line:nth-child(2) {
    opacity: 0 !important;
}
.hamburger-open .hamburger-line:last-child {
    transform: translateY(-7px) rotate(-45deg) !important;
}

/* Mobile menu — hidden on desktop, slides down on mobile */
.mobile-menu {
    display: none !important;
}

@media (max-width: 768px) {
    /* Hide desktop nav, show hamburger */
    .desktop-nav {
        display: none !important;
    }
    .hamburger {
        display: flex !important;
    }

    /* Slide-down mobile menu */
    .mobile-menu {
        display: block !important;
        max-height: 0 !important;
        overflow: hidden !important;
        transition: max-height 0.3s ease !important;
        background: rgba(0, 0, 0, 0.15) !important; /* slightly darker than header */
    }
    .mobile-menu-open {
        max-height: 500px !important;
    }

    .mobile-nav-list li a {
        display: block !important;
        color: #ffffff !important;
        text-decoration: none !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        padding: 10px 0 !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
    }
}
```

**Key implementation notes:**
- `max-height: 0` → `max-height: 500px` is the CSS transition trick for animating `height: auto` (CSS can't animate auto height directly)
- The `translateY(7px)` for the X animation = line height (2px) + gap (5px), so the lines meet at center
- The mobile menu `<div>` must be inside `<header>` but outside the nav-bar container
- Duplicate nav links in the mobile menu HTML — don't try to show/hide the same `<ul>`

##### Card Grids (Hero, Topics, etc.)

```css
.card-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 16px !important;
}

@media (max-width: 768px) {
    .card-grid {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 480px) {
    .card-grid {
        grid-template-columns: 1fr !important;
    }

    .card {
        padding: 16px !important;
    }
}
```

##### Search Bars

At 768px: stack input and button vertically, reduce outer padding.

```css
.search-section {
    padding: 0 24px 32px !important;
}

.search-input-wrap {
    display: flex !important;
    background: #ffffff !important;
    border-radius: 6px !important;
    overflow: hidden !important;
}

.search-input {
    flex: 1 !important;
    border: none !important;
    padding: 10px 16px !important;
}

.search-button {
    padding: 10px 28px !important;
    margin: 6px !important;
    border-radius: 4px !important;
}

@media (max-width: 768px) {
    .search-section {
        padding: 0 16px 24px !important;
    }

    .search-box {
        padding: 20px !important;
    }

    .search-input-wrap {
        flex-direction: column !important;
    }

    .search-button {
        margin: 4px !important;
        padding: 12px !important;
    }
}
```

##### Footer Grids

4-column link grids and icon rows → single column at 768px. Copyright bar flex-row → column.

```css
.footer-links-grid {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 24px !important;
}

.footer-bottom-inner {
    display: flex !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
}

@media (max-width: 768px) {
    .footer-links-grid {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 480px) {
    .footer-links-grid {
        gap: 20px !important;
    }

    .footer-bottom-inner {
        flex-direction: column !important;
        align-items: flex-start !important;
    }
}
```

##### Typography Scaling

```css
.heading {
    font-size: 22px !important;
    font-weight: 700 !important;
}

@media (max-width: 480px) {
    .heading {
        font-size: 20px !important;
    }
}
```

#### Mobile Testing Checklist

Before deploying any component, verify:
- [ ] Desktop navigation converts to hamburger menu at 768px
- [ ] Hamburger animates to X on open and back on close
- [ ] Mobile menu slides down smoothly (max-height transition)
- [ ] ALL grids stack to single column at 768px (NOT 2-column, NOT horizontal scroll)
- [ ] Search bar input and button stack vertically at 768px
- [ ] Footer grids (icons + link columns) stack to single column at 768px
- [ ] Copyright bar stacks to column layout at 480px
- [ ] Text wraps naturally without overflow
- [ ] Images/logos scale proportionally
- [ ] Padding reduces from 24px to 16px at mobile breakpoints
- [ ] Touch targets are minimum 44x44px
- [ ] No horizontal scrolling on any mobile viewport
- [ ] Full-width components still bleed edge-to-edge on mobile
- [ ] All link colors use explicit hex values (not `inherit`) with `!important`

## Phase 6: Agent Chat Integration (Embedded Messaging)

**Trigger:** User wants an Agentforce agent (or any bot) accessible via chat on the Experience Cloud site.

This phase configures Salesforce Embedded Messaging end-to-end. It combines automated CLI steps (permission set deployment, guest user assignment, validation queries) with manual Setup UI steps (channel creation, deployment creation/publishing, Experience Builder component placement).

### Prerequisites — Automated Validation

Before starting, run these checks to confirm readiness. All commands use `--json` for structured output.

**Check 1: Verify target org is set**
```bash
sf config get target-org --json
```

**Check 2: Verify the agent exists and has at least one published version**
```bash
sf data query --json --query "SELECT Id, DeveloperName, MasterLabel FROM BotDefinition WHERE DeveloperName = '<Agent_API_Name>'"
sf data query --json --query "SELECT Id, DeveloperName FROM BotVersion WHERE BotDefinition.DeveloperName = '<Agent_API_Name>'"
```
If no BotVersion records exist, the agent hasn't been published. Publish first:
```bash
sf agent publish authoring-bundle --json --api-name <Agent_API_Name>
sf agent activate --json --api-name <Agent_API_Name>
```

**Check 3: Verify the Experience Cloud site exists**
```bash
sf data query --json --query "SELECT Id, Name, Status FROM Network WHERE Name = '<Site_Name>'"
```
Note the `Status` — if `UnderConstruction`, the site has never been published. If `Live`, it's published but will need re-publishing after configuration changes.

**Check 4: Check if a Messaging for In-App & Web channel already exists**
```bash
sf data query --json --query "SELECT Id, DeveloperName, MasterLabel, IsActive, RoutingType FROM MessagingChannel WHERE DeveloperName = 'Messaging_for_In_App_Web'"
```
If a record exists and `IsActive = true`, skip Step 1. If `RoutingType` is null, the channel exists but has no agent assigned — proceed to Step 3.

**Check 5: Verify a Sites domain is registered**

The Embedded Service Deployment wizard requires a valid host domain. If the org doesn't have a Salesforce Sites domain registered, the wizard will block with "the site needs a valid host domain."

Check via Setup UI: **Setup** → Quick Find → **Sites** (under "Sites and Domains", NOT "All Sites"). Look for a registered domain at the top of the page (e.g., `your-org.my.salesforce-sites.com`).

If no domain is registered:
1. On the **Sites** page, enter a subdomain name in the registration field (often pre-populated with the org's My Domain)
2. Click **Register**
3. Wait for confirmation — this is usually instant but can take a few minutes
4. Then proceed to Step 2

**This cannot be checked or registered via CLI** — it must be done in Setup UI before creating the Embedded Service Deployment.

### Step 1: Create the Messaging Channel (Setup UI — Manual)

The messaging channel is the backend pipe that connects customer messages to the agent. **This must be created through Setup UI.**

1. **Setup** → Quick Find → **Messaging Settings**
2. Click **New Channel**
3. Select **Messaging for In-App & Web**
4. Configure:
   - **Channel Name**: e.g., `Messaging for In-App & Web` (default) or a custom name
   - **Routing Type**: Select **Agentforce Service Agent** (not Queue)
   - **Agentforce Service Agent**: Select the target agent
   - **Fallback Queue**: Select or create a queue for human escalation
   - If the agent doesn't appear in the dropdown, it hasn't been activated — activate first via CLI:
     ```bash
     sf agent activate --json --api-name <Agent_API_Name>
     ```
5. Click **Save**

**After creating, verify the channel was created correctly:**
```bash
sf data query --json --query "SELECT Id, DeveloperName, MasterLabel, IsActive, RoutingType FROM MessagingChannel WHERE DeveloperName = 'Messaging_for_In_App_Web'"
```
Confirm `IsActive = true` and `RoutingType` is not null.

### Step 2: Create the Embedded Service Deployment (Setup UI — Manual)

The deployment wraps the messaging channel into a configurable chat widget.

**CRITICAL: Always create the FIRST deployment through Setup UI.** The UI wizard provisions a backing `ESW_*` Force.com Site that the deployment needs to function. Metadata deployment (`EmbeddedServiceConfig`) creates the config record but SKIPS this site provisioning — resulting in a deployment that appears to exist but cannot be published (the Publish button does nothing, no audit trail entry, "Published On" timestamp never updates). If you deployed via metadata and publishing fails silently, **delete the metadata-deployed config and recreate through Setup UI.**

**If the wizard shows "the site needs a valid host domain":** The org doesn't have a Salesforce Sites domain registered. Go to Setup → Sites (under "Sites and Domains") → register a domain first. See Check 5 in Prerequisites.

1. **Setup** → Quick Find → **Embedded Service Deployments**
2. Click **New Deployment**
3. Select **Embedded Messaging** as the deployment type
4. Configure:
   - **Name**: e.g., `Help Center Agent`
   - **API Name**: auto-generated
   - **Messaging Channel**: Select the channel from Step 1 — **this links the deployment to the channel**
   - **Site**: Select your Experience Cloud site
5. Walk through the configuration wizard:
   - **Branding**: Colors, logo, chat window title
   - **Pre-Chat Form**: Fields to collect before chat starts (optional)
   - **Automated Messages**: Welcome message, agent assignment message
6. Click **Save**

**The deployment-to-channel link is established during creation.** When you select the Messaging Channel in step 4, the deployment is permanently linked to that channel. The data flow is: **Embedded Service Deployment → Messaging Channel → Agent**. If you later create a NEW deployment (e.g., because you deleted a broken metadata-deployed one), you must select the same messaging channel again to re-establish the link. Verify in Messaging Settings that the channel still shows the correct agent in Omni-Channel Routing.

**How to verify the backing site was created:**
```bash
sf data query --json --query "SELECT Id, Name, Status, SiteType FROM Site WHERE Name LIKE 'ESW_%'"
```
After UI creation, you should see a new `ESW_*` Site record. If no new ESW site appears, the deployment wasn't properly provisioned — delete and recreate.

**Optional — version control the config after UI creation:**

After creating via UI, you can retrieve the metadata for version control:
```bash
sf project retrieve start --json --metadata EmbeddedServiceConfig --target-org <alias>
```
This captures the config in `force-app/main/default/EmbeddedServiceConfig/` for future CI/CD deployments. Subsequent deployments of this metadata to the SAME org will update the config. But deploying to a NEW org still requires the initial UI creation to provision the backing site.

### Step 3: Verify Agent-to-Channel Routing (Automated Check)

Run this query to confirm the agent is properly routed:
```bash
sf data query --json --query "SELECT Id, DeveloperName, MasterLabel, IsActive, RoutingType FROM MessagingChannel WHERE DeveloperName = 'Messaging_for_In_App_Web'"
```

**If `RoutingType` is null:** The channel exists but no agent is assigned. Fix via Setup UI:
1. **Setup** → Quick Find → **Messaging Settings**
2. Click the channel name
3. In **Omni-Channel Routing** section, click **Edit**
4. Set **Routing Type** → **Agentforce Service Agent**
5. Select the target agent
6. Set a **Fallback Queue** for escalation
7. Click **Save**

### Step 4: Publish the Embedded Service Deployment (Setup UI — Manual)

The deployment MUST be **published** before the Experience Builder component activates. This step cannot be automated via CLI.

1. **Setup** → Quick Find → **Embedded Service Deployments**
2. Click on the deployment name
3. Review the configuration checklist — all items must be complete
4. Click **Publish** at the top of the page

**What publishing does:**
- Generates the JavaScript snippet for the chat widget
- Registers the messaging endpoint
- Enables the "Embedded Messaging" component in Experience Builder (it will be greyed out until published)

### Step 5: Deploy Guest User Permissions (Automated)

**This is the most common blocker for chat widgets not appearing.** The guest user profile needs Messaging object permissions. Without them, the chat widget silently fails to render — no error message, it just doesn't show up.

**Step 5a: Generate and deploy the permission set**

Create `force-app/main/default/permissionsets/Messaging_Guest_Access.permissionset-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <description>Grants guest users access to Messaging objects required for the Embedded Messaging chat widget.</description>
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

Deploy:
```bash
sf project deploy start --json --source-dir force-app/main/default/permissionsets/Messaging_Guest_Access.permissionset-meta.xml --target-org <alias>
```

**Step 5b: Find the deployed permission set ID**
```bash
sf data query --json --query "SELECT Id FROM PermissionSet WHERE Name = 'Messaging_Guest_Access'"
```

**Step 5c: Find BOTH guest users that need the permission set**

There are TWO guest users that need messaging permissions:
1. The **Experience Cloud site** guest user (serves the page)
2. The **ESW backing site** guest user (serves the chat widget assets)

Missing either one will silently block the chat widget — no error, it just doesn't appear.

```bash
# Experience Cloud site guest user
sf data query --json --query "SELECT Id, Name FROM User WHERE Name LIKE '%<Site_Name>%Site Guest User%' AND UserType = 'Guest'"

# ESW backing site guest user (auto-created during deployment creation)
sf data query --json --query "SELECT Id, Name FROM User WHERE Name LIKE '%ESW_%<Deployment_API_Name>%Site Guest User%' AND UserType = 'Guest'"
```

**Step 5d: Assign the permission set to BOTH guest users**
```bash
# Assign to Experience Cloud site guest user
sf data create record --json --sobject PermissionSetAssignment --values "AssigneeId='<EC_Guest_User_Id>' PermissionSetId='<PermissionSet_Id>'" --target-org <alias>

# Assign to ESW backing site guest user
sf data create record --json --sobject PermissionSetAssignment --values "AssigneeId='<ESW_Guest_User_Id>' PermissionSetId='<PermissionSet_Id>'" --target-org <alias>
```

**Step 5e: Verify both assignments**
```bash
sf data query --json --query "SELECT Id, PermissionSet.Name, Assignee.Name FROM PermissionSetAssignment WHERE PermissionSet.Name = 'Messaging_Guest_Access' AND Assignee.UserType = 'Guest'"
```
Expect **2 records** — one for each guest user.

**Step 5f: Enable guest access on the EmbeddedServiceConfig**

The deployment config itself has a `areGuestUsersAllowed` flag that must be `true`. If it was created with this set to `false`, update and redeploy:

```xml
<!-- Must be true for guest/unauthenticated chat -->
<areGuestUsersAllowed>true</areGuestUsersAllowed>
```

Retrieve, check, and redeploy if needed:
```bash
sf project retrieve start --json --metadata "EmbeddedServiceConfig:<Deployment_API_Name>" --target-org <alias>
# Check the areGuestUsersAllowed value in the retrieved XML
# If false, edit to true and redeploy:
sf project deploy start --json --source-dir force-app/main/default/EmbeddedServiceConfig --target-org <alias>
```

**Three layers of guest access must ALL be enabled:**

| Layer | What | How to check |
|-------|------|-------------|
| EmbeddedServiceConfig | `areGuestUsersAllowed=true` | Retrieve metadata and inspect XML |
| Experience Cloud site guest user | Messaging_Guest_Access permission set assigned | SOQL query on PermissionSetAssignment |
| ESW backing site guest user | Messaging_Guest_Access permission set assigned | SOQL query on PermissionSetAssignment |

Missing ANY layer causes the chat widget to silently fail — no error message, it just doesn't render.

### Step 6: Add the Chat Component to the Experience Builder Page (Setup UI — Manual)

1. Open **Experience Builder** for your site
2. Navigate to the page where you want the chat widget
3. In the Components panel (left sidebar), search for **Embedded Messaging** (may also appear as "Messaging for In-App and Web" depending on release)
4. Drag the component onto the page (usually at the bottom or in a utility bar region)
5. Configure component properties if any appear in the right panel

**If the component is greyed out / not clickable:**
- The Embedded Service Deployment has not been published yet (go back to Step 4)
- The deployment is not associated with the correct Experience Cloud site
- The messaging channel is not enabled

### Step 7: Publish the Experience Cloud Site (Setup UI — Manual)

1. In Experience Builder, click **Publish** in the top-right corner
2. Confirm the publish

**Verify the site is published:**
```bash
sf data query --json --query "SELECT Id, Name, Status FROM Network WHERE Name = '<Site_Name>'"
```
Status should be `Live`. If still `UnderConstruction`, the publish didn't complete.

### Step 8: Verify End-to-End (Automated Diagnostic)

Run this full diagnostic script to verify all pieces are in place:

```bash
# 1. Agent exists and has versions
sf data query --json --query "SELECT Id, DeveloperName, MasterLabel FROM BotDefinition WHERE DeveloperName = '<Agent_API_Name>'"
sf data query --json --query "SELECT Id, DeveloperName FROM BotVersion WHERE BotDefinition.DeveloperName = '<Agent_API_Name>'"

# 2. Messaging channel is active with routing
sf data query --json --query "SELECT Id, DeveloperName, IsActive, RoutingType FROM MessagingChannel WHERE DeveloperName = 'Messaging_for_In_App_Web'"

# 3. Guest user has messaging permissions
sf data query --json --query "SELECT Id, PermissionSet.Name, Assignee.Name FROM PermissionSetAssignment WHERE PermissionSet.Name = 'Messaging_Guest_Access' AND Assignee.UserType = 'Guest'"

# 4. Site is published
sf data query --json --query "SELECT Id, Name, Status FROM Network WHERE Name = '<Site_Name>'"
```

**Expected results for a working setup:**
- BotDefinition: 1 record found
- BotVersion: At least 1 record
- MessagingChannel: `IsActive = true`, `RoutingType` is not null
- PermissionSetAssignment: 1 record linking Messaging_Guest_Access to the guest user
- Network: `Status = 'Live'`

**If chat still doesn't appear after all checks pass:**
1. Open browser DevTools → Console → look for errors
2. Open the site in an **incognito window** (cached state can mask changes)
3. Verify the Embedded Messaging component is actually on the published page (not just saved in builder)
4. Check that the Embedded Service Deployment is in **Published** state (not just created) — this cannot be verified via SOQL and must be checked in Setup UI

### CSP and Security Considerations

The built-in "Embedded Messaging" Experience Builder component handles Content Security Policy (CSP) automatically. You do NOT need to:
- Add CSP Trusted Sites for the messaging scripts
- Add `<script>` tags to head markup
- Configure Trusted URLs manually

**Do NOT attempt to embed the chat via head markup script injection.** The Embedded Messaging JavaScript snippet provided by Salesforce is intended for non-Experience Cloud sites (external websites). For Experience Cloud, always use the built-in component — it handles CSP, authentication context, and session management automatically.

If you previously added messaging script URLs to head markup or CSP Trusted Sites for the built-in component, they can be removed — they're unnecessary and may cause conflicts.

### Automation Summary

| Step | Automated? | Method |
|------|-----------|--------|
| Prerequisite validation | Yes | SOQL queries via CLI |
| Create Messaging Channel | No | Setup UI only |
| Create Embedded Service Deployment | No | Setup UI only (backing site requires UI wizard) |
| Verify agent-to-channel routing | Yes | SOQL query via CLI |
| Publish Embedded Service Deployment | No | Setup UI only |
| Deploy guest user permission set | **Yes** | Metadata deploy via CLI |
| Assign permission set to guest user | **Yes** | `sf data create record` via CLI |
| Verify permission assignment | Yes | SOQL query via CLI |
| Add component to page | No | Experience Builder UI |
| Publish Experience Cloud site | No | Experience Builder UI |
| End-to-end diagnostic | Yes | SOQL queries via CLI |

## Troubleshooting: Common Issues

### Deployment Issues

**Problem: `--source-dir` with comma-separated paths fails**
```bash
# WRONG — treated as a single path
sf project deploy start --source-dir path1,path2

# CORRECT — separate flags
sf project deploy start --source-dir path1 --source-dir path2
```

**Problem: Deploy succeeds but components not in org**
Deploy uses `rollbackOnError: true` by default. If ANY component in the batch fails, the ENTIRE batch rolls back — even components showing "Created" in the response. Always check `"success": true` at the top level. After fixing a failed component, redeploy ALL components.

**Problem: `--metadata LightningComponentBundle:Name` can't resolve components**
Use `--source-dir` pointing to the component directory instead:
```bash
sf project deploy start --source-dir force-app/main/default/lwc/myComponent --target-org <alias>
```

### CSS & Layout Issues

**Problem: Full-width header has a gap on the right**
`max-width: 100vw` includes scrollbar width, creating a gap. Remove `max-width: 100vw` and use only `width: calc(100% + Xpx)`.

**Problem: `* { margin: 0 }` kills `:host` negative margins**
The universal reset (`* { margin: 0 !important }`) overrides the host element's bleed margins in LWC shadow DOM. Scope the reset to a child container:
```css
/* WRONG — kills :host margin */
* { margin: 0 !important; }

/* CORRECT — only resets children */
.component-root * { box-sizing: border-box !important; }
.component-root { margin: 0 !important; padding: 0 !important; }
```

**Problem: Mobile view clips header elements on the right**
The full-width bleed pattern (negative margins) pushes content wider than the viewport on mobile. Add the mandatory mobile reset:
```css
@media (max-width: 768px) {
    :host {
        margin-left: 0 !important;
        margin-right: 0 !important;
        width: 100% !important;
    }
}
```

**Problem: Inner content not centered after fixing bleed**
After scoping the universal reset, ensure inner containers still have their padding and centering:
```css
.inner-container {
    max-width: 1280px !important;
    margin: 0 auto !important;
    padding: 0 42px !important;
}
```

### Embedded Messaging Issues

**Problem: "Messaging for In-App and Web" component greyed out in Experience Builder**
The Embedded Service Deployment hasn't been published yet. Go to Setup → Embedded Service Deployments → click the deployment → Publish.

**Problem: EmbeddedServiceConfig metadata deployed but deployment not usable / publish does nothing**
The backing `ESW_*` Force.com Site is only auto-created through the Setup UI wizard. Metadata deploy creates the config record but skips site provisioning. Symptoms: Publish button shows a toast saying "may take up to 10 minutes" but "Published On" timestamp never updates, nothing appears in Setup Audit Trail. **Fix:** Delete the metadata-deployed config, then recreate through Setup UI. Verify the backing site was created:
```bash
sf data query --json --query "SELECT Id, Name, Status FROM Site WHERE Name LIKE 'ESW_%'"
```
A new `ESW_*` record should appear after UI creation.

**Problem: "The site needs a valid host domain" when creating Embedded Service Deployment**
The org doesn't have a Salesforce Sites domain registered. Fix: Setup → Quick Find → Sites (under "Sites and Domains") → register a domain. This is a one-time setup per org.

**Problem: New Embedded Service Deployment not linked to messaging channel**
If you deleted a broken deployment and recreated it, you must select the messaging channel again during the creation wizard. The link is: **Deployment → Channel → Agent**. After creating the new deployment, verify the channel still has the correct agent: Setup → Messaging Settings → click channel → check Omni-Channel Routing section.

**Problem: Chat widget doesn't appear on published site**
Check in order:
1. Is the Embedded Service Deployment published? (Check "Published On" timestamp in Setup → Embedded Service Deployments — if blank, it's not published)
2. Does the deployment have a backing `ESW_*` Force.com Site? (If not, it was created via metadata and needs to be recreated via UI)
3. Is the "Embedded Messaging" component on the page? (Check in Experience Builder)
4. Is the Experience Cloud site published? (Not just saved — click Publish in Experience Builder)
5. Does the guest user have Messaging object permissions? (Most common silent blocker — widget just doesn't render with no error)
6. Is the messaging channel enabled and routing to an active agent?
7. Are you testing in an incognito browser? (Cached state from admin sessions can mask the widget)

**Problem: Agent doesn't appear in channel routing dropdown**
The agent hasn't been activated. Activate via Setup → Agents → select agent → Activate, or via CLI:
```bash
sf agent activate --json --api-name <Agent_API_Name>
```

**Problem: CSP violation errors in browser console for messaging**
If using the built-in Experience Builder component, CSP is handled automatically. If you see CSP errors, you may have added a conflicting script in head markup. Remove any manually added messaging scripts from head markup and rely solely on the built-in component.

**Problem: Head markup `<link>` tags for static resources don't load in LWR**
LWR ignores `<link>` tags in head markup for static resources. Use the `loadStyle` pattern instead — create an invisible LWC that imports `loadStyle` from `lightning/platformResourceLoader` and loads the static resource CSS.

### ECV2 CSS Repositioning Issues (Concept D Pattern)

**Problem: ECV2 iframe jitters when scrolling the page**
`position: fixed` elements positioned via `getBoundingClientRect()` use viewport-relative coordinates that change on every scroll pixel. The scroll handler can't update the iframe fast enough, creating 1-2 frame lag. **Fix:** Lock `document.body.style.overflow = 'hidden'` when chat opens. This prevents scrolling entirely, eliminating the jitter. Only a `resize` listener is needed.

**Problem: ECV2 iframe overflows into container padding**
`getBoundingClientRect()` returns the outer rect including padding. Use `getComputedStyle` to subtract padding and position the iframe within the content box:
```javascript
const cs = window.getComputedStyle(container);
const padTop = parseFloat(cs.paddingTop) || 0;
const innerTop = rect.top + padTop;
// ... same for left, width, height
```

**Problem: Can't hide ECV2 header/minimize/close buttons**
The ECV2 iframe is same-origin on `.my.site.com`. Access `iframe.contentDocument` and inject a `<style>` tag. Use a retry loop (10 attempts, 300ms apart) because the iframe DOM isn't ready when the chat first opens:
```javascript
_hideEcv2Chrome(ecv2, attempt) {
    const iframe = ecv2.querySelector('iframe');
    if (!iframe) { if (attempt < 10) setTimeout(...); return; }
    try {
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc || !iframeDoc.head) { if (attempt < 10) setTimeout(...); return; }
        // inject style targeting [class*="headerContainer"], header, [class*="closeButton"] etc.
    } catch (e) { if (attempt < 10) setTimeout(...); }
}
```
**This only works for same-origin iframes.** Cross-origin ECV2 deployments block `contentDocument` access.

**Problem: ECV2 FAB briefly appears before repositioning**
Set `ecv2.style.visibility = 'hidden'` before programmatically clicking the FAB. After repositioning completes, set `ecv2.style.visibility = 'visible'`. The 600ms delay between FAB click and repositioning gives the ECV2 iframe time to render.

**Problem: Can't remove `targetConfigs` from `js-meta.xml` after deploying**
`targetConfigs` cannot be removed from the metadata while org page instances reference the component. Delete the page instances in Experience Builder first, then remove the `targetConfigs` and redeploy.

### Split-Screen Animation Issues

**Problem: Messages area and login panel don't animate together**
Use CSS `flex-basis` transition on both elements inside a shared flex container. Set `transition: flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)` on both the messages area and the login panel. The browser's flex layout engine recalculates the split ratio every frame, creating coordinated movement.

### SVG Issues

**Problem: `LWC1052` / `LWC1535` parser errors on SVG elements**
The LWC HTML parser cannot handle `stroke-linecap` or `stroke-linejoin` attributes. Remove them and use only safe SVG attributes: `width`, `height`, `viewBox`, `fill`, `stroke`, `stroke-width`. Also check for nested `<a>` tags — these cause the same error.

### Custom Font Integration

If custom fonts required:

1. **Upload font files** to Static Resources
2. **Define @font-face** in CSS:

```css
@font-face {
    font-family: 'BrandFont';
    src: url('/resource/BrandFont') format('woff2');
    font-weight: normal;
    font-style: normal;
}

:root {
    --font-family-base: 'BrandFont', -apple-system, sans-serif;
}
```
