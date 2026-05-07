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

## Key Architectural Decisions

- **ECV2 `displayMode: 'inline'`** — ECV2 renders inside the LWC's own container div, not as a floating widget. Head Markup loads the bootstrap script; the LWC calls `init()`.
- **FSM state machine** — All ECV2 lifecycle events go through a `STATE/EVT/TRANSITIONS` table. Invalid transitions are no-ops, preventing race conditions.
- **Script injection pattern** — LWS blocks shadow DOM access from LWC code. Same-origin ECV2 iframe allows `contentDocument` access; injected scripts run natively outside LWS.
- **postMessage bridge** — Bidirectional channel between LWC and iframe for utterance confirmation, topic detection, and menu actions.
- **Split panel pattern** — CSS flex transition opens a contextual LWC panel alongside the chat when the agent detects a topic.

## Quick Start

### Using the Skill
```bash
# In any Salesforce project directory, Claude Code will invoke automatically when you ask to:
# "Build an Experience Cloud site with an embedded Agentforce agent"
# "Generate LWC components for a digital experience"
# "Create a branded help center with ECV2 inline mode"
```

The skill runs an 8-phase guided wizard:
1. Brand extraction (URL / screenshot / manual)
2. Agent integration mode selection (FAB / Inline / Fullscreen)
3. Agent generation (persona, topics, Knowledge)
4. Messaging Channel + ESW Deployment setup
5. Global CSS infrastructure
6. LWC component generation
7. Contextual panel generation (optional)
8. Design iteration loop → verification → documentation

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

## Reference Implementation

The Southwest Airlines Help Center (`/Users/dharding/Southwest-AMA-Agent-v2/`) demonstrates:
- Inline ECV2 with FSM state machine
- Pet travel wizard with split panel + 3-step data collection
- Agent Script with pet travel topic, Knowledge search, contextual responses
- Script injection pattern for chrome hiding and utterance injection
- postMessage bridge with session ID guards

See `BUILD_PROCESS.md` for the complete reproducible framework.
