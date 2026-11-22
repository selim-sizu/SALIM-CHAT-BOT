const cron = require("node-cron");

// 🎲 রাত ১২টার মজার মেসেজের লিস্ট (নিজের মতো বাড়াতে পারেন)
const midnightMessages = [
  "🕛 𝗥𝗔𝗧 𝟭𝟮𝗧𝗔 𝗕𝗔𝗝𝗘 𝗚𝗘𝗟𝗢 🕛\n\nতোর ঘুম আসছে না? 😏\nআমার বস 𝗦𝗲𝗹𝗶𝗺 এর ইনবক্সে যা, ঘুম উবে যাবে! 🤣",
  "🕛 𝗠𝗜𝗗𝗡𝗜𝗚𝗛𝗧 🕛\n\nরাত ১২টা বাজে, ভূত আসে... 👻\nভূতের ভয় নেই? তবে মেয়েদের রিকু দিয়ে দেখো, সরাসরি কিক খাবি! 🦵😎",
  "🕛 𝗥𝗔𝗧 𝟭𝟮𝗧𝗔 🕛\n\nঘুমাচ্ছস না কেন? 🤨\nভাবিস প্রেম করবি? আগে বস 𝗦𝗲𝗹𝗶𝗺 এর ইনবক্সে যা! 💋",
  "🕛 𝗚𝗢𝗢𝗗 𝗡𝗜𝗚𝗛𝗧 🕛\n\nরাত ১২টা বাজে, চোখ বন্ধ কর... 😴\nস্বপ্নে দেখবি আমার বস 𝗦𝗲𝗹𝗶𝗺 কে! 🤣🤣",
  "🕛 𝗥𝗔𝗧 𝟭𝟮𝗧𝗔 🕛\n\nএত রাতে জেগে থাকলে মাথা খারাপ হয়ে যায়! 😵\nযা ঘুমা! নাহলে কালকে স্কুল/কলেজে লেট হবে! 🏃‍♂️💨",
  "🕛 𝗠𝗜𝗗𝗡𝗜𝗚𝗛𝗧 🕛\n\nবিছানায় শুয়ে আছিস, কিন্তু ঘুম আসছে না। 🥱\nআমার মতো বটও জেগে আছে তোর জন্য! 🤖💛",
  "🕛 𝗥𝗔𝗧 𝟭𝟮𝗧𝗔 🕛\n\nরাত ১২টা বাজে... 🌙\nফোনটা রেখে ঘুমিয়ে পড়, নাহলে চোখের নিচে ডার্ক সার্কেল পড়বে! 😂",
  "🕛 𝗠𝗜𝗗𝗡𝗜𝗚𝗛𝗧 🕛\n\nমাঝরাতে জেগে থাকা মানুষের ইন্টেলিজেন্স লেভেল কমে যায়! 🧠📉\nযা ঘুমা! 😴"
];

module.exports = {
  config: {
    eventType: "system_startup",
    name: "midnight"
  },

  run: async ({ api, config, threadID }) => {
    // 🌟 যে গ্রুপে মেসেজ যাবে (আজানের গ্রুপ আইডি বা ডিফল্ট)
    const targetGroupID = config.midnightGroupID || config.azanGroupID || threadID; 
    if (!targetGroupID) {
      console.log("⚠️ Midnight: কোনো গ্রুপ আইডি পাওয়া যায়নি।");
      return;
    }

    // ⏰ প্রতিদিন রাত ১২:০০ টায় (বাংলাদেশ সময়)
    const cronTime = "0 0 * * *"; 

    cron.schedule(cronTime, async () => {
      console.log(`🕛 Midnight Message Time!`);

      // 🎲 র‍্যান্ডম মেসেজ বাছাই
      const randomMessage = midnightMessages[Math.floor(Math.random() * midnightMessages.length)];

      try {
        await api.sendMessageMqtt(randomMessage, targetGroupID);
      } catch (e) {
        console.error("❌ Midnight message send failed:", e.message);
      }

    }, { scheduled: true, timezone: "Asia/Dhaka" });
    
    console.log("✅ Midnight Cronjob চালু হয়েছে (রাত ১২:০০ টা)");
  }
};
