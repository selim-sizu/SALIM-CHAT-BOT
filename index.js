process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err?.message || err);
});

const fs = require("fs");
const path = require("path");
const { login } = require("biar-fca");
const keepAlive = require("./utils/keep_alive");

// ==========================================
// 🌟 হ্যাকার স্টাইল নেম (Selim Sizu)
// ==========================================
function showHackerStyleName() {
  const style = `
\x1b[31m====================================================\x1b[0m
\x1b[32m  ███████╗███████╗██╗     ██╗███╗   ███╗\x1b[0m
\x1b[32m  ██╔════╝██╔════╝██║     ██║████╗ ████║\x1b[0m
\x1b[32m  ███████╗█████╗  ██║     ██║██╔████╔██║\x1b[0m
\x1b[32m  ╚════██║██╔══╝  ██║     ██║██║╚██╔╝██║\x1b[0m
\x1b[32m  ███████║███████╗███████╗██║██║ ╚═╝ ██║\x1b[0m
\x1b[32m  ╚══════╝╚══════╝╚══════╝╚═╝╚═╝     ╚═╝\x1b[0m
\x1b[36m       [ SYSTEM HACKED BY SELIM SIZU ]\x1b[0m
\x1b[31m====================================================\x1b[0m
  `;
  console.log(style);
}

// কনফিগ এবং অ্যাপস্টেট লোড
const rawConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

// কনফিগ ম্যাপিং (ছোট ও বড় হাতের অক্ষর দুটোই সাপোর্ট করবে)
const config = {
  botName: rawConfig.botName || rawConfig.BOTNAME || "SALIM-CHAT-BOT",
  prefix: rawConfig.prefix || rawConfig.PREFIX || "/",
  ownerID: rawConfig.ownerID || rawConfig.OWNERID || (rawConfig.ADMINBOT && rawConfig.ADMINBOT[0]) || "",
  ownerName: rawConfig.ownerName || rawConfig.OWNERNAME || "Selim Sizu",
  adminIDs: rawConfig.adminIDs || rawConfig.ADMINBOT || [],
  adminOnly: rawConfig.adminOnly || false,
  azanGroupID: rawConfig.azanGroupID || "",
  azanVideoURL: rawConfig.azanVideoURL || "",
  gmGroupID: rawConfig.gmGroupID || rawConfig.azanGroupID || "",
  midnightGroupID: rawConfig.midnightGroupID || rawConfig.azanGroupID || "",
  welcomeVideoURL: rawConfig.welcomeVideoURL || "",
  leaveVideoURL: rawConfig.leaveVideoURL || "",
  helpImageURL: rawConfig.helpImageURL || ""
};

// অ্যাপস্টেট লোড
const appStatePath = fs.existsSync("/etc/secrets/appstate.json") 
  ? "/etc/secrets/appstate.json" 
  : path.join(__dirname, "appstate.json");
  
const appState = JSON.parse(fs.readFileSync(appStatePath, "utf8"));

// ==========================================
// 📦 কমান্ড লোডার
// ==========================================
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  try {
    const cmd = require(`./commands/${file}`);
    if (cmd.config && cmd.config.name) {
      commands.set(cmd.config.name, cmd);
      if (cmd.config.aliases) {
        cmd.config.aliases.forEach(a => commands.set(a, cmd));
      }
    }
  } catch (e) {
    console.error(`❌ কমান্ড লোড এরর (${file}):`, e.message);
  }
}
console.log(`✅ ${commands.size} টি কমান্ড লোড হয়েছে`);

// ==========================================
// 📦 ইভেন্ট লোডার
// ==========================================
const events = [];
const eventFiles = fs.readdirSync(path.join(__dirname, "events")).filter(f => f.endsWith(".js"));
for (const file of eventFiles) {
  try {
    const ev = require(`./events/${file}`);
    if (ev.config && ev.config.eventType) {
      events.push(ev);
    }
  } catch (e) {
    console.error(`❌ ইভেন্ট লোড এরর (${file}):`, e.message);
  }
}

// 🌐 Keep-alive সার্ভার চালু (Render + UptimeRobot)
keepAlive();

// ==========================================
// 🚀 বট লগইন এবং লিসেনার
// ==========================================
showHackerStyleName();

