# Ultifilm

A web application for ultimate frisbee coaches and players to upload match footage, annotate key moments, and create visual play diagrams.

## AI-Assisted Development

The interface and persistence layer for this project were designed and implemented with the assistance of **Claude Code** (Anthropic's AI coding CLI). Specifically, Claude Code was used to:

- Propose and implement the full **clean architecture** structure (domain → infrastructure → services → hooks → UI)
- Design the **database schema** (PostgreSQL via Supabase) and write the SQL migration
- Implement the **repository pattern** with dual Supabase/mock backends so the app runs without credentials in demo mode
- Build all **React components** — the play canvas (HTML5 Canvas API), video player, annotation system, and multi-step play creation wizard
- Debug **Supabase Row Level Security** policy issues during integration
- Add the **tutorial info buttons** throughout the interface

> Claude Code is available at [claude.ai/code](https://claude.ai/code)

---

## Features

- **Upload match videos** — MP4 and other formats, stored in Supabase Storage
- **Annotate footage** — click Annotate at any moment to save a timestamped comment; yellow markers appear on the scrubber
- **Create plays** — click "+ New Play", name it, then click directly on players in the video frame to place offense and defense dots
- **Edit play diagrams** — drag dots around the field canvas, add/remove players, save back to the database
- **Tutorial mode** — blue `i` buttons throughout the app explain every interactive area

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript | Component model, type safety |
| Build tool | Vite | Instant dev server, native ESM — CRA is deprecated |
| Styling | Tailwind CSS | Utility-first, matches the design mockups |
| Database | Supabase (PostgreSQL) | Relational data with FK constraints; free tier |
| File storage | Supabase Storage (S3) | Videos are large binaries — never store in a DB |
| Routing | React Router v6 | Industry standard SPA routing |

## Architecture

```
src/
├── domain/
│   ├── entities/          # Game, Play, PlayerPosition, Annotation
│   └── repositories/      # Interface definitions (no framework deps)
├── infrastructure/
│   ├── supabase/          # Real Supabase implementations
│   ├── mock/              # In-memory implementations (demo mode)
│   └── ServiceProvider.ts # Picks mock vs real based on .env
├── services/              # Business logic (GameService, PlayService, AnnotationService)
├── hooks/                 # React state wrappers (useGames, usePlays, useAnnotations)
├── components/            # Navbar, VideoPlayer, PlayCanvas, InfoButton, NewPlayWizard…
└── pages/                 # HomePage, GamePage, PlayEditorPage
```

## Database Schema

```
games               → id, title, video_path, created_at
plays               → id, game_id, name, start_time, end_time, notes
player_positions    → id, play_id, team (offense|defense|disc), x, y, label
annotations         → id, game_id, timestamp, text, created_at
```

Videos are stored in a Supabase Storage bucket (`videos`). The `video_path` column in `games` holds the bucket path; the app calls `getPublicUrl()` at runtime to get the actual URL.

## Running Locally

```bash
npm install
npm run dev        # demo mode — no credentials needed, data lives in memory
```

To connect a real Supabase project:

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# Run supabase/migrations/001_initial.sql in the Supabase SQL editor
npm run dev
```
