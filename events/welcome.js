const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ welcome send failed:", err.message));
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
    eventType: "event",
    name: "welcome"
  },

  run: async ({ api, event, config }) => {
    // শুধু নতুন সদস্য যোগ দিলে কাজ করবে
    if (event.logMessageType !== "log:subscribe") return;

    const threadID = event.threadID;
    const added = event.logMessageData?.addedParticipants || [];
    if (!added.length) return;

    const botName = config?.botName || "SALIM-CHAT-BOT";
    const prefix = config?.prefix || "/";

    for (const user of added) {
      // বট নিজে গ্রুপে যোগ দিলে ওয়েলকাম বাদ
      if (user.userFbId === api.getCurrentUserID()) continue;
      
      const name = user.fullName || "নতুন সদস্য";

      // 📝 মেসেজ টেক্সট তৈরি
      const bodyText = `🎉 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 🎉\n\n👤 ${name}\n\nআমাদের গ্রুপে আপনাকে আন্তরিক স্বাগতম! 🌸\nনিয়ম জানতে লিখুন: ${prefix}rules\n\n🤖 ${botName}`;

      // 🎬 র‍্যান্ডম জিফ খোঁজা
      const gifPath = getRandomGif("welcome");

      if (gifPath) {
        // 🌟 টেক্সট এবং জিফ একসাথে পাঠানো (এক বাবলে)
        await sendSafe(
          api,
          threadID,
          {
            body: bodyText,
            attachment: fs.createReadStream(gifPath)
          }
        );
      } else {
        // জিফ না পেলে শুধু টেক্সট পাঠাবে
        await sendSafe(api, threadID, bodyText);
      }
    }
  }
};
