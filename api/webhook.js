export default function handler(req, res) {
  if (req.method === "POST") {
    console.log("LINE Webhook received");

    return res.status(200).json({
      message: "OK"
    });
  }

  return res.status(200).send("ChaiGo LINE Bot is running!");
}