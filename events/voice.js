const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const emojiAudioMap = {
  "☺️": "https://files.catbox.moe/p2mi4u.mp3",
  "😊": "https://files.catbox.moe/p2mi4u.mp3",
  "🌚": "https://files.catbox.moe/ze3wu1.mp3",
  "🌝": "https://files.catbox.moe/ze3wu1.mp3",
  "🐸": "https://files.catbox.moe/9u1857.mp3",
  "👀": "https://files.catbox.moe/372kl0.mp3",
  "🖕": "https://files.catbox.moe/372kl0.mp3",
  "😁": "https://files.catbox.moe/ef6me4.mp3",
  "🤣": "https://files.catbox.moe/ipihl6.mp3",
  "😆": "https://files.catbox.moe/r4unub.mp3",
  "😑": "https://files.catbox.moe/z1evci.mp3",
  "😅": "https://files.catbox.moe/7hvdo6.mp3",
  "😍": "https://files.catbox.moe/r13v24.mp3",
  "😒": "https://files.catbox.moe/ww8yts.mp3",
  "💋": "https://files.catbox.moe/hd0zfr.mp3",
  "😘": "https://files.catbox.moe/hd0zfr.mp3",
  "😡": "https://files.catbox.moe/b5y405.mp3",
  "🤬": "https://files.catbox.moe/b5y405.mp3",
  "😩": "https://files.catbox.moe/vb01zl.mp3",
  "😭": "https://files.catbox.moe/d9w35v.mp3",
  "🙂": "https://files.catbox.moe/flp9ed.mp3",
  "🙏": "https://files.catbox.moe/2aw07b.mp3",
  "😂": "https://files.catbox.moe/vknlt2.mp3",
  "🤭": "https://files.catbox.moe/5s606f.mp3",
  "🥰": "https://files.catbox.moe/1ojauw.mp3",
  "🥱": "https://files.catbox.moe/088yxs.mp3",
  "🥵": "https://files.catbox.moe/c0odmp.mp3",
  "🥺": "https://files.catbox.moe/458umf.mp3",
  "🥹": "https://files.catbox.moe/cj6ny7.mp3",
  "🫶": "https://files.catbox.moe/hyo82t.mp3",
  "🫣": "https://files.catbox.moe/2qjfwl.mp3",
  "🍼": "https://files.catbox.moe/gvrvkh.mp3",
  "👍": "https://files.catbox.moe/t24ebx.mp3"
};

module.exports = {
  config: {
    eventType: "message",
    name: "voice"
  },

  run: async ({ api, event, config }) => {
    const { threadID, messageID, body } = event;
    
    // মেসেজ না থাকলে বা কমান্ড হলে ইগনোর করবে
    if (!body || body.length > 2) return;
    if (config?.prefix && body.startsWith(config.prefix)) return;

    const emoji = body.trim();
    const audioUrl = emojiAudioMap[emoji];
    if (!audioUrl) return;

    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);

    const filePath = path.join(cacheDir, `voice_${Date.now()}.mp3`);

    try {
      // অডিও ডাউনলোড করা
      const response = await axios({
        method: 'GET',
        url: audioUrl,
        responseType: 'stream',
        timeout: 20000
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // অডিও পাঠানো
      await api.sendMessageMqtt({
        attachment: fs.createReadStream(filePath)
      }, threadID, messageID)
      .catch(err => console.error("❌ voice send failed:", err.message));

      // ফাইল ডিলিট করা
      setTimeout(() => {
        fs.remove(filePath).catch(() => {});
      }, 10000);

    } catch (error) {
      console.error("Error downloading audio:", error.message);
      api.sendMessageMqtt("ইমুজি দিয়ে লাভ নাই\nযাও মুড়ি খাও জান😘", threadID, messageID)
        .catch(err => console.error(err.message));
    }
  }
};
