import fetch from "node-fetch";

// ================================
// Pinyin Game
// ================================

const games = new Map();

const AUDIO_BASE_URL =
  "https://raw.githubusercontent.com/finnapop/ChaiGo/main/ToneGame/audio";

// ================================
// LV1：單漢字拼音＋聲調
// ================================

const lv1Questions = [
  // ma
  {
    char: "媽",
    pinyin: "ma",
    tone: 1,
    answer: "mā",
    audio: `${AUDIO_BASE_URL}/lv1/ma_01.mp3`,
  },
  {
    char: "麻",
    pinyin: "ma",
    tone: 2,
    answer: "má",
    audio: `${AUDIO_BASE_URL}/lv1/ma_02.mp3`,
  },
  {
    char: "馬",
    pinyin: "ma",
    tone: 3,
    answer: "mǎ",
    audio: `${AUDIO_BASE_URL}/lv1/ma_03.mp3`,
  },
  {
    char: "罵",
    pinyin: "ma",
    tone: 4,
    answer: "mà",
    audio: `${AUDIO_BASE_URL}/lv1/ma_04.mp3`,
  },

  // ba
  {
    char: "八",
    pinyin: "ba",
    tone: 1,
    answer: "bā",
    audio: `${AUDIO_BASE_URL}/lv1/ba_01.mp3`,
  },
  {
    char: "拔",
    pinyin: "ba",
    tone: 2,
    answer: "bá",
    audio: `${AUDIO_BASE_URL}/lv1/ba_02.mp3`,
  },
  {
    char: "把",
    pinyin: "ba",
    tone: 3,
    answer: "bǎ",
    audio: `${AUDIO_BASE_URL}/lv1/ba_03.mp3`,
  },
  {
    char: "爸",
    pinyin: "ba",
    tone: 4,
    answer: "bà",
    audio: `${AUDIO_BASE_URL}/lv1/ba_04.mp3`,
  },

  // qi
  {
    char: "七",
    pinyin: "qi",
    tone: 1,
    answer: "qī",
    audio: `${AUDIO_BASE_URL}/lv1/qi_01.mp3`,
  },
  {
    char: "旗",
    pinyin: "qi",
    tone: 2,
    answer: "qí",
    audio: `${AUDIO_BASE_URL}/lv1/qi_02.mp3`,
  },
  {
    char: "起",
    pinyin: "qi",
    tone: 3,
    answer: "qǐ",
    audio: `${AUDIO_BASE_URL}/lv1/qi_03.mp3`,
  },
  {
    char: "氣",
    pinyin: "qi",
    tone: 4,
    answer: "qì",
    audio: `${AUDIO_BASE_URL}/lv1/qi_04.mp3`,
  },
];

// ================================
// LINE Reply
// ================================

async function replyMessage(replyToken, messages) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });
}

// ================================
// 隨機選 3 題
// ================================

