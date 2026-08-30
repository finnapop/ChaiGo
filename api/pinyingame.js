// ============================================================
// pinyingame.js
// 華語娘｜拼音遊戲
//
// LV1 規則：
// 1. 一個漢字一題
// 2. 每輪隨機 3 題
// 3. 必須輸入「拼音＋聲調」
// 4. ma1 / mā 都算正確
// 5. 第一次答錯 → 可以聽一次音
// 6. 聽音不算回答次數
// 7. 第二次答錯 → 算錯並進入下一題
//
// 音檔共用：
// ToneGame/audio/lv1/
// ============================================================

const games = new Map();


// ============================================================
// GitHub 音檔
// ============================================================

const AUDIO_BASE_URL =
  "https://raw.githubusercontent.com/finnapop/ChaiGo/main/ToneGame/audio";


// ============================================================
// LV1 題庫
//
// _01 = 一聲
// _02 = 二聲
// _03 = 三聲
// _04 = 四聲
// ============================================================

const lv1Questions = [

  // ----------------------------------------------------------
  // ma
  // ----------------------------------------------------------

  {
    char: "媽",
    pinyin: "ma1",
    audio: `${AUDIO_BASE_URL}/lv1/ma_01.mp3`,
    duration: 1500
  },
  {
    char: "麻",
    pinyin: "ma2",
    audio: `${AUDIO_BASE_URL}/lv1/ma_02.mp3`,
    duration: 1500
  },
  {
    char: "馬",
    pinyin: "ma3",
    audio: `${AUDIO_BASE_URL}/lv1/ma_03.mp3`,
    duration: 1500
  },
  {
    char: "罵",
    pinyin: "ma4",
    audio: `${AUDIO_BASE_URL}/lv1/ma_04.mp3`,
    duration: 1500
  },


  // ----------------------------------------------------------
  // ba
  // ----------------------------------------------------------

  {
    char: "八",
    pinyin: "ba1",
    audio: `${AUDIO_BASE_URL}/lv1/ba_01.mp3`,
    duration: 1500
  },
  {
    char: "拔",
    pinyin: "ba2",
    audio: `${AUDIO_BASE_URL}/lv1/ba_02.mp3`,
    duration: 1500
  },
  {
    char: "把",
    pinyin: "ba3",
    audio: `${AUDIO_BASE_URL}/lv1/ba_03.mp3`,
    duration: 1500
  },
  {
    char: "爸",
    pinyin: "ba4",
    audio: `${AUDIO_BASE_URL}/lv1/ba_04.mp3`,
    duration: 1500
  },


  // ----------------------------------------------------------
  // qi
  // ----------------------------------------------------------

  {
    char: "七",
    pinyin: "qi1",
    audio: `${AUDIO_BASE_URL}/lv1/qi_01.mp3`,
    duration: 1500
  },
  {
    char: "旗",
    pinyin: "qi2",
    audio: `${AUDIO_BASE_URL}/lv1/qi_02.mp3`,
    duration: 1500
  },
  {
    char: "起",
    pinyin: "qi3",
    audio: `${AUDIO_BASE_URL}/lv1/qi_03.mp3`,
    duration: 1500
  },
  {
    char: "氣",
    pinyin: "qi4",
    audio: `${AUDIO_BASE_URL}/lv1/qi_04.mp3`,
    duration: 1500
  }
];


// ============================================================
// 隨機抽 3 題
// ============================================================

function getRandomQuestions() {

  const shuffled =
    [...lv1Questions].sort(
      () => Math.random() - 0.5
    );

  return shuffled.slice(0, 3);
}


// ============================================================
// 拼音標準化
//
// ma1 → { base: "ma", tone: "1" }
// mā  → { base: "ma", tone: "1" }
//
// ma  → { base: "ma", tone: null }
// ============================================================

