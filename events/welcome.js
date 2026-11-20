const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ welcome send failed:", err.message));
}

// 🎲 র‍্যান্ডম জিফ সিলেক্ট করার ফাংশন
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
    if (event.logMessageType !== "log:subscribe") return;

    const threadID = event.threadID;
    const added = event.logMessageData?.addedParticipants || [];
    if (!added.length) return;

    const botName = config?.botName || "SALIM-CHAT-BOT";
    const prefix = config?.prefix || "/";

    for (const user of added) {
      if (user.userFbId === api.getCurrentUserID()) continue; // বট নিজে হলে বাদ
      const name = user.fullName || "নতুন সদস্য";

      // ১) টেক্সট মেসেজ
      await sendSafe(
        api,
        threadID,
        `🎉 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 🎉\n\n👤 ${name}\n\n` +
        `আমাদের গ্রুপে আপনাকে আন্তরিক স্বাগতম! 🌸\n` +
        `নিয়ম জানতে লিখুন: ${prefix}rules\n\n🤖 ${botName}`
      );

      // ২) র‍্যান্ডম জিফ (মেসেজের নিচে)
      const gifPath = getRandomGif("welcome"); // welcome ফোল্ডার থেকে নেবে
      
      if (gifPath) {
        setTimeout(async () => {
          try {
            await api.sendMessageMqtt(
              {
                body: "🎬",
                attachment: fs.createReadStream(gifPath)
              },
              threadID
            ).catch(err => console.error("❌ gif send failed:", err.message));
          } catch (e) {
            console.error("❌ gif read error:", e.message);
          }
        }, 1500); // ১.৫ সেকেন্ড পর জিফ যাবে
      }
    }
  }
};
