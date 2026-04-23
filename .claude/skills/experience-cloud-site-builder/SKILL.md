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

* Run: `sf project generate --name <site-name>`
* Generate folder structure:
    * `force-app/main/default/lwc/` — one folder per component
    * `force-app/main/default/digitalExperiences/` — site config
    * `force-app/main/default/navigationMenus/`
    * `force-app/main/default/customMetadata/`
* For each LWC component generate:
    * `<component>.html` — template with slots and data bindings
    * `<component>.js` — controller with wire adapters
    * `<component>.css` — scoped styles using design tokens
    * `<component>.js-meta.xml` — targets `lightningCommunity__Page`
* Generate `package.xml` scoped to Experience Cloud metadata types

## Phase 4: Deploy & Verify

* Run: `sf project deploy start --manifest package.xml --target-org <alias>`
* If errors occur:
    * Parse the error output
    * Suggest fixes and ask permission to apply them
    * Re-run deploy after fixes
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
* Suggested next steps

## Key Principles

* Always confirm the build plan before generating code
* Never deploy without explicit user confirmation
* Use LWR by default unless the user specifies Aura
* Use `@wire` adapters and `lightning-record-*` base components wherever possible
* Follow Salesforce DX project structure strictly
* If the org alias is unknown, run `sf org list` first
