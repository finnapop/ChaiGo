// ============================================================
// chat_tts_blob.js
// 華語娘 LINE Chat - Upload TTS Audio
//
// OpenAI TTS
// ↓
// MP3 Buffer
// ↓
// Vercel Blob
// ↓
// Public HTTPS URL
// ============================================================

import { put } from "@vercel/blob";

export async function uploadTTS(audioBuffer) {

  const filename =
    `audio/chaigo-${Date.now()}.mp3`;

  const blob =
    await put(
      filename,
      audioBuffer,
      {
        access: "public",
        contentType: "audio/mpeg"
      }
    );

  console.log(
    "TTS uploaded:",
    blob.url
  );

  return blob.url;
}