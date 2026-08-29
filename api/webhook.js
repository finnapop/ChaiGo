const games = new Map();

// 你的 GitHub 音檔
const AUDIO_BASE_URL =
  "https://raw.githubusercontent.com/finnapop/ChaiGo/main/ToneGame/audio";

// 5 題
// 目前只有 4 個音檔，所以第 5 題先重複使用 ma3.mp3
const questions = [
  {
    audio: `${AUDIO_BASE_URL}/ma1.mp3`,
    answer: 1,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ma3.mp3`,
    answer: 3,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ma2.mp3`,
    answer: 2,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ma4.mp3`,
    answer: 4,
    duration: 1500
  },
  {
    audio: `${AUDIO_BASE_URL}/ma3.mp3`,
    answer: 3,
    duration: 1500
  }
];

export default async function handler(req, res) {
  // LINE Verify / 瀏覽器測試
  if (req.method !== "POST") {
    return res.status(200).send("ChaiGo LINE Bot is running!");
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    for (const event of body.events || []) {
      // 只處理文字訊息
      if (
        event.type !== "message" ||
        event.message.type !== "text"
      ) {
        continue;
      }

      const userId = event.source.userId;
      const message = event.message.text.trim();

      // =========================
      // 開始遊戲
      // =========================
      if (message === "開始" || message.toLowerCase() === "start") {
        games.set(userId, {
          questionIndex: 0,
          score: 0
        });

        const game = games.get(userId);
        const question = questions[game.questionIndex];

        await replyToLine(event.replyToken, [
          {
            type: "text",
            text:
              "🎧 聲調挑戰開始！\n\n" +
              "一共 5 題，準備好了嗎？💗\n\n" +
              "第 1 / 5 題\n" +
              "請聽聲音，猜猜是哪一個聲調！"
          },
          {
            type: "audio",
            originalContentUrl: question.audio,
            duration: question.duration
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
        ]);

        continue;
      }

      // =========================
      // 沒有開始遊戲
      // =========================
      if (!games.has(userId)) {
        await replyToLine(event.replyToken, [
          {
            type: "text",
            text:
              "💗 歡迎來到華語娘聲調挑戰！\n\n" +
              "輸入「開始」開始 5 題挑戰吧！🎧"
          }
        ]);

        continue;
      }

      // =========================
      // 取得目前遊戲
      // =========================
      const game = games.get(userId);

      // 只接受 1 / 2 / 3 / 4
      if (!["1", "2", "3", "4"].includes(message)) {
        await replyToLine(event.replyToken, [
          {
            type: "text",
            text:
              "請回答 1、2、3 或 4 喔！😊"
          }
        ]);

        continue;
      }

      const selectedAnswer = Number(message);
      const question = questions[game.questionIndex];

      // =========================
      // 判斷答案
      // =========================
      const isCorrect = selectedAnswer === question.answer;

      if (isCorrect) {
        game.score++;
      }

      const currentQuestion = game.questionIndex + 1;

      // =========================
      // 第 5 題完成
      // =========================
      if (currentQuestion === questions.length) {
        const finalScore = game.score;
        const percentage = Math.round(
          (finalScore / questions.length) * 100
        );

        // 遊戲結束
        games.delete(userId);

        let resultMessage = "";

        if (percentage === 100) {
          resultMessage =
            "🏆 全部答對！太厲害了！";
        } else if (percentage >= 80) {
          resultMessage =
            "🎉 很棒！聲調掌握得很好！";
        } else if (percentage >= 60) {
          resultMessage =
            "😊 不錯喔！再練習一下會更好！";
        } else {
          resultMessage =
            "💪 沒關係，再挑戰一次吧！";
        }

        await replyToLine(event.replyToken, [
          {
            type: "text",
            text:
              (isCorrect
                ? "🎉 答對了！\n\n"
                : `❌ 答錯了！\n正確答案是：${question.answer}聲\n\n`) +
              `第 ${currentQuestion} / 5 題\n\n` +
              "🎊 挑戰完成！\n\n" +
              `你的成績：${finalScore} / 5\n` +
              `正答率：${percentage}%\n\n` +
              resultMessage +
              "\n\n想再挑戰一次嗎？\n輸入「開始」即可！💗"
          }
        ]);

        continue;
      }

      // =========================
      // 還有下一題
      // =========================
      game.questionIndex++;

      const nextQuestion = questions[game.questionIndex];

      const messages = [
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
            `🎧 第 ${game.questionIndex + 1} / 5 題\n\n` +
            "再聽聽看！"
        },
        {
          type: "audio",
          originalContentUrl: nextQuestion.audio,
          duration: nextQuestion.duration
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
      ];

      await replyToLine(event.replyToken, messages);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("Webhook error:", error);

    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}


// ==========================================
// LINE Reply API
// ==========================================

async function replyToLine(replyToken, messages) {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/reply",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    const errorText = await response.text();

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