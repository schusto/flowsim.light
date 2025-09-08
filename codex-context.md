# FlowSim – Codex Context

## Project Overview
FlowSim is a **visual and configurable simulator** of workflows across an organization.  
It runs entirely in the **browser** (no backend), is hosted on **Netlify**, and must remain **lightweight and modular**.

## Tech Stack
- **Languages:** HTML, CSS, JavaScript (ES modules only)
- **Entry point:** `main.mjs`
- **Structure:**
  - `index.html`
  - `main.mjs`
  - `css/`
  - `js/`
- **Constraints:**
  - No build pipeline / no compiler
  - No backend / server
  - Lightweight, easy-to-maintain files

## Functionality
- **Canvas-based simulation** with animated *Workitems*.
- Each Workitem displays:
  - **Type:** Epic, Feature, Story, Bug
  - **Size**
  - **Complexity**
  - **State** (highlighted background)
  - **Age** (days since creation)
  - **Days in current state**
- Workitems move through workflow states with animations.

## Architecture Notes
- Inspired by serverless P2P k-means demo.
- Must support **optional peer-to-peer state synchronization**.
- Files should stay small, modular, and easy to edit.

## Development Workflow
- **Source of truth:** GitHub repo `schusto/flowsim.light`
- **Deployment:** Automatic via Netlify
- **Code updates:** Prefer **full file rewrites**
- If diffs are used, they must be **unified diffs** relative to repo root.
- Keep this file (`codex-context.md`) updated with key decisions.

## Lessons Learned
- GitHub Action attempts to apply comment-posted diffs were unreliable.
- Zips are unsuitable (they expire).
- Best workflow: manage context inside this file + direct GitHub edits or Cursor/VS Code integration.
- Codex should be used for **targeted tasks** (e.g., fix errors, implement features).