function normalizePinyin(text) {

  let value =
    text
      .trim()
      .toLowerCase()
      .normalize("NFC")
      .replace(/\s+/g, "");


  // ----------------------------------------------------------
  // 聲調符號
  // ----------------------------------------------------------

  const toneMap = {
    "ā": ["a", "1"],
    "á": ["a", "2"],
    "ǎ": ["a", "3"],
    "à": ["a", "4"],

    "ē": ["e", "1"],
    "é": ["e", "2"],
    "ě": ["e", "3"],
    "è": ["e", "4"],

    "ī": ["i", "1"],
    "í": ["i", "2"],
    "ǐ": ["i", "3"],
    "ì": ["i", "4"],

    "ō": ["o", "1"],
    "ó": ["o", "2"],
    "ǒ": ["o", "3"],
    "ò": ["o", "4"],

    "ū": ["u", "1"],
    "ú": ["u", "2"],
    "ǔ": ["u", "3"],
    "ù": ["u", "4"],

    "ǖ": ["ü", "1"],
    "ǘ": ["ü", "2"],
    "ǚ": ["ü", "3"],
    "ǜ": ["ü", "4"]
  };


  let detectedTone = null;


  for (
    const [mark, data]
    of Object.entries(toneMap)
  ) {

    if (value.includes(mark)) {

      value =
        value.replace(
          mark,
          data[0]
        );

      detectedTone =
        data[1];

      break;
    }
  }


  // ----------------------------------------------------------
  // 數字聲調
  // ----------------------------------------------------------

  const numberMatch =
    value.match(/([1-4])$/);


  if (numberMatch) {

    detectedTone =
      numberMatch[1];

    value =
      value.replace(
        /[1-4]$/,
        ""
      );
  }


  return {
    base: value,
    tone: detectedTone
  };
}


// ============================================================
// 判斷答案
// ============================================================

function isCorrectPinyin(
  userInput,
  correctPinyin
) {

  const user =
    normalizePinyin(
      userInput
    );

  const correct =
    normalizePinyin(
      correctPinyin
    );


  return (
    user.base === correct.base &&
    user.tone === correct.tone
  );
}


// ============================================================
// 聲調數字 → 聲調符號
//
// ma1 → mā
// ma2 → má
// ma3 → mǎ
// ma4 → mà
// ============================================================

function numberToToneMark(
  pinyin
) {

  const match =
    pinyin.match(
      /^(.+)([1-4])$/
    );


  if (!match) {
    return pinyin;
  }


  const base =
    match[1];

  const tone =
    Number(match[2]);


  const toneMarks = {
    a: ["ā", "á", "ǎ", "à"],
    e: ["ē", "é", "ě", "è"],
    i: ["ī", "í", "ǐ", "ì"],
    o: ["ō", "ó", "ǒ", "ò"],
    u: ["ū", "ú", "ǔ", "ù"],
    "ü": ["ǖ", "ǘ", "ǚ", "ǜ"]
  };


  let vowelIndex = -1;


  // ----------------------------------------------------------
  // a / e 優先
  // ----------------------------------------------------------

  for (
    const vowel of ["a", "e"]
  ) {

    const index =
      base.indexOf(vowel);

    if (index !== -1) {

      vowelIndex =
        index;

      break;
    }
  }


  // ----------------------------------------------------------
  // ou → o
  // ----------------------------------------------------------

  if (
    vowelIndex === -1
  ) {

    const ouIndex =
      base.indexOf("ou");

    if (
      ouIndex !== -1
    ) {

      vowelIndex =
        ouIndex;

    } else {

      // ------------------------------------------------------
      // 否則找最後一個母音
      // ------------------------------------------------------

      for (
        let i = base.length - 1;
        i >= 0;
        i--
      ) {

        if (
          toneMarks[base[i]]
        ) {

          vowelIndex =
            i;

          break;
        }
      }
    }
  }


  if (
    vowelIndex === -1
  ) {

    return pinyin;
  }


  const vowel =
    base[vowelIndex];


  const markedVowel =
    toneMarks[vowel]?.[
      tone - 1
    ];


  if (
    !markedVowel
  ) {

    return pinyin;
  }


  return (
    base.slice(
      0,
      vowelIndex
    ) +
    markedVowel +
    base.slice(
      vowelIndex + 1
    )
  );
}


// ============================================================
// 顯示 Level 選擇
// ============================================================

async function showLevelSelection(
  replyToken
) {

  await replyToLine(
    replyToken,
    [
      {
        type: "text",
        text:
          "🔤 拼音挑戰\n\n" +
          "選擇你的 Level 💗\n\n" +
          "🟢 LV1　單字拼音\n" +
          "🔵 LV2　進階拼音\n" +
          "🟣 LV3　詞語拼音\n" +
          "🔴 LV4　高手挑戰\n\n" +
          "目前開放：LV1\n\n" +
          "👉 請輸入「LV1」開始"
      }
    ]
  );
}


// ============================================================
// 顯示題目
// ============================================================

