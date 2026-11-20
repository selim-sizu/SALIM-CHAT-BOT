const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

// ffmpeg-static থাকলে সেটার পাথ, নাহলে সিস্টেম ffmpeg
let ffmpegPath = "ffmpeg";
try {
  ffmpegPath = require("ffmpeg-static");
  console.log("✅ FFmpeg (static) লোড হয়েছে:", ffmpegPath);
} catch (_) {
  console.log("⚠️ ffmpeg-static পাওয়া যায়নি, সিস্টেম ffmpeg ব্যবহার হবে");
}

const CACHE_DIR = path.join(__dirname, "..", "cache");

function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ mp3 send failed:", err.message));
}

function reactSafe(api, emoji, messageID) {
  try {
    if (typeof api.setMessageReaction === "function" && messageID) {
      api.setMessageReaction(emoji, messageID, () => {}, true);
    }
  } catch (_) {}
}

function runFFmpeg(input, output) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      "-y",
      "-i", input,
      "-vn",
      "-acodec", "libmp3lame",
      "-q:a", "2",
      output
    ], { windowsHide: true });

    let errorOutput = "";

    ffmpeg.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    ffmpeg.on("error", err => reject(err));

    ffmpeg.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(errorOutput || `FFmpeg exited with code ${code}`));
    });
  });
}

async function downloadVideo(url, filePath) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
    writer.on("error", reject);
  });
}

module.exports = {
  config: {
    name: "mp3",
    aliases: ["tomp3", "audio"],
    description: "রিপ্লাই করা ভিডিও থেকে MP3 বানায়"
  },

  run: async ({ api, event }) => {
    let videoPath = null;
    let audioPath = null;

    try {
      const reply = event.messageReply;

      if (!reply || !reply.attachments || !reply.attachments.length) {
        return sendSafe(
          api,
          event.threadID,
          "⚠️ একটি ভিডিওতে reply করে /mp3 লিখুন।",
          event.messageID
        );
      }

      const video = reply.attachments.find(
        a => a.type === "video" && a.url
      );

      if (!video) {
        return sendSafe(
          api,
          event.threadID,
          "⚠️ Reply করা message-এ কোনো video পাওয়া যায়নি!",
          event.messageID
        );
      }

      await fs.ensureDir(CACHE_DIR);

      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      videoPath = path.join(CACHE_DIR, `video_${id}.mp4`);
      audioPath = path.join(CACHE_DIR, `audio_${id}.mp3`);

      reactSafe(api, "⏳", event.messageID);

      await downloadVideo(video.url, videoPath);
      await runFFmpeg(videoPath, audioPath);

      if (!(await fs.pathExists(audioPath)) || (await fs.stat(audioPath)).size === 0) {
        throw new Error("MP3 file was not created");
      }

      reactSafe(api, "✅", event.messageID);

      const stream = fs.createReadStream(audioPath);

      api.sendMessageMqtt(
        {
          body:
            "🎵 𝗩𝗶𝗱𝗲𝗼 𝗖𝗼𝗻𝘃𝗲𝗿𝘁𝗲𝗱 𝗧𝗼 𝗠𝗣𝟯\n\n🎧 Your audio is ready!",
          attachment: stream
        },
        event.threadID,
        event.messageID
      ).catch(err => console.error("❌ mp3 upload failed:", err.message));

      // মেসেজ আপলোড হওয়ার পর ফাইল ক্লিন (৩০ সেকেন্ড পর)
      setTimeout(async () => {
        try {
          if (videoPath) await fs.remove(videoPath);
          if (audioPath) await fs.remove(audioPath);
        } catch (_) {}
      }, 30000);

    } catch (error) {
      console.error("[MP3 ERROR]", error.message);

      if (videoPath) await fs.remove(videoPath).catch(() => {});
      if (audioPath) await fs.remove(audioPath).catch(() => {});

      reactSafe(api, "⚠️", event.messageID);

      return sendSafe(
        api,
        event.threadID,
        `❌ ভিডিও থেকে MP3 তৈরি করা যায়নি।\nকারণ: ${error.message}`,
        event.messageID
      );
    }
  }
};
