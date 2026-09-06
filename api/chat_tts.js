// ============================================================
// chat_tts.js
// 華語娘 LINE Chat - Text to Speech
//
// 中文文字
// ↓
// OpenAI TTS
// ↓
// 中文女聲 MP3
// ============================================================

export async function handleTTS(text) {

  const response =
    await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({
          model: "gpt-4o-mini-tts",

          // 女聲
          voice: "coral",

          // 中文語氣
          instructions:
            "請使用自然、親切、活潑的年輕女性聲音，以台灣華語（繁體中文）發音。語氣像一位可愛但自然的朋友，不要使用日語口音。",

          input: text,

          response_format: "mp3"
        })
      }
    );

  if (!response.ok) {

    const errorText =
      await response.text();

    console.error(
      "OpenAI TTS Error:",
      response.status,
      errorText
    );

    throw new Error(
      `OpenAI TTS failed: ${response.status}`
    );
  }

  const audioBuffer =
    await response.arrayBuffer();

  console.log(
    "TTS generated:",
    audioBuffer.byteLength,
    "bytes"
  );

  return audioBuffer;
}