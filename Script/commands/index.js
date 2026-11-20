'use strict';

const fs = require('fs');
const path = require('path');

// এই ফোল্ডারের সব কমান্ড ফাইল লোড করে। প্রতিটি ফাইলে name ও execute থাকতে হবে।
function loadCommands(dir = __dirname) {
  const commands = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js') || file === 'index.js') continue;
    const command = require(path.join(dir, file));
    if (!command || typeof command.name !== 'string' || typeof command.execute !== 'function') {
      throw new Error(`Invalid command file: ${file}`);
    }
    const names = [command.name, ...(Array.isArray(command.aliases) ? command.aliases : [])];
    for (const rawName of names) {
      const name = rawName.toLowerCase();
      if (commands.has(name)) {
        throw new Error(`Duplicate command name "${name}" in ${file}`);
      }
      commands.set(name, command);
    }
  }
  return commands;
}

module.exports = { loadCommands };
