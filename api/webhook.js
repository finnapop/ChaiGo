export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("ChaiGo LINE Bot is running!");
  }

  try {
    const body = req.body;

    for (const event of body.events) {
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;

        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [
              {
                type: "text",
                text: `華語娘收到啦！💗\n你說的是：「${userMessage}」`
              }
            ]
          })
        });
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}