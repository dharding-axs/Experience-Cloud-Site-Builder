# Experience Cloud Site Builder — Project Instructions

## What This Repository Is

A Claude Code skill and framework for building branded Salesforce Experience Cloud LWR sites with embedded Agentforce agents using ECV2 inline mode. Reference implementation: Southwest Airlines Help Center.

## How to Use This

**To build a new site:** Invoke the `experience-cloud-site-builder` skill. It runs an 8-phase guided wizard covering brand extraction, agent generation, ECV2 integration mode selection, LWC scaffolding, design iteration, and documentation.

**To understand the full build process:** Read `BUILD_PROCESS.md` — a complete 10-phase reproducible framework with all code patterns, CLI commands, and 26 lessons learned.

**For reference LWC templates:** See `templates/lwc/` — validated component templates from the SWA reference build.

## Skill Location

```
.claude/skills/experience-cloud-site-builder/SKILL.md
```

## Key Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Primary guided wizard — 8 phases, mode selection, code patterns, troubleshooting |
| `BUILD_PROCESS.md` | 10-phase reproducible framework — steps, commands, lessons learned |
| `README.md` | Repository overview and quick start |
| `templates/lwc/` | Reference LWC component templates |

## Three ECV2 Integration Modes

When invoked, the skill asks the user to choose:

- **A — Standard FAB:** Platform floating button, minimal custom UI (~4 hrs)
- **B — Inline Embedded:** ECV2 inside branded LWC wrapper, FSM, split panels (~8 hrs) ← recommended
- **C — Fullscreen Takeover:** CTA triggers full-viewport chat (~6 hrs)

## Non-Negotiable Rules

These prevent the most common silent failures. Enforce on every build:

1. **Head Markup loads script only — LWC calls `init()`** with `displayMode:'inline'` and `targetElement`
2. **`refs.chatContainer` always in DOM** — CSS `display:none/flex`, never `lwc:if`
3. **`BOT_MESSAGE` is the send trigger** — never `CONV_OPENED`, never pre-warm
4. **`--ignore-conflicts` on every deploy** — source tracking diverges after retrieves
5. **Head Markup changes → EB republish** — LWC changes do not
6. **Guest permissions: 3 layers** — perm set + both guest users + `areGuestUsersAllowed=true`
7. **ESW Deployment via Setup UI only** — metadata deploy doesn't provision backing site
8. **`without sharing` for guest-facing Apex** — guest users have no sharing rules

## Architecture Summary

```
LWR Site
├── Head Markup: stylesheet links + bootstrap.min.js (no init())
├── swaGlobalStyles (invisible LWC): loadStyle(overrides.css) → fixes ECV2 collapse
└── swaHelpCenterSearchD (main LWC wrapper)
    ├── Search layer (CSS hidden) — always in DOM
    ├── Chat layer (always in DOM)
    │   ├── Branded header (gradient bands)
    │   ├── ECV2 iframe container ← bootstrap.init() targetElement
    │   └── Wizard panel (split 55/45 flex)
    ├── FSM: PROMPT→PRIMED→LAUNCHING→SENDING→ACTIVE
    ├── Script injection: same-origin iframe, runs outside LWS
    └── postMessage bridge: swa-msg-sent, swa-topic-detected, swa-menu-items

Agentforce Agent (Atlas)
├── Topic Selector → topic handlers
├── pet_travel_topic → SwaPetPolicyController (@InvocableMethod)
└── SwaPetPolicyController (@AuraEnabled) ← called directly by LWC
```

## Utterance Injection Sequence (Critical)

```
launchChat()
  → onEmbeddedMessagingConversationOpened   ← WAIT (agent not joined)
  → onEmbeddedMessagingFirstBotMessageSent  ← SEND HERE
  → sendTextMessage(query)                  ← production orgs
  OR → script injection via textarea         ← SDO orgs fallback
```

## What Cannot Be Automated

1. Create Experience Cloud LWR site (Setup UI wizard)
2. Create Messaging Channel (Setup → Messaging Settings)
3. Create Embedded Service Deployment (Setup UI — provisions backing site)
4. Publish ESW Deployment
5. Publish Experience Builder site (required after Head Markup changes)
6. Add components to pages in Experience Builder

## Deploy Reference

```bash
# Standard deploy — always --ignore-conflicts
sf project deploy start --source-dir force-app/main/default/lwc/<name> --target-org <alias> --ignore-conflicts

# Agent Script
sf agent publish authoring-bundle --json --api-name <Name> --target-org <alias>
sf agent activate --api-name <Name> --target-org <alias>

# After changes, verify bootstrap in incognito console:
# console.log(typeof window.embeddedservice_bootstrap)  → 'object'
# console.log(window.embeddedservice_bootstrap?.settings?.displayMode)  → 'inline'
```
