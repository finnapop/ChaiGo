// Mock learning service for the PC tone game MVP.
// This adapter deliberately mirrors the future API service interface, but stores
// test data in this browser only. It never contacts a server or database.
// The global adapter keeps the PC page usable from both file:// and HTTP origins.
(() => {

const MOCK_MODE = true;
const MOCK_PLAYER = Object.freeze({
  player_id: "chaigo-test-user-001",
  nickname: "ChaiGo User",
});

const STORAGE_KEY = "chaigo-tonegame-mock-learning-v1";

function createEmptyStore() {
  return {
    mock_mode: true,
    player: { ...MOCK_PLAYER, play_count: 0 },
    sessions: [],
  };
}

function readStore() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error("このブラウザーでは Mock Mode の保存領域を利用できません。");
  }
  if (!raw) return createEmptyStore();

  let store;
  try {
    store = JSON.parse(raw);
  } catch {
    throw new Error("Mock Mode の記録を読み取れません。保存データを変更せずに停止しました。");
  }
  if (
    !store || store.mock_mode !== true || store.player?.player_id !== MOCK_PLAYER.player_id ||
    !Array.isArray(store.sessions) || !Number.isInteger(store.player.play_count)
  ) {
    throw new Error("Mock Mode の記録形式が正しくありません。データを変更せずに停止しました。");
  }
  return store;
}

function writeStore(store) {
  const serialized = JSON.stringify(store);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    const confirmed = localStorage.getItem(STORAGE_KEY);
    if (confirmed !== serialized) throw new Error("保存内容を確認できませんでした。");
  } catch (error) {
    throw new Error(`ブラウザー内の Mock 記録を保存できませんでした。${error?.message || ""}`.trim());
  }
  return store;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortNewestFirst(sessions) {
  return [...sessions].sort((left, right) => right.started_at.localeCompare(left.started_at));
}

async function getPlayer() {
  const store = readStore();
  return clone(store.player);
}

async function getPlayCount() {
  const store = readStore();
  return store.player.play_count;
}

async function startSession({ session_id, level, question_ids, total_questions }) {
  if (
    !session_id || !Array.isArray(question_ids) || question_ids.length !== total_questions ||
    new Set(question_ids).size !== question_ids.length
  ) {
    throw new Error("新しいゲーム場次の情報が正しくありません。");
  }
  const store = readStore();
  const existing = store.sessions.find((session) => session.session_id === session_id);
  if (existing) return { session: clone(existing), play_count: existing.play_count };

  const session = {
    player_id: MOCK_PLAYER.player_id,
    session_id,
    level: Number(level),
    started_at: new Date().toISOString(),
    completed_at: null,
    total_questions: Number(total_questions),
    correct_count: 0,
    wrong_count: 0,
    accuracy: 0,
    score: 0,
    play_count: store.player.play_count + 1,
    status: "started",
    question_ids: [...question_ids],
    answers: [],
  };
  store.sessions.push(session);
  writeStore(store);
  return { session: clone(session), play_count: session.play_count };
}

async function saveAnswer({
  session_id,
  question_id,
  question_order,
  audio_id,
  correct_answer,
  selected_answer,
  response_time_ms,
  answered_at,
}) {
  const store = readStore();
  const session = store.sessions.find((entry) => entry.session_id === session_id);
  if (!session) throw new Error("このゲーム場次が Mock 記録にありません。");
  if (session.status === "completed") throw new Error("完了済みのゲームには回答を追加できません。");

  const existing = session.answers.find((entry) => entry.question_id === question_id);
  if (existing) return { answer: clone(existing), duplicate: true };
  if (!session.question_ids.includes(question_id)) throw new Error("問題 ID がこのゲーム場次と一致しません。");
  if (session.answers.some((entry) => entry.question_order === Number(question_order))) {
    throw new Error("この問題順の回答はすでに保存されています。");
  }
  const correct = Number(correct_answer);
  const selected = Number(selected_answer);
  if (![1, 2, 3, 4].includes(correct) || ![1, 2, 3, 4].includes(selected)) {
    throw new Error("声調の回答は 1〜4 で指定してください。");
  }

  const answer = {
    player_id: MOCK_PLAYER.player_id,
    session_id,
    question_id,
    level: session.level,
    question_order: Number(question_order),
    audio_id,
    correct_answer: correct,
    selected_answer: selected,
    is_correct: selected === correct,
    answered_at: answered_at || new Date().toISOString(),
    response_time_ms: Math.max(0, Math.round(Number(response_time_ms) || 0)),
  };
  session.answers.push(answer);
  session.answers.sort((left, right) => left.question_order - right.question_order);
  writeStore(store);
  return { answer: clone(answer), duplicate: false };
}

async function completeSession(session_id) {
  const store = readStore();
  const session = store.sessions.find((entry) => entry.session_id === session_id);
  if (!session) throw new Error("このゲーム場次が Mock 記録にありません。");
  if (session.status === "completed") return { summary: clone(session) };
  if (session.answers.length !== session.total_questions) {
    throw new Error("全ての回答が保存されるまで結果を確定できません。");
  }

  const correctCount = session.answers.filter((answer) => answer.is_correct).length;
  session.correct_count = correctCount;
  session.wrong_count = session.total_questions - correctCount;
  session.accuracy = Math.round((correctCount / session.total_questions) * 100);
  session.score = correctCount;
  session.completed_at = new Date().toISOString();
  session.status = "completed";
  store.player.play_count += 1;
  session.play_count = store.player.play_count;
  writeStore(store);
  return { summary: clone(session) };
}

async function getSessionHistory() {
  const store = readStore();
  return sortNewestFirst(store.sessions).map(clone);
}

async function getQuestionHistory({ session_id } = {}) {
  const sessions = await getSessionHistory();
  return sessions
    .filter((session) => !session_id || session.session_id === session_id)
    .flatMap((session) => session.answers.map(clone));
}

async function getLearningStats() {
  const store = readStore();
  const sessions = sortNewestFirst(store.sessions);
  const completed = sessions.filter((session) => session.status === "completed");
  const level_play_counts = Object.fromEntries([1, 2, 3, 4].map((level) => [
    level,
    completed.filter((session) => session.level === level).length,
  ]));
  const totalQuestions = completed.reduce((sum, session) => sum + session.total_questions, 0);
  const totalCorrect = completed.reduce((sum, session) => sum + session.correct_count, 0);

  return {
    mock_mode: true,
    player: clone(store.player),
    play_count: store.player.play_count,
    completed_count: completed.length,
    total_score: completed.reduce((sum, session) => sum + session.score, 0),
    correct_count: totalCorrect,
    accuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    level_play_counts,
    sessions,
    question_records: sessions.flatMap((session) => session.answers.map(clone)),
  };
}

window.ChaiGoMockLearningService = Object.freeze({
  MOCK_MODE,
  MOCK_PLAYER,
  getPlayer,
  getPlayCount,
  startSession,
  saveAnswer,
  completeSession,
  getSessionHistory,
  getQuestionHistory,
  getLearningStats,
});
})();
