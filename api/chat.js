// ============================================================
// chat.js
// 華語娘 AI Chat
//
// LINE → chat.js → Dify → LINE
// ============================================================

export async function handleChat(event, message) {

  const userId = event.source.userId;

  // ==========================================================
  // 呼叫 Dify Chat API
  // ==========================================================

  const response = await fetch(
    "https://api.dify.ai/v1/chat-messages",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${process.env.DIFY_API_KEY}`
      },

      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: "blocking",
        user: userId
      })
    }
  );


  // ==========================================================
  // Dify API 錯誤
  // ==========================================================

  if (!response.ok) {

    const errorText =
      await response.text();

    console.error(
      "Dify API Error:",
      response.status,
      errorText
    );

    throw new Error(
      `Dify API failed: ${response.status}`
    );
  }


  // ==========================================================
  // 取得 Dify 回覆
  // ==========================================================

  const data =
    await response.json();

  console.log(
    "Dify response:",
    data
  );


  // ==========================================================
  // 回傳華語娘文字
  // ==========================================================

  return data.answer;
}