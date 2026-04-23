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
    * **Branding/Theme** (optional):
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

All components must include responsive breakpoints:

```css
/* Desktop: Default */
.component-container {
    max-width: var(--max-content-width, 1200px);
}

/* Tablet (≤1024px) */
@media (max-width: 1024px) {
    .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Mobile (≤768px) */
@media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; }
    .hero-title { font-size: var(--font-size-2xl, 1.5rem); }
}

/* Small Mobile (≤480px) */
@media (max-width: 480px) {
    .component-container { padding: var(--spacing-md, 1rem); }
}
```

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
