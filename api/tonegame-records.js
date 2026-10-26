import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { LV1_QUESTION_BY_ID } from "../tonegame-data.js";

const COOKIE_NAME = "chaigo_player";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let database;
let schemaReady;

function respond(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(payload);
}

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!database) database = neon(connectionString);
  return database;
}

async function ensureSchema(sql) {
  if (process.env.TONEGAME_AUTO_MIGRATE === "false") return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS tonegame_players (
        player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identity_token_hash TEXT NOT NULL UNIQUE,
        nickname TEXT NOT NULL DEFAULT 'ゲスト',
        play_count INTEGER NOT NULL DEFAULT 0 CHECK (play_count >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS tonegame_sessions (
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
      )`;
      await sql`CREATE INDEX IF NOT EXISTS tonegame_sessions_player_started_idx
        ON tonegame_sessions (player_id, started_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS tonegame_answers (
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
      )`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function readCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        const value = separator < 0 ? "" : part.slice(separator + 1);
        let decodedValue = value;
        try {
          decodedValue = decodeURIComponent(value);
        } catch {
          decodedValue = "";
        }
        return separator < 0
          ? [part, ""]
          : [part.slice(0, separator), decodedValue];
      }),
  );
}

function setPlayerCookie(req, res, token) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "").split(",")[0];
  const secure = forwardedProtocol === "https" || process.env.NODE_ENV === "production";
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}

async function getOrCreatePlayer(req, res, sql) {
  const cookies = readCookies(req);
  let token = cookies[COOKIE_NAME];
  let issueCookie = !/^[a-f0-9]{64}$/i.test(token || "");
  if (issueCookie) token = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256").update(token).digest("hex");
  let rows = await sql`
    SELECT player_id, nickname, play_count
    FROM tonegame_players
    WHERE identity_token_hash = ${tokenHash}
    LIMIT 1`;

  if (rows.length === 0) {
    rows = await sql`
      INSERT INTO tonegame_players (identity_token_hash)
      VALUES (${tokenHash})
      ON CONFLICT (identity_token_hash)
      DO UPDATE SET identity_token_hash = EXCLUDED.identity_token_hash
      RETURNING player_id, nickname, play_count`;
  }

  if (issueCookie) setPlayerCookie(req, res, token);
  return rows[0];
}

function requestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function validOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const requestHost = req.headers["x-forwarded-host"] || req.headers.host;
  try {
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

function cleanNickname(value) {
  const nickname = Array.from(String(value || "").trim())
    .filter((character) => !/[\u0000-\u001f\u007f]/.test(character))
    .slice(0, 24)
    .join("");
  return nickname || "ゲスト";
}

function validSessionId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

async function createSession(sql, player, body) {
  const sessionId = body.session_id;
  const questionIds = body.question_ids;
  if (!validSessionId(sessionId)) {
    return { error: [400, "invalid_session_id", "場次識別碼無效。"] };
  }
  if (Number(body.level) !== 1) {
    return { error: [400, "level_unavailable", "目前只有 LV1 可以遊玩。"] };
  }
  if (
    !Array.isArray(questionIds) ||
    questionIds.length !== 3 ||
    new Set(questionIds).size !== 3 ||
    questionIds.some((questionId) => !LV1_QUESTION_BY_ID[questionId])
  ) {
    return { error: [400, "invalid_questions", "題目清單無效，請重新開始。"] };
  }

  const nickname = cleanNickname(body.nickname);
  const inserted = await sql`
    WITH new_session AS (
      INSERT INTO tonegame_sessions
        (session_id, player_id, nickname, level, question_ids)
      VALUES
        (${sessionId}::uuid, ${player.player_id}::uuid, ${nickname}, 1, ${JSON.stringify(questionIds)}::jsonb)
      ON CONFLICT (session_id) DO NOTHING
      RETURNING session_id
    ), counted_player AS (
      UPDATE tonegame_players
      SET play_count = play_count + 1,
          nickname = ${nickname},
          updated_at = NOW()
      WHERE player_id = ${player.player_id}::uuid
        AND EXISTS (SELECT 1 FROM new_session)
      RETURNING play_count
    ), counted_session AS (
      UPDATE tonegame_sessions AS session
      SET play_count = counted_player.play_count
      FROM counted_player
      WHERE session.session_id = ${sessionId}::uuid
      RETURNING session.session_id, session.player_id, session.level,
        session.question_ids, session.play_count, session.status
    )
    SELECT session_id, player_id, level, question_ids, play_count, status
    FROM counted_session`;

  let session = inserted[0];
  if (!session) {
    const existing = await sql`
      SELECT session_id, player_id, level, question_ids, play_count, status
      FROM tonegame_sessions
      WHERE session_id = ${sessionId}::uuid
      LIMIT 1`;
    session = existing[0];
  }

  if (!session || session.player_id !== player.player_id) {
    return { error: [409, "session_conflict", "場次建立衝突，請以相同場次識別碼重試。"] };
  }

  const savedQuestionIds = Array.isArray(session.question_ids)
    ? session.question_ids
    : JSON.parse(session.question_ids);
  if (Number(session.level) !== 1 || savedQuestionIds.join("|") !== questionIds.join("|")) {
    return { error: [409, "session_conflict", "這個場次識別碼已用於其他題目，請重新載入後再試。"] };
  }

  return {
    session: {
      session_id: session.session_id,
      question_ids: savedQuestionIds,
      play_count: Number(session.play_count),
      status: session.status,
    },
  };
}

async function saveAnswer(sql, player, body) {
  const { session_id: sessionId, question_id: questionId } = body;
  const order = Number(body.question_order);
  const selectedAnswer = Number(body.selected_answer);
  const responseTime = Number(body.response_time_ms);

  if (!validSessionId(sessionId)) {
    return { error: [400, "invalid_session_id", "場次識別碼無效。"] };
  }
  if (!Number.isInteger(order) || order < 1 || order > 3) {
    return { error: [400, "invalid_question_order", "題目順序無效。"] };
  }
  if (![1, 2, 3, 4].includes(selectedAnswer)) {
    return { error: [400, "invalid_answer", "答案必須是第一聲至第四聲。"] };
  }
  if (!Number.isFinite(responseTime) || responseTime < 0 || responseTime > 3600000) {
    return { error: [400, "invalid_response_time", "作答時間無效。"] };
  }

  const sessions = await sql`
    SELECT session_id, player_id, question_ids, status
    FROM tonegame_sessions
    WHERE session_id = ${sessionId}::uuid
      AND player_id = ${player.player_id}::uuid
    LIMIT 1`;
  const session = sessions[0];
  if (!session) return { error: [404, "session_not_found", "找不到這輪遊戲。"] };

  const questionIds = Array.isArray(session.question_ids)
    ? session.question_ids
    : JSON.parse(session.question_ids);
  if (questionIds[order - 1] !== questionId) {
    return { error: [400, "question_mismatch", "題目與場次不相符。"] };
  }
  const question = LV1_QUESTION_BY_ID[questionId];
  if (!question) return { error: [400, "invalid_question", "題目不存在。"] };

  let answers = await sql`
    SELECT question_id, question_order, audio_id, correct_answer,
      selected_answer, is_correct, response_time_ms, answered_at
    FROM tonegame_answers
    WHERE session_id = ${sessionId}::uuid AND question_order = ${order}
    LIMIT 1`;
  if (answers.length === 0 && session.status !== "started") {
    return { error: [409, "session_completed", "這輪遊戲已經完成。"] };
  }
  if (answers.length === 0) {
    answers = await sql`
      INSERT INTO tonegame_answers
        (session_id, question_id, question_order, audio_id, correct_answer,
         selected_answer, is_correct, response_time_ms)
      VALUES
        (${sessionId}::uuid, ${question.id}, ${order}, ${question.audioId},
         ${question.answer}, ${selectedAnswer}, ${selectedAnswer === question.answer}, ${Math.round(responseTime)})
      ON CONFLICT (session_id, question_order) DO NOTHING
      RETURNING question_id, question_order, audio_id, correct_answer,
        selected_answer, is_correct, response_time_ms, answered_at`;
  }
  if (answers.length === 0) {
    answers = await sql`
      SELECT question_id, question_order, audio_id, correct_answer,
        selected_answer, is_correct, response_time_ms, answered_at
      FROM tonegame_answers
      WHERE session_id = ${sessionId}::uuid AND question_order = ${order}
      LIMIT 1`;
  }
  if (!answers[0]) return { error: [503, "answer_save_failed", "答案紀錄沒有完成，請重試。"] };

  return { answer: answers[0], duplicate: answers[0].selected_answer !== selectedAnswer };
}

async function completeSession(sql, player, body) {
  const sessionId = body.session_id;
  if (!validSessionId(sessionId)) {
    return { error: [400, "invalid_session_id", "場次識別碼無效。"] };
  }

  const completed = await sql`
    WITH answer_totals AS (
      SELECT session_id,
        COUNT(*)::integer AS total_questions,
        COUNT(*) FILTER (WHERE is_correct)::integer AS correct_count
      FROM tonegame_answers
      WHERE session_id = ${sessionId}::uuid
      GROUP BY session_id
      HAVING COUNT(*) = 3
    )
    UPDATE tonegame_sessions AS session
    SET completed_at = NOW(),
        total_questions = answer_totals.total_questions,
        correct_count = answer_totals.correct_count,
        wrong_count = answer_totals.total_questions - answer_totals.correct_count,
        accuracy = ROUND(answer_totals.correct_count * 100.0 / answer_totals.total_questions, 0),
        score = answer_totals.correct_count,
        status = 'completed'
    FROM answer_totals
    WHERE session.session_id = answer_totals.session_id
      AND session.session_id = ${sessionId}::uuid
      AND session.player_id = ${player.player_id}::uuid
      AND session.status = 'started'
    RETURNING session.session_id, session.level, session.started_at,
      session.completed_at, session.total_questions, session.correct_count,
      session.wrong_count, session.accuracy, session.score, session.play_count,
      session.status`;

  let result = completed[0];
  if (!result) {
    const existing = await sql`
      SELECT session_id, level, started_at, completed_at, total_questions,
        correct_count, wrong_count, accuracy, score, play_count, status
      FROM tonegame_sessions
      WHERE session_id = ${sessionId}::uuid
        AND player_id = ${player.player_id}::uuid
      LIMIT 1`;
    result = existing[0];
  }
  if (!result) return { error: [404, "session_not_found", "找不到這輪遊戲。"] };
  if (result.status !== "completed") {
    return { error: [409, "session_incomplete", "請先完成全部三題，答案紀錄完成後再結算。"] };
  }

  return {
    summary: {
      session_id: result.session_id,
      level: Number(result.level),
      started_at: result.started_at,
      completed_at: result.completed_at,
      total_questions: Number(result.total_questions),
      correct_count: Number(result.correct_count),
      wrong_count: Number(result.wrong_count),
      accuracy: Number(result.accuracy),
      score: Number(result.score),
      play_count: Number(result.play_count),
    },
  };
}

async function getHistory(sql, player) {
  const [profileRows, levelRows, sessions] = await Promise.all([
    sql`SELECT nickname, play_count FROM tonegame_players WHERE player_id = ${player.player_id}::uuid LIMIT 1`,
    sql`SELECT level, COUNT(*)::integer AS play_count
        FROM tonegame_sessions
        WHERE player_id = ${player.player_id}::uuid
        GROUP BY level ORDER BY level`,
    sql`SELECT session.session_id, session.nickname, session.level,
          session.started_at, session.completed_at, session.total_questions,
          session.correct_count, session.wrong_count, session.accuracy,
          session.score, session.play_count, session.status,
          COALESCE(
            JSONB_AGG(JSONB_BUILD_OBJECT(
              'question_id', answer.question_id,
              'question_order', answer.question_order,
              'audio_id', answer.audio_id,
              'correct_answer', answer.correct_answer,
              'selected_answer', answer.selected_answer,
              'is_correct', answer.is_correct,
              'response_time_ms', answer.response_time_ms,
              'answered_at', answer.answered_at
            ) ORDER BY answer.question_order)
            FILTER (WHERE answer.question_order IS NOT NULL),
            '[]'::jsonb
          ) AS answers
        FROM tonegame_sessions AS session
        LEFT JOIN tonegame_answers AS answer USING (session_id)
        WHERE session.player_id = ${player.player_id}::uuid
        GROUP BY session.session_id
        ORDER BY session.started_at DESC`,
  ]);

  const profile = profileRows[0] || { nickname: "ゲスト", play_count: 0 };
  return {
    nickname: profile.nickname,
    play_count: Number(profile.play_count),
    level_play_counts: Object.fromEntries(
      levelRows.map((row) => [String(row.level), Number(row.play_count)]),
    ),
    sessions: sessions.map((session) => ({
      ...session,
      level: Number(session.level),
      total_questions: Number(session.total_questions),
      correct_count: Number(session.correct_count),
      wrong_count: Number(session.wrong_count),
      accuracy: Number(session.accuracy),
      score: Number(session.score),
      play_count: Number(session.play_count),
      answers: Array.isArray(session.answers) ? session.answers : [],
    })),
  };
}

export default async function handler(req, res) {
  if (!getDatabase()) {
    return respond(res, 503, {
      error: "database_not_configured",
      message: "學習紀錄資料庫尚未設定。請先設定伺服器環境變數 DATABASE_URL。",
    });
  }
  if (!validOrigin(req)) {
    return respond(res, 403, { error: "origin_not_allowed", message: "請從 ChaiGo! 網站送出請求。" });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return respond(res, 405, { error: "method_not_allowed", message: "不支援此請求方式。" });
  }

  const sql = getDatabase();
  try {
    await ensureSchema(sql);
    const player = await getOrCreatePlayer(req, res, sql);

    if (req.method === "GET") {
      return respond(res, 200, await getHistory(sql, player));
    }

    const body = requestBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respond(res, 400, { error: "invalid_request", message: "請求內容格式無效。" });
    }

    let result;
    if (body.action === "start") result = await createSession(sql, player, body);
    else if (body.action === "answer") result = await saveAnswer(sql, player, body);
    else if (body.action === "complete") result = await completeSession(sql, player, body);
    else return respond(res, 400, { error: "unknown_action", message: "不支援此操作。" });

    if (result.error) {
      const [status, error, message] = result.error;
      return respond(res, status, { error, message });
    }
    return respond(res, 200, result);
  } catch (error) {
    console.error("Tone game records API error:", error?.message || error);
    return respond(res, 503, {
      error: "records_unavailable",
      message: "學習紀錄暫時無法連線，請稍後再試。",
    });
  }
}
