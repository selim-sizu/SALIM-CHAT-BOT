const axios = require("axios");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ animepic send failed:", err.message));
}

module.exports = {
  config: {
    name: "animepic",
    aliases: ["waifu", "neko", "animeimg"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Get random anime picture",
    category: "anime",
    cooldowns: 5
  },

  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    try {
      // API থেকে র‍্যান্ডম অ্যানিমে ছবি আনা
      const res = await axios.get("https://api.waifu.pics/sfw/waifu");
      const imageUrl = res.data.url;

      if (!imageUrl) {
        return sendSafe(api, threadID, "❌ ছবি আনতে সমস্যা হয়েছে।", messageID);
      }

      const body = `🌸 𝗔𝗻𝗶𝗺𝗲 𝗣𝗶𝗰𝘁𝘂𝗿𝗲 🌸\n\n✨ এখানে তোমার জন্য একটি র‍্যান্ডম অ্যানিমে ছবি!`;

      // সরাসরি URL পাঠানো (ডাউনলোড করার দরকার নেই)
      return sendSafe(api, threadID, {
        body: body,
        attachment: imageUrl
      }, messageID);

    } catch (e) {
      console.error("❌ animepic error:", e.message);
      return sendSafe(api, threadID, "❌ অ্যানিমে ছবি আনতে সমস্যা হয়েছে।", messageID);
    }
  }
};
