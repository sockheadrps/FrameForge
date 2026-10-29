# FrameForge foundation

## MVP acceptance criteria

The MVP is accepted when the ten-step end-to-end scenario in the product specification succeeds without direct ComfyUI integration or manual database edits. A creator can build a story hierarchy, import reusable references and two generated takes, attach the exact prompt revision and ordered source assets, approve one take, inspect the lineage on the canvas and storyboard, and recover the complete state after restart.

## Explicit exclusions

- ComfyUI API access or generation queues
- Nonlinear editing, compositing, and audio mixing
- Real-time collaboration
- User accounts, login, sessions, roles, and permissions
- AI writing or automatic continuity analysis
- Public media hosting

## Technical decisions

- **Runtime:** Node.js 22 LTS is the production baseline. The engine range also permits Node 24.
- **Package manager:** npm, with `package-lock.json` committed for repeatable installs.
- **Deployment:** SvelteKit's Node adapter on Ubuntu, limited to localhost, a trusted LAN, or a private VPN. An HTTPS reverse proxy is recommended for cross-device access. Phase 3 will choose and document systemd or containers.
- **Identity:** No authentication or user model. FrameForge is a personal tool for one trusted operator and must not be exposed directly to the public internet.
- **Persistent paths:** `/var/lib/frameforge` for state and media; `/etc/frameforge/frameforge.env` for deployment configuration. Source deployments remain disposable.
- **Quality gates:** TypeScript strict mode, Svelte diagnostics, ESLint, Prettier, Vitest unit tests, Playwright browser smoke tests, and a production build.

## Interface conventions

- A persistent explorer, central workspace, and contextual inspector form the desktop shell.
- On narrow screens, navigation moves above the workspace and the contextual inspector is hidden until a dedicated mobile treatment is built.
- Controls have accessible names, keyboard-visible focus states, sufficient contrast, and reduced-motion behavior.
- Empty, loading, and error states are first-class reusable UI patterns.
- The visual language is dark, cinematic, restrained, and content-first. Violet marks primary actions and selection; coral is reserved for attention and review states.

## Current milestone

Phases 0–2 are complete. FrameForge now has a runnable shell plus persistent Project, Episode, Scene, and Shot records backed by SQLite and versioned Drizzle migrations. Phase 3 is the private Ubuntu deployment baseline.
