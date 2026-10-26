const AUDIO_BASE_URL = "./ToneGame/audio/lv1";
const QUESTIONS_PER_ROUND = 3;
const learningService = window.ChaiGoMockPinyinLearningService;
if (!learningService) {
  const startButton = document.getElementById("start-game");
  if (startButton) startButton.disabled = true;
  const status = document.getElementById("record-status");
  if (status) status.textContent = "学習記録のスクリプトを読み込めませんでした。ページを再読み込みしてください。";
  throw new Error("Pinyin learning service failed to load.");
}

const { startSession, saveAnswer, completeSession } = learningService;

const QUESTIONS = [
  { char: "媽", pinyin: "ma1", audio: `${AUDIO_BASE_URL}/ma_01.mp3` },
  { char: "麻", pinyin: "ma2", audio: `${AUDIO_BASE_URL}/ma_02.mp3` },
  { char: "馬", pinyin: "ma3", audio: `${AUDIO_BASE_URL}/ma_03.mp3` },
  { char: "罵", pinyin: "ma4", audio: `${AUDIO_BASE_URL}/ma_04.mp3` },
  { char: "八", pinyin: "ba1", audio: `${AUDIO_BASE_URL}/ba_01.mp3` },
  { char: "拔", pinyin: "ba2", audio: `${AUDIO_BASE_URL}/ba_02.mp3` },
  { char: "把", pinyin: "ba3", audio: `${AUDIO_BASE_URL}/ba_03.mp3` },
  { char: "爸", pinyin: "ba4", audio: `${AUDIO_BASE_URL}/ba_04.mp3` },
  { char: "七", pinyin: "qi1", audio: `${AUDIO_BASE_URL}/qi_01.mp3` },
  { char: "旗", pinyin: "qi2", audio: `${AUDIO_BASE_URL}/qi_02.mp3` },
  { char: "起", pinyin: "qi3", audio: `${AUDIO_BASE_URL}/qi_03.mp3` },
  { char: "氣", pinyin: "qi4", audio: `${AUDIO_BASE_URL}/qi_04.mp3` },
];

const elements = Object.fromEntries(
  [
    "ready-content", "game-content", "result-content", "record-status", "start-game",
    "setup-message", "menuToggle", "primaryNav", "session-label", "question-progress",
    "progress-track", "progress-fill", "question-character", "answer-form", "pinyin-input",
    "submit-answer", "play-hint", "hint-status", "audio-error", "answer-feedback",
    "answer-status", "retry-answer", "next-question", "answered-count", "correct-count", "score-count",
    "result-greeting", "result-score", "result-accuracy", "result-correct", "result-message",
    "result-save-status", "retry-complete", "retry-game", "result-home",
  ].map((id) => [id, document.getElementById(id)]),
);

const state = {
  phase: "ready",
  questions: [],
  index: 0,
  score: 0,
  answered: 0,
  attempts: 0,
  currentAttempts: [],
  hintUsed: false,
  sessionId: null,
  questionStartedAt: 0,
  pendingAnswer: null,
  recordingEnabled: false,
  isSavingAnswer: false,
  isStarting: false,
  isCompleting: false,
  completeSaved: false,
  audio: new Audio(),
};

