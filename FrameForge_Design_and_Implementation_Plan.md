# FrameForge — Design Document and Chronological Implementation Plan

**Status:** Initial design specification  
**Deployment:** Self-hosted web application on Ubuntu  
**Stack:** SvelteKit, TypeScript, SQLite, Drizzle ORM, Svelte Flow  
**External tools:** ComfyUI remains independent; FrameForge never needs to call its API.

## 1. Vision

FrameForge is a production organizer for AI-generated animation and film. It connects story structure to the creative materials used to produce it: scripts, character sheets, location references, prompts, source frames, generated images, video takes, and approved clips.

The application provides three views of the same underlying project: a **story hierarchy** for episodes and shots, a **visual canvas** for linking references and outputs, and a **storyboard/review workspace** for examining and ordering finished takes. All three views share one data model, rather than maintaining separate copies of the same information.

**Core promise:** From any shot, the creator can find the exact prompt revision, source images, character references, generated takes, and selected approved result.

## 2. Scope and boundaries

### In scope

- Organize multiple productions into projects, episodes, scenes, and shots.
- Maintain reusable character, location, prop, and style references.
- Upload images and videos produced in external applications.
- Optionally link media already stored in administrator-approved directories on the Ubuntu server.
- Write, copy, revise, and reuse generation prompts.
- Document which prompt revisions and source assets produced each take.
- Compare takes and approve the preferred version.
- Visually connect shots, prompts, references, and outputs on an infinite canvas.
- Review scenes as ordered storyboards and simple playback sequences.
- Search and filter assets, shots, and prompts.
- Persist projects across application restarts and support backups.

### Not in scope for the first release

- ComfyUI API integration, generation queues, or automatic image/video generation.
- Full nonlinear video editing, compositing, or audio mixing.
- Real-time multi-user collaboration.
- User accounts, login, sessions, roles, or permissions. FrameForge is a personal tool for one trusted operator.
- AI-driven screenplay writing or automated continuity analysis.
- Public media hosting or social networking.

## 3. Application architecture

### 3.1 SvelteKit application

Use SvelteKit with TypeScript for both the browser interface and server-side endpoints/actions. Deploy the Node adapter on Ubuntu. A separate FastAPI backend is unnecessary for the initial version.

The browser interface should have a persistent project explorer on the left, a main workspace in the center, and a contextual inspector on the right. The main workspace switches between Story, Canvas, Storyboard, and Review modes.

Use a service layer between route handlers and persistence. Route handlers validate requests; domain services enforce project, approval, and ordering rules; repositories access SQLite and the media store. Validate incoming data with Zod or equivalent. Do not add account, role, permission, or session abstractions unless the product requirements explicitly change.

### 3.2 Database

Use SQLite with Drizzle ORM and versioned migrations. Enable foreign-key constraints and consider WAL mode for the single-server workload. Store stable opaque identifiers, creation/update timestamps, and explicit ordering fields.

| Entity              | Purpose                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| Project             | Production metadata, synopsis, style guide, settings                        |
| Episode             | Ordered collection of scenes                                                |
| Scene               | Ordered collection of shots, location and narrative notes                   |
| Shot                | Camera/action description, target duration, status, references              |
| Character           | Identity, personality, arc, reference versions                              |
| Location / Prop     | Reusable setting and object definitions                                     |
| Asset               | Image/video identity, path, type, dimensions, duration, tags                |
| Prompt              | Reusable prompt identity                                                    |
| PromptRevision      | Immutable text and optional generation notes                                |
| Take                | Imported result, shot, exact prompt revision, review state                  |
| TakeInput           | Ordered source assets with roles such as start frame or character reference |
| Canvas              | Project-wide or scene-specific graph                                        |
| CanvasNode          | Visual placement of an existing record or a freeform note                   |
| CanvasEdge          | Typed connection between canvas nodes                                       |
| Tag / TagAssignment | Search and organization                                                     |

Use join tables for many-to-many associations. A shot may have many takes, but at most one designated primary approved take. Enforce that invariant transactionally. Do not delete old takes when approval changes.

### 3.3 Media storage

Keep the database and uploaded media in persistent Ubuntu directories outside the deployed source tree. Managed uploads are the default: FrameForge copies an imported file into its own storage, uses generated filenames, and preserves the original name as metadata.

