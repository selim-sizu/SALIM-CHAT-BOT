function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ antigali send failed:", err.message));
}

// 🚫 গালির লিস্ট (নিজে বাড়ান/কমান)
const BAD_WORDS = [
  "gali1", "gali2", "gali3",
  "মাদারচোদ", "বেশ্যা", "চোদ", "খানকি", "শুয়োরের বাচ্চা"
  // আসল গালি এখানে যোগ করুন
];

function normalize(t) {
  return String(t || "").toLowerCase().replace(/\s+/g, " ");
}

function containsBadWord(text) {
  const t = normalize(text);
  return BAD_WORDS.some(w => t.includes(normalize(w)));
}

module.exports = {
  config: {
    eventType: "message",
    name: "antigali"
  },

  run: async ({ api, event, config }) => {
    if (!event?.body || !event?.threadID) return;

    // prefix থাকলে বাদ
    if (config?.prefix && event.body.trim().startsWith(config.prefix)) return;

    // নিজের মেসেজ বাদ
    if (event.senderID === api.getCurrentUserID()) return;

    // গালি নেই → কিছু করবে না
    if (!containsBadWord(event.body)) return;

    // অ্যাডমিন/মালিক হলে বাদ
    const admins = config?.adminIDs || config?.admins || [];
    if (admins.includes(event.senderID) || event.senderID === config?.ownerID) {
      return;
    }

    // ⚠️ কিক করার আগে ওয়ার্নিং
    await sendSafe(
      api,
      event.threadID,
      `⚠️ ${event.senderID} — গালি ব্যবহার করা হয়েছে! পরেরবার কিক করা হবে।`,
      event.messageID
    );

    // 🦵 কিক (কমেন্ট আউট — চালু করতে নিচের লাইন আনকমেন্ট করুন)
    // try {
    //   await api.removeUserFromGroup(event.senderID, event.threadID);
    //   await sendSafe(api, event.threadID, `✅ ${event.senderID} কে কিক করা হয়েছে।`);
    // } catch (e) {
    //   console.error("❌ kick failed:", e.message);
    // }
  }
};