login({ appState }, { 
  listenEvents: true, 
  autoReconnect: true, 
  online: true,
  autoMarkDelivery: false, 
  autoMarkRead: false      
}, (err, api) => {
  if (err) return console.error("❌ লগইন ব্যর্থ:", err);

  console.log("🤖 বট অনলাইন! আইডি:", api.getCurrentUserID());

  // ==========================================
  // 🌟 বটের পাঠানো মেসেজ সেভ করার লজিক
  // ==========================================
  const BOT_MSG_PATH = path.join(__dirname, "cache", "bot_messages.json");
  const originalSend = api.sendMessageMqtt;
  
  api.sendMessageMqtt = async function(payload, threadID, messageID) {
    const res = await originalSend.apply(this, arguments);
    try {
      const msgID = res?.messageID || res?.messageId || (typeof res === 'string' ? res : null);
      const bodyText = typeof payload === "string" ? payload : payload?.body;
      
      if (msgID && bodyText) {
        fs.ensureDirSync(path.dirname(BOT_MSG_PATH));
        let db = {};
        if (fs.existsSync(BOT_MSG_PATH)) db = JSON.parse(fs.readFileSync(BOT_MSG_PATH, "utf8"));
        
        db[msgID] = bodyText;
        const keys = Object.keys(db);
        if (keys.length > 200) delete db[keys[0]]; // মেমোরি ক্লিন
        
        fs.writeFileSync(BOT_MSG_PATH, JSON.stringify(db, null, 2));
      }
    } catch (e) {}
    return res;
  };

  // ==========================================
  // ⏰ সব ক্রনজব (Cronjobs) একসাথে চালু করা
  // ==========================================
  setTimeout(() => {
    const azanEvent = events.find(ev => ev.config.name === "azan");
    if (azanEvent) { try { azanEvent.run({ api, config, threadID: config.azanGroupID }); } catch (e) {} }

    const gmEvent = events.find(ev => ev.config.name === "goodmorning");
    if (gmEvent) { try { gmEvent.run({ api, config, threadID: config.gmGroupID }); } catch (e) {} }

    const midnightEvent = events.find(ev => ev.config.name === "midnight");
    if (midnightEvent) { try { midnightEvent.run({ api, config, threadID: config.midnightGroupID }); } catch (e) {} }
    
    console.log("✅ সব Cronjobs (Azan, GM, Midnight) চালু হয়েছে");
  }, 5000);

  api.listenMqtt(async (err, event) => {
    try {
      if (err) return console.error("⚠️ MQTT error:", err?.message || err);

      // 🌟 Auto Seen Logic
      try {
        const seenPath = path.join(__dirname, "cache", "autoseen.txt");
        if (fs.existsSync(seenPath) && fs.readFileSync(seenPath, "utf8").trim() === "true") {
          api.markAsRead(event.threadID, () => {});
        }
      } catch (e) {}

      // 🎯 ইভেন্ট হ্যান্ডলার
      if (event && event.type === "event") {
        for (const ev of events) {
          if (ev.config.eventType === "event") {
            try {
              await ev.run({ api, event, config });
            } catch (e) {
              console.error(`⚠️ ইভেন্ট এরর (${ev.config.name}):`, e?.message || e);
            }
          }
        }
        return;
      }

      // 🎯 মেসেজ হ্যান্ডলার
      if (event && event.type === "message" && event.body) {
        
        // ১. কাস্টম অটো-রিপ্লাই, অটো-নিকনেম, ভয়েস ইত্যাদি
        for (const ev of events) {
          if (ev.config.eventType === "message") {
            try {
              await ev.run({ api, event, config });
            } catch (e) {
              console.error(`⚠️ মেসেজ ইভেন্ট এরর (${ev.config.name}):`, e?.message || e);
            }
          }
        }

        // ২. কমান্ড চেক
        const body = event.body.trim();
        if (!body.startsWith(config.prefix)) return;

        const args = body.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const cmd = commands.get(commandName);

        if (cmd) {
          // Admin Only Mode চেক
          if (config.adminOnly === true && commandName !== "onlyadmin") {
            const admins = config.adminIDs || [];
            const isBotAdmin = admins.includes(event.senderID) || event.senderID === config.ownerID;
            if (!isBotAdmin) return; 
          }
          
          try {
            await cmd.run({ api, event, args, config, commands });
          } catch (e) {
            console.error(`কমান্ড ${commandName} এ ত্রুটি:`, e?.message || e);
            api.sendMessageMqtt(`❌ কমান্ড চালাতে সমস্যা হয়েছে: ${e.message}`, event.threadID)
              .catch(err => console.error("❌ send failed:", err.message));
          }
        }
      }
    } catch (outerErr) {
      console.error("⚠️ Listener handler error:", outerErr?.message || outerErr);
    }
  });
});
