// Shared question data for the browser game and its server-side record API.
// Exposed as a small global so this page also works when opened from file://.
(() => {

const TONE_OPTIONS = [
  { value: 1, label: "第一聲", contour: "平聲" },
  { value: 2, label: "第二聲", contour: "上揚" },
  { value: 3, label: "第三聲", contour: "先降後升" },
  { value: 4, label: "第四聲", contour: "下降" },
];

const QUESTIONS_PER_ROUND = 3;

// Answer keys are transcribed from the explicit audio/answer pairs in
// api/tonegame.js (the existing LINE game), rather than inferred from filenames.
const lv1AnswerKey = [
  { syllable: "ma", filename: "ma_01.mp3", answer: 1 },
  { syllable: "ma", filename: "ma_02.mp3", answer: 2 },
  { syllable: "ma", filename: "ma_03.mp3", answer: 3 },
  { syllable: "ma", filename: "ma_04.mp3", answer: 4 },
  { syllable: "ba", filename: "ba_01.mp3", answer: 1 },
  { syllable: "ba", filename: "ba_02.mp3", answer: 2 },
  { syllable: "ba", filename: "ba_03.mp3", answer: 3 },
  { syllable: "ba", filename: "ba_04.mp3", answer: 4 },
  { syllable: "qi", filename: "qi_01.mp3", answer: 1 },
  { syllable: "qi", filename: "qi_02.mp3", answer: 2 },
  { syllable: "qi", filename: "qi_03.mp3", answer: 3 },
  { syllable: "qi", filename: "qi_04.mp3", answer: 4 },
];

const LV1_QUESTIONS = lv1AnswerKey.map(({ syllable, filename, answer }) => ({
  id: `lv1-${syllable}-${answer}`,
  level: 1,
  audioId: `lv1/${filename}`,
  audioUrl: `./ToneGame/audio/lv1/${filename}`,
  answer,
  durationMs: 1500,
}));

const LEVELS = [
  {
    id: 1,
    title: "LV1｜基本の声調",
    status: "available",
    questionCount: LV1_QUESTIONS.length,
    questionsPerRound: QUESTIONS_PER_ROUND,
    description: "ma・ba・qi の四声を聞き分けます。",
  },
  {
    id: 2,
    title: "LV2｜ステップアップ",
    status: "incomplete",
    questionCount: 4,
    description: "音檔はありますが、正解の対応表が未確認です。",
  },
  {
    id: 3,
    title: "LV3｜声調チャレンジ",
    status: "incomplete",
    questionCount: 4,
    description: "音檔はありますが、出題内容と正解の対応表が未確認です。",
  },
  {
    id: 4,
    title: "LV4｜上級チャレンジ",
    status: "incomplete",
    questionCount: 0,
    description: "現在、題庫と音檔はありません。",
  },
];

const LV1_QUESTION_BY_ID = Object.fromEntries(
  LV1_QUESTIONS.map((question) => [question.id, question]),
);

window.ChaiGoToneGameData = Object.freeze({
  TONE_OPTIONS,
  QUESTIONS_PER_ROUND,
  LV1_QUESTIONS,
  LEVELS,
  LV1_QUESTION_BY_ID,
});
})();
