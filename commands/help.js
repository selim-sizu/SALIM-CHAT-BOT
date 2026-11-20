module.exports = {
  config: {
    name: "help",
    aliases: ["সাহায্য"],
    description: "সব কমান্ডের তালিকা দেখায়"
  },
  run: async ({ api, event, commands, config }) => {
    const unique = new Map();
    for (const [name, cmd] of commands) {
      if (!unique.has(cmd.config.name)) unique.set(cmd.config.name, cmd.config);
    }

    let msg = `🤖 ${config.botName} কমান্ড লিস্ট:\n\n`;
    for (const [name, cfg] of unique) {
      msg += `🔹 ${config.prefix}${name}`;
      if (cfg.aliases) msg += ` (${cfg.aliases.join(", ")})`;
      msg += ` — ${cfg.description || "কোনো বিবরণ নেই"}\n`;
    }

    api.sendMessageMqtt(random, event.threadID)
  .catch(err => console.error("❌ send failed:", err.message));
  }
};
