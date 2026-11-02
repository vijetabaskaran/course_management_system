'use strict';
/**
 * controllers/messageController.js
 * HTTP controllers for message history and contacts.
 */
const messageService = require('../services/messageService');

/**
 * GET /api/v1/messages/contacts
 * Retrieve all available contacts for chat.
 */
async function getContacts(req, res, next) {
  try {
    const contacts = await messageService.getContacts(req.user);
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/messages/:userId
 * Retrieve conversation history with a specific user.
 */
async function getHistory(req, res, next) {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;
    const history = await messageService.getHistory(req.user, userId, { page, limit });
    res.json(history);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/messages
 * Send a message via REST.
 */
async function sendMessage(req, res, next) {
  try {
    const { receiverId, content } = req.body || {};
    const message = await messageService.sendMessage(req.user, receiverId, content);
    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/messages/unread
 * Retrieve unread count summary for authenticated user.
 */
async function getUnreadSummary(req, res, next) {
  try {
    const summary = await messageService.getUnreadSummary(req.user);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/messages/:senderId/read
 * Mark messages received from senderId as read.
 */
async function markAsRead(req, res, next) {
  try {
    const { senderId } = req.params;
    const result = await messageService.markConversationAsRead(req.user, senderId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getContacts,
  getHistory,
  sendMessage,
  getUnreadSummary,
  markAsRead,
};

