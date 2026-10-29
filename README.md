# FrameForge

FrameForge is a self-hosted production organizer for AI-generated animation and film. It keeps story structure, references, prompt revisions, generated takes, and approvals connected without coupling the workflow to a generation tool.

FrameForge is intentionally a private, single-user tool. It has no login, accounts, roles, or session system and should only be reachable through localhost, a trusted LAN, or a private VPN.

The authoritative product plan is [FrameForge_Design_and_Implementation_Plan.md](./FrameForge_Design_and_Implementation_Plan.md).

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
