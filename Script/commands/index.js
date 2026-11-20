'use strict';

const fs = require('fs');
const path = require('path');

// এই ফোল্ডারের সব কমান্ড ফাইল লোড করে।
// প্রতিটি ফাইল একটি কমান্ড অবজেক্ট অথবা কমান্ডের অ্যারে এক্সপোর্ট করতে পারে।
function loadCommands(dir = __dirname) {
  const commands = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js') || file === 'index.js') continue;
    const exported = require(path.join(dir, file));
    const list = Array.isArray(exported) ? exported : [exported];
    for (const command of list) {
      if (!command || typeof command.name !== 'string' || typeof command.execute !== 'function') {
        throw new Error(`Invalid command in file: ${file}`);
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
  }
  return commands;
}

module.exports = { loadCommands };
