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
    eventType: "system_startup",
    name: "azan"
  },

  run: async ({ api, config, threadID }) => {
    const targetGroupID = config.azanGroupID || threadID; 
    if (!targetGroupID) return;

    try {
      // 🌟 API থেকে আজকের নামাজের সময় আনা হচ্ছে (মেহেরপুর, বাংলাদেশ)
      const res = await axios.get("https://api.aladhan.com/v1/timingsByCity?city=Meherpur&country=Bangladesh&method=1");
      const timings = res.data.data.timings;

      // API থেকে আসা সময় (যেমন "05:00 (BST)") পরিষ্কার করা হচ্ছে
      const cleanTime = (timeStr) => timeStr.split(" ")[0]; 

      const azanSchedule = [
        { name: "ফজর", time: cleanTime(timings.Fajr) },
        { name: "যোহর", time: cleanTime(timings.Dhuhr) },
        { name: "আসর", time: cleanTime(timings.Asr) },
        { name: "মাগরিব", time: cleanTime(timings.Maghrib) },
        { name: "এশা", time: cleanTime(timings.Isha) }
      ];

      azanSchedule.forEach(azan => {
        const [hour, minute] = azan.time.split(":");
        const cronTime = `${minute} ${hour} * * *`;

        console.log(`⏰ আজান শিডিউল: ${azan.name} - ${azan.time}`);

        cron.schedule(cronTime, async () => {
          console.log(`🕌 Azan Time: ${azan.name}`);
          
          const message = `🕌 𝗔𝗭𝗔𝗡 𝗧𝗜𝗠𝗘 🕌\n\n⏰ এখন ${azan.name} এর আজানের সময়।\n\n🚫 এখন গ্রুপে কেউ মেসেজ করবেন না।\n\n🕋 আসুন আমরা সবাই নামাজে দাঁড়াই।\n\n🤲 আল্লাহ আমাদের নামাজ কবুল করুন।`;

          const videoURL = config.azanVideoURL;
          if (videoURL) {
            const filePath = await downloadVideo(videoURL);
            if (filePath) {
              await sendSafe(api, targetGroupID, {
                body: message,
                attachment: fs.createReadStream(filePath)
              });
              setTimeout(() => fs.remove(filePath).catch(() => {}), 30000);
            } else {
              await sendSafe(api, targetGroupID, message);
            }
          } else {
            await sendSafe(api, targetGroupID, message);
          }

        }, { scheduled: true, timezone: "Asia/Dhaka" });
      });

      console.log("✅ আজকের আজানের সময় API থেকে লোড হয়েছে এবং ক্রনজব চালু হয়েছে।");

    } catch (error) {
      console.error("❌ আজানের API থেকে সময় আনতে সমস্যা হয়েছে:", error.message);
      
      // API ফেইল করলে ব্যাকআপ হিসেবে ম্যানুয়াল সময়
      const fallbackSchedule = [
        { name: "ফজর", time: "05:00" },
        { name: "যোহর", time: "12:30" },
        { name: "আসর", time: "16:00" },
        { name: "মাগরিব", time: "18:00" },
        { name: "এশা", time: "19:30" }
      ];

      fallbackSchedule.forEach(azan => {
        const [hour, minute] = azan.time.split(":");
        const cronTime = `${minute} ${hour} * * *`;
        cron.schedule(cronTime, async () => {
          await sendSafe(api, targetGroupID, `🕌 আজানের সময় হয়েছে: ${azan.name}`);
        }, { scheduled: true, timezone: "Asia/Dhaka" });
      });
    }
  }
};
