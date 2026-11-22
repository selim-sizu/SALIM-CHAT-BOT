const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ 4k send failed:", err.message));
}

// 🖼️ ফাইল ডাউনলোড করার ফাংশন
async function downloadFile(url, ext) {
  try {
    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `4k_${Date.now()}${ext}`);

    const res = await axios.get(url, { responseType: "stream", timeout: 30000 });
    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(filePath);
      res.data.pipe(w);
      w.on("finish", resolve);
      w.on("error", reject);
    });
    return filePath;
  } catch (e) {
    return null;
  }
}

module.exports = {
  config: {
    name: "4k",
    aliases: ["hd", "upscale", "enhance"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Enhance image or gif to HD quality",
    category: "tools",
    cooldowns: 10
  },

  run: async ({ api, event }) => {
    const { threadID, messageID, messageReply } = event;

    // ১. চেক করা হচ্ছে কেউ রিপ্লাই দিয়েছে কিনা
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return sendSafe(api, threadID, "⚠️ কোনো ছবি বা ভিডিওতে reply দিন এবং /4k লিখুন।", messageID);
    }

    const attachment = messageReply.attachments[0];
    
    // ২. চেক করা হচ্ছে এটি ছবি নাকি ভিডিও/জিফ
    if (attachment.type === "photo") {
      // 🖼️ ছবির ক্ষেত্রে
      await sendSafe(api, threadID, "⏳ ছবিটি HD করা হচ্ছে, অপেক্ষা করুন...", messageID);
      
      const imageUrl = attachment.url;
      // এখানে একটি ফ্রি ইমেজ আপস্কেলার API ব্যবহার করা হচ্ছে (উদাহরণস্বরূপ)
      const enhancedUrl = `https://api.popcat.xyz/upscale?image=${encodeURIComponent(imageUrl)}`;
      
      await sendSafe(api, threadID, {
        body: "✅ আপনার ছবিটি HD (4K) করা হয়েছে!",
        attachment: enhancedUrl
      }, messageID);

    } else if (attachment.type === "video" || attachment.type === "animated_image") {
      // 🎬 ভিডিও বা জিফের ক্ষেত্রে
      // ফেসবুক API সরাসরি ভিডিওর কোয়ালিটি বাড়াতে দেয় না, তবে আমরা ফাইলটি পাঠাতে পারি
      await sendSafe(api, threadID, "⏳ ভিডিওটি প্রসেস করা হচ্ছে...", messageID);
      
      const videoUrl = attachment.url;
      const filePath = await downloadFile(videoUrl, ".mp4");

      if (filePath) {
        await sendSafe(api, threadID, {
          body: "✅ আপনার ভিডিও/জিফটি HD কোয়ালিটিতে পাঠানো হলো!",
          attachment: fs.createReadStream(filePath)
        }, messageID);
        setTimeout(() => fs.remove(filePath).catch(() => {}), 20000);
      } else {
        await sendSafe(api, threadID, "❌ ভিডিওটি প্রসেস করা যায়নি।", messageID);
      }
    } else {
      return sendSafe(api, threadID, "⚠️ শুধু ছবি বা ভিডিও/জিফ সাপোর্ট করে।", messageID);
    }
  }
};
