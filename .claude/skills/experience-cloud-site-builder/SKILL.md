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
    * Site name and type (LWR vs Aura)
    * Pages needed (e.g., Home, Resource Library, Case Submission)
    * Key objects/data to surface (e.g., Cases, Knowledge, Opportunities)
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
    * `<component>.js` — controller with wire adapters
    * `<component>.css` — scoped styles using design tokens
    * `<component>.js-meta.xml` — targets `lightningCommunity__Page`
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
