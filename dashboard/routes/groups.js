'use strict';

const express = require('express');
const database = require('../../Script/database/database');
const { cleanBoolean } = require('../../utils/validation');

function createGroupsRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({ groups: database.listGroups() });
  });

  router.put('/:id', (req, res) => {
    const id = String(req.params.id);
    if (!database.getGroup(id)) {
      return res.status(404).json({ error: 'গ্রুপ পাওয়া যায়নি।' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const fields = {};
    if (body.name !== undefined) fields.name = String(body.name).trim().slice(0, 100);
    if (body.bot_enabled !== undefined) fields.bot_enabled = cleanBoolean(body.bot_enabled);
    if (body.replies_enabled !== undefined) fields.replies_enabled = cleanBoolean(body.replies_enabled);
    return res.json({ group: database.updateGroup(id, fields) });
  });

  return router;
}

module.exports = { createGroupsRouter };
