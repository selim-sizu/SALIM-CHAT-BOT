const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ leave send failed:", err.message));
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
    name: "leave"
  },

  run: async ({ api, event, config }) => {
    // শুধু কেউ গ্রুপ ছেড়ে গেলে কাজ করবে
    if (event.logMessageType !== "log:unsubscribe") return;

    const threadID = event.threadID;
    const leftID = event.logMessageData?.leftParticipantFbId;
    if (!leftID) return;

    // নাম বের করা
    let name = "একজন সদস্য";
    try {
      const info = await api.getUserInfo(leftID);
      if (info?.[leftID]?.name) name = info[leftID].name;
    } catch (e) {
      console.error("⚠️ getUserInfo failed:", e.message);
    }

    // 📝 মেসেজ টেক্সট তৈরি
    const bodyText = `👋 𝐆𝐨𝐨𝐝𝐛𝐲𝐞 ${name}\n\n😢 গ্রুপ থেকে চলে গেলেন।\n🆔 UID: ${leftID}\n\nআল্লাহ হাফেজ! আবার দেখা হবে 🌸`;

    // 🎬 র‍্যান্ডম জিফ খোঁজা
    const gifPath = getRandomGif("leave");

    if (gifPath) {
      // 🌟 টেক্সট এবং জিফ একসাথে পাঠানো (এক ফ্রেমে)
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
};
