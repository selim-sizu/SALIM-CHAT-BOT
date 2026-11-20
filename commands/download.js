const downloadAudio = require("../utils/youtube");

module.exports = {
  config: {
    name: "download",
    aliases: ["dl", "song"],
    description: "ইউটিউব থেকে অডিও ডাউনলোড করে"
  },
  run: async ({ api, event, args }) => {
    const url = args[0];
    if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
      return api.sendMessageMqtt("⚠️ ইউটিউব লিঙ্ক দিন। উদাহরণ: /download https://youtu.be/...", event.threadID);
    }

    api.sendMessageMqtt("⏳ অডিও ডাউনলোড হচ্ছে, অপেক্ষা করুন...", event.threadID);

    try {
      const { filePath, title } = await downloadAudio(url);
      api.sendMessageMqtt(
        {
          body: `🎵 ${title}`,
          attachment: require("fs").createReadStream(filePath)
        },
        event.threadID
      );

      // ডাউনলোডের পর ফাইল মুছে ফেলা
      setTimeout(() => require("fs").unlinkSync(filePath), 10000);
    } catch (e) {
      api.sendMessageMqtt(`❌ ডাউনলোড ব্যর্থ: ${e.message}`, event.threadID);
    }
  }
};
