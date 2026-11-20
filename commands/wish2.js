function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ wish2 send failed:", err.message));
}

module.exports = {
  config: {
    name: "wish2",
    aliases: ["bday", "hb"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Text-only birthday wish",
    category: "Birthday",
    usages: "@tag",
    cooldowns: 3
  },

  run: async ({ api, event }) => {
    const targetID = Object.keys(event.mentions || {})[0] || event.senderID;

    let targetName = "Friend";
    let wisherName = "Someone";

    try {
      const info = await api.getUserInfo([targetID, event.senderID]);
      if (info?.[targetID]?.name) targetName = info[targetID].name;
      if (info?.[event.senderID]?.name) wisherName = info[event.senderID].name;
    } catch (e) {
      console.error("⚠️ getUserInfo failed:", e.message);
    }

    const body =
      "┏┓┏┓\n" +
      "┃┗┛ Happy_🎂🎆🎉\n" +
      "┃┏┓┃ 🄱🄸🅁🅃🄷🄳🄰🅈🎉🎆\n" +
      "┗┛┗┛ Birthday Wishes For You..💐💗\n" +
      `🥰 ${targetName} 😘\n\n` +
      "_𝐇𝐚𝐩𝐩𝐲 𝐛𝐢𝐫𝐭𝐡𝐝𝐚𝐲 🎂_\n" +
      "অনেক অনেক শুভ কামনা, দোয়া ও ভালবাসা রইল তোমার জন্য ❤\n" +
      "তোমার জীবনের প্রতিটা ক্ষণ আনন্দময় হোক এই কামনা করি...\n" +
      "শুভ জন্মদিন 🎂🎂🎂\n" +
      "🌷🌷\n\n" +
      "_𝐇𝐚𝐩𝐩𝐲 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲 𝐖𝐢𝐬𝐡𝐞𝐬 𝐟𝐨𝐫 𝐔😍_\n" +
      "𝐈 𝐰𝐢𝐬𝐡 𝐮 𝐦𝐚𝐧𝐲 𝐦𝐨𝐫𝐞 𝐡𝐚𝐩𝐩𝐲 𝐫𝐞𝐭𝐮𝐫𝐧𝐬 𝐨𝐟 𝐭𝐡𝐞 𝐝𝐚𝐲 💞\n\n" +
      "🖤 আশা করি সারাজীবন এমনই থাকবা, সবসময় ভালো থাকো এই কামনা করি\n" +
      "❤ জন্মদিনে শুধু এটাই কাম্য যাতে ভবিষ্যতে অনেক অনেক সুখী হও ❤\n" +
      "শুভ জন্মদিন 🫂 ❤️‍🩹\n\n" +
      `𝐌𝐚𝐤𝐢𝐧𝐠 𝐭𝐡𝐢𝐬 𝐰𝐢𝐬𝐡: ${wisherName}`;

    return sendSafe(api, event.threadID, body, event.messageID);
  }
};
