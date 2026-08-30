// ============================================================
// pinyingame.js
// 華語娘｜拼音遊戲
// ============================================================

const games = new Map();


// ============================================================
// LV1 題庫
//
// LV1：一個漢字 → 輸入拼音
//
// 聲調不列入主要判斷：
// ma  ✅
// ma1 ✅
// mā  ✅
// ============================================================

const lv1Questions = [
  {
    char: "媽",
    pinyin: "ma"
  },
  {
    char: "爸",
    pinyin: "ba"
  },
  {
    char: "你",
    pinyin: "ni"
  },
  {
    char: "我",
    pinyin: "wo"
  },
  {
    char: "好",
    pinyin: "hao"
  },
  {
    char: "大",
    pinyin: "da"
  },
  {
    char: "小",
    pinyin: "xiao"
  },
  {
    char: "人",
    pinyin: "ren"
  },
  {
    char: "家",
    pinyin: "jia"
  },
  {
    char: "吃",
    pinyin: "chi"
  }
];


// ============================================================
// 隨機抽 3 題
// ============================================================

function getRandomQuestions() {
  const shuffled = [...lv1Questions].sort(
    () => Math.random() - 0.5
  );

  return shuffled.slice(0, 3);
}


// ============================================================
// 把拼音標準化
//
// 支援：
// ma
// ma1
// mā
//
// 最後都會變成：
// ma
// ============================================================

function normalizePinyin(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, "")
    .replace(/[1-5]$/, "")
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[ǖǘǚǜ]/g, "ü");
}


// ============================================================
// 顯示 Level 選擇
// ============================================================

async function showLevelSelection(replyToken) {

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
// 顯示 LV1 第一題
// ============================================================

async function startLevel1(event) {

  const userId = event.source.userId;

  const selectedQuestions =
    getRandomQuestions();

  games.set(userId, {
    level: 1,
    questionIndex: 0,
    score: 0,
    questions: selectedQuestions
  });

  const game = games.get(userId);

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
          "看漢字，輸入拼音！\n\n" +
          "第 1 / 3 題\n\n" +
          `【${question.char}】`
      },
      {
        type: "text",
        text:
          "請輸入拼音：\n\n" +
          "例如：ma"
      }
    ]
  );
}


// ============================================================
// 處理拼音遊戲
//
// return true  = 已處理
// return false = 不是拼音遊戲訊息
// ============================================================

export async function handlePinyinGame(
  event,
  message
) {

  const userId =
    event.source.userId;

  const normalizedMessage =
    message.trim().toLowerCase();


  // ==========================================================
  // 「開始拼音」
  //
  // Rich Menu「拼音遊戲」
  // → 自動送出「開始拼音」
  // ==========================================================

  if (
    normalizedMessage === "開始拼音"
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

    await startLevel1(event);

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

  if (!games.has(userId)) {
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
  // 判斷答案
  // ==========================================================

  const userAnswer =
    normalizePinyin(message);

  const correctAnswer =
    normalizePinyin(question.pinyin);

  const isCorrect =
    userAnswer === correctAnswer;


  // ==========================================================
  // 答錯
  // ==========================================================

  if (!isCorrect) {

    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            "❌ 再試一次！\n\n" +
            `【${question.char}】\n\n` +
            "💡 提示：請輸入這個漢字的拼音喔～"
        }
      ]
    );

    return true;
  }


  // ==========================================================
  // 答對
  // ==========================================================

  game.score++;

  const currentQuestion =
    game.questionIndex + 1;


  // ==========================================================
  // 第 3 題完成
  // ==========================================================

  if (currentQuestion === 3) {

    const finalScore =
      game.score;

    const percentage =
      Math.round(
        (finalScore / 3) * 100
      );


    let resultMessage = "";

    if (percentage === 100) {

      resultMessage =
        "🏆 全部答對！太厲害了！";

    } else if (percentage >= 66) {

      resultMessage =
        "🎉 很棒！再練一下就滿分了！";

    } else {

      resultMessage =
        "💪 沒關係，再挑戰一次吧！";
    }


    games.delete(userId);


    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            "🎉 答對了！\n\n" +
            `【${question.char}】 → ${question.pinyin}\n\n` +
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
          `【${question.char}】 → ${question.pinyin}\n\n` +
          `⭐ 目前得分：${game.score} / ${currentQuestion}`
      },
      {
        type: "text",
        text:
          `🔤 第 ${game.questionIndex + 1} / 3 題\n\n` +
          `【${nextQuestion.char}】\n\n` +
          "請輸入拼音："
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