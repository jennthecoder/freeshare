import { Context, Next } from 'hono';
import { run, get, generateId } from './db';
import { userRepo } from './user-repo';
import type { User } from '../types';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const authService = {
  async createSession(userId: string): Promise<{ userId: string; token: string; expiresAt: string }> {
    const id = generateId();
    const token = generateId() + generateId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    await run('INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, userId, token, expiresAt, new Date().toISOString()]);
    return { userId, token, expiresAt };
  },

  async validateSession(token: string): Promise<User | null> {
    const session = await get<any>('SELECT user_id, expires_at FROM sessions WHERE token = ?', [token]);
    if (!session) return null;
    if (new Date(session.expires_at) < new Date()) {
      await run('DELETE FROM sessions WHERE token = ?', [token]);
      return null;
    }
    const user = await userRepo.findById(session.user_id);
    if (user) await userRepo.updateLastActive(user.id);
    return user;
  },

  async revokeSession(token: string): Promise<void> {
    await run('DELETE FROM sessions WHERE token = ?', [token]);
  },

  async handleOAuthCallback(provider: 'google' | 'facebook' | 'apple', profile: { id: string; email: string; name: string; avatar?: string }) {
    let user = await userRepo.findByAuthProvider(provider, profile.id);
    if (!user) {
      const existingByEmail = await userRepo.findByEmail(profile.email);
      user = existingByEmail || await userRepo.create({ email: profile.email, name: profile.name, avatar: profile.avatar, authProvider: provider, authProviderId: profile.id });
    }
    return { user, session: await this.createSession(user.id) };
  }
};

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' }, 401);
  const user = await authService.validateSession(authHeader.slice(7));
  if (!user) return c.json({ success: false, error: 'Invalid session' }, 401);
  c.set('user', user);
  c.set('userId', user.id);
  await next();
}

export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const user = await authService.validateSession(authHeader.slice(7));
    if (user) { c.set('user', user); c.set('userId', user.id); }
  }
  await next();
}

export async function createDemoUser(name: string) {
  return await authService.handleOAuthCallback('google', {
    id: `demo_${Date.now()}`,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@demo.freeshare.local`,
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
  });
}
