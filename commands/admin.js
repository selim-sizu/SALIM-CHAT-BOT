const fs = require("fs");
const path = require("path");
const CONFIG_PATH = path.join(__dirname, "..", "config.json");

module.exports = {
  config: {
    name: "admin",
    aliases: ["adm"],
    description: "বট অ্যাডমিন ম্যানেজ করে"
  },
  run: async ({ api, event, args, config }) => {
    const { threadID, senderID, mentions, messageReply } = event;
    const adminKey = Array.isArray(config.adminIDs) ? "adminIDs" : "admins";
    let admins = Array.isArray(config[adminKey]) ? [...config[adminKey]] : [];
    const ownerID = config.ownerID;

    const isAdmin = admins.includes(senderID) || senderID === ownerID;
    if (!isAdmin) {
      return api.sendMessageMqtt("❌ এই কমান্ড শুধু অ্যাডমিনদের জন্য।", threadID);
    }

    const sub = (args[0] || "").toLowerCase();

    function getTargetID() {
      if (messageReply && messageReply.senderID) return messageReply.senderID;
      if (mentions && Object.keys(mentions).length > 0) return Object.keys(mentions)[0];
      if (args[1] && /^\d+$/.test(args[1])) return args[1];
      return null;
    }

    if (sub === "list" || sub === "") {
      const list = admins.length
        ? admins.map((id, i) => `${i + 1}. ${id}`).join("\n")
        : "কোনো অ্যাডমিন নেই।";
      return api.sendMessageMqtt(
        `👑 বট অ্যাডমিন লিস্ট:\n\n${list}\n\nOwner: ${ownerID || "সেট করা নেই"}`,
        threadID
      );
    }

    if (sub === "add") {
      const uid = getTargetID();
      if (!uid) return api.sendMessageMqtt("⚠️ কাউকে mention করুন, reply দিন, অথবা UID দিন।", threadID);
      if (admins.includes(uid)) return api.sendMessageMqtt(`ℹ️ ${uid} ইতিমধ্যে অ্যাডমিন।`, threadID);

      admins.push(uid);
      config[adminKey] = admins;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      return api.sendMessageMqtt(`✅ নতুন অ্যাডমিন যোগ হয়েছে: ${uid}`, threadID);
    }

    if (["remove", "del", "delete"].includes(sub)) {
      const uid = getTargetID();
      if (!uid) return api.sendMessageMqtt("⚠️ কাউকে mention করুন, reply দিন, অথবা UID দিন।", threadID);
      if (uid === ownerID) return api.sendMessageMqtt("❌ Owner-কে বাদ দেওয়া যাবে না।", threadID);
      if (!admins.includes(uid)) return api.sendMessageMqtt(`ℹ️ ${uid} অ্যাডমিন লিস্টে নেই।`, threadID);
      if (admins.length === 1 && admins[0] === uid && senderID !== ownerID) {
        return api.sendMessageMqtt("❌ শেষ অ্যাডমিনকে বাদ দেওয়া যাবে না।", threadID);
      }

      admins = admins.filter(id => id !== uid);
      config[adminKey] = admins;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      return api.sendMessageMqtt(`✅ অ্যাডমিন বাদ দেওয়া হয়েছে: ${uid}`, threadID);
    }

    return api.sendMessageMqtt(
      "📌 Admin কমান্ড:\n• admin list\n• admin add @mention / reply / UID\n• admin remove @mention / reply / UID",
      threadID
    );
  }
};
