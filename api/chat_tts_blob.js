// ============================================================
// chat_tts_blob.js
// 華語娘 LINE Chat - Upload RVC Audio
//
// OpenAI TTS
// ↓
// MP3 Buffer
// ↓
// ChaiGo RVC
// ↓
// WAV Buffer
// ↓
// Vercel Blob
// ↓
// Public HTTPS URL
// ============================================================

import { put } from "@vercel/blob";

export async function uploadTTS(audioBuffer) {

  const filename =
    `audio/chaigo-${Date.now()}.wav`;

  const blob =
    await put(
      filename,
      audioBuffer,
      {
        access: "public",
        contentType: "audio/wav"
      }
    );

  console.log(
    "TTS uploaded:",
    blob.url
  );

  return blob.url;
}