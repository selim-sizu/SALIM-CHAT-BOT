'use strict';

const { ValidationError } = require('../../utils/validation');

module.exports = {
  name: 'help',
  description: 'সব কমান্ডের তালিকা',
  usage: 'help [কমান্ড]',
  adminOnly: false,
  execute({ args, commands, isAdmin, prefix }) {
    const unique = [...new Set(commands.values())].sort((a, b) => a.name.localeCompare(b.name));

    if (args[0]) {
      const key = args[0].toLowerCase();
      const name = key.startsWith(prefix) ? key.slice(prefix.length) : key;
      const target = commands.get(name);
      if (!target || (target.adminOnly && !isAdmin)) {
        throw new ValidationError(`"${name}" নামে কোনো কমান্ড পাওয়া যায়নি।`);
      }
      return [
        `📌 ${prefix}${target.usage || target.name}`,
        target.description || '',
        target.adminOnly ? '🔒 শুধু অ্যাডমিনদের জন্য' : ''
      ]
        .filter(Boolean)
        .join('\n');
    }

    const line = (command) => `${prefix}${command.name} — ${command.description || ''}`;
    const lines = [`📖 কমান্ড তালিকা (prefix: ${prefix})`, '', ...unique.filter((c) => !c.adminOnly).map(line)];
    if (isAdmin) {
      lines.push('', '🔒 অ্যাডমিন কমান্ড', ...unique.filter((c) => c.adminOnly).map(line));
    }
    lines.push('', `বিস্তারিত: ${prefix}help কমান্ডের-নাম`);
    return lines.join('\n');
  }
};
