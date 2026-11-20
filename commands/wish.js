const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ wish send failed:", err.message));
}

function wrapText(ctx, text, maxWidth) {
  return new Promise(resolve => {
    if (ctx.measureText(text).width < maxWidth) return resolve([text]);
    if (ctx.measureText("W").width > maxWidth) return resolve(null);

    const words = text.split(" ");
    const lines = [];
    let line = "";

    while (words.length > 0) {
      let split = false;
      while (ctx.measureText(words[0]).width >= maxWidth) {
        const word = words[0];
        words[0] = word.slice(0, -1);
        if (split) {
          words[1] = word.slice(-1) + words[1];
        } else {
          split = true;
          words.splice(1, 0, word.slice(-1));
        }
      }

      if (ctx.measureText(line + words[0]).width < maxWidth) {
        line += words.shift() + " ";
      } else {
        lines.push(line.trim());
        line = "";
      }

      if (words.length === 0) lines.push(line.trim());
    }
    return resolve(lines);
  });
}

module.exports = {
  config: {
    name: "wish",
    aliases: ["birthday", "happybirthday"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Happy birthday wish for your friends",
    category: "Birthday",
    usages: "@tag",
    cooldowns: 5
  },

  run: async ({ api, event, config }) => {
    let canvas;
    try {
      canvas = require("canvas");
    } catch (e) {
      return sendSafe(
        api,
        event.threadID,
        "❌ canvas প্যাকেজ লোড হয়নি। শুধু টেক্সট wish পাঠাতে /wish2 ব্যবহার করুন।",
        event.messageID
      );
    }

    const { loadImage, createCanvas } = canvas;

    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);
    const bgPath = path.join(cacheDir, `wish_bg_${Date.now()}.png`);
    const avtPath = path.join(cacheDir, `wish_avt_${Date.now()}.png`);

    try {
      const targetID = Object.keys(event.mentions || {})[0] || event.senderID;

      let targetName = "Friend";
      let wisherName = "Someone";

      try {
        const info = await api.getUserInfo([targetID, event.senderID]);
        if (info?.[targetID]?.name) targetName = info[targetID].name;
        if (info?.[event.senderID]?.name) wisherName = info[event.senderID].name;
      } catch (e) {
        console.error("⚠️ getUserInfo failed:", e.message);
      }

      const bgURL = "https://i.postimg.cc/k4RS69d8/20230921-195836.png";

      const avtData = (await axios.get(
        `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
        { responseType: "arraybuffer", timeout: 20000 }
      )).data;
      await fs.writeFile(avtPath, Buffer.from(avtData));

      const bgData = (await axios.get(bgURL, { responseType: "arraybuffer", timeout: 20000 })).data;
      await fs.writeFile(bgPath, Buffer.from(bgData));

      const bgImage = await loadImage(bgPath);
      const avtImage = await loadImage(avtPath);
      const canvasObj = createCanvas(bgImage.width, bgImage.height);
      const ctx = canvasObj.getContext("2d");

      ctx.drawImage(bgImage, 0, 0, canvasObj.width, canvasObj.height);
      ctx.font = "400 32px Arial";
      ctx.fillStyle = "#1878F3";
      ctx.textAlign = "start";

      const nameLines = await wrapText(ctx, targetName, 1160);
      if (nameLines) ctx.fillText(nameLines.join("\n"), 120, 727);

      ctx.beginPath();
      ctx.drawImage(avtImage, 70, 270, 400, 400);

      const imageBuffer = canvasObj.toBuffer();
      await fs.writeFile(bgPath, imageBuffer);
      await fs.remove(avtPath);

      const body =
        "┏┓┏┓\n" +
        "┃┗┛ Happy_🎂🎆🎉\n" +
        "┃┏┓┃ 🄱🄸🅁🅃🄷🄳🄰🅈🎉🎆\n" +
        "┗┛┗┛ Birthday Wishes For You..💐💗\n" +
        `🥰 ${targetName} 😘\n\n` +
        "_𝐇𝐚𝐩𝐩𝐲 𝐛𝐢𝐫𝐭𝐡𝐝𝐚𝐲 🎂_\n" +
        "অনেক অনেক শুভ কামনা, দোয়া ও ভালবাসা রইল তোমার জন্য ❤\n" +
        "তোমার জীবনের প্রতিটা ক্ষণ আনন্দময় হোক এই কামনা করি...\n" +
        "শুভ জন্মদিন 🎂🎂🎂\n" +
        "🌷🌷\n\n" +
        "_𝐇𝐚𝐩𝐩𝐲 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲 𝐖𝐢𝐬𝐡𝐞𝐬 𝐟𝐨𝐫 𝐔😍_\n" +
        "𝐈 𝐰𝐢𝐬𝐡 𝐮 𝐦𝐚𝐧𝐲 𝐦𝐨𝐫𝐞 𝐡𝐚𝐩𝐩𝐲 𝐫𝐞𝐭𝐮𝐫𝐧𝐬 𝐨𝐟 𝐭𝐡𝐞 𝐝𝐚𝐲 💞\n\n" +
        "🖤 আশা করি সারাজীবন এমনই থাকবা, সবসময় ভালো থাকো এই কামনা করি\n" +
        "❤ জন্মদিনে শুধু এটাই কাম্য যাতে ভবিষ্যতে অনেক অনেক সুখী হও ❤\n" +
        "শুভ জন্মদিন 🫂 ❤️‍🩹\n\n" +
        `𝐌𝐚𝐤𝐢𝐧𝐠 𝐭𝐡𝐢𝐬 𝐰𝐢𝐬𝐡: ${wisherName}`;

      await sendSafe(
        api,
        event.threadID,
        {
          body,
          attachment: fs.createReadStream(bgPath)
        },
        event.messageID
      );

      setTimeout(() => fs.remove(bgPath).catch(() => {}), 30000);

    } catch (error) {
      console.error("❌ wish error:", error.message);
      await fs.remove(bgPath).catch(() => {});
      await fs.remove(avtPath).catch(() => {});
      return sendSafe(
        api,
        event.threadID,
        `❌ Wish তৈরি করা যায়নি: ${error.message}`,
        event.messageID
      );
    }
  }
};
