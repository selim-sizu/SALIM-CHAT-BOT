const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

function sendSafe(api, threadID, payload, messageID) {
  return api.sendMessageMqtt(payload, threadID, messageID)
    .catch(err => console.error("❌ help send failed:", err.message));
}

function getAliases(cmd) {
  const a = cmd.config.aliases;
  if (!a) return "None";
  return Array.isArray(a) ? a.join(", ") : String(a);
}

function getCommandInfo(cmd, prefix, botName) {
  return `🔰 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗜𝗻𝗳𝗼 🔰

🔖 𝗡𝗮𝗺𝗲: ${cmd.config.name}
🔁 𝗔𝗹𝗶𝗮𝘀: ${getAliases(cmd)}
📄 𝗨𝘀𝗮𝗴𝗲: ${cmd.config.usages || "Not Provided"}
📜 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${cmd.config.description || "Not Provided"}
👨‍💻 𝗖𝗿𝗲𝗱𝗶𝘁: ${cmd.config.credits || "Selim Sizu"}
📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${cmd.config.category || cmd.config.commandCategory || "system"}
⏳ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻: ${cmd.config.cooldowns || 0}s

⚙️ 𝗣𝗿𝗲𝗳𝗶𝘅: ${prefix}
🤖 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ${botName}
🌸 𝗢𝘄𝗻𝗲𝗿: 𝗦𝗲𝗹𝗶𝗺 𝗦𝗶𝘇𝘂 🦋🥂`;
}

// 🖼️ config.helpImageURL থেকে ছবি/ভিডিও নামায় (না থাকলে null)
async function downloadHelpMedia(url) {
  if (!url) return null;
  try {
    const cacheDir = path.join(__dirname, "..", "cache");
    await fs.ensureDir(cacheDir);

    const ext = url.split("?")[0].toLowerCase().endsWith(".mp4") ? ".mp4" : ".jpg";
    const filePath = path.join(cacheDir, `help_${Date.now()}${ext}`);

    const res = await axios.get(url, { responseType: "stream", timeout: 15000 });

    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(filePath);
      res.data.pipe(w);
      w.on("finish", resolve);
      w.on("error", reject);
    });

    return filePath;
  } catch (e) {
    console.error("⚠️ help media download failed:", e.message);
    return null;
  }
}

module.exports = {
  config: {
    name: "help",
    aliases: ["commands", "menu", "সাহায্য"],
    description: "সব কমান্ডের তালিকা ও তথ্য দেখায়"
  },

  run: async ({ api, event, args, config, commands }) => {
    const { threadID, messageID } = event;
    const prefix = config.prefix || "/";
    const botName = config.botName || "MESSENGER CHAT BOT";

    // 🔹 alias বাদ দিয়ে শুধু ইউনিক কমান্ডের নাম
    const uniqueNames = new Set();
    const commandNames = [];
    for (const [, cmd] of commands) {
      if (!cmd?.config?.name) continue;
      if (!uniqueNames.has(cmd.config.name)) {
        uniqueNames.add(cmd.config.name);
        commandNames.push(cmd.config.name);
      }
    }
    commandNames.sort();

    const query = args[0] ? String(args[0]).trim() : "";

    // 🔸 নির্দিষ্ট কমান্ডের তথ্য
    if (query && !/^\d+$/.test(query)) {
      const foundName = commandNames.find(
        n => n.toLowerCase() === query.toLowerCase()
      );

      // alias দিয়েও খুঁজবে
      const cmd =
        (foundName && commands.get(foundName)) ||
        commands.get(query.toLowerCase());

      if (cmd) {
        const text = getCommandInfo(cmd, prefix, botName);
        const media = await downloadHelpMedia(config.helpImageURL);

        if (media) {
          sendSafe(api, threadID, { body: text, attachment: fs.createReadStream(media) }, messageID);
          setTimeout(() => fs.remove(media).catch(() => {}), 30000);
        } else {
          sendSafe(api, threadID, text, messageID);
        }
        return;
      }
    }

    // 🔸 পেজিনেশন
    const notFoundNote =
      query && !/^\d+$/.test(query)
        ? `❔ "${query}" — এই নামে কোনো কমান্ড নেই।\n\n`
        : "";

    const perPage = 20;
    const page = Math.max(parseInt(query) || 1, 1);
    const totalPages = Math.max(Math.ceil(commandNames.length / perPage), 1);
    const safePage = Math.min(page, totalPages);
    const start = perPage * (safePage - 1);
    const view = commandNames.slice(start, start + perPage);

    const list = view.map(n => `┃ ✪ ${prefix}${n}`).join("\n");

    const text = `${notFoundNote}╭━━━━━━━━━━━━━━━━╮
┃ 📜 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐋𝐈𝐒𝐓 📜
┣━━━━━━━━━━━━━━━━┫
┃ 📄 𝗣𝗮𝗴𝗲: ${safePage}/${totalPages}
┃ 🧮 𝗧𝗼𝘁𝗮𝗹: ${commandNames.length}
┣━━━━━━━━━━━━━━━━┫
${list}
┣━━━━━━━━━━━━━━━━┫
┃ ⚙ 𝗣𝗿𝗲𝗳𝗶𝘅: ${prefix}
┃ 🤖 𝗕𝗼𝘁: ${botName}
┃ 🔰 𝗢𝘄𝗻𝗲𝗿:
┃ 𝗦𝗲𝗹𝗶𝗺 𝗦𝗶𝘇𝘂 🦋🥂
╰━━━━━━━━━━━━━━━━╯`;

    const media = await downloadHelpMedia(config.helpImageURL);

    if (media) {
      sendSafe(api, threadID, { body: text, attachment: fs.createReadStream(media) }, messageID);
      setTimeout(() => fs.remove(media).catch(() => {}), 30000);
    } else {
      sendSafe(api, threadID, text, messageID);
    }
  }
};
