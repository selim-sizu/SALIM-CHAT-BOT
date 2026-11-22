const cron = require("node-cron");
const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload) {
  return api.sendMessageMqtt(payload, threadID)
    .catch(err => console.error("❌ GoodMorning send failed:", err.message));
}

// 🎲 ফোল্ডার থেকে র‍্যান্ডম জিফ নেওয়ার ফাংশন
function getRandomGif(folderName) {
  const dir = path.join(__dirname, folderName);
  if (!fs.existsSync(dir)) return null;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".gif") || f.endsWith(".mp4"));
  if (files.length === 0) return null;
  
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return path.join(dir, randomFile);
}

module.exports = {
  config: {
    eventType: "system_startup",
    name: "goodmorning"
  },

  run: async ({ api, config, threadID }) => {
    // গ্রুপ আইডি (আপনার কনফিগ থেকে)
    const targetGroupID = config.gmGroupID || config.azanGroupID || threadID; 
    if (!targetGroupID) return;

    // ⏰ প্রতিদিন সকাল ৮:০০ টায়
    const cronTime = "0 8 * * *"; 

    cron.schedule(cronTime, async () => {
      console.log(`🌞 Good Morning Time!`);

      const message = `╭━━━🌞💛━━━╮
𝑮𝑶𝑶𝑫 𝑴𝑶𝑹𝑵𝑰𝑵𝑮 😴
╰━━━🌸✨━━━╯

সূর্য মামা ডিউটি করছে,
আর তুমি এখনো কম্বলের নিচে! 🤣

Utho!`;

      // 🌟 GitHub-এর events/goodmorning ফোল্ডার থেকে র‍্যান্ডম জিফ নেবে
      const gifPath = getRandomGif("goodmorning");

      if (gifPath) {
        // 🌟 টেক্সট এবং জিফ একসাথে পাঠানো (এক ফ্রেমে)
        await sendSafe(api, targetGroupID, {
          body: message,
          attachment: fs.createReadStream(gifPath)
        });
      } else {
        // জিফ না পেলে শুধু টেক্সট যাবে
        await sendSafe(api, targetGroupID, message);
      }

    }, { scheduled: true, timezone: "Asia/Dhaka" });
    
    console.log("✅ Good Morning Cronjob চালু হয়েছে (সকাল ৮:০০ টা)");
  }
};
