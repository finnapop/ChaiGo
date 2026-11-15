// Shared question data for the browser game and its server-side record API.
// Exposed as a small global so this page also works when opened from file://.
(() => {

const TONE_OPTIONS = [
  { value: 1, label: "第一聲", contour: "平聲" },
  { value: 2, label: "第二聲", contour: "上揚" },
  { value: 3, label: "第三聲", contour: "先降後升" },
  { value: 4, label: "第四聲", contour: "下降" },
];

const LV2_ANSWER_OPTIONS = [
  { value: 1, label: "第一聲＋第一聲", contour: "1–1", tones: [1, 1] },
  { value: 2, label: "第一聲＋第四聲", contour: "1–4", tones: [1, 4] },
  { value: 3, label: "第三聲＋第二聲", contour: "3–2", tones: [3, 2] },
  { value: 4, label: "第三聲＋第四聲", contour: "3–4", tones: [3, 4] },
];

const LV3_ANSWER_OPTIONS = [
  { value: 1, label: "4–4–1–4", contour: "逐字聲調", tones: [4, 4, 1, 4] },
  { value: 2, label: "2–1–4–4–3", contour: "逐字聲調", tones: [2, 1, 4, 4, 3] },
  { value: 3, label: "4–1–3", contour: "逐字聲調", tones: [4, 1, 3] },
  { value: 4, label: "2–1–3–4", contour: "逐字聲調", tones: [2, 1, 3, 4] },
];

const QUESTIONS_PER_ROUND = 3;
const LV2_QUESTIONS_PER_ROUND = 3;
const LV3_QUESTIONS_PER_ROUND = 3;

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

// LV2 answer choices describe both tones in each two-character word.
const lv2AnswerKey = [
  { word: "開心", filename: "開心.wav", answer: 1 }, // 1–1
  { word: "天氣", filename: "天氣.wav", answer: 2 }, // 1–4
  { word: "草莓", filename: "草莓.wav", answer: 3 }, // 3–2
  { word: "可愛", filename: "可愛.wav", answer: 4 }, // 3–4
];

const LV2_QUESTIONS = lv2AnswerKey.map(({ word, filename, answer }) => ({
  id: `lv2-${word}`,
  level: 2,
  word,
  audioId: `lv2/${filename}`,
  audioUrl: `./ToneGame/audio/lv2/${filename}`,
  answer,
  durationMs: 2000,
}));

// LV3 uses each phrase's standard Taiwanese Mandarin lexical tone sequence.
const lv3AnswerKey = [
  { word: "便利商店", filename: "便利商店.m4a", answer: 1 }, // biàn-lì-shāng-diàn: 4–4–1–4
  { word: "明天會下雨", filename: "明天會下雨.m4a", answer: 2 }, // míng-tiān-huì-xià-yǔ: 2–1–4–4–3
  { word: "大家好", filename: "大家好.m4a", answer: 3 }, // dà-jiā-hǎo: 4–1–3
  { word: "台灣很熱", filename: "台灣很熱.m4a", answer: 4 }, // tái-wān-hěn-rè: 2–1–3–4
];

const LV3_QUESTIONS = lv3AnswerKey.map(({ word, filename, answer }) => ({
  id: `lv3-${word}`,
  level: 3,
  word,
  audioId: `lv3/${filename}`,
  audioUrl: `./ToneGame/audio/lv3/${filename}`,
  answer,
  durationMs: 3000,
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
    status: "available",
    questionCount: LV2_QUESTIONS.length,
    questionsPerRound: LV2_QUESTIONS_PER_ROUND,
    description: "四つの音声から毎回ランダムに三題出題し、二文字語の声調の組み合わせを聞き分けます。",
  },
  {
    id: 3,
    title: "LV3｜声調チャレンジ",
    status: "available",
    questionCount: LV3_QUESTIONS.length,
    questionsPerRound: LV3_QUESTIONS_PER_ROUND,
    description: "四つの句から毎回ランダムに三題出題し、句全体の声調パターンを聞き分けます。",
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
const QUESTIONS_BY_LEVEL = Object.freeze({
  1: LV1_QUESTIONS,
  2: LV2_QUESTIONS,
  3: LV3_QUESTIONS,
});
const ANSWER_OPTIONS_BY_LEVEL = Object.freeze({
  1: TONE_OPTIONS,
  2: LV2_ANSWER_OPTIONS,
  3: LV3_ANSWER_OPTIONS,
});

window.ChaiGoToneGameData = Object.freeze({
  TONE_OPTIONS,
  LV2_ANSWER_OPTIONS,
  LV3_ANSWER_OPTIONS,
  QUESTIONS_PER_ROUND,
  LV2_QUESTIONS_PER_ROUND,
  LV3_QUESTIONS_PER_ROUND,
  LV1_QUESTIONS,
  LV2_QUESTIONS,
  LV3_QUESTIONS,
  QUESTIONS_BY_LEVEL,
  ANSWER_OPTIONS_BY_LEVEL,
  LEVELS,
  LV1_QUESTION_BY_ID,
});
})();
