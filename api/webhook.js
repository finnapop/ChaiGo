// ============================================================
// webhook.js
// 華語娘 LINE Bot
//
// LINE 唯一 Webhook 入口
// ============================================================

import { handleToneGame } from "./tonegame.js";


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
    // 處理 LINE Events
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
      // 目前沒有任何功能處理這個訊息
      // ======================================================

      await replyToLine(
        event.replyToken,
        [
          {
            type: "text",
            text:
              "💗 歡迎來到華語娘！\n\n" +
              "請從 Rich Menu 選擇功能喔～"
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
        error: "Internal Server Error"
      });
  }
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