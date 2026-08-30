// ============================================================
// toneGame.js
// 華語娘｜聲調遊戲
// ============================================================

const games = new Map();


// ============================================================
// GitHub 音檔
// ============================================================

const AUDIO_BASE_URL =
  "https://raw.githubusercontent.com/finnapop/ChaiGo/main/ToneGame/audio/lv1";


// ============================================================
// 題庫
//
// ma / ba / qi
// 每個音節都有四個聲調
// ============================================================

const questions = [
  // -------------------------
  // ma
  // -------------------------

  {
    audio: `${AUDIO_BASE_URL}/ma_01.mp3`,
    answer: 1,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ma_02.mp3`,
    answer: 2,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ma_03.mp3`,
    answer: 3,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ma_04.mp3`,
    answer: 4,
    duration: 1500
  },


  // -------------------------
  // ba
  // -------------------------

  {
    audio: `${AUDIO_BASE_URL}/ba_01.mp3`,
    answer: 1,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ba_02.mp3`,
    answer: 2,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ba_03.mp3`,
    answer: 3,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ba_04.mp3`,
    answer: 4,
    duration: 1500
  },


  // -------------------------
  // qi
  // -------------------------

  {
    audio: `${AUDIO_BASE_URL}/qi_01.mp3`,
    answer: 1,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/qi_02.mp3`,
    answer: 2,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/qi_03.mp3`,
    answer: 3,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/qi_04.mp3`,
    answer: 4,
    duration: 1500
  }
];


// ============================================================
// 隨機抽 3 題
// ============================================================

function getRandomQuestions() {

  const shuffled = [...questions].sort(
    () => Math.random() - 0.5
  );

  return shuffled.slice(0, 3);
}


// ============================================================
// 聲調遊戲
// ============================================================

export async function handleToneGame(
  event,
  message
) {

  const userId =
    event.source.userId;


  // ==========================================================
  // 開始遊戲
  // ==========================================================

  if (
    message === "開始" ||
    message.toLowerCase() === "start"
  ) {

    const selectedQuestions =
      getRandomQuestions();


    games.set(userId, {
      questionIndex: 0,
      score: 0,
      questions: selectedQuestions
    });


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
            "🎧 聲調挑戰開始！💗\n\n" +
            "一輪 3 題，準備好了嗎？\n\n" +
            "第 1 / 3 題\n" +
            "請聽聲音，猜猜是哪一個聲調！"
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


    return true;
  }


  // ==========================================================
  // 沒有正在玩聲調遊戲
  // ==========================================================

  if (!games.has(userId)) {
    return false;
  }


  // ==========================================================
  // 取得目前遊戲
  // ==========================================================

  const game =
    games.get(userId);


  // ==========================================================
  // 只接受 1 / 2 / 3 / 4
  // ==========================================================

  if (
    !["1", "2", "3", "4"].includes(message)
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


  const selectedAnswer =
    Number(message);


  const question =
    game.questions[game.questionIndex];


  // ==========================================================
  // 判斷答案
  // ==========================================================

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
        "🏆 全部答對！太厲害了！";

    } else if (percentage >= 66) {

      resultMessage =
        "🎉 很棒！再練一下就滿分了！";

    } else {

      resultMessage =
        "💪 沒關係，再挑戰一次吧！";
    }


    // --------------------------------------------------------
    // 遊戲結束
    // --------------------------------------------------------

    games.delete(userId);


    await replyToLine(
      event.replyToken,
      [
        {
          type: "text",
          text:
            isCorrect
              ? "🎉 答對了！\n\n"
              : `❌ 答錯了！\n正確答案是：${question.answer}聲\n\n` +
            `第 ${currentQuestion} / 3 題\n\n` +
            "🎊 挑戰完成！\n\n" +
            `你的成績：${finalScore} / 3\n` +
            `正答率：${percentage}%\n\n` +
            resultMessage +
            "\n\n" +
            "想再挑戰一次嗎？\n" +
            "輸入「開始」即可！💗"
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


  await replyToLine(
    event.replyToken,
    [
      {
        type: "text",
        text:
          isCorrect
            ? `🎉 答對了！\n\n目前得分：${game.score} / ${currentQuestion}`
            : `❌ 答錯了！\n正確答案是：${question.answer}聲\n\n目前得分：${game.score} / ${currentQuestion}`
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