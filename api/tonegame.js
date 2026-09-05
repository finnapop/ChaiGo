// ============================================================
// tonegame.js
// 華語娘｜声調チャレンジ
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
// ma / ba / qi
// 每個音節都有四個聲調
// ============================================================

const lv1Questions = [

  // ma
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


  // ba
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


  // qi
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
          "🎧 声調チャレンジ\n\n" +
          "レベルを選んでね 💗\n\n" +
          "🟢 LV1　基本の声調\n" +
          "🔵 LV2　ステップアップ\n" +
          "🟣 LV3　声調チャレンジ\n" +
          "🔴 LV4　上級チャレンジ\n\n" +
          "現在プレイできるのは：LV1\n\n" +
          "👉 「LV1」と入力してスタート！"
      }
    ]
  );
}


// ============================================================
// 開始 LV1
// ============================================================

async function startLevel1(event) {

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
          "🎧 LV1 声調チャレンジ開始！💗\n\n" +
          "1ラウンド 3問\n" +
          "音声を聞いて、どの声調か当ててね！\n\n" +
          "第 1 / 3 問"
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
          "答えてね：\n\n" +
          "1️⃣ 第一声\n" +
          "2️⃣ 第二声\n" +
          "3️⃣ 第三声\n" +
          "4️⃣ 第四声"
      }
    ]
  );
}


// ============================================================
// 声調チャレンジ Handler
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
  // 声調チャレンジ開始 → Level 選択
  // ==========================================================

  if (
    message === "声調チャレンジ開始"
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
            "🚧 まだ準備中です～\n\n" +
            "まずは LV1 に挑戦してみてね！💗"
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
            "🚧 まだ準備中です～\n\n" +
            "まずは LV1 に挑戦してみてね！💗"
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
            "🚧 まだ準備中です～\n\n" +
            "まずは LV1 に挑戦してみてね！💗"
        }
      ]
    );

    return true;
  }


  // ==========================================================
  // 不是聲調遊戲
  // ==========================================================

  if (!games.has(userId)) {
    return false;
  }


  // ==========================================================
  // 取得遊戲
  // ==========================================================

  const game =
    games.get(userId);

  const question =
    game.questions[
      game.questionIndex
    ];


  // ==========================================================
  // 只接受 1～4
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
            "1、2、3、4 のどれかで答えてね！😊"
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
        "🏆 全問正解！すごい！";

    } else if (percentage >= 66) {

      resultMessage =
        "🎉 いい感じ！あと少しで満点！";

    } else {

      resultMessage =
        "💪 大丈夫！もう一度チャレンジしてみよう！";
    }


    games.delete(userId);


    const resultText =
      isCorrect
        ? "🎉 正解！\n\n"
        : "❌ 不正解！\n" +
          `正解は：${question.answer}声\n\n`;


    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            resultText +
            `第 ${currentQuestion} / 3 問\n\n` +
            "🎊 LV1 チャレンジ完了！\n\n" +
            `成績：${finalScore} / 3\n` +
            `正答率：${percentage}%\n\n` +
            resultMessage +
            "\n\n" +
            "もう一度挑戦する？\n" +
            "「LV1」と入力してね！💗"
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


  const resultText =
    isCorrect
      ? `🎉 正解！\n\n現在のスコア：${game.score} / ${currentQuestion}`
      : `❌ 不正解！\n正解は：${question.answer}声\n\n現在のスコア：${game.score} / ${currentQuestion}`;


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
          `🎧 第 ${game.questionIndex + 1} / 3 問\n\n` +
          "もう一度聞いてみてね！"
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
          "答えてね：\n\n" +
          "1️⃣ 第一声\n" +
          "2️⃣ 第二声\n" +
          "3️⃣ 第三声\n" +
          "4️⃣ 第四声"
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