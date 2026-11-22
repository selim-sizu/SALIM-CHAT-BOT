process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err?.message || err);
});

const fs = require("fs-extra");
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

// ==========================================
// ⚙️ কনফিগ লোড (Safe)
// ==========================================
let rawConfig = {};
try {
  rawConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
} catch (e) {
  console.error("❌ config.json পড়তে সমস্যা হয়েছে:", e.message);
  process.exit(1);
}

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

// ==========================================
// 🔐 অ্যাপস্টেট লোড (Safe)
// ==========================================
const appStatePath = fs.existsSync("/etc/secrets/appstate.json") 
  ? "/etc/secrets/appstate.json" 
  : path.join(__dirname, "appstate.json");

let appState = [];
try {
  appState = JSON.parse(fs.readFileSync(appStatePath, "utf8"));
  if (!Array.isArray(appState) || appState.length === 0) {
    throw new Error("appstate.json খালি বা ভুল ফরম্যাটে আছে!");
  }
} catch (e) {
  console.error("❌ appstate.json পড়তে সমস্যা হয়েছে:", e.message);
  process.exit(1);
}

// ==========================================
// 📦 কমান্ড ও ইভেন্ট লোডার
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

// 🌐 Keep-alive সার্ভার চালু
keepAlive();

// ==========================================
// 🚀 বট লগইন এবং অটো-রিট্রাই সিস্টেম
// ==========================================
showHackerStyleName();

function startBot() {
  login({ appState }, { 
    listenEvents: true, 
    autoReconnect: true, 
    online: true,
    autoMarkDelivery: false, 
    autoMarkRead: false      
  }, (err, api) => {
    if (err) {
      console.error("❌ লগইন ব্যর্থ:", err?.message || err);
      console.log("⏳ ১ মিনিট পর আবার লগইন চেষ্টা করা হচ্ছে...");
      return setTimeout(startBot, 60000); // ১ মিনিট পর আবার ট্রাই করবে
    }

    console.log("🤖 বট অনলাইন! আইডি:", api.getCurrentUserID());

    // 🌟 বটের পাঠানো মেসেজ সেভ করার লজিক
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
          if (keys.length > 200) delete db[keys[0]];
          
          fs.writeFileSync(BOT_MSG_PATH, JSON.stringify(db, null, 2));
        }
      } catch (e) {}
      return res;
    };

    // ⏰ ক্রনজব চালু
    setTimeout(() => {
      if (config.azanGroupID && config.azanGroupID !== "আপনার_গ্রুপের_আইডি_এখানে_দিন") {
        const azanEvent = events.find(ev => ev.config.name === "azan");
        if (azanEvent) { try { azanEvent.run({ api, config, threadID: config.azanGroupID }); } catch (e) {} }

        const gmEvent = events.find(ev => ev.config.name === "goodmorning");
        if (gmEvent) { try { gmEvent.run({ api, config, threadID: config.gmGroupID }); } catch (e) {} }

        const midnightEvent = events.find(ev => ev.config.name === "midnight");
        if (midnightEvent) { try { midnightEvent.run({ api, config, threadID: config.midnightGroupID }); } catch (e) {} }
        
        console.log("✅ সব Cronjobs চালু হয়েছে");
      } else {
        console.log("⚠️ সতর্কতা: azanGroupID সেট করা নেই, তাই আজান/মিডনাইট কাজ করবে না।");
      }
    }, 5000);

    // 🎯 মেসেজ ও ইভেন্ট লিসেনার
    api.listenMqtt(async (err, event) => {
      try {
        if (err) return console.error("⚠️ MQTT error:", err?.message || err);

        // Auto Seen
        try {
          const seenPath = path.join(__dirname, "cache", "autoseen.txt");
          if (fs.existsSync(seenPath) && fs.readFileSync(seenPath, "utf8").trim() === "true") {
            api.markAsRead(event.threadID, () => {});
          }
        } catch (e) {}

        // Event Handler
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

        // Message Handler
        if (event && event.type === "message" && event.body) {
          for (const ev of events) {
            if (ev.config.eventType === "message") {
              try {
                await ev.run({ api, event, config });
              } catch (e) {
                console.error(`⚠️ মেসেজ ইভেন্ট এরর (${ev.config.name}):`, e?.message || e);
              }
            }
          }

          const body = event.body.trim();
          if (!body.startsWith(config.prefix)) return;

          const args = body.slice(config.prefix.length).trim().split(/ +/);
          const commandName = args.shift().toLowerCase();
          const cmd = commands.get(commandName);

          if (cmd) {
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
}

// বট চালু করা
startBot();
