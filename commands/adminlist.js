function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ adminlist send failed:", err.message));
}

module.exports = {
  config: {
    name: "adminlist",
    aliases: ["adminaccess", "adminmanage", "admingroup", "এডমিনলিস্ট"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Show all group admins and bot admins",
    category: "group",
    cooldowns: 5
  },

  run: async ({ api, event, config }) => {
    const { threadID, messageID } = event;

    try {
      // 📥 গ্রুপের ইনফরমেশন আনা
      const threadInfo = await api.getThreadInfo(threadID);
      const adminIDs = threadInfo.adminIDs.map(item => item.id);
      
      if (adminIDs.length === 0) {
        return sendSafe(api, threadID, "⚠️ এই গ্রুপে কোনো অ্যাডমিন পাওয়া যায়নি।", messageID);
      }

      // 📥 গ্রুপের অ্যাডমিনদের নাম ও ডাটা আনা
      const userInfo = await api.getUserInfo(adminIDs);

      let adminList = "";
      let count = 1;

      for (const uid of adminIDs) {
        const user = userInfo[uid];
        const name = user ? user.name : "Unknown Admin";
        const firstName = user ? user.firstName : "Unknown";
        
        // স্টাইলিশ কার্ড তৈরি
        adminList += `╭───────────────⭓\n`;
        adminList += `│ ${count}. 👑 ${name}\n`;
        adminList += `│ 🆔 UID: ${uid}\n`;
        adminList += `│ 🔗 m.me/${uid}\n`;
        adminList += `╰───────────────⭓\n`;
        count++;
      }

      // 📥 বটের ওনার/গ্লোবাল অ্যাডমিন লিস্ট
      const botAdmins = config.adminIDs || [];
      let botAdminText = "";
      if (botAdmins.length > 0) {
        botAdminText = `\n🌟 𝗕𝗢𝗧 𝗚𝗟𝗢𝗕𝗔𝗟 𝗔𝗗𝗠𝗜𝗡𝗦\n`;
        botAdmins.forEach((uid, index) => {
          botAdminText += `➤ ${index + 1}. UID: ${uid}\n`;
        });
      }

      // 📝 সম্পূর্ণ মেসেজ তৈরি
      const body = `╔══════════❖🌺❖══════════╗
║ 👑 𝗚𝗥𝗢𝗨𝗣 𝗔𝗗𝗠𝗜𝗡 𝗟𝗜𝗦𝗧 👑
╠══════════❖🌺❖══════════╣
║ 📛 গ্রুপ: ${threadInfo.threadName || "Unknown"}
║ 👥 মোট অ্যাডমিন: ${adminIDs.length} জন
╠══════════❖🌺❖══════════╣
${adminList}${botAdminText}
╔══════════❖🌺❖══════════╗
║ 🕒 ${new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })}
╚══════════❖🌺❖══════════╝`;

      // 📤 মেসেজ পাঠানো
      return sendSafe(api, threadID, body, messageID);

    } catch (e) {
      console.error("❌ adminlist error:", e.message);
      return sendSafe(api, threadID, `❌ অ্যাডমিন লিস্ট আনতে সমস্যা হয়েছে: ${e.message}`, messageID);
    }
  }
};
