// ============================================================
// chat_audio.js
// 華語娘 LINE Chat - Audio Message
//
// MP3 Buffer
// ↓
// 取得音檔 duration
// ↓
// LINE Audio Message
// ============================================================

import { parseBuffer } from "music-metadata";

export async function getAudioDuration(audioBuffer) {

  const metadata =
    await parseBuffer(
      Buffer.from(audioBuffer),
      {
        mimeType: "audio/mpeg"
      }
    );

  const duration =
    metadata.format.duration;

  if (!duration) {

    throw new Error(
      "Could not determine audio duration"
    );
  }

  const durationMs =
    Math.ceil(duration * 1000);

  console.log(
    "Audio duration:",
    durationMs,
    "ms"
  );

  return durationMs;
}