async function sendQuestion(
  event,
  game,
  introText
) {

  const question =
    game.questions[
      game.questionIndex
    ];


  await replyToLine(
    event.replyToken,
    [
      {
        type: "text",
        text:
          introText +
          `\n\n第 ${game.questionIndex + 1} / 3 題\n\n` +
          `【${question.char}】`
      },
      {
        type: "text",
        text:
          "請輸入拼音＋聲調\n\n" +
          "例如：ma1 或 mā\n\n" +
          "🔊 第一次答錯後可以聽音"
      }
    ]
  );
}


// ============================================================
// 開始 LV1
// ============================================================

async function startLevel1(
  event
) {

  const userId =
    event.source.userId;


  const selectedQuestions =
    getRandomQuestions();


  games.set(
    userId,
    {
      level: 1,

      questionIndex: 0,

      score: 0,

      questions:
        selectedQuestions,

      // --------------------------------------------------------
      // 本題是否已經回答過一次
      // --------------------------------------------------------

      attempts: 0,

      // --------------------------------------------------------
      // 本題是否已經使用聽音提示
      // --------------------------------------------------------

      hintUsed: false
    }
  );


  const game =
    games.get(userId);


  await sendQuestion(
    event,
    game,
    "🔤 LV1 拼音挑戰開始！💗\n\n" +
    "一輪 3 題\n" +
    "看漢字，輸入拼音＋聲調！"
  );
}


// ============================================================
// 聽音提示
// ============================================================

async function playHint(
  event,
  game
) {

  const question =
    game.questions[
      game.questionIndex
    ];


  await replyToLine(
    event.replyToken,
    [
      {
        type: "audio",

        originalContentUrl:
          question.audio,

        duration:
          question.duration
      },
      {
        type: "text",

        text:
          "🔊 聽音提示\n\n" +
          `【${question.char}】\n\n` +
          "再想想看它的拼音＋聲調喔～"
      }
    ]
  );
}


// ============================================================
// 進入下一題
// ============================================================

async function nextQuestion(
  event,
  game,
  resultText
) {

  game.questionIndex++;

  game.attempts = 0;

  game.hintUsed = false;


  // ----------------------------------------------------------
  // 還有下一題
  // ----------------------------------------------------------

  if (
    game.questionIndex < 3
  ) {

    const nextQuestion =
      game.questions[
        game.questionIndex
      ];


    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            resultText +
            "\n\n" +
            `🔤 第 ${game.questionIndex + 1} / 3 題\n\n` +
            `【${nextQuestion.char}】\n\n` +
            "請輸入拼音＋聲調\n\n" +
            "🔊 第一次答錯後可以聽音"
        }
      ]
    );


    return true;
  }


  // ----------------------------------------------------------
  // 3 題全部完成
  // ----------------------------------------------------------

  const finalScore =
    game.score;


  const percentage =
    Math.round(
      (finalScore / 3) * 100
    );


  let resultMessage = "";


  if (
    percentage === 100
  ) {

    resultMessage =
      "🏆 全部答對！太厲害了！";

  } else if (
    percentage >= 66
  ) {

    resultMessage =
      "🎉 很棒！再練一下就滿分了！";

  } else {

    resultMessage =
      "💪 沒關係，再挑戰一次吧！";
  }


  games.delete(
    event.source.userId
  );


  await replyToLine(
    event.replyToken,
    [
      {
        type: "text",
        text:
          resultText +
          "\n\n" +
          "🎊 LV1 挑戰完成！\n\n" +
          `你的成績：${finalScore} / 3\n` +
          `正答率：${percentage}%\n\n` +
          resultMessage +
          "\n\n" +
          "想再挑戰一次嗎？\n" +
          "輸入「LV1」即可！💗"
      }
    ]
  );


  return true;
}


// ============================================================
// 拼音遊戲 Handler
// ============================================================

