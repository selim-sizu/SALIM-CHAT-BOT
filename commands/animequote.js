const axios = require("axios");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ animequote send failed:", err.message));
}

module.exports = {
  config: {
    name: "animequote",
    aliases: ["quote", "aq"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Get random anime quote",
    category: "anime",
    cooldowns: 5
  },

  run: async ({ api, event }) => {
    const { threadID, messageID } = event;

    try {
      // API থেকে র‍্যান্ডম কোটস আনা
      const res = await axios.get("https://animechan.vercel.app/api/random");
      const quote = res.data.quote;
      const anime = res.data.anime;
      const character = res.data.character;

      if (!quote) {
        return sendSafe(api, threadID, "❌ কোটস আনতে সমস্যা হয়েছে।", messageID);
      }

      const body = `╔══════════❖🌺❖══════════╗
║ 🎬 𝐀𝐧𝐢𝐦𝐞 𝐐𝐮𝐨𝐭𝐞 🎬
╠══════════❖🌺❖══════════╣
║ "${quote}"
╠══════════❖🌺❖══════════╣
║ 👤 𝐂𝐡𝐚𝐫𝐚𝐜𝐭𝐞𝐫: ${character}
║ 📺 𝐀𝐧𝐢𝐦𝐞: ${anime}
╚══════════❖🌺❖══════════╝`;

      return sendSafe(api, threadID, body, messageID);

    } catch (e) {
      console.error("❌ animequote error:", e.message);
      // API ডাউন থাকলে ফলব্যাক মেসেজ
      return sendSafe(api, threadID, "❌ কোটস আনতে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।", messageID);
    }
  }
};