Support PNG, JPEG, WebP, MP4, and WebM initially. Validate file signatures, types, sizes, and paths. Extract image dimensions, video duration, and poster frames; FFmpeg/ffprobe may be installed as server utilities. Generate thumbnails asynchronously for larger files.

Support **linked media** for files already accessible to the Ubuntu server, beginning with the administrator-approved ComfyUI output root `/mnt/data/comfy/output`. Preserve its subfolder hierarchy and provide read-only folder navigation. Restrict links to explicitly configured directories, resolve canonical paths, block traversal and symlink escapes, and indicate missing or modified files. A Windows-hosted Node process cannot automatically read a Linux `/mnt/...` path; browser uploads or an explicitly configured Windows-accessible equivalent remain the cross-device fallback.

Use content hashes for duplicate detection. Never expose arbitrary filesystem paths through media-serving routes. Deleting a record must not remove a file still referenced elsewhere.

### 3.4 Deployment and security

Run the SvelteKit Node server under systemd or a container. FrameForge has no application login and must remain a private personal tool, reachable only from localhost, a trusted LAN, or a private VPN. Do not expose it directly to the public internet. An HTTPS reverse proxy is recommended when traffic crosses devices. Keep request validation, upload limits, safe media-serving routes, and restrictive host firewall rules.

Configure the database path, media root, linked-directory allowlist, application origin, bind address, and upload limits using environment variables. No session secret or identity configuration is needed. Back up the SQLite database and media together; document and test a restore procedure.

## 4. Feature specification

### 4.1 Project and story explorer

A project stores its title, logline, synopsis, cover art, genre, visual style, and production status. Episodes contain ordered scenes; scenes contain ordered shots. Standalone films may use a default episode internally so the data model remains consistent.

A shot stores a title, action description, camera framing/movement, estimated duration, dialogue, continuity notes, linked characters/locations/props, and production status. Users can reorder episodes, scenes, and shots without breaking their stable references.

Provide breadcrumbs, direct links to individual shots, drag-and-drop ordering, and an inspector for editing without leaving the current workspace.

### 4.2 Reusable asset library

Provide a grid/list view with image thumbnails, video posters, previews, search, tags, media type, and metadata. Assets can be labeled as character references, location references, props, style references, first/last frames, source images, output images, or output videos.

The same asset may be used in multiple shots. Importing an asset should not require duplicating it for each use.

### 4.3 Prompt editor and versioning

Prompts are named reusable records with immutable revisions. Support writing, editing, duplicating, comparing, and copying prompt text. Each revision can include an optional negative prompt, model/workflow label, purpose, and notes.

A take must reference a specific revision, not merely the latest editable prompt. Users can attach prompt details retrospectively when a clip was already generated in ComfyUI.

### 4.4 Takes and generation lineage

Each take records the imported output asset, associated shot, exact prompt revision, ordered input assets, and optional metadata such as model, workflow label, seed, resolution, frame rate, and duration.

Take statuses are candidate, approved, and rejected. A user can compare takes and choose one primary approved take per shot. Preserve rejected takes and prior approvals for historical context.

Source-image ordering matters: the UI must distinguish Image 1 (starting frame), Image 2 (character reference), and other explicitly named roles. Never present user-entered lineage as automatically verified provenance.

### 4.5 Infinite visual canvas

Use Svelte Flow for pan, zoom, drag, selection, connections, and grouping. Initial node types: Asset, Prompt, Shot, Take, Note, and Group. Edges have meanings such as references, used as input, generated from, belongs to shot, continues from, and inspired by.

Nodes representing existing assets or shots must reference the canonical database record. Moving or deleting a canvas node does not alter or delete the underlying asset. Store canvas positions, connections, groups, and viewport per canvas. Support both project-level and scene-specific canvases.

### 4.6 Storyboard and review

Display ordered shot cards with approved thumbnails, descriptions, durations, and statuses. Clicking a card opens the shot and its takes. The review workspace plays imported MP4/WebM files, compares candidate takes, and records approval notes.

Provide a simple scene preview that plays approved clips consecutively. This is for reviewing narrative flow, not replacing a full video editor. A more sophisticated timeline and FFmpeg exports can follow later.

### 4.7 Character and continuity records

Characters, locations, and props have descriptions and versioned reference sets. Existing shots keep their original reference versions when a canonical design changes. Optionally warn that a newer reference exists without silently replacing old inputs.

