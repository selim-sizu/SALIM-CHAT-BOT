const fs = require("fs-extra");
const path = require("path");

const BOT_MSG_PATH = path.join(__dirname, "..", "cache", "bot_messages.json");

function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ replyhandler send failed:", err.message));
}

module.exports = {
  config: {
    eventType: "message",
    name: "replyhandler"
  },

  run: async ({ api, event, config }) => {
    if (!event.body || !event.threadID) return;
    
    // শুধু রিপ্লাই হলে কাজ করবে
    if (!event.messageReply || !event.messageReply.messageID) return;
    
    const repliedMsgID = event.messageReply.messageID;
    const userText = event.body.trim();

    // চেক করা হচ্ছে বট কি আগে এই মেসেজ পাঠিয়েছিল?
    if (fs.existsSync(BOT_MSG_PATH)) {
      let botDb = {};
      try { botDb = JSON.parse(fs.readFileSync(BOT_MSG_PATH, "utf8")); } catch (_) {}
      
      if (botDb[repliedMsgID]) {
        const originalText = botDb[repliedMsgID];

        // বটের রিপ্লাই মেসেজ
        const replyBack = `🤖 আপনি আমার আগের মেসেজের রিপ্লাই দিয়েছেন!\n\n📝 আমি বলেছিলাম: "${originalText}"\n\n💬 আপনি এখন যা বললেন: "${userText}"\n\n😄 ধন্যবাদ!`;
        
        return sendSafe(api, event.threadID, replyBack, event.messageID);
      }
    }
  }
};
