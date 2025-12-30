import { run, get, all, generateId } from './db';
import type { Item, ItemCreate, ItemUpdate, ItemFilters } from '../types';

export const itemRepo = {
  async findById(id: string, currentUserId?: string): Promise<Item | null> {
    const row = await get<any>(`
      SELECT i.*, u.id as user_id, u.name as user_name, u.avatar as user_avatar
      FROM items i JOIN users u ON i.user_id = u.id WHERE i.id = ?
    `, [id]);
    if (!row) return null;
    const saved = currentUserId ? await get<any>('SELECT 1 FROM saved_items WHERE user_id = ? AND item_id = ?', [currentUserId, id]) : null;
    return this.mapRow(row, !!saved);
  },

  async findAll(filters: ItemFilters, currentUserId?: string): Promise<{ items: Item[]; total: number }> {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (filters.status) { where += " AND i.status = ?"; params.push(filters.status); }
    else if (!filters.userId) { where += " AND i.status = 'available'"; }
    if (filters.category) { where += " AND i.category = ?"; params.push(filters.category); }
    if (filters.userId) { where += " AND i.user_id = ?"; params.push(filters.userId); }
    if (filters.search) { where += " AND (i.title LIKE ? OR i.description LIKE ?)"; params.push(`%${filters.search}%`, `%${filters.search}%`); }

    const countRow = await get<any>(`SELECT COUNT(*) as total FROM items i ${where}`, params);
    const total = countRow?.total || 0;

    let orderBy = "ORDER BY i.created_at DESC";
    if (filters.sortBy === 'closest' && filters.lat && filters.lng) {
      orderBy = `ORDER BY ((i.location_lat - ${filters.lat}) * (i.location_lat - ${filters.lat}) + (i.location_lng - ${filters.lng}) * (i.location_lng - ${filters.lng})) ASC`;
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const rows = await all<any>(`
      SELECT i.*, u.id as user_id, u.name as user_name, u.avatar as user_avatar
      FROM items i JOIN users u ON i.user_id = u.id ${where} ${orderBy} LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const savedIds = currentUserId ? new Set((await all<any>('SELECT item_id FROM saved_items WHERE user_id = ?', [currentUserId])).map(r => r.item_id)) : new Set();

    const items = rows.map(row => {
      const item = this.mapRow(row, savedIds.has(row.id));
      if (filters.lat && filters.lng) {
        const latDiff = row.location_lat - filters.lat;
        const lngDiff = row.location_lng - filters.lng;
        item.distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69;
      }
      return item;
    });

    return { items, total };
  },

  async create(userId: string, data: ItemCreate): Promise<Item> {
    const id = generateId();
    const now = new Date().toISOString();
    await run(`INSERT INTO items (id, user_id, title, description, images, category, condition, location_lat, location_lng, city, zip, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)`,
      [id, userId, data.title, data.description, JSON.stringify(data.images), data.category, data.condition, data.locationLat, data.locationLng, data.city, data.zip, now, now]);
    return (await this.findById(id))!;
  },

  async update(id: string, userId: string, data: ItemUpdate): Promise<Item | null> {
    const existing = await get<any>('SELECT user_id FROM items WHERE id = ?', [id]);
    if (!existing || existing.user_id !== userId) return null;

    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [new Date().toISOString()];

    if (data.title !== undefined) { sets.push('title = ?'); vals.push(data.title); }
    if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
    if (data.images !== undefined) { sets.push('images = ?'); vals.push(JSON.stringify(data.images)); }
    if (data.category !== undefined) { sets.push('category = ?'); vals.push(data.category); }
    if (data.condition !== undefined) { sets.push('condition = ?'); vals.push(data.condition); }
    if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }

    vals.push(id);
    await run(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await get<any>('SELECT user_id FROM items WHERE id = ?', [id]);
    if (!existing || existing.user_id !== userId) return false;
    await run('DELETE FROM items WHERE id = ?', [id]);
    return true;
  },

  async saveItem(userId: string, itemId: string): Promise<boolean> {
    try {
      await run('INSERT OR IGNORE INTO saved_items (id, user_id, item_id, created_at) VALUES (?, ?, ?, ?)', [generateId(), userId, itemId, new Date().toISOString()]);
      return true;
    } catch { return false; }
  },

  async unsaveItem(userId: string, itemId: string): Promise<boolean> {
    await run('DELETE FROM saved_items WHERE user_id = ? AND item_id = ?', [userId, itemId]);
    return true;
  },

  async getSavedItems(userId: string, limit = 20, offset = 0): Promise<{ items: Item[]; total: number }> {
    const countRow = await get<any>('SELECT COUNT(*) as total FROM saved_items WHERE user_id = ?', [userId]);
    const rows = await all<any>(`
      SELECT i.*, u.id as user_id, u.name as user_name, u.avatar as user_avatar
      FROM saved_items si JOIN items i ON si.item_id = i.id JOIN users u ON i.user_id = u.id
      WHERE si.user_id = ? ORDER BY si.created_at DESC LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
    return { items: rows.map(r => this.mapRow(r, true)), total: countRow?.total || 0 };
  },

  mapRow(row: any, isSaved: boolean): Item {
    return {
      id: row.id, userId: row.user_id, title: row.title, description: row.description,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []),
      category: row.category, condition: row.condition, status: row.status,
      locationLat: row.location_lat, locationLng: row.location_lng, city: row.city, zip: row.zip,
      createdAt: row.created_at, updatedAt: row.updated_at, isSaved,
      user: row.user_name ? { id: row.user_id, name: row.user_name, avatar: row.user_avatar } : undefined
    };
  }
};
