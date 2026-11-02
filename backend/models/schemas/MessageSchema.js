'use strict';
/**
 * models/schemas/MessageSchema.js
 * Mongoose schema for persistent real-time chat messages (Activity 13.8).
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type:     String,
      required: [true, 'Sender ID is required.'],
      trim:     true,
      index:    true,
    },
    senderEmail: {
      type:      String,
      trim:      true,
      lowercase: true,
    },
    senderName: {
      type: String,
      trim: true,
    },
    receiverId: {
      type:     String,
      required: [true, 'Receiver ID is required.'],
      trim:     true,
      index:    true,
    },
    receiverEmail: {
      type:      String,
      trim:      true,
      lowercase: true,
    },
    receiverName: {
      type: String,
      trim: true,
    },
    content: {
      type:      String,
      required:  [true, 'Message content is required.'],
      trim:      true,
      maxlength: [2000, 'Message cannot exceed 2000 characters.'],
    },
    isRead: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    readAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for fast conversation history retrieval
messageSchema.index(
  { senderId: 1, receiverId: 1, createdAt: 1 },
  { name: 'conversation_forward' }
);
messageSchema.index(
  { receiverId: 1, senderId: 1, createdAt: 1 },
  { name: 'conversation_backward' }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

