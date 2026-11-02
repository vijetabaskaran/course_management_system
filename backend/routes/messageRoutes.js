'use strict';
/**
 * routes/messageRoutes.js
 * Express router for message history and chat contacts (Activity 13.8).
 * All endpoints require a valid JWT via protect middleware.
 */
const router = require('express').Router();
const controller = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// 1. GET /api/v1/messages/unread — Get unread count summary
router.get('/unread', protect, controller.getUnreadSummary);

// 2. GET /api/v1/messages/contacts — Get available chat contacts
router.get('/contacts', protect, controller.getContacts);

// 3. PATCH/PUT /api/v1/messages/:senderId/read — Mark conversation as read
router.patch('/:senderId/read', protect, controller.markAsRead);
router.put('/:senderId/read', protect, controller.markAsRead);

// 4. GET /api/v1/messages/:userId — Get message history with user
router.get('/:userId', protect, controller.getHistory);

// 3. POST /api/v1/messages — Send a message
router.post('/', protect, controller.sendMessage);

module.exports = router;

