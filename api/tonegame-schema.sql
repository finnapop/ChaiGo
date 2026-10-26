-- Anonymous browser player identity. Only the hash of the HttpOnly cookie token
-- is stored; the token itself is never returned by the API.
CREATE TABLE IF NOT EXISTS tonegame_players (
  player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_token_hash TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL DEFAULT 'ゲスト',
  play_count INTEGER NOT NULL DEFAULT 0 CHECK (play_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tonegame_sessions (
  session_id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES tonegame_players(player_id),
  nickname TEXT NOT NULL,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
  question_ids JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_questions INTEGER NOT NULL DEFAULT 3,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed'))
);

CREATE INDEX IF NOT EXISTS tonegame_sessions_player_started_idx
  ON tonegame_sessions (player_id, started_at DESC);

CREATE TABLE IF NOT EXISTS tonegame_answers (
  session_id UUID NOT NULL REFERENCES tonegame_sessions(session_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_order SMALLINT NOT NULL CHECK (question_order BETWEEN 1 AND 3),
  audio_id TEXT NOT NULL,
  correct_answer SMALLINT NOT NULL CHECK (correct_answer BETWEEN 1 AND 4),
  selected_answer SMALLINT NOT NULL CHECK (selected_answer BETWEEN 1 AND 4),
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, question_order),
  UNIQUE (session_id, question_id)
);
