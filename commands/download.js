const fs = require("fs");
const path = require("path");
const downloadAudio = require("../utils/youtube");

function sendSafe(api, threadID, message) {
  return api.sendMessageMqtt(message, threadID)
    .catch(err => console.error("❌ download send failed:", err.message));
}

module.exports = {
  config: {
    name: "download",
    aliases: ["dl", "song", "gan"],
    description: "ইউটিউব থেকে অডিও ডাউনলোড করে"
  },
  run: async ({ api, event, args }) => {
    const url = args[0];

    if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
      return sendSafe(
        api,
        event.threadID,
        "⚠️ ইউটিউব লিঙ্ক দিন।\nউদাহরণ: /download https://youtu.be/xxxxxxx"
      );
    }

    await sendSafe(api, event.threadID, "⏳ অডিও ডাউনলোড হচ্ছে, অপেক্ষা করুন...");

    let filePath;
    try {
      const result = await downloadAudio(url);
      filePath = result.filePath;
      const title = result.title;

      if (!fs.existsSync(filePath)) {
        return sendSafe(api, event.threadID, "❌ ফাইল তৈরি হয়নি।");
      }

      await api.sendMessageMqtt(
        {
          body: `🎵 ${title}`,
          attachment: fs.createReadStream(filePath)
        },
        event.threadID
      ).catch(err => console.error("❌ audio upload failed:", err.message));

    } catch (e) {
      console.error("❌ ডাউনলোড ব্যর্থ:", e?.message || e);
      return sendSafe(api, event.threadID, `❌ ডাউনলোড ব্যর্থ: ${e.message}`);
    } finally {
      // ১০ সেকেন্ড পর টেম্পোরারি ফাইল মুছে ফেলা
      if (filePath && fs.existsSync(filePath)) {
        setTimeout(() => {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }, 10000);
      }
    }
  }
};
