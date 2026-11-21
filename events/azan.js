const cron = require("node-cron");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload) {
  return api.sendMessageMqtt(payload, threadID)
    .catch(err => console.error("❌ azan send failed:", err.message));
}

// 🖼️ ভিডিও ডাউনলোড করার ফাংশন
async function downloadVideo(url) {
  try {
    if (!url) return null;
    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);
    const ext = url.toLowerCase().includes(".mp4") ? ".mp4" : ".gif";
    const filePath = path.join(cacheDir, `azan_${Date.now()}${ext}`);

    const res = await axios.get(url, { responseType: "stream", timeout: 30000 });
    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(filePath);
      res.data.pipe(w);
      w.on("finish", resolve);
      w.on("error", reject);
    });
    return filePath;
  } catch (e) {
    console.error("⚠️ Azan video download failed:", e.message);
    return null;
  }
}

module.exports = {
  config: {
    eventType: "system_startup", // এটি বট চালু হওয়ার সাথে সাথে একবার রান করবে
    name: "azan"
  },

  run: async ({ api, config, threadID }) => {
    // গ্রুপ আইডি config থেকে নেবে, অথবা নির্দিষ্ট গ্রুপ আইডি বসাতে হবে
    const targetGroupID = config.azanGroupID || threadID; 
    if (!targetGroupID) {
      console.log("⚠️ Azan: কোনো গ্রুপ আইডি পাওয়া যায়নি।");
      return;
    }

    // 🕌 আজানের সময়সূচি (বাংলাদেশ সময়)
    const azanSchedule = [
      { name: "ফজর", time: "05:00" },
      { name: "যোহর", time: "12:30" },
      { name: "আসর", time: "16:00" },
      { name: "মাগরিব", time: "18:00" },
      { name: "এশা", time: "19:30" }
    ];

    azanSchedule.forEach(azan => {
      const [hour, minute] = azan.time.split(" ");
      const cronTime = `${minute} ${hour} * * *`; // প্রতি দিন এই সময়ে চলবে

      cron.schedule(cronTime, async () => {
        console.log(`🕌 Azan Time: ${azan.name}`);

        const message = `🕌 𝗔𝗭𝗔𝗡 𝗧𝗜𝗠𝗘 🕌\n\n⏰ নামাজের সময় হয়েছে: ${azan.name}\n\n🕋 আসুন আমরা সবাই নামাজে দাঁড়াই।\n\n🤲 আল্লাহ আমাদের নামাজ কবুল করুন।`;

        await sendSafe(api, targetGroupID, message);

        // ভিডিও থাকলে পাঠানো
        const videoURL = config.azanVideoURL;
        if (videoURL) {
          setTimeout(async () => {
            const filePath = await downloadVideo(videoURL);
            if (filePath) {
              await api.sendMessageMqtt(
                { attachment: fs.createReadStream(filePath) },
                targetGroupID
              ).catch(err => console.error("❌ Azan video send failed:", err.message));
              setTimeout(() => fs.remove(filePath).catch(() => {}), 30000);
            }
          }, 2000);
        }
      }, {
        scheduled: true,
        timezone: "Asia/Dhaka" // 🌟 বাংলাদেশ সময়
      });
    });

    console.log("✅ Azan Cronjob চালু হয়েছে (Asia/Dhaka timezone)");
  }
};
