// ============================================================
// webhook.js
// 華語娘 LINE Bot
//
// LINE 唯一 Webhook 入口
//
// 負責：
// 1. 接收 LINE 訊息
// 2. 判斷使用者目前模式
// 3. 將訊息交給 tonegame / pinyingame / chat
//
// 模式：
// "tone"   → 聲調遊戲
// "pinyin" → 拼音遊戲
// "chat"   → AI 聊天
//
// Chat 模式支援：
// 📝 文字 → Dify
// 🎤 語音 → OpenAI STT
// ============================================================

import { handleToneGame } from "./tonegame.js";
import { handlePinyinGame } from "./pinyingame.js";
import { handleChat } from "./chat.js";
import { handleSTT } from "./chat_stt.js";


// ============================================================
// 使用者目前模式
//
// userId → "tone" / "pinyin" / "chat"
// ============================================================

const userModes = new Map();


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
      // 只確認是不是 message event
      //
      // ⚠️ 這裡不能限制 text
      // 因為 audio 也要處理
      // ------------------------------------------------------

      if (
        event.type !== "message" ||
        !event.message
      ) {
        continue;
      }


      const userId =
        event.source.userId;


      const messageType =
        event.message.type;


      // ======================================================
      // 🎤 語音訊息
      //
      // 只有 chat 模式才處理
      // ======================================================

      if (
        messageType === "audio"
      ) {

        const mode =
          userModes.get(userId);


        // ----------------------------------------------------
        // 如果目前不是聊天模式
        // ----------------------------------------------------

        if (mode !== "chat") {

          await replyToLine(
            event.replyToken,
            [
              {
                type: "text",
                text:
                  "💗 先點選「AI聊天」開始聊天喔～"
              }
            ]
          );

          continue;
        }


        // ----------------------------------------------------
        // Chat 模式 → STT
        // ----------------------------------------------------

        try {

const text =
  await handleSTT(event);


// --------------------------------------------------
// STT → Dify
// --------------------------------------------------

const reply =
  await handleChat(
    event,
    text
  );


// --------------------------------------------------
// 回覆 Dify 結果
// --------------------------------------------------

await replyToLine(
  event.replyToken,
  [
    {
      type: "text",
      text: reply
    }
  ]
);


        } catch (error) {

          console.error(
            "STT Error:",
            error
          );


          await replyToLine(
            event.replyToken,
            [
              {
                type: "text",
                text:
                  "ごめんね💦 音声をうまく聞き取れなかったみたい…"
              }
            ]
          );
        }


        continue;
      }


      // ======================================================
      // 不是文字訊息
      //
      // 例如：
      // sticker / image / video / location
      //
      // 目前不處理
      // ======================================================

      if (
        messageType !== "text"
      ) {
        continue;
      }


      // ======================================================
      // 取得文字
      // ======================================================

      const message =
        event.message.text.trim();


      const normalizedMessage =
        message.toLowerCase();


      // ======================================================
      // 🎧 聲調遊戲入口
      //
      // 「声調チャレンジ開始」
      // ======================================================

      if (
        message === "声調チャレンジ開始" ||
        normalizedMessage === "start"
      ) {

        userModes.set(
          userId,
          "tone"
        );


        await handleToneGame(
          event,
          message
        );


        continue;
      }


      // ======================================================
      // 🔤 拼音遊戲入口
      //
      // 「ピンインチャレンジ開始」
      // ======================================================

      if (
        message === "ピンインチャレンジ開始"
      ) {

        userModes.set(
          userId,
          "pinyin"
        );


        await handlePinyinGame(
          event,
          message
        );


        continue;
      }


      // ======================================================
      // 💗 AI 聊天入口
      //
      // 「チャット START！」
      // ======================================================

      if (
        message === "チャット START！"
      ) {

        userModes.set(
          userId,
          "chat"
        );


        await replyToLine(
          event.replyToken,
          [
            {
              type: "text",
              text:
                "💗 好呀～來跟華語娘聊天吧！\n\n" +
                "今天想聊什麼？"
            }
          ]
        );


        continue;
      }


      // ======================================================
      // 取得使用者目前模式
      // ======================================================

      const mode =
        userModes.get(userId);


      // ======================================================
      // 🎧 使用者正在玩聲調遊戲
      // ======================================================

      if (
        mode === "tone"
      ) {

        const handled =
          await handleToneGame(
            event,
            message
          );


        if (handled) {
          continue;
        }
      }


      // ======================================================
      // 🔤 使用者正在玩拼音遊戲
      // ======================================================

      if (
        mode === "pinyin"
      ) {

        const handled =
          await handlePinyinGame(
            event,
            message
          );


        if (handled) {
          continue;
        }
      }


      // ======================================================
      // 💗 使用者正在 AI 聊天模式
      //
      // 📝 文字 → Dify
      // ======================================================

      if (
        mode === "chat"
      ) {

        try {

          const reply =
            await handleChat(
              event,
              message
            );


          await replyToLine(
            event.replyToken,
            [
              {
                type: "text",
                text: reply
              }
            ]
          );


        } catch (error) {

          console.error(
            "Chat Error:",
            error
          );


          await replyToLine(
            event.replyToken,
            [
              {
                type: "text",
                text:
                  "ごめんね💦 ちょっと調子が悪いみたい…"
              }
            ]
          );
        }


        continue;
      }


      // ======================================================
      // 沒有任何功能處理這個訊息
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


    // ========================================================
    // Webhook 成功
    // ========================================================

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