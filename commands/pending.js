function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ pending send failed:", err.message));
}

module.exports = {
  config: {
    name: "pending",
    aliases: ["pen", "approved", "apv"],
    version: "2.0.0",
    credits: "Selim sizu",
    description: "Manage bot pending group requests",
    category: "system",
    cooldowns: 5
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID } = event;

    // শুধু মালিক/অ্যাডমিন
    const admins = config?.adminIDs || config?.admins || [];
    if (senderID !== config?.ownerID && !admins.includes(senderID)) {
      return sendSafe(api, threadID, "❌ শুধু মালিক/অ্যাডমিন এই কমান্ড ব্যবহার করতে পারবে।", messageID);
    }

    const sub = (args[0] || "").toLowerCase();
    const prefix = config?.prefix || "/";
    const botName = config?.botName || "SALIM-CHAT-BOT";

    const notify = `🌸 আপনাদের গ্রুপে চলে এসেছি — ${botName}!

♡ এখন থেকে আপনাদের সাথে আড্ডা, বিনোদন এবং বিভিন্ন কাজে পাশে থাকব।

› সাহায্য পেতে ব্যবহার করুন:
${prefix}help

✦ ${botName} ব্যবহার করার জন্য ধন্যবাদ।
♡ আশা করি আমাদের সাথে সুন্দর সময় কাটাবেন!`;

    // 🔹 পেন্ডিং লিস্ট আনা
    let list = [];
    try {
      const [spam, pending] = await Promise.all([
        api.getThreadList(100, null, ["OTHER"]).catch(() => []),
        api.getThreadList(100, null, ["PENDING"]).catch(() => [])
      ]);

      list = [...(spam || []), ...(pending || [])].filter(
        g => g.isSubscribed && g.isGroup
      );
    } catch (e) {
      console.error("❌ getThreadList failed:", e.message);
      return sendSafe(api, threadID, `❌ পেন্ডিং লিস্ট আনা যায়নি: ${e.message}`, messageID);
    }

    if (!list.length) {
      return sendSafe(api, threadID, "✅ কোনো পেন্ডিং গ্রুপ নেই।", messageID);
    }

    // 🔹 list — শুধু দেখাবে
    if (sub === "" || sub === "list") {
      const text = list
        .map((g, i) => `${i + 1}. ${g.name || "Unnamed Group"}\n   ID: ${g.threadID}`)
        .join("\n\n");

      return sendSafe(
        api,
        threadID,
        `📋 𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗚𝗿𝗼𝘂𝗽𝘀: ${list.length}\n\n${text}\n\n` +
        `👉 কমান্ড:\n` +
        `• ${prefix}pending approve all\n` +
        `• ${prefix}pending approve 1 2 3\n` +
        `• ${prefix}pending reject all\n` +
        `• ${prefix}pending reject 1 2 3`,
        messageID
      );
    }

    // 🔹 approve
    if (sub === "approve" || sub === "apv" || sub === "a") {
      const targets = args[1]?.toLowerCase() === "all"
        ? list.map((_, i) => i)
        : (args.slice(1).map(n => parseInt(n) - 1).filter(i => i >= 0 && i < list.length));

      if (!targets.length) {
        return sendSafe(api, threadID, "⚠️ সংখ্যা দিন বা 'all' লিখুন।", messageID);
      }

      let count = 0;
      for (const i of targets) {
        try {
          await api.sendMessageMqtt(notify, list[i].threadID);
          count++;
        } catch (e) {
          console.error("❌ approve failed:", e.message);
        }
      }

      return sendSafe(api, threadID, `✅ সফলভাবে ${count}টি গ্রুপ অ্যাপ্রুভ করা হয়েছে।`, messageID);
    }

    // 🔹 reject (বট নিজে গ্রুপ ছাড়ে)
    if (sub === "reject" || sub === "r" || sub === "cancel" || sub === "c") {
      const targets = args[1]?.toLowerCase() === "all"
        ? list.map((_, i) => i)
        : (args.slice(1).map(n => parseInt(n) - 1).filter(i => i >= 0 && i < list.length));

      if (!targets.length) {
        return sendSafe(api, threadID, "⚠️ সংখ্যা দিন বা 'all' লিখুন।", messageID);
      }

      let count = 0;
      for (const i of targets) {
        try {
          await api.removeUserFromGroup(api.getCurrentUserID(), list[i].threadID);
          count++;
        } catch (e) {
          console.error("❌ reject failed:", e.message);
        }
      }

      return sendSafe(api, threadID, `📛 সফলভাবে ${count}টি গ্রুপ রিজেক্ট (বট লিভ) করা হয়েছে।`, messageID);
    }

    // অজানা sub
    return sendSafe(
      api,
      threadID,
      `📌 Pending কমান্ড:\n` +
      `• ${prefix}pending list\n` +
      `• ${prefix}pending approve all\n` +
      `• ${prefix}pending approve 1 2 3\n` +
      `• ${prefix}pending reject all\n` +
      `• ${prefix}pending reject 1 2 3`,
      messageID
    );
  }
};
