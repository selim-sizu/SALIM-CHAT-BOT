const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ leavevideo send failed:", err.message));
}

async function downloadVideo(url) {
  const cacheDir = path.join(__dirname, "..", "cache");
  await fs.ensureDir(cacheDir);
  const filePath = path.join(cacheDir, `leave_${Date.now()}.mp4`);

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 30000
  });

  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(filePath);
    res.data.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
  });

  return filePath;
}

module.exports = {
  config: {
    eventType: "event",
    name: "leavevideo"
  },

  run: async ({ api, event, config }) => {
    if (event.logMessageType !== "log:unsubscribe") return;

    const threadID = event.threadID;
    const leftID = event.logMessageData?.leftParticipantFbId;
    if (!leftID) return;

    let name = "একজন সদস্য";
    try {
      const info = await api.getUserInfo(leftID);
      if (info?.[leftID]?.name) name = info[leftID].name;
    } catch (e) {
      console.error("⚠️ getUserInfo failed:", e.message);
    }

    const videoURL = config?.leaveVideoURL || "";

    // ১) লিভ মেসেজ
    await sendSafe(
      api,
      threadID,
      `👋 𝐆𝐨𝐨𝐝𝐛𝐲𝐞 ${name}\n\n` +
      `😢 গ্রুপ থেকে চলে গেলেন।\n` +
      `🆔 UID: ${leftID}\n\n` +
      `আল্লাহ হাফেজ! আবার দেখা হবে 🌸`
    );

    // ২) ভিডিও
    if (videoURL) {
      setTimeout(async () => {
        let filePath;
        try {
          filePath = await downloadVideo(videoURL);
          await api.sendMessageMqtt(
            {
              body: "🎬",
              attachment: fs.createReadStream(filePath)
            },
            threadID
          ).catch(err => console.error("❌ video send failed:", err.message));

          setTimeout(() => fs.remove(filePath).catch(() => {}), 30000);
        } catch (e) {
          console.error("❌ video download failed:", e.message);
        }
      }, 2000);
    }
  }
};
