'use strict';

const express = require('express');
const manager = require('../../Script/replyManager');

function notFound(res) {
  return res.status(404).json({ error: 'রিপ্লাই পাওয়া যায়নি।' });
}

function createRepliesRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    const filters = {};
    if (req.query.search) filters.search = String(req.query.search).slice(0, 100);
    if (req.query.enabled === 'true' || req.query.enabled === 'false') {
      filters.enabled = req.query.enabled === 'true';
    }
    if (req.query.matchType) filters.matchType = String(req.query.matchType);
    if (req.query.groupId) filters.groupId = String(req.query.groupId);
    res.json({ replies: manager.listReplies(filters) });
  });

  router.post('/', (req, res) => {
    const reply = manager.addReply(req.body || {});
    res.status(201).json({ reply });
  });

  router.put('/:id', (req, res) => {
    if (!manager.getReply(req.params.id)) return notFound(res);
    return res.json({ reply: manager.updateReply(req.params.id, req.body || {}) });
  });

  router.delete('/:id', (req, res) => {
    if (!manager.getReply(req.params.id)) return notFound(res);
    manager.deleteReply(req.params.id);
    return res.json({ ok: true });
  });

  return router;
}

module.exports = { createRepliesRouter };
