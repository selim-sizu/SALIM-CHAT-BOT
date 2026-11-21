function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ mention send failed:", err.message));
}

module.exports = {
  config: {
    name: "mention",
    aliases: ["men", "m"],
    version: "1.1.0",
    credits: "Selim sizu",
    description: "Mention users by reply or mention",
    category: "group",
    cooldowns: 5
  },

  run: async ({ api, event, args, config }) => {
    const { mentions, threadID, messageID, messageReply, senderID } = event;

    // ⚠️ শুধু মালিক/অ্যাডমিন পারবে (ফেসবুক ব্যান এড়াতে)
    const admins = config?.adminIDs || [];
    if (senderID !== config?.ownerID && !admins.includes(senderID)) {
      return sendSafe(api, threadID, "❌ এই কমান্ড শুধু বটের অ্যাডমিনরা ব্যবহার করতে পারবে।", messageID);
    }

    const users = new Map();

    // ১. reply করা ইউজার
    if (messageReply?.senderID) {
      const id = String(messageReply.senderID);
      users.set(id, {
        id,
        name: messageReply.senderName || "User"
      });
    }

    // ২. @mention করা ইউজার
    for (const id of Object.keys(mentions || {})) {
      const userID = String(id);
      if (!users.has(userID)) {
        users.set(userID, {
          id: userID,
          name: mentions[id]
        });
      }
    }

    if (!users.size) {
      return sendSafe(api, threadID, "⚠️ Reply করুন অথবা ইউজারকে mention করুন!", messageID);
    }

    // ৩. কতবার মেনশন করবে (সর্বোচ্চ ৫ বার, যাতে ফেসবুক ব্লক না করে)
    let count = parseInt(args[args.length - 1], 10);
    if (isNaN(count)) count = 1;
    const repeatCount = Math.max(1, Math.min(count, 5)); 

    const userList = [...users.values()];

    for (let i = 0; i < repeatCount; i++) {
      try {
        const messageMentions = [];
        let body = "📢 ";

        userList.forEach((user, index) => {
          const tag = `@${user.name}`;
          body += tag;
          if (index < userList.length - 1) body += " ";

          messageMentions.push({
            tag,
            id: user.id
          });
        });

        body += "\n\n🐸 চিপা থেকে বের হও! 😄";

        // মেসেজ পাঠানো (মেনশন সহ)
        await api.sendMessageMqtt(
          {
            body,
            mentions: messageMentions
          },
          threadID
        );

        // টানা মেসেজ না পাঠিয়ে ২ সেকেন্ড গ্যাপ দেওয়া
        if (i < repeatCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error("[MENTION ERROR]", error?.message || error);
        return sendSafe(api, threadID, "❌ Mention পাঠাতে সমস্যা হয়েছে।", messageID);
      }
    }
  }
};
