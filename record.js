const toneGameData = window.ChaiGoToneGameData;
const toneLearningService = window.ChaiGoMockLearningService;
const pinyinLearningService = window.ChaiGoMockPinyinLearningService;

if (!toneGameData || !toneLearningService || !pinyinLearningService) {
  const status = document.getElementById("records-message");
  if (status) status.textContent = "学習記録のスクリプトを読み込めませんでした。ページを再読み込みしてください。";
  throw new Error("Learning records dependencies failed to load.");
}

const { TONE_OPTIONS } = toneGameData;
const { getLearningStats: getToneLearningStats, getSessionHistory: getToneSessionHistory } = toneLearningService;
const { getLearningStats: getPinyinLearningStats, getSessionHistory: getPinyinSessionHistory } = pinyinLearningService;

const LEVEL_TITLES = {
  1: "LV1｜基本の声調",
  2: "LV2｜ステップアップ",
  3: "LV3｜声調チャレンジ",
  4: "LV4｜上級チャレンジ",
};

const elements = Object.fromEntries(
  [
    "records-message", "records-summary", "level-count-list", "history-list", "history-count",
    "refresh-records", "menuToggle", "primaryNav",
  ].map((id) => [id, document.getElementById(id)]),
);

function toneLabel(tone) {
  const option = TONE_OPTIONS.find((entry) => entry.value === Number(tone));
  return option ? `${option.label}（${option.contour}）` : "—";
}

function prettyDate(value) {
  if (!value) return "未完了";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function summaryCard(label, value) {
  const card = document.createElement("div");
  card.className = "records-summary__card";
  const title = document.createElement("span");
  title.textContent = label;
  const number = document.createElement("strong");
  number.textContent = value;
  card.append(title, number);
  return card;
}

function renderSession(session) {
  const card = document.createElement("article");
  card.className = "history-card";
  const isPinyin = session.game_type === "pinyin";

  const top = document.createElement("div");
  top.className = "history-card__top";
  const title = document.createElement("strong");
  title.className = "history-card__title";
  const levelTitle = isPinyin ? `ピンイン LV${session.level}｜単漢字` : LEVEL_TITLES[session.level] || `LV${session.level}`;
  title.textContent = `${levelTitle} · ${session.status === "completed" ? `${session.score} / ${session.total_questions} 点` : "進行中"}`;
  const date = document.createElement("span");
  date.className = "history-card__date";
  date.textContent = `${prettyDate(session.started_at)}${session.completed_at ? ` → ${prettyDate(session.completed_at)}` : ""}`;
  top.append(title, date);

  const stats = document.createElement("div");
  stats.className = "history-card__stats";
  [
    `場次 ID ${session.session_id}`,
    `正答率 ${session.status === "completed" ? `${session.accuracy}%` : "未確定"}`,
    `正解 ${session.correct_count} / ${session.total_questions}`,
    `累計 ${session.play_count} 回目`,
    `回答記録 ${(session.answers || []).length} 件`,
  ].forEach((text) => {
    const item = document.createElement("span");
    item.textContent = text;
    stats.append(item);
  });

  const answers = document.createElement("ol");
  answers.className = "history-card__answers";
  for (const answer of session.answers || []) {
    const item = document.createElement("li");
    item.classList.add(answer.is_correct ? "is-correct" : "is-wrong");
    const prompt = document.createElement("span");
    prompt.textContent = isPinyin
      ? `第 ${answer.question_order} 問 · 【${answer.character}】`
      : `第 ${answer.question_order} 問 · ${answer.question_id} · ${answer.audio_id}`;
    const response = document.createElement("span");
    const pinyinAttempts = (answer.answer_attempts || [])
      .map((attempt) => `${attempt.input} ${attempt.is_correct ? "✓" : "×"}`)
      .join(" → ");
    response.textContent = isPinyin
      ? `${answer.is_correct ? "○" : "×"} 入力 ${pinyinAttempts || answer.selected_pinyin || "—"} · 正解 ${answer.correct_pinyin || "—"} · ${answer.attempts} 回目${answer.hint_used ? "・音声ヒント使用" : ""} · ${answer.response_time_ms} ms · ${prettyDate(answer.answered_at)}`
      : `${answer.is_correct ? "○" : "×"} 選択 ${toneLabel(answer.selected_answer)} · 正解 ${toneLabel(answer.correct_answer)} · ${answer.response_time_ms} ms · ${prettyDate(answer.answered_at)}`;
    item.append(prompt, response);
    answers.append(item);
  }
  card.append(top, stats, answers);
  return card;
}

async function loadHistory() {
  elements["records-message"].textContent = "声調とピンインの Mock 記録を読み込んでいます…";
  elements["records-message"].classList.remove("is-error");
  try {
    const [toneStats, toneSessions, pinyinStats, pinyinSessions] = await Promise.all([
      getToneLearningStats(), getToneSessionHistory(), getPinyinLearningStats(), getPinyinSessionHistory(),
    ]);
    const sessions = [...toneSessions, ...pinyinSessions].sort(
      (left, right) => right.started_at.localeCompare(left.started_at),
    );
    const completed = sessions.filter((session) => session.status === "completed");
    const totalQuestions = completed.reduce((sum, session) => sum + session.total_questions, 0);
    const correctCount = completed.reduce((sum, session) => sum + session.correct_count, 0);
    const accuracy = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;

    elements["records-summary"].replaceChildren(
      summaryCard("累計プレイ", `${toneStats.play_count + pinyinStats.play_count} 回`),
      summaryCard("累計得点", `${toneStats.total_score + pinyinStats.total_score} 点`),
      summaryCard("正解した問題", `${toneStats.correct_count + pinyinStats.correct_count} 題`),
      summaryCard("全回答の正答率", `${accuracy}%`),
    );

    elements["level-count-list"].replaceChildren(
      ...[
        ...[1, 2, 3, 4].map((level) => ({ gameType: "tone", level })),
        ...[1, 2, 3, 4].map((level) => ({ gameType: "pinyin", level })),
      ].map(({ gameType, level }) => {
        const item = document.createElement("div");
        item.className = "level-count";
        const label = document.createElement("span");
        label.textContent = gameType === "tone" ? LEVEL_TITLES[level] : `ピンイン LV${level}`;
        const count = document.createElement("strong");
        count.textContent = `${completed.filter((session) =>
          (session.game_type === "pinyin" ? "pinyin" : "tone") === gameType && session.level === level,
        ).length} 回`;
        item.append(label, count);
        return item;
      }),
    );

    elements["history-count"].textContent = `${sessions.length} 件`;
    if (!sessions.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "まだ学習記録がありません。声調ゲームかピンインゲームに挑戦すると、ここに保存されます。";
      elements["history-list"].replaceChildren(empty);
    } else {
      elements["history-list"].replaceChildren(...sessions.map(renderSession));
    }
    elements["records-message"].textContent = "Mock Mode · 声調とピンインの回答をこのブラウザー内に保存しています。";
  } catch (error) {
    elements["records-message"].textContent = `学習記録を読み込めませんでした：${error.message}`;
    elements["records-message"].classList.add("is-error");
  }
}

function closePrimaryNav() {
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.menuToggle.setAttribute("aria-label", "メニューを開く");
  elements.primaryNav.classList.remove("is-open");
}

elements["refresh-records"].addEventListener("click", loadHistory);
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

loadHistory();
