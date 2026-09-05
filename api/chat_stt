// ============================================================
// chat_stt.js
// 華語娘 LINE Chat - Speech to Text
//
// LINE Audio
// ↓
// LINE Content API
// ↓
// OpenAI Speech-to-Text
// ↓
// 回傳文字
// ============================================================

export async function handleSTT(event) {

  const messageId =
    event.message.id;


  // ==========================================================
  // ① 從 LINE 取得音訊
  // ==========================================================

  const audioResponse =
    await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        method: "GET",

        headers: {
          "Authorization":
            `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );


  if (!audioResponse.ok) {

    const errorText =
      await audioResponse.text();

    console.error(
      "LINE Audio API Error:",
      audioResponse.status,
      errorText
    );

    throw new Error(
      `LINE Audio API failed: ${audioResponse.status}`
    );
  }


  // ==========================================================
  // ② 取得音訊 Buffer
  // ==========================================================

  const audioBuffer =
    await audioResponse.arrayBuffer();


  // ==========================================================
  // ③ 建立 FormData
  // ==========================================================

  const formData =
    new FormData();


  const audioBlob =
    new Blob(
      [audioBuffer],
      {
        type:
          audioResponse.headers.get(
            "content-type"
          ) || "audio/m4a"
      }
    );


  formData.append(
    "file",
    audioBlob,
    "line_audio.m4a"
  );


  formData.append(
    "model",
    "gpt-4o-mini-transcribe"
  );


  // ==========================================================
  // ④ 呼叫 OpenAI Speech-to-Text
  // ==========================================================

  const sttResponse =
    await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: formData
      }
    );


  // ==========================================================
  // ⑤ OpenAI API 錯誤
  // ==========================================================

  if (!sttResponse.ok) {

    const errorText =
      await sttResponse.text();

    console.error(
      "OpenAI STT Error:",
      sttResponse.status,
      errorText
    );

    throw new Error(
      `OpenAI STT failed: ${sttResponse.status}`
    );
  }


  // ==========================================================
  // ⑥ 取得辨識結果
  // ==========================================================

  const data =
    await sttResponse.json();


  console.log(
    "STT result:",
    data
  );


  // ==========================================================
  // ⑦ 回傳文字
  // ==========================================================

  return data.text;
}