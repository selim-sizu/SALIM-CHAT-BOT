const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ leave send failed:", err.message));
}

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
    name: "leave"
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
    } catch (e) {}

    // ১) টেক্সট মেসেজ
    await sendSafe(
      api,
      threadID,
      `👋 𝐆𝐨𝐨𝐝𝐛𝐲𝐞 ${name}\n\n` +
      `😢 গ্রুপ থেকে চলে গেলেন।\n` +
      `আল্লাহ হাফেজ! আবার দেখা হবে 🌸`
    );

    // ২) র‍্যান্ডম জিফ (মেসেজের নিচে)
    const gifPath = getRandomGif("leave"); // leave ফোল্ডার থেকে নেবে
    
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
      }, 1500);
    }
  }
};
