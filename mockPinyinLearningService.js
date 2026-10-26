// Browser-only mock records for the pinyin game. The tone and pinyin games
// keep separate storage formats, while tonegame_pc.js combines them for display.
(() => {
  const MOCK_PLAYER = Object.freeze({
    player_id: "chaigo-test-user-001",
    nickname: "ChaiGo User",
  });
  const STORAGE_KEY = "chaigo-pinyingame-mock-learning-v1";

  function createEmptyStore() {
    return { mock_mode: true, player: { ...MOCK_PLAYER, play_count: 0 }, sessions: [] };
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
      throw new Error("ピンインの Mock 記録を読み取れません。");
    }
    if (
      store?.mock_mode !== true || store.player?.player_id !== MOCK_PLAYER.player_id ||
      !Array.isArray(store.sessions) || !Number.isInteger(store.player.play_count)
    ) {
      throw new Error("ピンインの Mock 記録形式が正しくありません。");
    }
    return store;
  }

  function writeStore(store) {
    const serialized = JSON.stringify(store);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error("保存内容を確認できませんでした。");
    } catch (error) {
      throw new Error(`ブラウザー内の Mock 記録を保存できませんでした。${error?.message || ""}`.trim());
    }
    return store;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function startSession({ session_id, level, question_ids, total_questions }) {
    if (!session_id || !Array.isArray(question_ids) || question_ids.length !== total_questions) {
      throw new Error("ピンインゲーム場次の情報が正しくありません。");
    }
    const store = readStore();
    const existing = store.sessions.find((session) => session.session_id === session_id);
    if (existing) return { session: clone(existing) };

    const session = {
      player_id: MOCK_PLAYER.player_id,
      game_type: "pinyin",
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
    return { session: clone(session) };
  }

  async function saveAnswer(answerData) {
    const store = readStore();
    const session = store.sessions.find((entry) => entry.session_id === answerData.session_id);
    if (!session) throw new Error("このピンインゲーム場次が Mock 記録にありません。");
    if (session.status === "completed") throw new Error("完了済みのゲームには回答を追加できません。");
    const existing = session.answers.find((entry) => entry.question_id === answerData.question_id);
    if (existing) return { answer: clone(existing), duplicate: true };
    if (!session.question_ids.includes(answerData.question_id)) {
      throw new Error("問題 ID がこのゲーム場次と一致しません。");
    }

    const answer = {
      ...answerData,
      player_id: MOCK_PLAYER.player_id,
      game_type: "pinyin",
      level: session.level,
      question_order: Number(answerData.question_order),
      is_correct: Boolean(answerData.is_correct),
      attempts: Number(answerData.attempts),
      hint_used: Boolean(answerData.hint_used),
      response_time_ms: Math.max(0, Math.round(Number(answerData.response_time_ms) || 0)),
      answered_at: answerData.answered_at || new Date().toISOString(),
    };
    session.answers.push(answer);
    session.answers.sort((left, right) => left.question_order - right.question_order);
    writeStore(store);
    return { answer: clone(answer), duplicate: false };
  }

  async function completeSession(session_id) {
    const store = readStore();
    const session = store.sessions.find((entry) => entry.session_id === session_id);
    if (!session) throw new Error("このピンインゲーム場次が Mock 記録にありません。");
    if (session.status === "completed") return { summary: clone(session) };
    if (session.answers.length !== session.total_questions) {
      throw new Error("全ての回答が保存されるまで結果を確定できません。");
    }

    session.correct_count = session.answers.filter((answer) => answer.is_correct).length;
    session.wrong_count = session.total_questions - session.correct_count;
    session.accuracy = Math.round((session.correct_count / session.total_questions) * 100);
    session.score = session.correct_count;
    session.completed_at = new Date().toISOString();
    session.status = "completed";
    store.player.play_count += 1;
    session.play_count = store.player.play_count;
    writeStore(store);
    return { summary: clone(session) };
  }

  async function getSessionHistory() {
    const store = readStore();
    return [...store.sessions]
      .sort((left, right) => right.started_at.localeCompare(left.started_at))
      .map(clone);
  }

  async function getLearningStats() {
    const store = readStore();
    const completed = store.sessions.filter((session) => session.status === "completed");
    const totalQuestions = completed.reduce((sum, session) => sum + session.total_questions, 0);
    const correctCount = completed.reduce((sum, session) => sum + session.correct_count, 0);
    return {
      mock_mode: true,
      play_count: store.player.play_count,
      completed_count: completed.length,
      total_score: completed.reduce((sum, session) => sum + session.score, 0),
      correct_count: correctCount,
      accuracy: totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0,
      level_play_counts: Object.fromEntries([1, 2, 3, 4].map((level) => [
        level,
        completed.filter((session) => session.level === level).length,
      ])),
    };
  }

  window.ChaiGoMockPinyinLearningService = Object.freeze({
    MOCK_PLAYER,
    startSession,
    saveAnswer,
    completeSession,
    getSessionHistory,
    getLearningStats,
  });
})();
