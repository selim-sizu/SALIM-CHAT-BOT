module.exports = {
  config: {
    eventType: "message",
    name: "autonick"
  },

  run: async ({ api, event, config }) => {
    const nickName = config.botName || "SALIM-CHAT-BOT";
    const threadID = event.threadID;
    const botID = api.getCurrentUserID();

    // শুধু গ্রুপের ক্ষেত্রে কাজ করবে
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      
      if (threadInfo.isGroup && threadInfo.nicknames && threadInfo.nicknames[botID] !== nickName) {
        await api.changeNickname(nickName, threadID, botID);
        console.log(`✅ গ্রুপ ${threadID}-এ বটের নিকনেম সেট হয়েছে: ${nickName}`);
      }
    } catch (e) {}
  }
};
