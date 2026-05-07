# Experience Cloud Site Builder

A Claude Code skill and reproducible framework for building branded Salesforce Experience Cloud LWR sites with embedded Agentforce agents using ECV2 inline mode.

**Reference implementation:** Southwest Airlines Help Center  
**Stack:** Experience Cloud LWR · ECV2 Inline Mode · Agentforce Agent Script · LWC · Apex

---

## What This Is

A complete, battle-tested toolkit for going from zero to a deployed, branded Experience Cloud site with a live Agentforce agent embedded in a custom LWC wrapper. Built and validated during a production engagement — every workaround, timing constraint, and silent failure mode is documented.

## What's Included

| File / Folder | Purpose |
|---|---|
| `.claude/skills/experience-cloud-site-builder/SKILL.md` | **Primary skill** — 8-phase guided wizard used by Claude Code to scaffold, generate, and iterate the site |
| `BUILD_PROCESS.md` | **Reproducible framework** — 10-phase step-by-step process with all code patterns, CLI commands, and 26 lessons learned |
| `CLAUDE.md` | **Project instructions** — Context Claude Code reads automatically when working in this directory |
| `templates/lwc/` | **Reference LWC components** — Validated templates for header, footer, topics, ECV2 wrapper, pet wizard |
| `docs/architecture-guide.md` | **Architecture deep-dive** — For architects: data flow, LWS boundary, FSM reasoning, workarounds, sequence diagram |

## Key Architectural Decisions

- **ECV2 `displayMode: 'inline'`** — ECV2 renders inside the LWC's own container div, not as a floating widget. Head Markup loads the bootstrap script; the LWC calls `init()`.
- **FSM state machine** — All ECV2 lifecycle events go through a `STATE/EVT/TRANSITIONS` table. Invalid transitions are no-ops, preventing race conditions.
- **Script injection pattern** — LWS blocks shadow DOM access from LWC code. Same-origin ECV2 iframe allows `contentDocument` access; injected scripts run natively outside LWS.
- **postMessage bridge** — Bidirectional channel between LWC and iframe for utterance confirmation, topic detection, and menu actions.
- **Split panel pattern** — CSS flex transition opens a contextual LWC panel alongside the chat when the agent detects a topic.

## Quick Start

### Trigger Utterance

With this repository open in Claude Code, start with:

> **"Build me a branded Experience Cloud site with an embedded Agentforce agent"**

Or any of these equivalents:
- `"Create an Experience Cloud help center with ECV2 inline chat"`
- `"I want to build an LWR site with a custom Agentforce agent wrapper"`
- `"Scaffold an Experience Cloud site with an embedded agent using ECV2 inline mode"`

Claude Code will automatically invoke the `experience-cloud-site-builder` skill and begin the guided wizard.

### What to Have Ready Before You Start

The wizard will ask for these — gathering them first speeds up Phase 0:

| Input | Where to find it |
|-------|-----------------|
| Salesforce org alias | `sf org list` |
| Brand URL or brand colors (hex) | Your customer's website or brand guide |
| Logo file path | Local SVG or PNG |
| Agent API name (if existing) | Setup → Agentforce Agents |
| Site name and URL prefix | Decide in advance (e.g., "Help Center" / `helpcenter`) |

### What the Wizard Does

The skill runs an 8-phase guided wizard — no code is generated until you confirm the plan:

1. **Phase 0** — Brand extraction + mode selection + plan confirmation
2. **Phase 1** — Agent generation (persona, topics, Knowledge)
3. **Phase 2** — Messaging Channel + ESW Deployment setup (guided manual + automated)
4. **Phase 3** — Global CSS infrastructure
5. **Phase 4** — LWC component generation
6. **Phase 5** — Contextual panel generation (optional — e.g. a data collection wizard)
7. **Phase 6** — Design iteration loop (~90s per cycle)
8. **Phase 7/8** — Verification, testing, documentation

### Reproducing the Build Manually
Follow `BUILD_PROCESS.md` — it's a complete 10-phase runbook with every CLI command, manual step, and verification query.

## Three Integration Modes

| Mode | Description | Effort |
|------|-------------|--------|
| **A — Standard FAB** | Platform floating button, minimal custom UI | ~4 hrs |
| **B — Inline Embedded** ⭐ | ECV2 inside branded LWC wrapper, split panels, utterance injection | ~8 hrs |
| **C — Fullscreen Takeover** | CTA triggers full-viewport chat | ~6 hrs |

Mode B is the reference implementation and the most fully documented.

## Critical Rules (don't skip these)

1. **Head Markup: load script only, never call `init()`** — If Head Markup calls `init()`, the LWC's inline settings are ignored
2. **`refs.chatContainer` must always be in the DOM** — Use CSS `display:none/flex`, never `lwc:if` on the ECV2 container
3. **Send utterance on `BOT_MESSAGE`, not `CONV_OPENED`** — Agent hasn't joined at `CONV_OPENED`
4. **Never pre-warm the session** — Pre-warming fires `BOT_MESSAGE` early; utterance injection silently fails
5. **Always `--ignore-conflicts` when deploying** — Source tracking diverges after retrieves
6. **Head Markup changes require EB republish** — LWC JS/CSS changes do not

## Org Compatibility

### Minimum Requirements

Every org must have these features enabled before the skill can deploy:

| Requirement | How to verify |
|-------------|--------------|
| Experience Cloud (LWR) | `sf data query --query "SELECT Id FROM Network LIMIT 1"` — must return a record |
| Agentforce Service Agent license | `sf data query --query "SELECT Id FROM BotDefinition LIMIT 1"` — must not error |
| Messaging for In-App & Web | Setup → Messaging Settings — channel creation must be available |
| Embedded Service Deployments | Setup → Embedded Service Deployments — must be accessible |

### Recommended Org by Goal

| Goal | Best org type | Expected agent latency |
|------|--------------|----------------------|
| Build and iterate | SDO / demo org | 15–30s (shared infrastructure) |
| Customer demo | Developer sandbox from their org | 3–5s |
| Prove production viability | Full sandbox | 3–5s |
| Production deployment | Production org | 3–5s |
| Reproduce build from scratch | Any org with required licenses | Depends on org tier |

> **Note on SDO latency:** The slow agent join time on SDO orgs is an infrastructure issue — shared demo compute, not a code problem. The same LWC and agent deployed to a properly licensed sandbox will feel significantly faster. The skill's timing constants (`SEND_FALLBACK_MS`, `DEFAULT_TIMEOUT_MS`) are set generously for SDO use and can be reduced for production.

### What Won't Work

- **Scratch orgs** — No Experience Cloud site support, no Agentforce agent runtime
- **Developer Edition (free)** — Experience Cloud available but Agentforce license not included by default; requires a partner/ISV template with Agentforce add-on
- **Trailhead Playgrounds** — Not supported for ECV2 deployments

---

## For Architects

`docs/architecture-guide.md` covers the full technical rationale — the three core problems this architecture solves, the LWS security boundary, the FSM state machine, the script injection pattern, the postMessage bridge, a sequence diagram, and a decision summary table with "Decision → Why → Workaround Required."

---

## Reference Implementation

The Southwest Airlines Help Center demonstrates:
- Inline ECV2 with FSM state machine
- Pet travel wizard with split panel + 3-step data collection
- Agent Script with pet travel topic, Knowledge search, contextual responses
- Script injection pattern for chrome hiding and utterance injection
- postMessage bridge with session ID guards

See `BUILD_PROCESS.md` for the complete reproducible framework.
