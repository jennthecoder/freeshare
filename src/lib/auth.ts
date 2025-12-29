import { Context, Next } from 'hono';
import { run, get, generateId } from './db';
import { userRepo } from './user-repo';
import type { User } from '../types';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const authService = {
  createSession(userId: string): { userId: string; token: string; expiresAt: string } {
    const id = generateId();
    const token = generateId() + generateId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    run('INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, userId, token, expiresAt, new Date().toISOString()]);
    return { userId, token, expiresAt };
  },

  validateSession(token: string): User | null {
    const session = get<any>('SELECT user_id, expires_at FROM sessions WHERE token = ?', [token]);
    if (!session) return null;
    if (new Date(session.expires_at) < new Date()) {
      run('DELETE FROM sessions WHERE token = ?', [token]);
      return null;
    }
    const user = userRepo.findById(session.user_id);
    if (user) userRepo.updateLastActive(user.id);
    return user;
  },

  revokeSession(token: string): void {
    run('DELETE FROM sessions WHERE token = ?', [token]);
  },

  handleOAuthCallback(provider: 'google' | 'facebook' | 'apple', profile: { id: string; email: string; name: string; avatar?: string }) {
    let user = userRepo.findByAuthProvider(provider, profile.id);
    if (!user) {
      const existingByEmail = userRepo.findByEmail(profile.email);
      user = existingByEmail || userRepo.create({ email: profile.email, name: profile.name, avatar: profile.avatar, authProvider: provider, authProviderId: profile.id });
    }
    return { user, session: this.createSession(user.id) };
  }
};

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' }, 401);
  const user = authService.validateSession(authHeader.slice(7));
  if (!user) return c.json({ success: false, error: 'Invalid session' }, 401);
  c.set('user', user);
  c.set('userId', user.id);
  await next();
}

export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const user = authService.validateSession(authHeader.slice(7));
    if (user) { c.set('user', user); c.set('userId', user.id); }
  }
  await next();
}

export function createDemoUser(name: string) {
  return authService.handleOAuthCallback('google', {
    id: `demo_${Date.now()}`,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@demo.freeshare.local`,
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
  });
}