For character arcs, record motivations, relationships, turning points, and episode-by-episode changes. For the initial anime, this can track the masked man's evolution from decent worker to reluctant fugitive to increasingly ruthless vigilante, alongside Beemo's development.

### 4.8 Search and portability

Search project titles, shot descriptions, prompt text, tags, and asset names. Filter by episode, character, approval state, and missing references.

Plan a later export format containing a manifest and managed media, preserving stable IDs, revisions, and relationships. Mark external linked files explicitly and validate imports before restoring data.

## 5. Chronological implementation checklist

Each phase ends with a working, testable milestone. Complete the phases in order rather than building all UI views before persistence works.

### Phase 0 — Product and repository foundation

- [x] Create the repository and save this document as the project specification.
- [x] Define MVP acceptance criteria and record excluded features.
- [x] Choose supported Node.js version and package manager.
- [x] Decide the Ubuntu installation and persistent data directories.
- [x] Configure formatting, linting, TypeScript strictness, and test tooling.
- [x] Define a basic design system, responsive layout, and accessibility conventions.

**Done when:** The repository and development conventions are established.

### Phase 1 — SvelteKit shell

- [x] Scaffold SvelteKit with TypeScript and Node adapter.
- [x] Create application shell with header, sidebar, workspace, and inspector.
- [x] Add dashboard, project, settings, and error routes.
- [x] Create reusable loading, empty, and error states.
- [x] Add environment-based configuration and initial smoke tests.

**Done when:** The app starts on Ubuntu and the browser navigation works.

### Phase 2 — Database and story hierarchy

- [x] Add SQLite, Drizzle ORM, and migrations.
- [x] Create Project, Episode, Scene, and Shot schemas and services.
- [x] Build CRUD forms and detail pages for all four entities.
- [x] Implement transactional ordering and drag-and-drop rearrangement.
- [x] Add descriptions, statuses, notes, and target durations.
- [x] Test persistence, restart recovery, and referential integrity.

**Done when:** A complete episode can be organized and reopened after a restart.

### Phase 3 — Private deployment baseline

> Ubuntu runtime verification is intentionally deferred until feature development is complete. Development continues on Windows with environment-specific media roots and filesystem tests.

- [x] Set up production Node startup with systemd or containerization.
- [x] Bind FrameForge to localhost or the trusted LAN/VPN interface.
- [x] Configure an HTTPS reverse proxy when accessing it across devices.
- [x] Restrict inbound access with host firewall and network rules.
- [ ] Document database/media backups and test a restore.
- [ ] Verify access from the Windows browser to the Ubuntu host.

**Done when:** A private production instance starts automatically, is reachable over the intended trusted network, and is not exposed to the public internet.

### Phase 4 — Media library

- [x] Add secure, read-only navigation for the configured `/mnt/data/comfy/output` root and its subfolders.
- [x] Create Asset schema and managed filesystem storage service.
- [x] Implement image/video upload with validation and limits.
- [x] Extract metadata and generate thumbnails/poster frames.
- [x] Build media grid, preview, detail inspector, and tags.
- [x] Link assets to shots and other project records.
- [x] Handle duplicate uploads and missing files.
- [x] Import or link selected ComfyUI files into canonical Asset records without duplicating source media.

**Done when:** ComfyUI-generated images and videos can be imported, previewed, and reused.

### Phase 5 — Prompt management

- [x] Create Prompt and immutable PromptRevision schemas.
- [x] Build prompt editor, duplicate, rename, and copy actions.
- [x] Implement revision history and comparison.
- [x] Attach prompt revisions to shots.
- [x] Add optional model/workflow notes without ComfyUI API coupling.
- [x] Test revision integrity after edits.

**Done when:** A shot can point to an exact historical prompt revision.

### Phase 6 — Takes, approval, and provenance

- [x] Create Take and TakeInput schemas.
- [x] Build a workflow to attach imported media as a shot take.
- [x] Record exact prompt revision and ordered input references.
- [x] Add optional model, seed, resolution, and workflow metadata.
- [x] Implement candidate/approved/rejected states and review notes.
- [x] Enforce one primary approved take per shot.
- [x] Build take comparison and lineage detail panels.

**Done when:** A user can identify every documented input to a generated clip and approve a preferred result.

### Phase 7 — Storyboard

