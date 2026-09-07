
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

  const rvcApiUrl = process.env.RVC_API_URL;

  if (!rvcApiUrl) {
    throw new Error(
      "RVC_API_URL is not configured"
    );
  }

  console.log(
    "[ChaiGo RVC] Sending audio to:",
    rvcApiUrl
  );

  // ==========================================================
  // 建立 multipart/form-data
  // ==========================================================

  const formData = new FormData();

  const audioBlob = new Blob(
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

  // ==========================================================
  // 呼叫 ChaiGo RVC API
  // ==========================================================

  const response = await fetch(
    `${rvcApiUrl}/convert`,
    {
      method: "POST",
      body: formData
    }
  );

  // ==========================================================
  // RVC API 錯誤
  // ==========================================================

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

  // ==========================================================
  // 取得 RVC 回傳的 WAV
  // ==========================================================

  const arrayBuffer =
    await response.arrayBuffer();

  const rvcBuffer =
    Buffer.from(arrayBuffer);

  // ==========================================================
  // 確認有收到音檔
  // ==========================================================

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
