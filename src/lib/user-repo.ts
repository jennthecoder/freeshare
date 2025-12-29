import { run, get, all, generateId } from './db';
import type { User, UserCreate, UserUpdate } from '../types';

export const userRepo = {
  findById(id: string): User | null {
    return get<User>(`SELECT id, email, name, avatar, bio, location_lat as locationLat, location_lng as locationLng, city, zip, auth_provider as authProvider, auth_provider_id as authProviderId, created_at as createdAt, last_active as lastActive FROM users WHERE id = ?`, [id]) || null;
  },

  findByAuthProvider(provider: string, providerId: string): User | null {
    return get<User>(`SELECT id, email, name, avatar, bio, location_lat as locationLat, location_lng as locationLng, city, zip, auth_provider as authProvider, auth_provider_id as authProviderId, created_at as createdAt, last_active as lastActive FROM users WHERE auth_provider = ? AND auth_provider_id = ?`, [provider, providerId]) || null;
  },

  findByEmail(email: string): User | null {
    return get<User>(`SELECT id, email, name, avatar, bio, location_lat as locationLat, location_lng as locationLng, city, zip, auth_provider as authProvider, auth_provider_id as authProviderId, created_at as createdAt, last_active as lastActive FROM users WHERE email = ?`, [email]) || null;
  },

  create(data: UserCreate): User {
    const id = generateId();
    const now = new Date().toISOString();
    run(`INSERT INTO users (id, email, name, avatar, auth_provider, auth_provider_id, created_at, last_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.email, data.name, data.avatar || null, data.authProvider, data.authProviderId, now, now]);
    return this.findById(id)!;
  },

  update(id: string, data: UserUpdate): User | null {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.avatar !== undefined) { sets.push('avatar = ?'); vals.push(data.avatar); }
    if (data.bio !== undefined) { sets.push('bio = ?'); vals.push(data.bio); }
    if (data.locationLat !== undefined) { sets.push('location_lat = ?'); vals.push(data.locationLat); }
    if (data.locationLng !== undefined) { sets.push('location_lng = ?'); vals.push(data.locationLng); }
    if (data.city !== undefined) { sets.push('city = ?'); vals.push(data.city); }
    if (data.zip !== undefined) { sets.push('zip = ?'); vals.push(data.zip); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  },

  updateLastActive(id: string): void {
    run(`UPDATE users SET last_active = ? WHERE id = ?`, [new Date().toISOString(), id]);
  }
};
