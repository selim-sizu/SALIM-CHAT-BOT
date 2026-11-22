const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const FACEBOOK_ACCESS_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

function sendSafe(api, threadID, payload) {
  return api.sendMessageMqtt(payload, threadID)
    .catch(err => console.error("❌ groupupdate send failed:", err.message));
}

async function getProfileImage(userID) {
  if (!userID) return null;
  const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${encodeURIComponent(FACEBOOK_ACCESS_TOKEN)}`;
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await loadImage(Buffer.from(res.data));
  } catch { return null; }
}

async function createBanner({ title, subtitle, userName, userID, details, colors }) {
  const WIDTH = 1000, HEIGHT = 600;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background Gradient
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, colors.bg1);
  bg.addColorStop(1, colors.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Profile Photo
  const profile = await getProfileImage(userID);
  const px = 150, py = 250, radius = 80;
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, radius + 5, 0, Math.PI * 2);
  ctx.fillStyle = colors.accent;
  ctx.fill();
  ctx.clip();
  if (profile) {
    ctx.drawImage(profile, px - radius, py - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = "#333";
    ctx.fill();
  }
  ctx.restore();

  // Text Setup
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  
  ctx.font = "bold 40px Arial";
  ctx.fillText(title, 50, 80);
  
  ctx.fillStyle = colors.accent;
  ctx.font = "bold 25px Arial";
  ctx.fillText(subtitle, 50, 120);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px Arial";
  ctx.fillText(userName || "Unknown", 260, 230);

  ctx.fillStyle = colors.accent;
  ctx.font = "20px Arial";
  ctx.fillText(`UID: ${userID || "Unknown"}`, 260, 270);

  // Details
  ctx.fillStyle = "#ffffff";
  ctx.font = "22px Arial";
  let dy = 350;
  for (const d of details) {
    ctx.fillText(`➤ ${d}`, 60, dy);
    dy += 40;
  }

  const filePath = path.join(__dirname, "..", "cache", `update_${Date.now()}.png`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, canvas.toBuffer("image/png"));
  return filePath;
}

module.exports = {
  config: {
    eventType: "event",
    name: "groupupdate"
  },

  run: async ({ api, event, config }) => {
    const { threadID, logMessageType, logMessageData, author } = event;
    if (!logMessageData) return;

    let bannerData = null;
    let body = "";

    let userName = "Unknown";
    let userID = author || "";
    if (userID) {
      try {
        const info = await api.getUserInfo(userID);
        if (info && info[userID]) userName = info[userID].name;
      } catch {}
    }

    // ১. অ্যাডমিন আপডেট
    if (logMessageType === "log:thread-admins") {
      const targetID = String(logMessageData.TARGET_ID || "");
      const isAdd = logMessageData.ADMIN_EVENT === "add_admin";
      let targetName = "Unknown";
      try {
        const info = await api.getUserInfo(targetID);
        if (info && info[targetID]) targetName = info[targetID].name;
      } catch {}

      body = `👑 𝐆𝐑𝐎𝐔𝐏 𝐀𝐃𝐌𝐈𝐍 𝐔𝐏𝐃𝐀𝐓𝐄\n\n👤 User: ${targetName}\n🆔 UID: ${targetID}\n\n${isAdd ? "🟢 Admin Power Activated" : "🔴 Admin Power Removed"}\n\n🤖 ${config.botName}`;
      bannerData = {
        title: isAdd ? "ADMIN ACTIVATED" : "ADMIN REMOVED",
        subtitle: "GROUP UPDATE",
        userName: targetName, userID: targetID,
        details: [isAdd ? "Permission: Activated" : "Permission: Removed"],
        colors: isAdd ? { bg1: "#08001f", bg2: "#21005d", accent: "#00e5ff" } : { bg1: "#210008", bg2: "#4a0015", accent: "#ff3d71" }
      };
    }

    // ২. গ্রুপের নাম পরিবর্তন
    if (logMessageType === "log:thread-name") {
      const newName = logMessageData.name || "New Name";
      body = `⚠️ 𝐆𝐑𝐎𝐔𝐏 𝐍𝐀𝐌𝐄 𝐔𝐏𝐃𝐀𝐓𝐄\n\n👤 User: ${userName}\n🆔 UID: ${userID}\n\n📝 New Name: ${newName}\n\n🤖 ${config.botName}`;
      bannerData = {
        title: "NAME CHANGED",
        subtitle: "GROUP UPDATE",
        userName, userID,
        details: [`New Name: ${newName}`],
        colors: { bg1: "#020b2d", bg2: "#003c72", accent: "#00d9ff" }
      };
    }

    // ৩. নিকনেম পরিবর্তন
    if (logMessageType === "log:user-nickname") {
      const targetID = String(logMessageData.participant_id || "");
      const nickname = logMessageData.nickname || "Original Name";
      body = `👤 𝐍𝐈𝐂𝐊𝐍𝐀𝐌𝐄 𝐔𝐏𝐃𝐀𝐓𝐄\n\n👤 User: ${userName}\n🆔 UID: ${userID}\n\n📝 New Nickname: ${nickname}\n\n🤖 ${config.botName}`;
      bannerData = {
        title: "NICKNAME CHANGED",
        subtitle: "GROUP UPDATE",
        userName, userID: targetID,
        details: [`New Nickname: ${nickname}`],
        colors: { bg1: "#16002e", bg2: "#42006e", accent: "#ff39d4" }
      };
    }

    // ছবি তৈরি এবং পাঠানো
    if (bannerData) {
      try {
        const imgPath = await createBanner(bannerData);
        await sendSafe(api, threadID, {
          body: body,
          attachment: fs.createReadStream(imgPath)
        });
        setTimeout(() => fs.remove(imgPath).catch(() => {}), 15000);
      } catch (e) {
        console.error("❌ Group update banner failed:", e.message);
        await sendSafe(api, threadID, { body: body });
      }
    }
  }
};