function getRandomQuestions() {
  const shuffled = [...lv1Questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ================================
// 拼音正規化
// ================================

function normalizePinyin(input) {
  let text = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  // ----------------
  // 數字聲調
  // ----------------

  let tone = null;

  const toneMatch = text.match(/([1-4])$/);

  if (toneMatch) {
    tone = Number(toneMatch[1]);
    text = text.slice(0, -1);
  }

  // ----------------
  // 聲調符號
  // ----------------

  const toneMap = {
    ā: ["a", 1],
    á: ["a", 2],
    ǎ: ["a", 3],
    à: ["a", 4],

    ē: ["e", 1],
    é: ["e", 2],
    ě: ["e", 3],
    è: ["e", 4],

    ī: ["i", 1],
    í: ["i", 2],
    ǐ: ["i", 3],
    ì: ["i", 4],

    ō: ["o", 1],
    ó: ["o", 2],
    ǒ: ["o", 3],
    ò: ["o", 4],

    ū: ["u", 1],
    ú: ["u", 2],
    ǔ: ["u", 3],
    ù: ["u", 4],

    ǖ: ["ü", 1],
    ǘ: ["ü", 2],
    ǚ: ["ü", 3],
    ǜ: ["ü", 4],
  };

  for (const [mark, [base, markTone]] of Object.entries(toneMap)) {
    if (text.includes(mark)) {
      text = text.replace(mark, base);

      if (!tone) {
        tone = markTone;
      }
    }
  }

  return {
    pinyin: text,
    tone,
  };
}

// ================================
// 判斷答案
// ================================

function isCorrectPinyin(input, question) {
  const normalized = normalizePinyin(input);

  return (
    normalized.pinyin === question.pinyin &&
    normalized.tone === question.tone
  );
}

// ================================
// 拼音 → 聲調符號
// ================================

function numberToToneMark(pinyin, tone) {
  const toneMap = {
    a: ["ā", "á", "ǎ", "à"],
    e: ["ē", "é", "ě", "è"],
    i: ["ī", "í", "ǐ", "ì"],
    o: ["ō", "ó", "ǒ", "ò"],
    u: ["ū", "ú", "ǔ", "ù"],
    ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
  };

  if (!tone || tone < 1 || tone > 4) {
    return pinyin;
  }

  // 優先順序：a > e > o > 最後一個母音
  let target = null;

  if (pinyin.includes("a")) {
    target = "a";
  } else if (pinyin.includes("e")) {
    target = "e";
  } else if (pinyin.includes("o")) {
    target = "o";
  } else {
    const vowels = ["i", "u", "ü"];

    for (let i = pinyin.length - 1; i >= 0; i--) {
      if (vowels.includes(pinyin[i])) {
        target = pinyin[i];
        break;
      }
    }
  }

  if (!target) {
    return pinyin;
  }

  return pinyin.replace(
    target,
    toneMap[target][tone - 1]
  );
}

// ================================
// 顯示題目
// ================================

async function sendQuestion(replyToken, game) {
  const question = game.questions[game.current];

  const message = `
🔤 LV1 ピンインチャレンジ開始！💗

全3問
漢字を見て、ピンイン＋声調を入力してね！

第${game.current + 1} / 3問

【${question.char}】

ピンイン＋声調を入力してください。

例：ma1 または mā

🔊 1回目に間違えた後、音声ヒントを1回だけ聞けます。
`.trim();

  await replyMessage(replyToken, [
    {
      type: "text",
      text: message,
    },
  ]);
}

// ================================
// LV 選択
// ================================

async function showLevelMenu(replyToken) {
  const message = `
🔤 ピンインチャレンジ 💗

レベルを選んでね！

🟢 LV1　単漢字ピンイン
🔵 LV2　ステップアップ
🟣 LV3　単語ピンイン
🔴 LV4　上級チャレンジ

現在プレイできるのは：LV1

👉 「LV1」と入力してスタート！
`.trim();

  await replyMessage(replyToken, [
    {
      type: "text",
      text: message,
    },
  ]);
}

// ================================
// LV1 開始
// ================================

async function startLevel1(replyToken, userId) {
  const questions = getRandomQuestions();

  games.set(userId, {
    level: 1,
    questions,
    current: 0,
    score: 0,

    // 每題錯誤次數
    attempts: 0,

    // 是否已經使用音聲提示
    hintUsed: false,
  });

  const game = games.get(userId);

  await sendQuestion(replyToken, game);
}

// ================================
// 音聲提示
// ================================

async function playHint(replyToken, game) {
  const question = game.questions[game.current];

  if (game.attempts < 1) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "まだ1回目の間違い前だよ！\nまず答えてみてね 😊",
      },
    ]);

    return;
  }

  if (game.hintUsed) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "この問題の音声ヒントは、もう使ったよ！\nもう一度答えてみてね 💗",
      },
    ]);

    return;
  }

  game.hintUsed = true;

  await replyMessage(replyToken, [
    {
      type: "audio",
      originalContentUrl: question.audio,
      duration: 1500,
    },
  ]);
}

// ================================
// 下一題
// ================================

