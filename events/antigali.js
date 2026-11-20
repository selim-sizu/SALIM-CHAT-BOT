function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ antigali send failed:", err.message));
}

// 🚫 গালির লিস্ট — নিজে বাড়ান/কমান
const BAD_WORDS = [
  // বাংলা
  "মাদারচোদ", "মাদারচোদা", "বেশ্যা", "খানকি", "চোদ", "চুদ",
  "শুয়োরের বাচ্চা", "নপুংসক", "ভোঁদা", "ছাগু",
  // English
  "fuck", "fucking", "motherfucker", "bitch", "bastard",
  "asshole", "dick", "pussy", "slut", "whore",
  "cunt", "shit", "bullshit", "son of a bitch"
];

function normalize(t) {
  return String(t || "").toLowerCase().replace(/\s+/g, " ");
}

function containsBadWord(text) {
  const t = normalize(text);
  return BAD_WORDS.find(w => t.includes(normalize(w))) || null;
}

module.exports = {
  config: {
    eventType: "message",
    name: "antigali"
  },

  run: async ({ api, event, config }) => {
    if (!event?.body || !event?.threadID) return;

    // কমান্ড হলে বাদ
    if (config?.prefix && event.body.trim().startsWith(config.prefix)) return;

    // বট নিজে হলে বাদ
    if (event.senderID === api.getCurrentUserID()) return;

    // গালি চেক
    const badWord = containsBadWord(event.body);
    if (!badWord) return;

    // অ্যাডমিন/মালিক হলে বাদ
    const admins = config?.adminIDs || config?.admins || [];
    if (admins.includes(event.senderID) || event.senderID === config?.ownerID) {
      return;
    }

    // ১) সাথে সাথে ওয়ার্নিং
    await sendSafe(
      api,
      event.threadID,
      `⚠️ 𝐖𝐀𝐑𝐍𝐈𝐍𝐆!\n\n` +
      `@${event.senderID} গালি ব্যবহার করেছে!\n` +
      `শব্দ: "${badWord}"\n\n` +
      `🦵 এখনই কিক করা হচ্ছে...`,
      event.messageID
    );

    // ২) ২ সেকেন্ড পর কিক (মেসেজ পাঠানোর সময় দেওয়ার জন্য)
    setTimeout(async () => {
      try {
        await api.removeUserFromGroup(event.senderID, event.threadID);

        await sendSafe(
          api,
          event.threadID,
          `✅ @${event.senderID} কে সফলভাবে কিক করা হয়েছে।\n` +
          `কারণ: গালি ব্যবহার (${badWord})`
        );
      } catch (e) {
        console.error("❌ kick failed:", e.message);

        // কিক ব্যর্থ হলে অ্যাডমিনকে জানানো
        for (const adminID of admins) {
          api.sendMessageMqtt(
            `⚠️ কিক ব্যর্থ!\nইউজার: ${event.senderID}\nথ্রেড: ${event.threadID}\nকারণ: ${e.message}`,
            adminID
          ).catch(() => {});
        }

        await sendSafe(
          api,
          event.threadID,
          `❌ @${event.senderID} কে কিক করা যায়নি।\n` +
          `সম্ভবত বটের অ্যাডমিন পারমিশন নেই বা সে অ্যাডমিন।`
        );
      }
    }, 2000);
  }
};
