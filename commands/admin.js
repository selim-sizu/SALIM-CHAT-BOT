const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ admin send failed:", err.message));
}

// 🕒 বাংলাদেশ সময় (Asia/Dhaka)
function getBangladeshTime() {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(now);
  } catch (_) {
    return now.toString();
  }
}

// 🖼️ ছবি ডাউনলোড করার ফাংশন
async function downloadImage(url) {
  try {
    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `admin_pic_${Date.now()}.jpg`);

    const res = await axios.get(url, { responseType: "stream", timeout: 20000 });
    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(filePath);
      res.data.pipe(w);
      w.on("finish", resolve);
      w.on("error", reject);
    });
    return filePath;
  } catch (e) {
    console.error("⚠️ admin image download failed:", e.message);
    return null;
  }
}

module.exports = {
  config: {
    name: "admin",
    aliases: ["adm", "owner", "মালিক", "ownerinfo"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Show Owner Info with photo"
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, senderID, mentions, messageReply, messageID } = event;
    const sub = (args[0] || "").toLowerCase();

    // ==========================================
    // 🌟 ওনার কার্ড (ছবি সহ)
    // ==========================================
    if (sub === "" || sub === "info" || sub === "owner") {
      
      // 🖼️ এখানে আপনার Imgur ছবির ডাইরেক্ট লিঙ্কটি বসান (.jpg বা .png)
      const imageURL = "https://imgur.com/a/1qk168c.jpg"; 

      const time = getBangladeshTime();
      
      const bodyText = `┌───────────────⭓
│ 𝗢𝗪𝗡𝗘𝗥 𝗗𝗘𝗧𝗔𝗜𝗟𝗦
├───────────────
│👤 𝐍𝐚𝐦𝐞 : ${config.ownerName || "Selim Sizu"} 🦋
│🚹 𝐆𝐞𝐧𝐝𝐞𝐫 : 𝐌𝐚𝐥𝐞
│❤️ 𝐑𝐞𝐥𝐚𝐭𝐢𝐨𝐧 : 𝐒𝐢𝐧𝐠𝐥𝐞
│🎂 𝐀𝐠𝐞 : 𝟏𝟖+
│🕌 𝐑𝐞𝐥𝐢𝐠𝐢𝐨𝐧 : 𝐈𝐬𝐥𝐚𝐦
│🎓 𝐄𝐝𝐮𝐜𝐚𝐭𝐢𝐨𝐧 : 𝐇𝐒𝐂
│🏡 𝐀𝐝𝐝𝐫𝐞𝐬𝐬 : 𝐌𝐞𝐡𝐞𝐫𝐩𝐮𝐫 
└───────────────⭓

┌───────────────⭓
│ 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗟𝗜𝗡𝗞𝗦
├───────────────
│📘 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸:
│https://fb.com/${config.ownerID}
│💬 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽:
│https://wa.me/01618119633
└───────────────⭓

┌───────────────⭓
│ 🕒 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 𝗧𝗶𝗺𝗲
├───────────────
│ ${time}
└───────────────⭓`;

      // ছবি ডাউনলোড করে মেসেজের সাথে পাঠানো
      const imgPath = await downloadImage(imageURL);

      if (imgPath) {
        await sendSafe(api, threadID, {
          body: bodyText,
          attachment: fs.createReadStream(imgPath)
        }, messageID);
        
        // ফাইল ডিলিট করা
        setTimeout(() => fs.remove(imgPath).catch(() => {}), 20000);
      } else {
        // ছবি ডাউনলোড না হলে শুধু টেক্সট যাবে
        await sendSafe(api, threadID, bodyText, messageID);
      }
      return;
    }

    // ==========================================
    // অ্যাডমিন ম্যানেজমেন্ট (add/remove/list)
    // ==========================================
    const adminKey = Array.isArray(config.adminIDs) ? "adminIDs" : "admins";
    let admins = Array.isArray(config[adminKey]) ? [...config[adminKey]] : [];
    const ownerID = config.ownerID;

    const isAdmin = admins.includes(senderID) || senderID === ownerID;
    if (!isAdmin) {
      return sendSafe(api, threadID, "❌ এই কমান্ড শুধু অ্যাডমিনদের জন্য।", messageID);
    }

    function getTargetID() {
      if (messageReply && messageReply.senderID) return messageReply.senderID;
      if (mentions && Object.keys(mentions).length > 0) return Object.keys(mentions)[0];
      if (args[1] && /^\d+$/.test(args[1])) return args[1];
      return null;
    }

    // admin list
    if (sub === "list" || sub === "all") {
      const list = admins.length
        ? admins.map((id, i) => `${i + 1}. ${id}`).join("\n")
        : "কোনো অ্যাডমিন নেই।";
      return sendSafe(api, threadID, `👑 বট অ্যাডমিন লিস্ট:\n\n${list}\n\nOwner: ${ownerID || "সেট করা নেই"}`, messageID);
    }

    // admin add
    if (sub === "add") {
      const uid = getTargetID();
      if (!uid) {
        return sendSafe(api, threadID, "⚠️ কাউকে mention করুন, reply দিন, অথবা UID দিন।\nউদাহরণ: /admin add 1000xxxxxxxxx", messageID);
      }
      if (admins.includes(uid)) {
        return sendSafe(api, threadID, `ℹ️ ${uid} ইতিমধ্যে অ্যাডমিন।`, messageID);
      }

      admins.push(uid);
      config[adminKey] = admins;
      try {
        fs.writeFileSync(path.join(__dirname, "..", "config.json"), JSON.stringify(config, null, 2));
      } catch (e) {
        return sendSafe(api, threadID, "❌ config.json সেভ করা যায়নি।", messageID);
      }
      return sendSafe(api, threadID, `✅ নতুন অ্যাডমিন যোগ হয়েছে: ${uid}`, messageID);
    }

    // admin remove
    if (["remove", "del", "delete"].includes(sub)) {
      const uid = getTargetID();
      if (!uid) {
        return sendSafe(api, threadID, "⚠️ কাউকে mention করুন, reply দিন, অথবা UID দিন।\nউদাহরণ: /admin remove 1000xxxxxxxxx", messageID);
      }
      if (uid === ownerID) {
        return sendSafe(api, threadID, "❌ Owner-কে বাদ দেওয়া যাবে না।", messageID);
      }
      if (!admins.includes(uid)) {
        return sendSafe(api, threadID, `ℹ️ ${uid} অ্যাডমিন লিস্টে নেই।`, messageID);
      }
      if (admins.length === 1 && admins[0] === uid && senderID !== ownerID) {
        return sendSafe(api, threadID, "❌ শেষ অ্যাডমিনকে বাদ দেওয়া যাবে না।", messageID);
      }

      admins = admins.filter(id => id !== uid);
      config[adminKey] = admins;
      try {
        fs.writeFileSync(path.join(__dirname, "..", "config.json"), JSON.stringify(config, null, 2));
      } catch (e) {
        return sendSafe(api, threadID, "❌ config.json সেভ করা যায়নি।", messageID);
      }
      return sendSafe(api, threadID, `✅ অ্যাডমিন বাদ দেওয়া হয়েছে: ${uid}`, messageID);
    }

    return sendSafe(
      api,
      threadID,
      "📌 Admin কমান্ড:\n" +
        "• /admin — Owner details\n" +
        "• /admin list — অ্যাডমিন লিস্ট\n" +
        "• /admin add @mention / reply / UID\n" +
        "• /admin remove @mention / reply / UID",
      messageID
    );
  }
};
