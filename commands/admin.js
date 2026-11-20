const fs = require("fs");
const path = require("path");
const CONFIG_PATH = path.join(__dirname, "..", "config.json");

function sendSafe(api, threadID, message) {
  return api.sendMessageMqtt(message, threadID)
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

// 🎨 OWNER DETAILS কার্ড
function ownerCard(time) {
  return `┌───────────────⭓
│ 𝗢𝗪𝗡𝗘𝗥 𝗗𝗘𝗧𝗔𝗜𝗟𝗦
├───────────────
│👤 𝐍𝐚𝐦𝐞 : 𝐒𝐞𝐥𝐢𝐦 𝐒𝐢𝐳𝐮 🦋
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
│https://fb.com/100075452558091
│💬 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽:
│https://wa.me/01618119633
└───────────────⭓

┌───────────────⭓
│ 🕒 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 𝗧𝗶𝗺𝗲
├───────────────
│ ${time}
└───────────────⭓`;
}

module.exports = {
  config: {
    name: "admin",
    aliases: ["adm", "owner", "মালিক"],
    description: "অ্যাডমিন তথ্য ও ম্যানেজমেন্ট"
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, senderID, mentions, messageReply } = event;
    const sub = (args[0] || "").toLowerCase();

    // ✅ যে কেউ "admin" বা "admin info" লিখলে কার্ড দেখবে
    if (sub === "" || sub === "info" || sub === "owner") {
      return sendSafe(api, threadID, ownerCard(getBangladeshTime()));
    }

    // নিচের সব কমান্ডের জন্য অ্যাডমিন পারমিশন দরকার
    const adminKey = Array.isArray(config.adminIDs) ? "adminIDs" : "admins";
    let admins = Array.isArray(config[adminKey]) ? [...config[adminKey]] : [];
    const ownerID = config.ownerID;

    const isAdmin = admins.includes(senderID) || senderID === ownerID;
    if (!isAdmin) {
      return sendSafe(api, threadID, "❌ এই কমান্ড শুধু অ্যাডমিনদের জন্য।");
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
      return sendSafe(
        api,
        threadID,
        `👑 বট অ্যাডমিন লিস্ট:\n\n${list}\n\nOwner: ${ownerID || "সেট করা নেই"}`
      );
    }

    // admin add
    if (sub === "add") {
      const uid = getTargetID();
      if (!uid) {
        return sendSafe(
          api,
          threadID,
          "⚠️ কাউকে mention করুন, reply দিন, অথবা UID দিন।\nউদাহরণ: /admin add 1000xxxxxxxxx"
        );
      }
      if (admins.includes(uid)) {
        return sendSafe(api, threadID, `ℹ️ ${uid} ইতিমধ্যে অ্যাডমিন।`);
      }

      admins.push(uid);
      config[adminKey] = admins;
      try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      } catch (e) {
        console.error("❌ config save failed:", e.message);
        return sendSafe(api, threadID, "❌ config.json সেভ করা যায়নি।");
      }
      return sendSafe(api, threadID, `✅ নতুন অ্যাডমিন যোগ হয়েছে: ${uid}`);
    }

    // admin remove
    if (["remove", "del", "delete"].includes(sub)) {
      const uid = getTargetID();
      if (!uid) {
        return sendSafe(
          api,
          threadID,
          "⚠️ কাউকে mention করুন, reply দিন, অথবা UID দিন।\nউদাহরণ: /admin remove 1000xxxxxxxxx"
        );
      }
      if (uid === ownerID) {
        return sendSafe(api, threadID, "❌ Owner-কে বাদ দেওয়া যাবে না।");
      }
      if (!admins.includes(uid)) {
        return sendSafe(api, threadID, `ℹ️ ${uid} অ্যাডমিন লিস্টে নেই।`);
      }
      if (admins.length === 1 && admins[0] === uid && senderID !== ownerID) {
        return sendSafe(api, threadID, "❌ শেষ অ্যাডমিনকে বাদ দেওয়া যাবে না।");
      }

      admins = admins.filter(id => id !== uid);
      config[adminKey] = admins;
      try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      } catch (e) {
        console.error("❌ config save failed:", e.message);
        return sendSafe(api, threadID, "❌ config.json সেভ করা যায়নি।");
      }
      return sendSafe(api, threadID, `✅ অ্যাডমিন বাদ দেওয়া হয়েছে: ${uid}`);
    }

    // অজানা sub → help
    return sendSafe(
      api,
      threadID,
      "📌 Admin কমান্ড:\n" +
        "• /admin — Owner details\n" +
        "• /admin list — অ্যাডমিন লিস্ট\n" +
        "• /admin add @mention / reply / UID\n" +
        "• /admin remove @mention / reply / UID"
    );
  }
};
