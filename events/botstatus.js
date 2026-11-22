const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

// 🌟 এখানে আপনার অ্যাডমিন গ্রুপের আইডি বসান
const NOTIFICATION_GROUP_TID = "100075452558091"; 

function sendSafe(api, threadID, payload) {
  return api.sendMessageMqtt(payload, threadID)
    .catch(err => console.error("❌ botstatus send failed:", err.message));
}

async function createBanner({ botName, groupTID, actorID, action, time }) {
  const WIDTH = 1000, HEIGHT = 600;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const isAdded = action === "added";
  const accent = isAdded ? "#25b864" : "#e53935";
  const bgColor = isAdded ? "#0a1c12" : "#1c0a0a";

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 45px Arial";
  ctx.fillText(isAdded ? "BOT ADDED" : "BOT REMOVED", WIDTH / 2, 100);

  ctx.fillStyle = accent;
  ctx.font = "bold 30px Arial";
  ctx.fillText(isAdded ? "SUCCESSFULLY ACTIVE ✅" : "LEFT THE GROUP ❌", WIDTH / 2, 160);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "24px Arial";

  ctx.fillText(`🤖 Bot Name: ${botName}`, 80, 280);
  ctx.fillText(`📌 Group TID: ${groupTID}`, 80, 330);
  ctx.fillText(`👤 ${isAdded ? "Added" : "Removed"} By: ${actorID}`, 80, 380);
  ctx.fillText(`🕒 Time: ${time}`, 80, 430);

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = "bold 25px Arial";
  ctx.fillText(isAdded ? "Thank you for adding me!" : "Thank you for using me!", WIDTH / 2, 520);

  const filePath = path.join(__dirname, "..", "cache", `botstatus_${Date.now()}.png`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, canvas.toBuffer("image/png"));
  return filePath;
}

module.exports = {
  config: {
    eventType: "event",
    name: "botstatus"
  },

  run: async ({ api, event, config }) => {
    if (!event.logMessageData) return;

    const botID = String(api.getCurrentUserID());
    const botName = config.botName || "SALIM-CHAT-BOT";
    const groupTID = String(event.threadID);
    const actorID = String(event.author || "Unknown");
    
    let action = null;

    // বট অ্যাড হলে
    if (event.logMessageType === "log:subscribe") {
      const participants = event.logMessageData.addedParticipants || [];
      const isBotAdded = participants.some(u => String(u.userFbId) === botID);
      if (isBotAdded) action = "added";
    }

    // বট রিমুভ হলে
    if (event.logMessageType === "log:unsubscribe") {
      const leftID = event.logMessageData.leftParticipantFbId;
      if (String(leftID) === botID) action = "removed";
    }

    if (!action) return;

    const time = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });
    const text = action === "added" 
      ? `✅ Bot Added Successfully!\n📌 Group TID: ${groupTID}\n👤 Added By: ${actorID}` 
      : `❌ Bot Removed!\n📌 Group TID: ${groupTID}\n👤 Removed By: ${actorID}`;

    try {
      const imgPath = await createBanner({ botName, groupTID, actorID, action, time });
      await sendSafe(api, NOTIFICATION_GROUP_TID, {
        body: text,
        attachment: fs.createReadStream(imgPath)
      });
      setTimeout(() => fs.remove(imgPath).catch(() => {}), 15000);
    } catch (e) {
      console.error("❌ Bot status banner failed:", e.message);
      await sendSafe(api, NOTIFICATION_GROUP_TID, text);
    }
  }
};
