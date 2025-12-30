import { run, get, all, generateId } from './db';
import type { Conversation, Message } from '../types';

export const messageRepo = {
  async findConversationById(id: string, userId: string): Promise<Conversation | null> {
    const row = await get<any>(`
      SELECT c.*, i.id as item_id, i.title as item_title, i.images as item_images, i.status as item_status
      FROM conversations c JOIN items i ON c.item_id = i.id
      WHERE c.id = ? AND c.participant_ids LIKE ?
    `, [id, `%${userId}%`]);
    if (!row) return null;
    return this.mapConversationRow(row, userId);
  },

  async getUserConversations(userId: string, limit = 20, offset = 0): Promise<{ conversations: Conversation[]; total: number }> {
    const countRow = await get<any>('SELECT COUNT(*) as total FROM conversations WHERE participant_ids LIKE ?', [`%${userId}%`]);
    const rows = await all<any>(`
      SELECT c.*, i.id as item_id, i.title as item_title, i.images as item_images, i.status as item_status
      FROM conversations c JOIN items i ON c.item_id = i.id
      WHERE c.participant_ids LIKE ? ORDER BY COALESCE(c.last_message_at, c.created_at) DESC LIMIT ? OFFSET ?
    `, [`%${userId}%`, limit, offset]);

    // Map in parallel
    const conversations = await Promise.all(rows.map(row => this.mapConversationRow(row, userId)));
    for (const conv of conversations) {
      conv.participants = await this.getParticipants(conv.participantIds);
      const unreadRow = await get<any>('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL', [conv.id, userId]);
      conv.unreadCount = unreadRow?.count || 0;
    }
    return { conversations, total: countRow?.total || 0 };
  },

  async createConversation(userId: string, data: { itemId: string; participantId: string; initialMessage: string }): Promise<Conversation> {
    const participantIds = [userId, data.participantId].sort().join(',');

    const existing = await get<any>('SELECT id FROM conversations WHERE item_id = ? AND participant_ids = ?', [data.itemId, participantIds]);
    if (existing) {
      await this.createMessage(userId, { conversationId: existing.id, content: data.initialMessage });
      return (await this.findConversationById(existing.id, userId))!;
    }

    const id = generateId();
    const now = new Date().toISOString();
    await run('INSERT INTO conversations (id, item_id, participant_ids, last_message_content, last_message_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.itemId, participantIds, data.initialMessage, now, now, now]);

    await run('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateId(), id, userId, data.initialMessage, now]);

    return (await this.findConversationById(id, userId))!;
  },

  async getConversationMessages(conversationId: string, userId: string, limit = 50, offset = 0): Promise<{ messages: Message[]; total: number }> {
    const conv = await get<any>('SELECT participant_ids FROM conversations WHERE id = ?', [conversationId]);
    if (!conv || !conv.participant_ids.includes(userId)) return { messages: [], total: 0 };

    const countRow = await get<any>('SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?', [conversationId]);
    const rows = await all<any>(`
      SELECT m.*, u.id as sender_id, u.name as sender_name, u.avatar as sender_avatar
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ? ORDER BY m.created_at ASC LIMIT ? OFFSET ?
    `, [conversationId, limit, offset]);

    return {
      messages: rows.map(r => ({
        id: r.id, conversationId: r.conversation_id, senderId: r.sender_id,
        content: r.content, readAt: r.read_at, createdAt: r.created_at,
        sender: { id: r.sender_id, name: r.sender_name, avatar: r.sender_avatar }
      })),
      total: countRow?.total || 0
    };
  },

  async createMessage(userId: string, data: { conversationId: string; content: string }): Promise<Message | null> {
    const conv = await get<any>('SELECT participant_ids FROM conversations WHERE id = ?', [data.conversationId]);
    if (!conv || !conv.participant_ids.includes(userId)) return null;

    const id = generateId();
    const now = new Date().toISOString();
    await run('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.conversationId, userId, data.content, now]);
    await run('UPDATE conversations SET last_message_content = ?, last_message_at = ?, updated_at = ? WHERE id = ?',
      [data.content, now, now, data.conversationId]);

    const row = await get<any>('SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?', [id]);
    if (!row) return null;
    return {
      id: row.id, conversationId: row.conversation_id, senderId: row.sender_id,
      content: row.content, readAt: row.read_at, createdAt: row.created_at,
      sender: { id: row.sender_id, name: row.sender_name, avatar: row.sender_avatar }
    };
  },

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await run('UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL',
      [new Date().toISOString(), conversationId, userId]);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const row = await get<any>(`
      SELECT COUNT(*) as count FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.participant_ids LIKE ? AND m.sender_id != ? AND m.read_at IS NULL
    `, [`%${userId}%`, userId]);
    return row?.count || 0;
  },

  async getParticipants(participantIds: string[]): Promise<{ id: string; name: string; avatar: string | null }[]> {
    if (!participantIds.length) return [];
    const placeholders = participantIds.map(() => '?').join(',');
    return await all<any>(`SELECT id, name, avatar FROM users WHERE id IN (${placeholders})`, participantIds);
  },

  mapConversationRow(row: any, _userId: string): Conversation {
    const participantIds = row.participant_ids.split(',');
    return {
      id: row.id,
      itemId: row.item_id,
      participantIds,
      lastMessageContent: row.last_message_content,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      item: {
        id: row.item_id,
        title: row.item_title,
        images: JSON.parse(row.item_images || '[]'),
        status: row.item_status
      },
      unreadCount: 0
    };
  }
};