state.audio.preload = "none";
state.audio.addEventListener("error", showAudioError);
state.audio.addEventListener("ended", () => setHintPlaying(false));

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const random = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000
      : Math.random();
    const swapIndex = Math.floor(random * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

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

function questionId(question) {
  return `lv1-${question.pinyin}-${question.char}`;
}

function normalizePinyin(text) {
  let value = text.trim().toLowerCase().normalize("NFC").replace(/\s+/g, "");
  const toneMap = {
    "ā": ["a", "1"], "á": ["a", "2"], "ǎ": ["a", "3"], "à": ["a", "4"],
    "ē": ["e", "1"], "é": ["e", "2"], "ě": ["e", "3"], "è": ["e", "4"],
    "ī": ["i", "1"], "í": ["i", "2"], "ǐ": ["i", "3"], "ì": ["i", "4"],
    "ō": ["o", "1"], "ó": ["o", "2"], "ǒ": ["o", "3"], "ò": ["o", "4"],
    "ū": ["u", "1"], "ú": ["u", "2"], "ǔ": ["u", "3"], "ù": ["u", "4"],
    "ǖ": ["ü", "1"], "ǘ": ["ü", "2"], "ǚ": ["ü", "3"], "ǜ": ["ü", "4"],
  };

  let detectedTone = null;
  for (const [mark, [vowel, tone]] of Object.entries(toneMap)) {
    if (!value.includes(mark)) continue;
    value = value.replace(mark, vowel);
    detectedTone = tone;
    break;
  }

  const numberMatch = value.match(/([1-4])$/);
  if (numberMatch) {
    detectedTone = numberMatch[1];
    value = value.replace(/[1-4]$/, "");
  }

  return { base: value, tone: detectedTone };
}

function numberToToneMark(pinyin) {
  const match = pinyin.match(/^(.+)([1-4])$/);
  if (!match) return pinyin;
  const [, base, toneText] = match;
  const toneMarks = {
    a: ["ā", "á", "ǎ", "à"], e: ["ē", "é", "ě", "è"],
    i: ["ī", "í", "ǐ", "ì"], o: ["ō", "ó", "ǒ", "ò"],
    u: ["ū", "ú", "ǔ", "ù"], "ü": ["ǖ", "ǘ", "ǚ", "ǜ"],
  };
  const tone = Number(toneText);
  let vowelIndex = -1;

  for (const vowel of ["a", "e"]) {
    const index = base.indexOf(vowel);
    if (index !== -1) {
      vowelIndex = index;
      break;
    }
  }

  if (vowelIndex === -1) {
    const ouIndex = base.indexOf("ou");
    if (ouIndex !== -1) vowelIndex = ouIndex;
    else {
      for (let index = base.length - 1; index >= 0; index -= 1) {
        if (toneMarks[base[index]]) {
          vowelIndex = index;
          break;
        }
      }
    }
  }

  if (vowelIndex === -1) return pinyin;
  const markedVowel = toneMarks[base[vowelIndex]]?.[tone - 1];
  if (!markedVowel) return pinyin;
  return `${base.slice(0, vowelIndex)}${markedVowel}${base.slice(vowelIndex + 1)}`;
}

function setPhase(phase) {
  state.phase = phase;
  elements["ready-content"].hidden = phase !== "ready";
  elements["game-content"].hidden = !["playing", "first-wrong", "answered"].includes(phase);
  elements["result-content"].hidden = phase !== "result";
  document.body.dataset.gameState = phase;
}

function setHintPlaying(playing) {
  const available = state.phase === "first-wrong" && !state.hintUsed;
  elements["play-hint"].disabled = !available || playing;
  elements["play-hint"].classList.toggle("is-playing", playing);
  if (playing) elements["hint-status"].textContent = "音声を再生中…";
  else if (state.hintUsed) elements["hint-status"].textContent = "この問題のヒントを使いました";
  else if (available) elements["hint-status"].textContent = "ヒントは 1 回だけ聞けます";
  else elements["hint-status"].textContent = "1 回目に間違えると使えます";
}

function showAudioError() {
  elements["audio-error"].hidden = false;
  elements["audio-error"].textContent = "音声を再生できませんでした。回答はそのまま続けられます。";
  setHintPlaying(false);
}

function renderScore() {
  elements["answered-count"].innerHTML = `${state.answered} <small>/ ${QUESTIONS_PER_ROUND}</small>`;
  elements["correct-count"].textContent = String(state.score);
  elements["score-count"].innerHTML = `${state.score} <small>点</small>`;
}

function renderQuestion() {
  const question = state.questions[state.index];
  const number = state.index + 1;
  state.questionStartedAt = performance.now();
  elements["session-label"].textContent = `第 ${number} 問 / 全 ${QUESTIONS_PER_ROUND} 問`;
  elements["question-progress"].textContent = `第 ${number} 問 / 全 ${QUESTIONS_PER_ROUND} 問`;
  elements["progress-track"].setAttribute("aria-valuenow", String(state.index));
  elements["progress-fill"].style.width = `${(state.index / QUESTIONS_PER_ROUND) * 100}%`;
  elements["question-character"].textContent = question.char;
  elements["pinyin-input"].value = "";
  elements["pinyin-input"].disabled = false;
  elements["submit-answer"].disabled = false;
  elements["next-question"].disabled = true;
  elements["next-question"].textContent = "次の問題 →";
  elements["answer-feedback"].hidden = true;
  elements["answer-feedback"].textContent = "";
  elements["answer-feedback"].className = "feedback pinyin-feedback";
  elements["answer-status"].textContent = "";
  elements["answer-status"].className = "save-status";
  elements["retry-answer"].hidden = true;
  elements["retry-answer"].disabled = false;
  elements["audio-error"].hidden = true;
  state.attempts = 0;
  state.currentAttempts = [];
  state.hintUsed = false;
  state.pendingAnswer = null;
  state.audio.pause();
  state.audio.currentTime = 0;
  setHintPlaying(false);
  setPhase("playing");
}

async function startGame() {
  if (state.isStarting) return;
  state.isStarting = true;
  elements["start-game"].disabled = true;
  elements["setup-message"].textContent = "新しいゲームと学習記録を準備しています…";
  state.questions = shuffle(QUESTIONS).slice(0, QUESTIONS_PER_ROUND);
  state.sessionId = makeId();
  state.recordingEnabled = true;
  state.completeSaved = false;
  try {
    await startSession({
      session_id: state.sessionId,
      level: 1,
      question_ids: state.questions.map(questionId),
      total_questions: QUESTIONS_PER_ROUND,
    });
    elements["setup-message"].textContent = "";
  } catch (error) {
    state.recordingEnabled = false;
    elements["setup-message"].textContent = `記録を保存できませんでした。このラウンドの記録は残りません：${error.message}`;
  }
  state.index = 0;
  state.score = 0;
  state.answered = 0;
  renderScore();
  renderQuestion();
  elements["start-game"].disabled = false;
  state.isStarting = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function submitAnswer(event) {
  event.preventDefault();
  if (!["playing", "first-wrong"].includes(state.phase)) return;

  const answer = elements["pinyin-input"].value.trim();
  if (!answer) {
    elements["answer-status"].textContent = "ピンインを入力してください。";
    elements["pinyin-input"].focus();
    return;
  }

  state.attempts += 1;
  elements["answer-status"].textContent = "";
  const question = state.questions[state.index];
  const userPinyin = normalizePinyin(answer);
  const correctPinyin = normalizePinyin(question.pinyin);
  const isCorrect = userPinyin.base === correctPinyin.base && userPinyin.tone === correctPinyin.tone;
  state.currentAttempts.push({ input: answer, is_correct: isCorrect, answered_at: new Date().toISOString() });

  if (isCorrect) {
    state.score += 1;
    resolveQuestion(true, `正解！【${question.char}】のピンインは ${numberToToneMark(question.pinyin)} です。`, answer);
    return;
  }

  if (state.attempts === 1) {
    const message = userPinyin.base === correctPinyin.base && userPinyin.tone !== correctPinyin.tone
      ? "ピンインは合っていますが、声調が違います。もう一度入力してみましょう。"
      : "もう一度チャレンジしてみましょう。";
    elements["answer-feedback"].textContent = `${message} 音声ヒントも 1 回聞けます。`;
    elements["answer-feedback"].classList.add("is-wrong");
    elements["answer-feedback"].hidden = false;
    setPhase("first-wrong");
    setHintPlaying(false);
    elements["pinyin-input"].select();
    return;
  }

  resolveQuestion(false, `残念！正解は ${numberToToneMark(question.pinyin)} です。`, answer);
}

function resolveQuestion(isCorrect, message, selectedPinyin) {
  const question = state.questions[state.index];
  state.answered += 1;
  state.pendingAnswer = {
    session_id: state.sessionId,
    question_id: questionId(question),
    question_order: state.index + 1,
    character: question.char,
    correct_pinyin: numberToToneMark(question.pinyin),
    selected_pinyin: selectedPinyin,
    is_correct: isCorrect,
    attempts: state.currentAttempts.length,
    answer_attempts: [...state.currentAttempts],
    hint_used: state.hintUsed,
    answered_at: new Date().toISOString(),
    response_time_ms: Math.max(0, Math.round(performance.now() - state.questionStartedAt)),
  };
  elements["pinyin-input"].disabled = true;
  elements["submit-answer"].disabled = true;
  elements["answer-feedback"].textContent = message;
  elements["answer-feedback"].className = `feedback pinyin-feedback ${isCorrect ? "is-correct" : "is-wrong"}`;
  elements["answer-feedback"].hidden = false;
  elements["answer-status"].textContent = isCorrect ? "✓ 正解" : "次の問題で再チャレンジ！";
  elements["next-question"].disabled = true;
  elements["next-question"].textContent = state.index + 1 === QUESTIONS_PER_ROUND ? "結果を見る →" : "次の問題 →";
  state.audio.pause();
  renderScore();
  setPhase("answered");
  setHintPlaying(false);
  persistCurrentAnswer();
}

async function persistCurrentAnswer() {
  const answer = state.pendingAnswer;
  if (!answer || state.isSavingAnswer) return;
  if (!state.recordingEnabled || !state.sessionId) {
    elements["answer-status"].textContent = "このラウンドの記録は保存されていません。";
    elements["answer-status"].className = "save-status is-error";
    elements["next-question"].disabled = false;
    return;
  }

  state.isSavingAnswer = true;
  elements["next-question"].disabled = true;
  elements["retry-answer"].hidden = true;
  elements["retry-answer"].disabled = true;
  elements["answer-status"].textContent = "回答を学習記録に保存しています…";
  elements["answer-status"].className = "save-status";
  try {
    await saveAnswer(answer);
    state.pendingAnswer = null;
    elements["answer-status"].textContent = "✓ この回答を学習記録に保存しました。";
    elements["answer-status"].className = "save-status is-ready";
    elements["next-question"].disabled = false;
  } catch (error) {
    elements["answer-status"].textContent = `保存できませんでした：${error.message}`;
    elements["answer-status"].className = "save-status is-error";
    elements["retry-answer"].hidden = false;
    elements["retry-answer"].disabled = false;
  } finally {
    state.isSavingAnswer = false;
  }
}

function playHint() {
  if (state.phase !== "first-wrong" || state.hintUsed) return;
  state.hintUsed = true;
  elements["audio-error"].hidden = true;
  state.audio.src = state.questions[state.index].audio;
  setHintPlaying(true);
  const playback = state.audio.play();
  if (playback?.catch) playback.catch(showAudioError);
  else setHintPlaying(false);
}

async function advanceQuestion() {
  if (state.phase !== "answered") return;
  if (state.index + 1 >= QUESTIONS_PER_ROUND) {
    await showResult();
    return;
  }
  state.index += 1;
  renderQuestion();
}

async function showResult() {
  const accuracy = Math.round((state.score / QUESTIONS_PER_ROUND) * 100);
  elements["progress-track"].setAttribute("aria-valuenow", String(QUESTIONS_PER_ROUND));
  elements["progress-fill"].style.width = "100%";
  elements["result-greeting"].textContent = "ChaiGo User さん、おつかれさま！";
  elements["result-score"].innerHTML = `${state.score} <small>/ ${QUESTIONS_PER_ROUND}</small>`;
  elements["result-accuracy"].innerHTML = `${accuracy}<small>%</small>`;
  elements["result-correct"].innerHTML = `${state.score} <small>/ ${QUESTIONS_PER_ROUND}</small>`;
  elements["result-message"].textContent = state.score === QUESTIONS_PER_ROUND
    ? "🏆 全問正解！すばらしい！"
    : state.score >= 2
      ? "🎉 いい感じ！次は満点を目指そう。"
      : "💪 音声ヒントも使いながら、もう一度練習してみよう。";
  elements["result-save-status"].textContent = "";
  elements["retry-complete"].hidden = true;
  state.audio.pause();
  setPhase("result");
  await persistCompletion();
}

async function persistCompletion() {
  if (state.completeSaved || state.isCompleting) return;
  if (!state.recordingEnabled || !state.sessionId) {
    elements["result-save-status"].textContent = "このラウンドは学習記録に保存されていません。";
    return;
  }

  state.isCompleting = true;
  elements["retry-complete"].hidden = true;
  elements["result-save-status"].textContent = "ラウンド結果を学習記録に保存しています…";
  try {
    const response = await completeSession(state.sessionId);
    state.completeSaved = true;
    elements["result-save-status"].textContent = `✓ 学習記録に保存しました · ピンインゲーム ${response.summary.play_count} 回目`;
  } catch (error) {
    elements["result-save-status"].textContent = `回答は保存済みですが、ラウンド結果を確定できませんでした：${error.message}`;
    elements["retry-complete"].hidden = false;
  } finally {
    state.isCompleting = false;
  }
}

function returnToReady() {
  state.audio.pause();
  setPhase("ready");
  elements["setup-message"].textContent = "いつでも LV1 に挑戦できます。";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closePrimaryNav() {
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.menuToggle.setAttribute("aria-label", "メニューを開く");
  elements.primaryNav.classList.remove("is-open");
}

elements["start-game"].addEventListener("click", startGame);
elements["retry-game"].addEventListener("click", startGame);
elements["result-home"].addEventListener("click", returnToReady);
elements["answer-form"].addEventListener("submit", submitAnswer);
elements["retry-answer"].addEventListener("click", persistCurrentAnswer);
elements["retry-complete"].addEventListener("click", persistCompletion);
elements["play-hint"].addEventListener("click", playHint);
elements["next-question"].addEventListener("click", advanceQuestion);
elements.menuToggle.addEventListener("click", () => {
  const isOpen = elements.menuToggle.getAttribute("aria-expanded") === "true";
  elements.menuToggle.setAttribute("aria-expanded", String(!isOpen));
  elements.menuToggle.setAttribute("aria-label", isOpen ? "メニューを開く" : "メニューを閉じる");
  elements.primaryNav.classList.toggle("is-open", !isOpen);
});
elements.primaryNav.querySelectorAll("a").forEach((item) => item.addEventListener("click", closePrimaryNav));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePrimaryNav();
});

setPhase("ready");
