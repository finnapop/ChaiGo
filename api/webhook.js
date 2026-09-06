// ============================================================
// webhook.js
// 華語娘 LINE Bot
//
// LINE 唯一 Webhook 入口
//
// 模式：
// "tone"   → 聲調遊戲
// "pinyin" → 拼音遊戲
// "chat"   → AI 聊天
//
// Chat 模式支援：
// 📝 文字 → Dify → 文字
// 🎤 語音 → STT → Dify → TTS → LINE Audio
// ============================================================

import { handleToneGame } from "./tonegame.js";
import { handlePinyinGame } from "./pinyingame.js";
import { handleChat } from "./chat.js";
import { handleSTT } from "./chat_stt.js";
import { handleTTS } from "./chat_tts.js";
import { uploadTTS } from "./chat_tts_blob.js";
import { getAudioDuration } from "./chat_audio.js";

const userModes = new Map();

export default async function handler(req, res) {

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

    for (const event of body.events || []) {

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
      // Chat 模式：
      // LINE Audio
      // ↓
      // STT
      // ↓
      // Dify
      // ↓
      // TTS
      // ↓
      // Blob
      // ↓
      // LINE Audio
      // ======================================================

      if (
        messageType === "audio"
      ) {

        const mode =
          userModes.get(userId);

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

        try {

          // --------------------------------------------------
          // 🎤 LINE Audio → STT
          // --------------------------------------------------

          const text =
            await handleSTT(event);

          console.log(
            "STT text:",
            text
          );

          // --------------------------------------------------
          // 🤖 STT → Dify
          // --------------------------------------------------

          const reply =
            await handleChat(
              event,
              text
            );

          console.log(
            "Dify reply:",
            reply
          );

          // --------------------------------------------------
          // 🔊 Dify → TTS
          // --------------------------------------------------

          const audioBuffer =
            await handleTTS(reply);

          // --------------------------------------------------
          // ☁️ TTS MP3 → Vercel Blob
          // --------------------------------------------------

          const audioUrl =
            await uploadTTS(
              audioBuffer
            );

          // --------------------------------------------------
          // ⏱ 取得音檔長度
          // --------------------------------------------------

          const duration =
            await getAudioDuration(
              audioBuffer
            );

          // --------------------------------------------------
          // 🔊 LINE Audio Reply
          // --------------------------------------------------

          await replyToLine(
            event.replyToken,
            [
              {
                type: "audio",
                originalContentUrl:
                  audioUrl,
                duration:
                  duration
              }
            ]
          );

        } catch (error) {

          console.error(
            "Voice Chat Error:",
            error
          );

          // --------------------------------------------------
          // 發生錯誤時，至少回傳文字
          // --------------------------------------------------

          await replyToLine(
            event.replyToken,
            [
              {
                type: "text",
                text:
                  "ごめんね💦 音声の返信をうまく作れなかったみたい…"
              }
            ]
          );
        }

        continue;
      }

      // ======================================================
      // 不是文字訊息
      // ======================================================

      if (
        messageType !== "text"
      ) {
        continue;
      }

      const message =
        event.message.text.trim();

      const normalizedMessage =
        message.toLowerCase();

      // ======================================================
      // 🎧 聲調遊戲入口
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
      // 📝 文字 → Dify → 文字
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
      // 💗 沒有模式
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
        error:
          "Internal Server Error"
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