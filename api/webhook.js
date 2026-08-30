// ============================================================
// webhook.js
// LINE 唯一 Webhook 入口
// ============================================================

import { handleToneGame } from "./toneGame.js";


// ============================================================
// LINE Webhook
// ============================================================

export default async function handler(req, res) {

  // ==========================================================
  // LINE Verify / 瀏覽器測試
  // ==========================================================

  if (req.method !== "POST") {

    return res
      .status(200)
      .send("ChaiGo LINE Bot is running!");
  }


  try {

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;


    // ========================================================
    // 處理所有 LINE Events
    // ========================================================

    for (const event of body.events || []) {

      // ------------------------------------------------------
      // 目前只處理文字訊息
      // ------------------------------------------------------

      if (
        event.type !== "message" ||
        event.message.type !== "text"
      ) {
        continue;
      }


      const message =
        event.message.text.trim();


      // ======================================================
      // 交給聲調遊戲
      // ======================================================

      const handled =
        await handleToneGame(
          event,
          message
        );


      // ======================================================
      // 聲調遊戲已處理
      // ======================================================

      if (handled) {
        continue;
      }


      // ======================================================
      // 目前沒有任何遊戲處理這個訊息
      // ======================================================

      // 暫時保留原本的歡迎訊息
      // 之後加入拼音遊戲時會在這裡繼續分流。

      await replyToLine(
        event.replyToken,
        [
          {
            type: "text",
            text:
              "💗 歡迎來到華語娘！\n\n" +
              "輸入「開始」開始聲調挑戰吧！🎧"
          }
        ]
      );
    }


    return res
      .status(200)
      .json({
        ok: true
      });


  } catch (error) {

    console.error(
      "Webhook error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "Internal Server Error"
      });
  }
}


// ============================================================
// LINE Reply API
//
// Webhook.js 目前也需要這個，
// 因為當沒有遊戲處理訊息時，要回覆 LINE。
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