- [x] Build reorderable shot cards with thumbnails and durations.
- [x] Show approved media or clear placeholders when missing.
- [x] Add shot-status and missing-asset filters.
- [x] Open the shared shot inspector from storyboard cards.
- [x] Calculate scene runtime from target or approved clip durations.
- [x] Verify storyboard ordering uses canonical shot order.

**Done when:** An episode can be reviewed visually without opening each file separately.

### Phase 8 — Infinite canvas

- [x] Integrate Svelte Flow.
- [x] Implement Asset, Prompt, Shot, Take, Note, and Group nodes.
- [x] Add typed edges and connection validation.
- [x] Persist node positions, connections, groups, and viewport.
- [x] Allow dragging existing assets and shots onto the canvas.
- [x] Open the shared inspector when selecting a node.
- [x] Add project-level and scene-specific canvases.
- [x] Ensure deleting a visual node never deletes the canonical record.

**Done when:** Source images, prompts, shots, and outputs can be connected visually and reopened intact.

### Phase 9 — Character and world continuity

- [x] Create Character, Location, and Prop entities.
- [x] Add versioned reference images and canonical selections.
- [x] Link these entities to scenes, shots, and take inputs.
- [x] Show which reference version each take used.
- [x] Add non-destructive newer-reference indicators.
- [x] Add character-arc notes and turning points.

**Done when:** Recurring designs and narrative changes are traceable across episodes.

### Phase 10 — Review sequence

- [x] Create ordered scene playback using approved takes.
- [x] Add individual clip playback, scrubbing, and next/previous navigation.
- [x] Display target versus actual durations.
- [x] Add non-destructive in/out review markers if needed.
- [x] Consider optional FFmpeg sequence export after playback is stable. (Deferred: mixed source codecs and dimensions need an explicit transcode policy.)

**Done when:** A creator can review a complete scene in story order.

### Phase 11 — Search, portability, and release hardening

- [x] Implement project-wide search and filtering.
- [x] Create validated project export/import with assets and manifest.
- [x] Add collision handling and missing-linked-media warnings.
- [x] Improve performance for large media libraries and canvases.
- [x] Complete keyboard navigation and accessibility review.
- [x] Add logs, diagnostics, deployment docs, and migration instructions.
- [x] Rehearse backup, restore, and upgrade paths locally; repeat the supplied deployment rehearsal on the Ubuntu host before production use.

**Done when:** The application is reliable enough for a long-running production.

## 6. First end-to-end acceptance test

Use an actual anime production task as the milestone scenario:

1. Create **Ghosts of the Machine**, Episode 01, a scene, and a motorcycle drive-by shot.
2. Import the masked man, Beemo, and single antagonist reference images plus a motorcycle starting frame.
3. Save a prompt revision specifying that Beemo fires sideways from the moving motorcycle while the masked rider keeps both hands on the handlebars.
4. Generate the video separately in ComfyUI.
5. Import the MP4 as Take 01, attaching the exact prompt revision and ordered references.
6. Import a second generation as Take 02.
7. Reject Take 01 and approve Take 02 without losing either result.
8. Verify the storyboard displays Take 02.
9. Verify the canvas shows the relationships among references, prompt, shot, and both takes.
10. Restart FrameForge and confirm all media, relationships, and approvals persist.

**MVP success:** The entire workflow works without direct ComfyUI integration or manual database edits.

## 7. Engineering principles and implementation-agent instructions

- Maintain one source of truth for project entities; the canvas and storyboard are alternative views.
- Preserve original media, immutable prompt revisions, and take history.
- Distinguish confirmed lineage records from informal planning links.
- Keep generation tools external and optional.
- Avoid hardcoded absolute paths in portable project data.
- Validate every upload and media request on the server, constrain filesystem access, and never serve arbitrary paths.
- Keep FrameForge account-free and single-user unless the product requirements explicitly change.
  **- Build incrementally and keep the application runnable after each phase.
- Do not introduce microservices, embedded AI, or collaboration infrastructure without a demonstrated need.

**Instructions for VS Code Codex:** Treat this document as the authoritative implementation plan. Inspect the repository before each phase, implement the next incomplete checklist items, and avoid skipping dependencies. For each completed phase, report the changed files, migrations, tests executed, how to run the result, known limitations, and the next task. Make the simplest maintainable decision when details are unspecified and document that decision. Do not add ComfyUI API integration unless the product requirements explicitly change.
**
