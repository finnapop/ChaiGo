```javascript
// ============================================================
// chat_rvc.js
// 華語娘 RVC
//
// OpenAI TTS Buffer
// ↓
// ChaiGo RVC API
// ↓
// RVC WAV Buffer
// ============================================================

export async function handleRVC(audioBuffer) {

  const rvcApiUrl =
    process.env.RVC_API_URL;

  if (!rvcApiUrl) {
    throw new Error(
      "RVC_API_URL is not configured"
    );
  }

  console.log(
    "[ChaiGo RVC] Sending audio to:",
    rvcApiUrl
  );

  const formData =
    new FormData();

  const audioBlob =
    new Blob(
      [audioBuffer],
      {
        type: "audio/mpeg"
      }
    );

  formData.append(
    "audio",
    audioBlob,
    "tts.mp3"
  );

  const response =
    await fetch(
      `${rvcApiUrl}/convert`,
      {
        method: "POST",
        body: formData
      }
    );

  if (!response.ok) {

    const errorText =
      await response.text();

    console.error(
      "[ChaiGo RVC] API Error:",
      response.status,
      errorText
    );

    throw new Error(
      `ChaiGo RVC API failed: ${response.status}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  const rvcBuffer =
    Buffer.from(arrayBuffer);

  if (
    !rvcBuffer ||
    rvcBuffer.length === 0
  ) {
    throw new Error(
      "ChaiGo RVC returned empty audio"
    );
  }

  console.log(
    "[ChaiGo RVC] Conversion successful:",
    rvcBuffer.length,
    "bytes"
  );

  return rvcBuffer;
}
```
