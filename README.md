# FrameForge

FrameForge is a self-hosted production organizer for AI-generated animation and film. It keeps story structure, references, prompt revisions, generated takes, and approvals connected without coupling the workflow to a generation tool.

FrameForge is intentionally a private, single-user tool. It has no login, accounts, roles, or session system and should only be reachable through localhost, a trusted LAN, or a private VPN.

The authoritative product plan is [FrameForge_Design_and_Implementation_Plan.md](./FrameForge_Design_and_Implementation_Plan.md).

## Project workflow

FrameForge organizes production records and media; image and video generation remains in external tools such as ComfyUI.

1. **Create a project.** Add its title, logline, synopsis, genre, visual direction, and production status.
2. **Shape the story.** Build the canonical hierarchy of episodes, scenes, and ordered shots. Give each shot its action, dialogue, camera direction, target duration, continuity notes, and working status.
3. **Build the media library.** Upload media into FrameForge-managed storage or browse an approved linked folder such as `/mnt/data/comfy/output`. Add selected files to the project, categorize and tag them, and link useful references to shots.
4. **Write and revise prompts.** Create reusable named prompts. Editing creates a new immutable revision, so an older generation can always retain the exact text and generation notes that produced it.
5. **Generate externally.** Copy the desired prompt into ComfyUI or another generation tool, use the chosen reference media, and generate the image or video outside FrameForge.
6. **Document takes.** Import or link the generated output, attach it to its shot as a take, and record the exact prompt revision, ordered input references, model, seed, resolution, workflow, and review notes.
7. **Review candidates.** Compare takes and mark them as candidate, rejected, or approved. Each shot has at most one primary approved take, and replacing an approval preserves the complete history.
8. **Review the production visually.** Use the storyboard to inspect canonical shot order, approved thumbnails, missing outputs, statuses, and estimated scene runtime. Use Scene Review to play approved clips in sequence and add non-destructive review markers.
9. **Track relationships and continuity.** Use the canvas to connect assets, prompts, shots, takes, notes, and groups. Maintain versioned character, location, and prop references; historical takes continue pointing to the versions they actually used.
10. **Search or move the project.** Search across story records, prompts, assets, takes, and continuity entities. Export a portable project package when moving a production to another FrameForge installation; linked media that cannot be embedded is reported as a warning.

A typical shot therefore moves through this path:

```text
Plan shot → attach references → save prompt revision → generate externally
→ import output as a take → document lineage → compare → approve
→ review in storyboard and scene sequence
```

FrameForge treats the story hierarchy and project records as the source of truth. The storyboard, canvas, review player, and media library are different views of those same records rather than separate copies.

## Requirements

- Node.js 22 LTS (Node 24 is also supported for development)
- npm 10 or newer

## Development

```sh
npm install
cp .env.example .env
npm run dev
```

Open the URL printed by Vite. The development server defaults to `http://localhost:5173`.

## Quality checks

```sh
npm run check
npm run lint
npm run test:unit -- --run
npm run build
```

End-to-end tests additionally require a Playwright browser and run with `npm run test:e2e`.

## Database

Development data is stored in `.data/frameforge.db` by default. The server applies committed migrations automatically when it opens the database.

```sh
npm run db:generate  # generate a migration after a schema change
npm run db:migrate   # apply migrations without starting the app
npm run db:studio    # inspect local records
```

## Production

`npm run build` produces a Node server using `@sveltejs/adapter-node`. Start it with `node build`. Persistent data will live outside the source tree:

- Application data: `/var/lib/frameforge`
- SQLite database: `/var/lib/frameforge/frameforge.db`
- Managed media: `/var/lib/frameforge/media`
- Environment configuration: `/etc/frameforge/frameforge.env`

See [docs/FOUNDATION.md](./docs/FOUNDATION.md) for accepted conventions and MVP boundaries.

For the private Ubuntu service, HTTPS, firewall, backup, restore, and Windows access procedure, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).
