'use strict';

// Facebook ছাড়া টেস্টের জন্য নকল মেসেঞ্জার। এটা Facebook-এর সাথে সংযুক্ত নয়।
class SimulatorAdapter {
  constructor({ botId = 'simulator-bot' } = {}) {
    this.name = 'simulator';
    this.simulated = true;
    this.botId = botId;
    this.handler = null;
    this.sent = [];
    this.counter = 0;
    this.running = false;
  }

  onMessage(handler) {
    if (typeof handler !== 'function') {
      throw new Error('handler must be a function');
    }
    this.handler = handler;
  }

  async start() {
    this.running = true;
  }

  async stop() {
    this.running = false;
  }

  getStatus() {
    return { name: this.name, connected: false, simulated: true, running: this.running };
  }

  async sendMessage(groupId, text) {
    if (!groupId || typeof text !== 'string' || !text) {
      throw new Error('groupId and text are required');
    }
    this.counter += 1;
    const record = {
      messageId: `sim-out-${this.counter}`,
      groupId: String(groupId),
      text,
      sentAt: new Date().toISOString()
    };
    this.sent.push(record);
    return record;
  }

  // গ্রুপে একটি মেসেজ এসেছে এমন ভান করে এবং বটের ফলাফল ফেরত দেয়
  async simulateIncoming({
    groupId = 'sim-group',
    groupName = 'Simulator Group',
    senderId = 'sim-user',
    senderName = 'Sim User',
    text = '',
    messageId,
    isFromBot = false
  } = {}) {
    if (!this.handler) {
      throw new Error('No message handler registered. Call onMessage() first.');
    }
    this.counter += 1;
    return this.handler({
      messageId: messageId !== undefined ? messageId : `sim-in-${this.counter}`,
      groupId,
      groupName,
      senderId,
      senderName,
      text,
      isFromBot,
      timestamp: Date.now()
    });
  }

  getSentMessages() {
    return [...this.sent];
  }

  clearSent() {
    this.sent = [];
  }
}

module.exports = { SimulatorAdapter };
