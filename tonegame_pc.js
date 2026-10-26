const gameData = window.ChaiGoToneGameData;
const learningService = window.ChaiGoMockLearningService;
if (!gameData || !learningService) {
  const status = document.getElementById("record-status");
  if (status) status.textContent = "ゲームのスクリプトを読み込めませんでした。ページを再読み込みしてください。";
  const startButton = document.getElementById("start-game");
  if (startButton) startButton.disabled = true;
  throw new Error("Tone game data or learning service failed to load.");
}

const { QUESTIONS_PER_ROUND, TONE_OPTIONS, LV1_QUESTIONS } = gameData;
const {
  MOCK_PLAYER,
  completeSession,
  getLearningStats,
  getPlayer,
  saveAnswer,
  startSession,
} = learningService;

const elements = Object.fromEntries(
  [
    "home-screen", "ready-content", "game-content", "result-content",
    "record-status", "current-user-name", "start-game", "setup-message",
    "menuToggle", "primaryNav",
    "session-label", "question-progress", "progress-fill", "play-audio", "audio-error",
    "answer-grid", "answer-feedback", "answer-save-status", "next-question", "retry-answer",
    "answered-count", "correct-count", "score-count", "result-title", "result-greeting",
    "result-score", "result-accuracy", "result-correct", "result-message", "complete-status",
    "retry-game", "result-home", "retry-complete",
  ].map((id) => [id, document.getElementById(id)]),
);

const state = {
  phase: "ready",
  view: "setup",
  game: null,
  pendingStart: null,
  questionStartedAt: 0,
  isStarting: false,
  isSavingAnswer: false,
  isCompleting: false,
  audio: new Audio(),
};

