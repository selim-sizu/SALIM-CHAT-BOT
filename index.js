process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err?.message || err);
});

const fs = require("fs");
const path = require("path");
const { login } = require("biar-fca");                    // 🔴 বদলানো হয়েছে
const keepAlive = require("./utils/keep_alive");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const appState = JSON.parse(fs.readFileSync(path.join(__dirname, "appstate.json"), "utf8"));

// কমান্ড লোডার
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  commands.set(cmd.config.name, cmd);
  if (cmd.config.aliases) {
    cmd.config.aliases.forEach(a => commands.set(a, cmd));
  }
}
console.log(`✅ ${commands.size} টি কমান্ড লোড হয়েছে`);

// ইভেন্ট লোডার
const events = [];
const eventFiles = fs.readdirSync(path.join(__dirname, "events")).filter(f => f.endsWith(".js"));
for (const file of eventFiles) {
  events.push(require(`./events/${file}`));
}

// Keep-alive সার্ভার চালু (Render + UptimeRobot)
keepAlive();

// বট লগইন
login({ appState }, { listenEvents: true, autoReconnect: true }, (err, api) => {
  if (err) return console.error("❌ লগইন ব্যর্থ:", err);

  console.log("🤖 বট অনলাইন! আইডি:", api.getCurrentUserID());

  api.listenMqtt(async (err, event) => {
    try {                                                  // 🔴 নতুন try
      if (err) return console.error("⚠️ MQTT error:", err);

      // ইভেন্ট হ্যান্ডলার
      for (const ev of events) {
        if (ev.config && ev.config.eventType && event.type === ev.config.eventType) {
          try {
            await ev.run({ api, event, config });          // 🔴 await + catch
          } catch (e) {
            console.error("⚠️ Event error:", e?.message || e);
          }
        }
      }

      // মেসেজ কমান্ড হ্যান্ডলার
      if (event.type === "message" && event.body) {
        const body = event.body.trim();
        if (!body.startsWith(config.prefix)) return;

        const args = body.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const cmd = commands.get(commandName);

        if (cmd) {
          try {
            await cmd.run({ api, event, args, config, commands });
          } catch (e) {
            console.error(`কমান্ড ${commandName} এ ত্রুটি:`, e?.message || e);
            api.sendMessageMqtt(
              `❌ কমান্ড চালাতে সমস্যা হয়েছে: ${e.message}`,
              event.threadID
            ).catch(err => console.error("❌ send failed:", err.message)); // 🔴 .catch
          }
        }
      }
    } catch (outerErr) {                                   // 🔴 নতুন catch
      console.error("⚠️ Listener handler error:", outerErr?.message || outerErr);
    }
  });
});
