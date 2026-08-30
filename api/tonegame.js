// ============================================================
// toneGame.js
// 華語娘｜聲調遊戲
// ============================================================


// ============================================================
// 玩家遊戲狀態
//
// userId → 遊戲資料
//
// {
//   level: 1,
//   questionIndex: 0,
//   score: 0,
//   questions: [...]
// }
// ============================================================

const games = new Map();


// ============================================================
// GitHub 音檔
//
// ToneGame/
// └── audio/
//     ├── lv1/
//     ├── lv2/
//     ├── lv3/
//     └── lv4/
// ============================================================

const AUDIO_BASE_URL =
  "https://raw.githubusercontent.com/finnapop/ChaiGo/main/ToneGame/audio";


// ============================================================
// LV1 題庫
//
// 每個音節 × 四個聲調
//
// ma_01 → 一聲
// ma_02 → 二聲
// ma_03 → 三聲
// ma_04 → 四聲
//
// ba / qi 同樣
// ============================================================

const lv1Questions = [

  // ----------------------------------------------------------
  // ma
  // ----------------------------------------------------------

  {
    audio: `${AUDIO_BASE_URL}/lv1/ma_01.mp3`,
    answer: 1,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/ma_02.mp3`,
    answer: 2,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/ma_03.mp3`,
    answer: 3,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/ma_04.mp3`,
    answer: 4,
    duration: 1500
  },


  // ----------------------------------------------------------
  // ba
  // ----------------------------------------------------------

  {
    audio: `${AUDIO_BASE_URL}/lv1/ba_01.mp3`,
    answer: 1,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/ba_02.mp3`,
    answer: 2,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/ba_03.mp3`,
    answer: 3,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/ba_04.mp3`,
    answer: 4,
    duration: 1500
  },


  // ----------------------------------------------------------
  // qi
  // ----------------------------------------------------------

  {
    audio: `${AUDIO_BASE_URL}/lv1/qi_01.mp3`,
    answer: 1,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/qi_02.mp3`,
    answer: 2,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/qi_03.mp3`,
    answer: 3,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/lv1/qi_04.mp3`,
    answer: 4,
    duration: 1500
  }
];


// ============================================================
// 目前開放的 Level
//
// 目前只有 LV1
// LV2～LV4 先顯示，但尚未開放
// ============================================================

const availableLevels = {
  1: true,
  2: false,
  3: false,
  4: false
};


// ============================================================
// 隨機抽 3 題
// ============================================================

function getRandomQuestions(questionPool) {

  const shuffled =
    [...questionPool].sort(
      () => Math.random() - 0.5
    );


  return shuffled.slice(0, 3);
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
          "🎧 聲調挑戰\n\n" +
          "選擇你的 Level 💗\n\n" +
          "🟢 LV1　基礎聲調\n" +
          "🔵 LV2　進階聲調\n" +
          "🟣 LV3　挑戰聲調\n" +
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
    getRandomQuestions(
      lv1Questions
    );


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
          "🎧 LV1 聲調挑戰開始！💗\n\n" +
          "一輪 3 題\n" +
          "請聽聲音，猜猜是哪一個聲調！\n\n" +
          "第 1 / 3 題"
      },
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
          "請回答：\n\n" +
          "1️⃣ 一聲\n" +
          "2️⃣ 二聲\n" +
          "3️⃣ 三聲\n" +
          "4️⃣ 四聲"
      }
    ]
  );
}


// ============================================================
// 處理聲調遊戲
//
// return true  = 已經處理這個訊息
// return false = 不是聲調遊戲的訊息
// ============================================================

export async function handleToneGame(
  event,
  message
) {

  const userId =
    event.source.userId;


  const normalizedMessage =
    message.trim().toLowerCase();


  // ==========================================================
  // 「開始」
  //
  // Rich Menu 點擊「聲調遊戲」
  // LINE 自動送出「開始」
  //
  // → 顯示 LV 選擇
  // ==========================================================

  if (
    normalizedMessage === "開始" ||
    normalizedMessage === "start"
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

    if (!availableLevels[1]) {

      await replyToLine(
        event.replyToken,
        [
          {
            type: "text",
            text:
              "🚧 LV1 目前尚未開放喔～"
          }
        ]
      );

      return true;
    }


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
  // 如果玩家沒有正在玩遊戲
  //
  // 不是聲調遊戲相關訊息
  // → 交回 webhook.js
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
  // 玩家輸入不是 1～4
  // ==========================================================

  if (
    !["1", "2", "3", "4"].includes(
      normalizedMessage
    )
  ) {

    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            "請回答 1、2、3 或 4 喔！😊"
        }
      ]
    );

    return true;
  }


  // ==========================================================
  // 判斷答案
  // ==========================================================

  const selectedAnswer =
    Number(normalizedMessage);


  const isCorrect =
    selectedAnswer === question.answer;


  if (isCorrect) {
    game.score++;
  }


  const currentQuestion =
    game.questionIndex + 1;


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


    // --------------------------------------------------------
    // 評語
    // --------------------------------------------------------

    let resultMessage = "";


    if (percentage === 100) {

      resultMessage =
        "🏆 全部答對！太厲害了！";

    } else if (percentage >= 66) {

      resultMessage =
        "🎉 很棒！聲調掌握得很好！";

    } else {

      resultMessage =
        "💪 沒關係，再挑戰一次吧！";
    }


    // --------------------------------------------------------
    // 清除遊戲
    // --------------------------------------------------------

    games.delete(userId);


    // --------------------------------------------------------
    // 最終結果
    // --------------------------------------------------------

    const resultText =
      isCorrect
        ? "🎉 答對了！\n\n"
        : "❌ 答錯了！\n" +
          `正確答案是：${question.answer}聲\n\n`;


    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            resultText +
            `第 ${currentQuestion} / 3 題\n\n` +
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
  // 還有下一題
  // ==========================================================

  game.questionIndex++;


  const nextQuestion =
    game.questions[
      game.questionIndex
    ];


  const resultText =
    isCorrect
      ? `🎉 答對了！\n\n目前得分：${game.score} / ${currentQuestion}`
      : `❌ 答錯了！\n正確答案是：${question.answer}聲\n\n目前得分：${game.score} / ${currentQuestion}`;


  await replyToLine(
    event.replyToken,
    [
      {
        type: "text",
        text:
          resultText
      },
      {
        type: "text",
        text:
          `🎧 第 ${game.questionIndex + 1} / 3 題\n\n` +
          "再聽聽看！"
      },
      {
        type: "audio",
        originalContentUrl:
          nextQuestion.audio,
        duration:
          nextQuestion.duration
      },
      {
        type: "text",
        text:
          "請回答：\n\n" +
          "1️⃣ 一聲\n" +
          "2️⃣ 二聲\n" +
          "3️⃣ 三聲\n" +
          "4️⃣ 四聲"
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