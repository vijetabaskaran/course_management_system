'use strict';
/**
 * services/messageService.js
 * Business logic for persistent chat messages and conversation history.
 */
const messageModel = require('../models/messageModel');
const studentModel = require('../models/studentModel');
const User = require('../models/schemas/UserSchema');

/**
 * Validate and persist a message from the authenticated user to a recipient.
 * @param {{ id: string, email: string, role: string }} senderUser
 * @param {string} receiverId
 * @param {string} content
 */
async function sendMessage(senderUser, receiverId, content) {
  if (!senderUser || (!senderUser.id && !senderUser.email)) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  const senderId = String(senderUser.id || senderUser.email).trim();
  const targetReceiverId = String(receiverId || '').trim();

  // 1. Validate receiver ID
  if (!targetReceiverId) {
    const err = new Error('Receiver ID is required.');
    err.statusCode = 400;
    throw err;
  }

  if (senderId === targetReceiverId) {
    const err = new Error('Cannot send a message to yourself.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Validate message content
  if (!content || typeof content !== 'string' || !content.trim()) {
    const err = new Error('Message content cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  const cleanContent = content.trim();
  if (cleanContent.length > 2000) {
    const err = new Error('Message cannot exceed 2000 characters.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Find receiver user in database
  let receiver = await studentModel.findById(targetReceiverId);
  if (!receiver) {
    // Check by email or legacyId
    const recDoc = await User.findOne({
      $or: [
        { legacyId: targetReceiverId },
        { email: targetReceiverId.toLowerCase() },
      ],
    }).select('-password').lean();
    if (recDoc) {
      receiver = { ...recDoc, id: recDoc.legacyId || String(recDoc._id) };
    }
  }

  if (!receiver) {
    const err = new Error(`Recipient with ID "${targetReceiverId}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  // 4. Resolve sender name
  let senderName = senderUser.fullname;
  if (!senderName) {
    const senderDoc = await studentModel.findById(senderId);
    senderName = senderDoc?.fullname || (senderUser.role === 'admin' ? 'Administrator' : 'Student');
  }

  const receiverActualId = receiver.id || receiver.legacyId || String(receiver._id);
  const receiverName = receiver.fullname || receiver.username || 'User';

  // 5. Persist message to MongoDB
  const saved = await messageModel.create({
    senderId,
    senderEmail: senderUser.email || '',
    senderName,
    receiverId: receiverActualId,
    receiverEmail: receiver.email || '',
    receiverName,
    content: cleanContent,
  });

  return saved;
}

/**
 * Retrieve message history between authenticated user and target participant.
 * @param {{ id: string, email: string, role: string }} user
 * @param {string} targetUserId
 * @param {object} queryOptions
 */
async function getHistory(user, targetUserId, queryOptions = {}) {
  if (!user || (!user.id && !user.email)) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  const currentUserId = String(user.id || user.email).trim();
  const cleanTargetId = String(targetUserId || '').trim();

  if (!cleanTargetId) {
    const err = new Error('User ID parameter is required.');
    err.statusCode = 400;
    throw err;
  }

  // Verify participant exists
  let targetUser = await studentModel.findById(cleanTargetId);
  if (!targetUser) {
    const found = await User.findOne({
      $or: [
        { legacyId: cleanTargetId },
        { email: cleanTargetId.toLowerCase() },
      ],
    }).select('-password').lean();
    if (found) {
      targetUser = { ...found, id: found.legacyId || String(found._id) };
    }
  }

  if (!targetUser) {
    const err = new Error(`User with ID "${cleanTargetId}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const targetActualId = targetUser.id || targetUser.legacyId || String(targetUser._id);
  const result = await messageModel.getConversation(currentUserId, targetActualId, queryOptions);

  return {
    success: true,
    participant: {
      id: targetActualId,
      fullname: targetUser.fullname,
      email: targetUser.email,
      role: targetUser.role || 'student',
      department: targetUser.department || '',
    },
    ...result,
  };
}

/**
 * Get all available contacts (students + admins) for the chat contact list.
 * @param {{ id: string, email: string, role: string }} currentUser
 */
async function getContacts(currentUser) {
  const currentUserId = String(currentUser?.id || currentUser?.email || '').trim();
  const allUsers = await User.find({}).select('-password').lean();

  const contacts = allUsers
    .map(u => ({
      id: u.legacyId || String(u._id),
      _id: String(u._id),
      fullname: u.fullname || u.username || 'User',
      email: u.email,
      role: u.role || 'student',
      department: u.department || '',
    }))
    .filter(u => u.id !== currentUserId && u.email !== currentUser?.email);

  return contacts;
}

module.exports = {
  sendMessage,
  getHistory,
  getContacts,
};

