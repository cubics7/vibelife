# GitHub Copilot instructions — Cannon Fodder: RL

Purpose: help AI coding agents become productive quickly in this repository.

Big picture
- Entry: `index.html` loads `js/main.js` as an ES module which constructs `Game`.
- `js/core/Game.js` is the central orchestrator: it creates `MenuManager`, `InputHandler`, entity arrays and game loop.
- Entities live in `js/entities/` (e.g. `Squad.js`, `Soldier.js`, `Enemy.js`) and typically extend `Entity.js`.
- Systems live in `js/systems/` (e.g. `WeaponSystem.js`, `SaveManager.js`) and provide shared constants and persistence.
- UI is DOM-based under `js/ui/MenuManager.js`; saves use `localStorage` via `SaveManager`.

Key patterns & conventions (project-specific)
- ES modules only: imports use relative paths (e.g. `import { Game } from './core/Game.js'`) and run in the browser via `type="module"`.
- No bundler: keep file paths stable and avoid Node-only APIs in browser-facing modules.
- Entities and systems are plain classes; state is held in `Game` (arrays: `enemies`, `bullets`, `weaponCrates`, `cages`).
- UI interactions are handled by `MenuManager` — prefer updating UI through that class rather than touching the DOM elsewhere.

Run / debug
- Run by serving the folder and opening `index.html` in a modern browser (modules require HTTP):

  - Python: `python -m http.server 8000`
  - Node: `npx http-server -c-1 .`
  - VS Code: use Live Server extension.

Development workflow notes
- Local commits: small, focused changes to `js/` and verify in browser. Example commit subject: "Add Enemy patrol behavior (Enemy.js)".
- Branches: use feature branches and open PRs back to `main`.
- If adding new files, update imports with correct relative paths; IDEs may auto-fix but verify runtime in browser.

Files to inspect for examples
- `js/main.js` (app entry)
- `js/core/Game.js` (game loop, spawn/update/draw logic)
- `js/entities/Soldier.js`, `Enemy.js`, `Squad.js` (entity lifecycle patterns)
- `js/systems/WeaponSystem.js` (shared constants like `WEAPON_TYPES`)
- `js/systems/SaveManager.js` (save/load, `localStorage` integration)
- `js/ui/MenuManager.js` (DOM hooks and button callbacks)

When you modify behavior
- Run the server and test the UI flows: Start game, Spawn enemies, Save/Load game, Pause/Resume.
- Prefer observing runtime state via `console.log` in `Game.draw()` (there are already debug info lines) and browser devtools.

What not to assume
- There is no automated build/test infra in the repo — do not attempt to run `npm` build steps unless one is added.
- The project targets in-browser execution; Node-only modules or `require()` will not run in the browser.

If you need help
- Suggest concrete edits: give files and short code snippets to change. Reference functions/classes (e.g. `Game.spawnEnemy`, `Enemy.update`).

— End of instructions