async function nextQuestion(replyToken, userId) {
  const game = games.get(userId);

  if (!game) {
    return;
  }

  game.current++;

  // ----------------
  // 3 題結束
  // ----------------

  if (game.current >= game.questions.length) {
    const score = game.score;

    games.delete(userId);

    const message = `
🎉 ピンインチャレンジ終了！

結果：${score} / 3 問正解！

${score === 3
  ? "✨ パーフェクト！すごい！"
  : score === 2
  ? "👏 いい感じ！"
  : score === 1
  ? "💪 もう一回チャレンジしてみよう！"
  : "🌱 大丈夫！もう一度練習してみよう！"}

また遊びたいときは
「LV1」と入力してね 💗
`.trim();

    await replyMessage(replyToken, [
      {
        type: "text",
        text: message,
      },
    ]);

    return;
  }

  // ----------------
  // 新しい問題
  // ----------------

  game.attempts = 0;
  game.hintUsed = false;

  await sendQuestion(replyToken, game);
}

// ================================
// Main Handler
// ================================

export async function handlePinyinGame(event) {
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  if (!userId || !replyToken) {
    return;
  }

  const message = event.message;

  if (!message || message.type !== "text") {
    return;
  }

  const userMessage = message.text.trim();

  // =====================================
  // ピンインチャレンジ開始
  // =====================================

  if (
    userMessage === "ピンインチャレンジ開始" ||
    userMessage === "開始拼音"
  ) {
    await showLevelMenu(replyToken);
    return;
  }

  // =====================================
  // LV 選擇
  // =====================================

  if (userMessage === "LV1" || userMessage === "lv1") {
    await startLevel1(replyToken, userId);
    return;
  }

  if (
    userMessage === "LV2" ||
    userMessage === "lv2" ||
    userMessage === "LV3" ||
    userMessage === "lv3" ||
    userMessage === "LV4" ||
    userMessage === "lv4"
  ) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: `
🚧 このレベルは現在準備中です。

今プレイできるのは LV1 です！

👉 「LV1」と入力してね 💗
`.trim(),
      },
    ]);

    return;
  }

  // =====================================
  // 遊戲進行中
  // =====================================

  const game = games.get(userId);

  if (!game) {
    return;
  }

  const normalizedMessage = userMessage.toLowerCase();

  // =====================================
  // 音聲
  // =====================================

  if (
    normalizedMessage === "音声" ||
    normalizedMessage === "おんせい" ||
    normalizedMessage === "聽音" ||
    normalizedMessage === "听音" ||
    normalizedMessage === "audio"
  ) {
    await playHint(replyToken, game);
    return;
  }

  // =====================================
  // 判斷答案
  // =====================================

  const question = game.questions[game.current];

  const normalized = normalizePinyin(userMessage);

  const correct = isCorrectPinyin(userMessage, question);

  // =====================================
  // 答對
  // =====================================

  if (correct) {
    game.score++;

    await replyMessage(replyToken, [
      {
        type: "text",
        text: `
⭕ 正解！

【${question.char}】＝ ${question.answer}

すごい！🎉
`.trim(),
      },
    ]);

    await nextQuestion(replyToken, userId);

    return;
  }

  // =====================================
  // 第一次答錯
  // =====================================

  if (game.attempts === 0) {
    game.attempts = 1;

    // 拼音正確，但是聲調錯
    if (
      normalized.pinyin === question.pinyin &&
      normalized.tone !== question.tone
    ) {
      await replyMessage(replyToken, [
        {
          type: "text",
          text: `
❌ ピンインは合っているけど、声調が違うよ！

【${question.char}】

🔊 「音声」と入力すると、1回だけ音声を聞けます。

もう一度答えてみてね！
`.trim(),
        },
      ]);
    } else {
      await replyMessage(replyToken, [
        {
          type: "text",
          text: `
❌ 残念！

【${question.char}】

🔊 「音声」と入力すると、1回だけ音声を聞けます。

もう一度答えてみてね！
`.trim(),
        },
      ]);
    }

    return;
  }

  // =====================================
  // 第二次答錯 → 算錯，直接下一題
  // =====================================

  await replyMessage(replyToken, [
    {
      type: "text",
      text: `
❌ 残念！

正解：${question.answer}
`.trim(),
    },
  ]);

  await nextQuestion(replyToken, userId);
}