state.audio.preload = "none";
state.audio.addEventListener("error", showAudioError);
state.audio.addEventListener("ended", () => setAudioButton(false));

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000
      : Math.random();
    const swapIndex = Math.floor(random * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function toneLabel(tone) {
  const option = TONE_OPTIONS.find((entry) => entry.value === Number(tone));
  return option ? `${option.label}（${option.contour}）` : "—";
}

function setPhase(phase) {
  const allowed = ["ready", "playing", "feedback", "result"];
  if (!allowed.includes(phase)) throw new Error(`Unknown game phase: ${phase}`);
  state.phase = phase;
  document.body.dataset.gameState = phase;
  elements["ready-content"].hidden = phase !== "ready";
  elements["game-content"].hidden = phase !== "playing" && phase !== "feedback";
  elements["result-content"].hidden = phase !== "result";
}

function setView(view) {
  state.view = view;
  elements["home-screen"].hidden = view !== "setup";
  if (view !== "setup") {
    state.audio.pause();
    setAudioButton(false);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setRecordStatus(message, kind = "ready") {
  elements["record-status"].textContent = message;
  elements["record-status"].classList.toggle("is-error", kind === "error");
  elements["record-status"].classList.toggle("is-ready", kind === "ready");
}

function setSetupLocked(locked) {
  document.querySelectorAll(".level-card").forEach((button) => {
    button.disabled = locked || button.dataset.level !== "1";
    button.setAttribute("aria-disabled", String(button.disabled));
  });
  elements["start-game"].disabled = locked || state.isStarting;
  if (locked) elements["setup-message"].textContent = "";
}

function updateSetupPlayer(player) {
  elements["current-user-name"].textContent = player.nickname;
  document.querySelectorAll(".user-name").forEach((node) => { node.textContent = player.nickname; });
}

async function initialize() {
  try {
    const player = await getPlayer();
    updateSetupPlayer(player);
    const stats = await getLearningStats();
    setRecordStatus(
      `Mock Mode · 固定テスト ID ${MOCK_PLAYER.player_id} · 声調ゲーム ${stats.play_count} 回（サーバー／DB未接続）`,
      "ready",
    );
    elements["start-game"].disabled = false;
  } catch (error) {
    setRecordStatus(`Mock Mode の準備に失敗しました：${error.message}`, "error");
    elements["start-game"].disabled = true;
  }
}

function setAudioButton(playing) {
  const icon = elements["play-audio"].querySelector("span");
  const label = elements["play-audio"].querySelector("strong");
  icon.textContent = playing ? "■" : "🔊";
  label.textContent = playing ? "再生中…" : "音声を聞く";
  elements["play-audio"].setAttribute("aria-label", playing ? "音声を停止" : "問題音声を聞く");
}

function showAudioError() {
  elements["audio-error"].hidden = false;
  elements["audio-error"].textContent = "音声を再生できませんでした。接続を確認してから、もう一度お試しください。";
  setAudioButton(false);
}

async function playAudio() {
  const question = state.game?.questions[state.game.index];
  if (!question) return;
  elements["audio-error"].hidden = true;
  elements["audio-error"].textContent = "";
  const audioUrl = new URL(question.audioUrl, document.baseURI).href;
  if (state.audio.src !== audioUrl) {
    state.audio.src = question.audioUrl;
    state.audio.load();
  } else {
    state.audio.currentTime = 0;
  }
  try {
    await state.audio.play();
    setAudioButton(true);
  } catch {
    showAudioError();
  }
}

async function startGame() {
  if (state.phase === "result" && state.game?.completeSaved) {
    state.game = null;
    state.pendingStart = null;
    setPhase("ready");
    setView("setup");
    setSetupLocked(false);
  }
  if (state.phase !== "ready" || state.isStarting) return;
  state.isStarting = true;
  elements["start-game"].disabled = true;
  elements["setup-message"].textContent = "問題と新しい Mock ゲーム場次を準備しています…";
  setSetupLocked(true);

  if (!state.pendingStart) {
    state.pendingStart = {
      session_id: makeId(),
      level: 1,
      question_ids: shuffle(LV1_QUESTIONS).slice(0, QUESTIONS_PER_ROUND).map((question) => question.id),
      total_questions: QUESTIONS_PER_ROUND,
    };
  }
  try {
    const response = await startSession(state.pendingStart);
    const questionById = new Map(LV1_QUESTIONS.map((question) => [question.id, question]));
    const questions = state.pendingStart.question_ids.map((questionId) => questionById.get(questionId));
    if (questions.some((question) => !question)) throw new Error("題庫と Mock 場次の問題 ID が一致しません。");
    state.pendingStart = null;
    state.game = {
      sessionId: response.session.session_id,
      questions,
      index: 0,
      answers: Array(QUESTIONS_PER_ROUND).fill(null),
      pendingAnswer: null,
      completeSaved: false,
    };
    elements["setup-message"].textContent = "";
    showQuestion();
    setPhase("playing");
  } catch (error) {
    setRecordStatus(`Mock Mode の開始記録を保存できませんでした：${error.message}`, "error");
    elements["setup-message"].textContent = "記録を保存できなかったため、ゲームは開始していません。もう一度お試しください。";
    setSetupLocked(false);
  } finally {
    state.isStarting = false;
    if (state.phase === "ready") elements["start-game"].disabled = false;
  }
}

function renderScore() {
  const game = state.game;
  if (!game) return;
  const answered = game.answers.filter(Boolean);
  const correct = answered.filter((answer) => answer.is_correct).length;
  elements["answered-count"].innerHTML = `${answered.length} <small>/ ${QUESTIONS_PER_ROUND}</small>`;
  elements["correct-count"].textContent = String(correct);
  elements["score-count"].innerHTML = `${correct} <small>点</small>`;
  elements["progress-fill"].style.width = `${(answered.length / QUESTIONS_PER_ROUND) * 100}%`;
  document.querySelector(".progress-track").setAttribute("aria-valuenow", String(answered.length));
}

function showQuestion() {
  const game = state.game;
  const question = game?.questions[game.index];
  if (!game || !question) return;
  state.audio.pause();
  const number = game.index + 1;
  state.questionStartedAt = performance.now();
  elements["session-label"].textContent = `第 ${number} 題 / 共 ${QUESTIONS_PER_ROUND} 題`;
  elements["question-progress"].textContent = `第 ${number} 題 / 共 ${QUESTIONS_PER_ROUND} 題`;
  elements["answer-feedback"].hidden = true;
  elements["answer-feedback"].textContent = "";
  elements["answer-feedback"].className = "feedback";
  elements["answer-save-status"].textContent = "";
  elements["answer-save-status"].className = "save-status";
  elements["retry-answer"].hidden = true;
  elements["retry-answer"].disabled = false;
  elements["next-question"].disabled = true;
  elements["next-question"].textContent = number === QUESTIONS_PER_ROUND ? "結果を見る →" : "次の問題 →";
  elements["audio-error"].hidden = true;
  elements["audio-error"].textContent = "";
  elements["play-audio"].disabled = false;
  setAudioButton(false);
  elements["answer-grid"].querySelectorAll("button").forEach((button) => {
    button.disabled = false;
    button.classList.remove("is-correct", "is-wrong");
    button.setAttribute("aria-pressed", "false");
  });
  renderScore();
}

function renderFeedback(answer) {
  const feedback = elements["answer-feedback"];
  feedback.hidden = false;
  feedback.classList.toggle("is-correct", Boolean(answer.is_correct));
  feedback.classList.toggle("is-wrong", !answer.is_correct);
  feedback.textContent = answer.is_correct
    ? "🎉 正解！いい耳です！"
    : `もう一歩！正解は ${toneLabel(answer.correct_answer)} です。`;
  elements["answer-grid"].querySelectorAll("button").forEach((button) => {
    const value = Number(button.dataset.answer);
    if (value === Number(answer.correct_answer)) button.classList.add("is-correct");
    if (value === Number(answer.selected_answer) && !answer.is_correct) button.classList.add("is-wrong");
    button.disabled = true;
    button.setAttribute("aria-pressed", String(value === Number(answer.selected_answer)));
  });
}

function chooseAnswer(value) {
  const game = state.game;
  if (state.phase !== "playing" || !game || game.answers[game.index]) return;
  state.audio.pause();
  setAudioButton(false);
  const question = game.questions[game.index];
  const answer = {
    player_id: MOCK_PLAYER.player_id,
    session_id: game.sessionId,
    question_id: question.id,
    level: question.level,
    question_order: game.index + 1,
    audio_id: question.audioId,
    correct_answer: question.answer,
    selected_answer: Number(value),
    is_correct: Number(value) === question.answer,
    answered_at: new Date().toISOString(),
    response_time_ms: Math.max(0, Math.round(performance.now() - state.questionStartedAt)),
    saved: false,
  };
  game.pendingAnswer = answer;
  game.answers[game.index] = answer;
  setPhase("feedback");
  renderFeedback(answer);
  renderScore();
  persistCurrentAnswer();
}

async function persistCurrentAnswer() {
  const game = state.game;
  const answer = game?.pendingAnswer;
  if (!answer || state.isSavingAnswer) return;
  state.isSavingAnswer = true;
  elements["retry-answer"].hidden = true;
  elements["retry-answer"].disabled = true;
  elements["next-question"].disabled = true;
  elements["answer-save-status"].textContent = "Mock 記録をこのブラウザーに保存しています…";
  elements["answer-save-status"].className = "save-status";
  try {
    const response = await saveAnswer(answer);
    game.answers[game.index] = { ...response.answer, saved: true };
    game.pendingAnswer = null;
    renderFeedback(game.answers[game.index]);
    elements["answer-save-status"].textContent = "✓ Mock Mode · このブラウザーに保存済み（サーバー保存ではありません）";
    elements["answer-save-status"].className = "save-status is-ready";
    elements["next-question"].disabled = false;
    renderScore();
  } catch (error) {
    elements["answer-save-status"].textContent = `保存できませんでした：${error.message}`;
    elements["answer-save-status"].className = "save-status is-error";
    elements["retry-answer"].hidden = false;
    elements["retry-answer"].disabled = false;
    elements["next-question"].disabled = true;
  } finally {
    state.isSavingAnswer = false;
  }
}

function advanceQuestion() {
  const game = state.game;
  if (state.phase !== "feedback" || !game?.answers[game.index]?.saved) return;
  if (game.index + 1 === QUESTIONS_PER_ROUND) {
    openResults();
    return;
  }
  game.index += 1;
  showQuestion();
  setPhase("playing");
}

function renderResult(correctCount) {
  const game = state.game;
  const accuracy = Math.round((correctCount / QUESTIONS_PER_ROUND) * 100);
  elements["result-greeting"].textContent = `${MOCK_PLAYER.nickname}さん、おつかれさま！`;
  elements["result-score"].innerHTML = `${correctCount} <small>/ ${QUESTIONS_PER_ROUND}</small>`;
  elements["result-accuracy"].innerHTML = `${accuracy}<small>%</small>`;
  elements["result-correct"].innerHTML = `${correctCount} <small>/ ${QUESTIONS_PER_ROUND}</small>`;
  elements["result-message"].textContent = correctCount === QUESTIONS_PER_ROUND
    ? "🏆 全問正解！すばらしい！"
    : correctCount >= 2
      ? "🎉 いい感じ！次は満点を目指そう。"
      : "💪 何度も聞いて練習しよう。もう一度挑戦できます！";
  elements["complete-status"].textContent = "Mock Mode の結果をこのブラウザーに保存しています…";
  elements["retry-complete"].hidden = true;
  elements["retry-game"].disabled = true;
  elements["result-home"].disabled = true;
  if (game) game.completeSaved = false;
}

function openResults() {
  if (state.phase !== "feedback") return;
  const correctCount = state.game.answers.filter((answer) => answer?.is_correct).length;
  setPhase("result");
  renderResult(correctCount);
  persistCompletion();
}

async function persistCompletion() {
  const game = state.game;
  if (!game || game.completeSaved || state.isCompleting) return;
  state.isCompleting = true;
  elements["retry-complete"].hidden = true;
  elements["retry-complete"].disabled = true;
  try {
    const response = await completeSession(game.sessionId);
    const summary = response.summary;
    game.completeSaved = true;
    elements["result-score"].innerHTML = `${summary.score} <small>/ ${summary.total_questions}</small>`;
    elements["result-accuracy"].innerHTML = `${summary.accuracy}<small>%</small>`;
    elements["result-correct"].innerHTML = `${summary.correct_count} <small>/ ${summary.total_questions}</small>`;
    elements["retry-game"].disabled = false;
    elements["result-home"].disabled = false;
    elements["retry-complete"].hidden = true;
    elements["complete-status"].textContent = `✓ Mock Mode · このブラウザーに保存済み · 累計 ${summary.play_count} 回（サーバー保存ではありません）`;
    try {
      const stats = await getLearningStats();
      setRecordStatus(
        `Mock Mode · 固定テスト ID ${MOCK_PLAYER.player_id} · このブラウザーに保存済み ${stats.play_count} 回（サーバー／DB未接続）`,
        "ready",
      );
    } catch {
      // The completed session has already been confirmed in localStorage.
    }
  } catch (error) {
    elements["complete-status"].textContent = `結果を Mock 記録に保存できませんでした：${error.message}`;
    elements["retry-complete"].hidden = false;
    elements["retry-complete"].disabled = false;
  } finally {
    state.isCompleting = false;
  }
}

function returnToReady() {
  if (state.phase !== "result" || !state.game?.completeSaved) return;
  state.game = null;
  setPhase("ready");
  setSetupLocked(false);
  elements["start-game"].disabled = false;
  setView("setup");
}

elements["start-game"].addEventListener("click", startGame);
elements["play-audio"].addEventListener("click", () => {
  if (!state.audio.paused) {
    state.audio.pause();
    setAudioButton(false);
  } else {
    playAudio();
  }
});
elements["answer-grid"].addEventListener("click", (event) => {
  const button = event.target.closest("button[data-answer]");
  if (button && !button.disabled) chooseAnswer(Number(button.dataset.answer));
});
elements["next-question"].addEventListener("click", advanceQuestion);
elements["retry-answer"].addEventListener("click", persistCurrentAnswer);
elements["retry-complete"].addEventListener("click", persistCompletion);
elements["retry-game"].addEventListener("click", startGame);
elements["result-home"].addEventListener("click", returnToReady);

function closePrimaryNav() {
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.menuToggle.setAttribute("aria-label", "メニューを開く");
  elements.primaryNav.classList.remove("is-open");
}

elements.menuToggle.addEventListener("click", () => {
  const isOpen = elements.menuToggle.getAttribute("aria-expanded") === "true";
  elements.menuToggle.setAttribute("aria-expanded", String(!isOpen));
  elements.menuToggle.setAttribute("aria-label", isOpen ? "メニューを開く" : "メニューを閉じる");
  elements.primaryNav.classList.toggle("is-open", !isOpen);
});
elements.primaryNav.querySelectorAll("a, button").forEach((item) => {
  item.addEventListener("click", closePrimaryNav);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePrimaryNav();
  if (state.view !== "setup" || state.phase !== "playing" || !/^[1-4]$/.test(event.key)) return;
  if (event.target instanceof HTMLElement && (event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))) return;
  const button = elements["answer-grid"].querySelector(`[data-answer="${event.key}"]`);
  if (button && !button.disabled) {
    event.preventDefault();
    chooseAnswer(Number(event.key));
  }
});

document.querySelectorAll(".level-card").forEach((button) => {
  if (button.dataset.level !== "1") return;
  button.addEventListener("click", () => {
    if (state.phase !== "ready") return;
    document.querySelectorAll(".level-card").forEach((card) => {
      const selected = card === button;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
  });
});

setPhase("ready");
setView("setup");
initialize();
