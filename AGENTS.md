# Agent Operating Guide

This project uses a local-first multi-agent workflow. The coordinator in the main session owns scope, integration, and final verification. Specialist agents may investigate or implement one bounded area at a time, but the coordinator must prevent file conflicts and must run the final quality gate.

## Source Of Truth

- Work only in the repository root (the `awareness/` folder containing this file).
- Do not edit `node_modules` unless the task requires dependency changes.
- The app is a static vanilla JavaScript project. There is no build step for production runtime.
- Browser modules attach to `window.App`; HTML script order is part of the runtime contract.
- Keep [docs/foundation_ux_contract.md](docs/foundation_ux_contract.md) authoritative for page navigation, flow steps, guards, and shared state cards.

## Multi-Agent Roles

- Coordinator: decomposes work, assigns one bounded task at a time, integrates results, and runs verification.
- Docs agent: maintains `AGENTS.md`, `docs/CONTEXT.md`, `MEMORY.md`, and `docs/TESTING.md`.
- Harness agent: owns local scripts, Playwright configuration, lint configuration, and fixture structure.
- E2E agent: owns deterministic browser tests for critical user flows.
- Unit agent: owns focused module tests and testability seams.
- Bug-fix agents: fix one reproduced issue at a time, with a failing test first.
- Review agent: checks specification fit, code quality, verification evidence, and residual risk.

Do not let two agents edit the same file at the same time. Each agent handoff must include files touched, tests run, failures remaining, and risks.

## Local Quality Gate

Use these commands as the default local pipeline:

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run audit:baseline
npm run verify
```

The deterministic tests must not depend on live RSS proxies or public AI APIs. Live-network checks belong in the baseline audit or manual QA notes and may be marked blocked when upstream services fail.

## Test-First Rules

- Add or update tests before production behavior changes.
- Watch the new test fail for the expected reason.
- Make the smallest scoped fix.
- Rerun the targeted test, then the relevant quality gate.
- Do not hide external-service failures behind false passes; classify them as blocked or handled fallback behavior.

## Safety Rules

- Never commit or paste browser storage dumps containing API keys, SMTP settings, or delivery data.
- Do not log stored secrets from `localStorage`, IndexedDB, or test fixtures.
- Keep generated reports out of source unless the task explicitly updates audit evidence.
- Preserve the static app model unless the user approves a larger architecture change.

