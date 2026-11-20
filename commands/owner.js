const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ owner send failed:", err.message));
}

// 📥 ইমেজ বা ভিডিও ডাউনলোড করার ফাংশন
async function downloadMedia(url) {
  try {
    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);
    
    // লিঙ্কে .mp4 থাকলে ভিডিও, নাহলে ছবি
    const ext = url.toLowerCase().includes(".mp4") ? ".mp4" : ".jpg";
    const filePath = path.join(cacheDir, `owner_${Date.now()}${ext}`);

    const res = await axios.get(url, {
      responseType: "stream",
      timeout: 20000
    });

    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(filePath);
      res.data.pipe(w);
      w.on("finish", resolve);
      w.on("error", reject);
    });

    return filePath;
  } catch (e) {
    console.error("⚠️ owner media download failed:", e.message);
    return null;
  }
}

module.exports = {
  config: {
    name: "owner",
    aliases: ["ownerinfo", "owners", "মালিক"],
    version: "1.0.1",
    credits: "Selim sizu",
    description: "Show Owner Info with random photo or video",
    category: "Information",
    cooldowns: 2
  },

  run: async ({ api, event, config }) => {
    const info = `
👑 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢

👤 𝗡𝗮𝗺𝗲: 𝐒𝐞𝐥𝐢𝐦 𝐒𝐢𝐳𝐮 🦋
🧸 𝗡𝗶𝗰𝗸 𝗡𝗮𝗺𝗲: 𝐒𝐢𝐳𝐮
🎂 𝗔𝗴𝗲: 𝟭𝟴+
💘 𝗥𝗲𝗹𝗮𝘁𝗶𝗼𝗻: 𝗦𝗶𝗻𝗴𝗹𝗲
🎓 𝗣𝗿𝗼𝗳𝗲𝘀𝘀𝗶𝗼𝗻: 𝗦𝘁𝘂𝗱𝗲𝗻𝘁
📚 𝗘𝗱𝘂𝗰𝗮𝘁𝗶𝗼𝗻: 𝐇𝐒𝐂
🏡 𝗔𝗱𝗱𝗿𝗲𝘀𝘀: 𝐌𝐞𝐡𝐞𝐫𝐩𝐮𝐫

🔗 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗟𝗜𝗡𝗞𝗦

📘 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸:
fb.com/100075452558091

💬 𝗠𝗲𝘀𝘀𝗲𝗻𝗴𝗲𝗿:
m.me/100075452558091

📞 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽:
wa.me/8801618119633
`;

    // ⚠️ এখানে Imgur এর ডাইরেক্ট লিঙ্ক (.jpg / .png / .mp4) দিতে হবে
    const mediaList = [
      "https://i.imgur.com/xxxxxx.jpg", // ১ম ছবি
      "https://i.imgur.com/yyyyyy.mp4", // ২য় ভিডিও
      "https://i.imgur.com/zzzzzz.png"  // ৩য় ছবি
    ];

    const randomMedia = mediaList[Math.floor(Math.random() * mediaList.length)];

    // মিডিয়া ডাউনলোড করা
    const filePath = await downloadMedia(randomMedia);

    if (filePath) {
      // ছবি/ভিডিও সহ মেসেজ পাঠানো
      await sendSafe(
        api,
        event.threadID,
        {
          body: info,
          attachment: fs.createReadStream(filePath)
        },
        event.messageID
      );

      // ৩০ সেকেন্ড পর ক্যাশ ফাইল ডিলিট
      setTimeout(() => {
        fs.remove(filePath).catch(() => {});
      }, 30000);
    } else {
      // ডাউনলোড ফেইল হলে শুধু টেক্সট যাবে
      await sendSafe(api, event.threadID, info, event.messageID);
    }
  }
};
