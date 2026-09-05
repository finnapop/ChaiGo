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
// ============================================================

import { handleToneGame } from "./tonegame.js";
import { handlePinyinGame } from "./pinyingame.js";
import { handleChat } from "./chat.js";
import { handleSTT } from "./chat_stt.js";

// ============================================================
// 使用者目前模式
//
// userId → "tone" / "pinyin" / "chat"
//
// 例如：
// userA → tone
// userB → pinyin
// userC → chat
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
      // 目前只處理文字訊息
      // ------------------------------------------------------

      if (
        event.type !== "message" ||
        !event.message ||
        event.message.type !== "text"
      ) {
        continue;
      }


      const userId =
        event.source.userId;

      const message =
        event.message.text.trim();

      const normalizedMessage =
        message.toLowerCase();


      // ======================================================
      // 🎧 聲調遊戲入口
      //
      // Rich Menu：
      // 「聲調遊戲」
      // ↓
      // 自動送出「開始」
      //
      // 「開始」代表：
      // 我要進入聲調遊戲
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


        // 入口處理完畢
        // 不要再往下面執行
        continue;
      }


      // ======================================================
      // 🔤 拼音遊戲入口
      //
      // Rich Menu：
      // 「ピンインチャレンジ」
      // ↓
      // 自動送出「ピンインチャレンジ開始」
      //
      // 「ピンインチャレンジ開始」代表：
      // 我要進入拼音遊戲
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


        // ⭐ 非常重要
        // 入口處理完畢後直接結束這個 event
        // 避免同一個 replyToken 被處理兩次
        continue;
      }


      // ======================================================
      // 💗 AI 聊天入口
      //
      // Rich Menu：
      // 「AI聊天」
      // ↓
      // 自動送出「開始聊天」
      //
      // 「開始聊天」代表：
      // 我要進入 AI 聊天模式
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
      // ======================================================

      if (
        mode === "chat"
      ) {

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