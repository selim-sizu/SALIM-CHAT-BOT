const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ pp send failed:", err.message));
}

// 🖼️ প্রোফাইল পিকচার নামানো
async function downloadAvatar(uid) {
  const url = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
  try {
    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `avatar_${uid}_${Date.now()}.jpg`);

    const res = await axios.get(url, {
      responseType: "stream",
      timeout: 20000
    });

    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(filePath);
      res.data.pipe(w);
      w.on("finish", resolve);
      w.on("error", reject);
    });

    const stat = await fs.stat(filePath);
    if (stat.size < 500) {
      // খুব ছোট → ডিফল্ট ছবি
      await fs.remove(filePath).catch(() => {});
      return null;
    }
    return filePath;
  } catch (e) {
    console.error("⚠️ avatar download failed:", e.message);
    return null;
  }
}

function profileCard(name, uid) {
  return `╔══════════❖🌺❖══════════╗
║ 👤 𝐍𝐚𝐦𝐞 : ${name}
║ 🆔 𝐔𝐬𝐞𝐫 𝐔𝐈𝐃 : ${uid}
║ 🔗 𝐌𝐞𝐬𝐬𝐚𝐠𝐞 𝐋𝐢𝐧𝐤 :
║ m.me/${uid}
║ 🌐 𝐅𝐁 𝐏𝐫𝐨𝐟𝐢𝐥𝐞 :
║ fb.com/${uid}
╚══════════❖🌺❖══════════╝`;
}

module.exports = {
  config: {
    name: "pp",
    aliases: ["profile", "pic", "avatar"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Get Facebook UID and profile links",
    category: "tools",
    cooldowns: 5
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    // 🎯 টার্গেট UID নির্ধারণ
    let targetID;

    if (messageReply && messageReply.senderID) {
      // reply করা মেসেজের প্রেরক
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      // @mention করা ইউজার
      targetID = Object.keys(mentions)[0];
    } else if (args[0] && /^\d+$/.test(args[0])) {
      // সরাসরি UID
      targetID = args[0];
    } else {
      // নিজের তথ্য
      targetID = senderID;
    }

    // 👤 নাম বের করা
    let name = "Facebook User";
    try {
      const info = await api.getUserInfo(targetID);
      if (info && info[targetID] && info[targetID].name) {
        name = info[targetID].name;
      }
    } catch (e) {
      console.error("⚠️ getUserInfo failed:", e.message);
    }

    const body = profileCard(name, targetID);

    // 🖼️ প্রোফাইল পিকচার নামানো
    const avatarPath = await downloadAvatar(targetID);

    if (avatarPath) {
      await sendSafe(
        api,
        threadID,
        {
          body,
          attachment: fs.createReadStream(avatarPath)
        },
        messageID
      );

      // ২০ সেকেন্ড পর ফাইল ক্লিন
      setTimeout(() => {
        fs.remove(avatarPath).catch(() => {});
      }, 20000);
    } else {
      // ছবি না পেলে শুধু টেক্সট
      await sendSafe(api, threadID, body, messageID);
    }
  }
};
