-- ============================================================
-- Ultifilm — Initial Schema
-- Run this in your Supabase SQL editor or via the CLI.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- games
-- One row per match recording. The actual video file lives in
-- the "videos" Storage bucket; video_path stores the bucket
-- path so we can retrieve a signed/public URL at runtime.
-- ------------------------------------------------------------
CREATE TABLE games (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL,
  video_path  TEXT,                     -- e.g. "games/<id>/match.mp4"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- plays
-- A timestamped segment within a game that the coach wants
-- to highlight. start_time / end_time are seconds from the
-- beginning of the video.
-- ------------------------------------------------------------
CREATE TABLE plays (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id     UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  start_time  NUMERIC     NOT NULL DEFAULT 0,
  end_time    NUMERIC,
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- player_positions
-- Each row is one dot on the play canvas. x / y are 0–100
-- percentages of the canvas dimensions so the diagram scales
-- to any screen size. "team" constrains the dot colour.
-- ------------------------------------------------------------
CREATE TABLE player_positions (
  id       UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  play_id  UUID    NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  team     TEXT    NOT NULL CHECK (team IN ('offense', 'defense', 'disc')),
  x        NUMERIC NOT NULL,   -- 0–100 (% of canvas width)
  y        NUMERIC NOT NULL,   -- 0–100 (% of canvas height)
  label    TEXT    NOT NULL DEFAULT ''
);

-- Keep games.updated_at current automatically.
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- ------------------------------------------------------------
-- Storage bucket
-- Run these two lines in the Supabase SQL editor to create the
-- bucket that holds uploaded match videos.
-- ------------------------------------------------------------
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
-- CREATE POLICY "Public video access" ON storage.objects FOR SELECT USING (bucket_id = 'videos');

-- ------------------------------------------------------------
-- annotations  (added in refactor)
-- A timestamped text comment on a game video.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS annotations (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id     UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  timestamp   NUMERIC     NOT NULL DEFAULT 0,   -- seconds from video start
  text        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