export async function handlePinyinGame(
  event,
  message
) {

  const userId =
    event.source.userId;


  const normalizedMessage =
    message
      .trim()
      .toLowerCase();


  // ==========================================================
  // 開始拼音
  // ==========================================================

  if (
    message === "開始拼音"
  ) {

    await showLevelSelection(
      event.replyToken
    );

    return true;
  }


  // ==========================================================
  // LV1
  // ==========================================================

  if (
    normalizedMessage === "lv1" ||
    normalizedMessage === "level1"
  ) {

    await startLevel1(
      event
    );

    return true;
  }


  // ==========================================================
  // LV2
  // ==========================================================

  if (
    normalizedMessage === "lv2" ||
    normalizedMessage === "level2"
  ) {

    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            "🔵 LV2\n\n" +
            "🚧 還在準備中喔～\n\n" +
            "先來挑戰 LV1 吧！💗"
        }
      ]
    );

    return true;
  }


  // ==========================================================
  // LV3
  // ==========================================================

  if (
    normalizedMessage === "lv3" ||
    normalizedMessage === "level3"
  ) {

    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            "🟣 LV3\n\n" +
            "🚧 還在準備中喔～\n\n" +
            "先來挑戰 LV1 吧！💗"
        }
      ]
    );

    return true;
  }


  // ==========================================================
  // LV4
  // ==========================================================

  if (
    normalizedMessage === "lv4" ||
    normalizedMessage === "level4"
  ) {

    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            "🔴 LV4\n\n" +
            "🚧 還在準備中喔～\n\n" +
            "先來挑戰 LV1 吧！💗"
        }
      ]
    );

    return true;
  }


  // ==========================================================
  // 沒有正在進行拼音遊戲
  // ==========================================================

  if (
    !games.has(userId)
  ) {

    return false;
  }


  // ==========================================================
  // 取得目前遊戲
  // ==========================================================

  const game =
    games.get(userId);


  const question =
    game.questions[
      game.questionIndex
    ];


  // ==========================================================
  // 🔊 聽音
  //
  // 只能在第一次答錯後使用
  // ==========================================================

  if (
    normalizedMessage === "聽音" ||
    normalizedMessage === "听音" ||
    normalizedMessage === "audio"
  ) {

    // --------------------------------------------------------
    // 還沒有答錯
    // --------------------------------------------------------

    if (
      game.attempts === 0
    ) {

      await replyToLine(
        event.replyToken,
        [
          {
            type: "text",
            text:
              "💡 先試著回答一次喔！\n\n" +
              "答錯後就可以使用 🔊 聽音提示。"
          }
        ]
      );

      return true;
    }


    // --------------------------------------------------------
    // 已經使用過提示
    // --------------------------------------------------------

    if (
      game.hintUsed
    ) {

      await replyToLine(
        event.replyToken,
        [
          {
            type: "text",
            text:
              "🔊 這一題的聽音提示已經使用過囉！"
          }
        ]
      );

      return true;
    }


    game.hintUsed =
      true;


    await playHint(
      event,
      game
    );

    return true;
  }


  // ==========================================================
  // 第一次 / 第二次回答
  // ==========================================================

  game.attempts++;


  const isCorrect =
    isCorrectPinyin(
      message,
      question.pinyin
    );


  // ==========================================================
  // 答對
  // ==========================================================

  if (
    isCorrect
  ) {

    game.score++;


    const toneMarked =
      numberToToneMark(
        question.pinyin
      );


    await nextQuestion(
      event,
      game,
      "🎉 答對了！\n\n" +
      `【${question.char}】 → ${toneMarked}\n` +
      `⭐ 目前得分：${game.score} / ${game.questionIndex + 1}`
    );


    return true;
  }


  // ==========================================================
  // 第一次答錯
  //
  // 還可以聽音
  // ==========================================================

  if (
    game.attempts === 1
  ) {

    const userPinyin =
      normalizePinyin(
        message
      );

    const correctPinyin =
      normalizePinyin(
        question.pinyin
      );


    let errorMessage =
      "";


    if (
      userPinyin.base ===
        correctPinyin.base &&
      userPinyin.tone !==
        correctPinyin.tone
    ) {

      errorMessage =
        "❌ 拼音對了，但聲調不對喔！";

    } else {

      errorMessage =
        "❌ 再試一次！";
    }


    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            errorMessage +
            "\n\n" +
            `【${question.char}】\n\n` +
            "🔊 可以輸入「聽音」聽一次提示！\n\n" +
            "然後再回答一次。"
        }
      ]
    );


    return true;
  }


  // ==========================================================
  // 第二次答錯
  //
  // 正式算錯
  // 直接進下一題
  // ==========================================================

  const correctToneMarked =
    numberToToneMark(
      question.pinyin
    );


  await nextQuestion(
    event,
    game,
    "❌ 答錯了！\n\n" +
    `正確答案：${correctToneMarked}`
  );


  return true;
}


// ============================================================
// LINE Reply API
// ============================================================

async function replyToLine(
  replyToken,
  messages
) {

  const response =
    await fetch(
      "https://api.line.me/v2/bot/message/reply",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        },

        body: JSON.stringify({
          replyToken,
          messages
        })
      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();


    console.error(
      "LINE Reply API Error:",
      response.status,
      errorText
    );


    throw new Error(
      `LINE Reply API failed: ${response.status}`
    );
  }


  return response.json();
}