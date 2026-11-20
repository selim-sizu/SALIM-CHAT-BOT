'use strict';

module.exports = {
  name: 'ping',
  description: 'বট সক্রিয় কিনা দেখুন',
  usage: 'ping',
  adminOnly: false,
  execute({ message }) {
    const stamp = Number(message && message.timestamp);
    const latency = Date.now() - stamp;
    if (Number.isFinite(stamp) && latency >= 0 && latency < 60000) {
      return `🏓 Pong! (${latency}ms)`;
    }
    return '🏓 Pong!';
  }
};
