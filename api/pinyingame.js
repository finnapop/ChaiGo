// ============================================================
// pinyingame.js
// 華語娘｜拼音遊戲
//
// LV1：
// 漢字 → 輸入「拼音＋聲調」
//
// ma1  ✅
// mā   ✅
// ma   ❌
//
// 一輪 3 題
// 可以輸入「聽音」播放提示音檔
//
// 音檔共用 ToneGame/audio/lv1/
// ============================================================

const games = new Map();


// ============================================================
// GitHub 音檔
//
// 與 tonegame.js 共用同一套音檔
// ============================================================

const AUDIO_BASE_URL =
  "https://raw.githubusercontent.com/finnapop/ChaiGo/main/ToneGame/audio";


// ============================================================
// LV1 題庫
//
// ma / ba / qi
//
// _01 = 一聲
// _02 = 二聲
// _03 = 三聲
// _04 = 四聲
// ============================================================

const lv1Questions = [
  {
    char: "媽",
    pinyin: "ma1",
    audio: `${AUDIO_BASE_URL}/lv1/ma_01.mp3`,
    duration: 1500
  },
  {
    char: "八",
    pinyin: "ba1",
    audio: `${AUDIO_BASE_URL}/lv1/ba_01.mp3`,
    duration: 1500
  },
  {
    char: "七",
    pinyin: "qi1",
    audio: `${AUDIO_BASE_URL}/lv1/qi_01.mp3`,
    duration: 1500
  }
];


// ============================================================
// 隨機抽 3 題
//
// 目前剛好 3 題，所以每輪會出現：
// 媽 / 八 / 七
//
// 題目順序會隨機
// ============================================================

function getRandomQuestions() {

  const shuffled =
    [...lv1Questions].sort(
      () => Math.random() - 0.5
    );

  return shuffled.slice(0, 3);
}


// ============================================================
// 聲調符號 → 聲調數字
//
// mā → ma1
// má → ma2
// mǎ → ma3
// mà → ma4
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
//
// 必須同時符合：
// 1. 拼音正確
// 2. 聲調正確
//
// ma1 → ✅
// mā  → ✅
//
// ma  → ❌
// ma2 → ❌
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
// ba1 → bā
// qi1 → qī
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
    toneMarks[vowel]?.[tone - 1];


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
      questions: selectedQuestions
    }
  );


  const game =
    games.get(userId);


  const question =
    game.questions[0];


  await replyToLine(
    event.replyToken,
    [
      {
        type: "text",
        text:
          "🔤 LV1 拼音挑戰開始！💗\n\n" +
          "一輪 3 題\n" +
          "看漢字，輸入拼音＋聲調！\n\n" +
          "第 1 / 3 題\n\n" +
          `【${question.char}】`
      },
      {
        type: "text",
        text:
          "請輸入拼音：\n\n" +
          "例如：ma1 或 mā\n\n" +
          "🔊 不確定？輸入「聽音」"
      }
    ]
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
  // 🔊 聽音提示
  // ==========================================================

  if (
    normalizedMessage === "聽音" ||
    normalizedMessage === "听音" ||
    normalizedMessage === "audio"
  ) {

    await playHint(
      event,
      game
    );

    return true;
  }


  // ==========================================================
  // 判斷答案
  // ==========================================================

  const isCorrect =
    isCorrectPinyin(
      message,
      question.pinyin
    );


  // ==========================================================
  // 答錯
  // ==========================================================

  if (!isCorrect) {

    const userPinyin =
      normalizePinyin(
        message
      );

    const correctPinyin =
      normalizePinyin(
        question.pinyin
      );


    // --------------------------------------------------------
    // 拼音正確，但聲調錯
    // --------------------------------------------------------

    if (
      userPinyin.base ===
        correctPinyin.base &&
      userPinyin.tone !==
        correctPinyin.tone
    ) {

      await replyToLine(
        event.replyToken,
        [
          {
            type: "text",
            text:
              "❌ 拼音對了，但聲調不對喔！\n\n" +
              `【${question.char}】\n\n` +
              "🔊 輸入「聽音」再聽一次"
          }
        ]
      );

    } else {

      await replyToLine(
        event.replyToken,
        [
          {
            type: "text",
            text:
              "❌ 再試一次！\n\n" +
              `【${question.char}】\n\n` +
              "💡 記得要輸入「拼音＋聲調」喔！\n\n" +
              "例如：ma1 或 mā\n\n" +
              "🔊 不確定可以輸入「聽音」"
          }
        ]
      );
    }


    return true;
  }


  // ==========================================================
  // 答對
  // ==========================================================

  game.score++;


  const currentQuestion =
    game.questionIndex + 1;


  const toneMarked =
    numberToToneMark(
      question.pinyin
    );


  // ==========================================================
  // 第 3 題完成
  // ==========================================================

  if (
    currentQuestion === 3
  ) {

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
      userId
    );


    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            "🎉 答對了！\n\n" +
            `【${question.char}】 → ${toneMarked}\n\n` +
            `第 ${currentQuestion} / 3 題`
        },
        {
          type: "text",
          text:
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


  // ==========================================================
  // 下一題
  // ==========================================================

  game.questionIndex++;


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
          "🎉 答對了！\n\n" +
          `【${question.char}】 → ${toneMarked}\n\n` +
          `⭐ 目前得分：${game.score} / ${currentQuestion}`
      },
      {
        type: "text",
        text:
          `🔤 第 ${game.questionIndex + 1} / 3 題\n\n` +
          `【${nextQuestion.char}】\n\n` +
          "請輸入拼音＋聲調\n\n" +
          "💡 例如：ma1 或 mā\n" +
          "🔊 不確定？輸入「聽音」"
      }
    ]
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