'use strict';
/**
 * models/messageModel.js
 * Data access layer for chat messages.
 */
const Message = require('./schemas/MessageSchema');
const User = require('./schemas/UserSchema');

/**
 * Save a new chat message to MongoDB.
 */
async function create(messageData) {
  const doc = new Message(messageData);
  const saved = await doc.save();
  return saved.toObject();
}

/**
 * Resolve all alias identifiers for a user (ID, ObjectId, legacyId, email)
 * to ensure conversation history matching never drops messages due to identifier variance.
 */
async function resolveUserAliases(identifier) {
  const idStr = String(identifier || '').trim();
  if (!idStr) return [];
  const set = new Set([idStr]);
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idStr);
  try {
    const doc = await User.findOne({
      $or: [
        ...(isObjectId ? [{ _id: idStr }] : []),
        { legacyId: idStr },
        { email: idStr.toLowerCase() },
      ],
    }).lean();
    if (doc) {
      set.add(String(doc._id));
      if (doc.legacyId) set.add(String(doc.legacyId));
      if (doc.email) set.add(doc.email.toLowerCase());
    }
  } catch (_) {}
  return Array.from(set);
}

/**
 * Retrieve messages between two users in chronological order.
 * @param {string} userA
 * @param {string} userB
 * @param {object} options
 */
async function getConversation(userA, userB, options = {}) {
  const [idsA, idsB] = await Promise.all([
    resolveUserAliases(userA),
    resolveUserAliases(userB),
  ]);

  const query = {
    $or: [
      { senderId: { $in: idsA }, receiverId: { $in: idsB } },
      { senderId: { $in: idsB }, receiverId: { $in: idsA } },
      { senderEmail: { $in: idsA }, receiverEmail: { $in: idsB } },
      { senderEmail: { $in: idsB }, receiverEmail: { $in: idsA } },
      { senderId: { $in: idsA }, receiverEmail: { $in: idsB } },
      { senderId: { $in: idsB }, receiverEmail: { $in: idsA } },
      { senderEmail: { $in: idsA }, receiverId: { $in: idsB } },
      { senderEmail: { $in: idsB }, receiverId: { $in: idsA } },
    ],
  };

  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments(query),
  ]);

  return {
    messages,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    limit,
  };
}

/**
 * Retrieve list of distinct user IDs that have conversations with the given user.
 */
async function getConversationPartners(userId) {
  const sent = await Message.distinct('receiverId', { senderId: userId });
  const received = await Message.distinct('senderId', { receiverId: userId });
  const set = new Set([...sent, ...received]);
  set.delete(userId);
  return Array.from(set);
}

/**
 * Mark messages sent by sender to receiver as read.
 */
async function markAsRead(receiverIdentifiers, senderIdentifiers) {
  const query = {
    $and: [
      {
        $or: [
          { receiverId: { $in: receiverIdentifiers } },
          { receiverEmail: { $in: receiverIdentifiers } },
        ],
      },
      {
        $or: [
          { senderId: { $in: senderIdentifiers } },
          { senderEmail: { $in: senderIdentifiers } },
        ],
      },
      {
        $or: [
          { isRead: false },
          { readAt: null },
        ],
      },
    ],
  };

  const now = new Date();
  const result = await Message.updateMany(query, {
    $set: {
      isRead: true,
      readAt: now,
    },
  });

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    readAt: now,
  };
}

/**
 * Get count of unread messages received by user, grouped by sender.
 */
async function getUnreadCounts(receiverIdentifiers) {
  const query = {
    $and: [
      {
        $or: [
          { receiverId: { $in: receiverIdentifiers } },
          { receiverEmail: { $in: receiverIdentifiers } },
        ],
      },
      {
        $or: [
          { isRead: false },
          { readAt: null },
        ],
      },
    ],
  };

  const [total, bySenderAggregation] = await Promise.all([
    Message.countDocuments(query),
    Message.aggregate([
      { $match: query },
      { $group: { _id: '$senderId', count: { $sum: 1 }, senderEmail: { $first: '$senderEmail' } } },
    ]),
  ]);

  const bySender = {};
  for (const item of bySenderAggregation) {
    if (item._id) bySender[item._id] = item.count;
    if (item.senderEmail) bySender[item.senderEmail.toLowerCase()] = item.count;
  }

  return {
    total,
    bySender,
  };
}

module.exports = {
  create,
  getConversation,
  getConversationPartners,
  markAsRead,
  getUnreadCounts,
  resolveUserAliases,
};

