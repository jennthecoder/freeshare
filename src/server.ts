import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { initDb } from './lib/db';
import { userRepo } from './lib/user-repo';
import { itemRepo } from './lib/item-repo';
import { messageRepo } from './lib/message-repo';
import { authService, requireAuth, optionalAuth, createDemoUser } from './lib/auth';
import type { ItemFilters, ItemCreate, ItemUpdate, ConversationCreate, MessageCreate, UserUpdate } from './types';
import { getOAuthUrl, exchangeCodeForToken, getUserProfile } from './lib/oauth';

import type { User } from './types';

type Variables = {
  user: User;
  userId: string;
}

const app = new Hono<{ Variables: Variables }>();

export default app;

// Initialize database
let dbInitialized = false;
app.use('*', async (c, next) => {
  try {
    if (!dbInitialized) {
      await initDb();
      dbInitialized = true;
      console.log('✅ Database initialized');
    }
    await next();
  } catch (err: any) {
    console.error('Database init error:', err);
    return c.json({ success: false, error: 'Database connection failed' }, 500);
  }
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: err.message || 'Internal server error' }, 500);
});

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check (also returns env var status for debugging)
app.get('/api/health', (c) => c.json({
  status: 'ok',
  time: new Date().toISOString(),
  hasDbUrl: !!process.env.TURSO_DATABASE_URL,
  hasDbToken: !!process.env.TURSO_AUTH_TOKEN,
}));

// ============== AUTH ROUTES ==============

// Demo login (for development)
app.post('/api/auth/demo', async (c) => {
  const { name } = await c.req.json();
  if (!name || typeof name !== 'string' || name.length < 2) {
    return c.json({ success: false, error: 'Name must be at least 2 characters' }, 400);
  }

  const { user, session } = await createDemoUser(name);
  return c.json({ success: true, data: { user, token: session.token } });
});

// Get current user 
app.get('/api/auth/me', requireAuth, (c) => {
  const user = c.get('user');
  return c.json({ success: true, data: user });
});

// Logout
app.post('/api/auth/logout', requireAuth, async (c) => {
  const token = c.req.header('Authorization')?.slice(7);
  if (token) {
    await authService.revokeSession(token);
  }
  return c.json({ success: true });
});

// OAuth Routes

// 1. Redirect to Provider
app.get('/api/auth/:provider', (c) => {
  const provider = c.req.param('provider');
  if (!['google', 'facebook', 'apple'].includes(provider)) {
    return c.json({ success: false, error: 'Invalid provider' }, 400);
  }
  const url = getOAuthUrl(provider);
  return c.redirect(url);
});

// 2. Handle Callback
app.get('/api/auth/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error) {
    return c.html(`<h3>Login Failed</h3><p>${error}</p><a href="/">Go Home</a>`);
  }

  if (!code) {
    return c.json({ success: false, error: 'No code provided' }, 400);
  }

  try {
    const tokenData = await exchangeCodeForToken(provider, code);
    const profile = await getUserProfile(provider, tokenData.access_token);

    // Create/Get User & Session
    const { session } = await authService.handleOAuthCallback(provider as any, profile);

    // Redirect to frontend with token
    // In production, better to set HttpOnly cookie, but for now passing via URL fragment/query
    // or rendering a page that saves to localStorage
    return c.html(`
      <html>
        <body>
          <h1>Login Successful...</h1>
          <script>
            localStorage.setItem('freeshare_token', '${session.token}');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error('OAuth Error:', err);
    return c.html(`<h3>Login Failed</h3><p>${err.message}</p><a href="/">Go Home</a>`);
  }
});

// ============== USER ROUTES ==============

// Get user profile
app.get('/api/users/:id', optionalAuth, async (c) => {
  const user = await userRepo.findById(c.req.param('id'));
  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  // Don't expose email to other users
  const currentUserId = c.get('userId');
  if (user.id !== currentUserId) {
    const { email, ...publicUser } = user;
    return c.json({ success: true, data: publicUser });
  }

  return c.json({ success: true, data: user });
});

// Update current user profile
app.patch('/api/users/me', requireAuth, async (c) => {
  const userId = c.get('userId');
  const data: UserUpdate = await c.req.json();

  const updated = await userRepo.update(userId, data);
  if (!updated) {
    return c.json({ success: false, error: 'Failed to update profile' }, 400);
  }

  return c.json({ success: true, data: updated });
});

// ============== ITEM ROUTES ==============

// Get items feed
app.get('/api/items', optionalAuth, async (c) => {
  const currentUserId = c.get('userId');

  const filters: ItemFilters = {
    category: c.req.query('category') as any,
    lat: c.req.query('lat') ? parseFloat(c.req.query('lat')!) : undefined,
    lng: c.req.query('lng') ? parseFloat(c.req.query('lng')!) : undefined,
    radiusMiles: c.req.query('radius') ? parseFloat(c.req.query('radius')!) : undefined,
    search: c.req.query('search'),
    sortBy: (c.req.query('sort') as any) || 'newest',
    status: c.req.query('status') as any,
    userId: c.req.query('userId'),
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20,
    offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0,
  };

  const { items, total } = await itemRepo.findAll(filters, currentUserId);

  return c.json({
    success: true,
    data: items,
    pagination: {
      total,
      limit: filters.limit!,
      offset: filters.offset!,
      hasMore: filters.offset! + items.length < total
    }
  });
});

// Get single item
app.get('/api/items/:id', optionalAuth, async (c) => {
  const currentUserId = c.get('userId');
  const item = await itemRepo.findById(c.req.param('id'), currentUserId);

  if (!item) {
    return c.json({ success: false, error: 'Item not found' }, 404);
  }

  return c.json({ success: true, data: item });
});

// Create item
app.post('/api/items', requireAuth, async (c) => {
  const userId = c.get('userId');
  const data: ItemCreate = await c.req.json();

  // Validation
  if (!data.title || data.title.length < 3) {
    return c.json({ success: false, error: 'Title must be at least 3 characters' }, 400);
  }
  if (!data.description || data.description.length < 10) {
    return c.json({ success: false, error: 'Description must be at least 10 characters' }, 400);
  }
  if (!data.category) {
    return c.json({ success: false, error: 'Category is required' }, 400);
  }
  if (!data.condition) {
    return c.json({ success: false, error: 'Condition is required' }, 400);
  }
  if (!data.locationLat || !data.locationLng) {
    return c.json({ success: false, error: 'Location is required' }, 400);
  }

  const item = await itemRepo.create(userId, data);
  return c.json({ success: true, data: item }, 201);
});

// Update item
app.patch('/api/items/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const data: ItemUpdate = await c.req.json();

  const updated = await itemRepo.update(c.req.param('id'), userId, data);
  if (!updated) {
    return c.json({ success: false, error: 'Item not found or not authorized' }, 404);
  }

  return c.json({ success: true, data: updated });
});

// Delete item
app.delete('/api/items/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const deleted = await itemRepo.delete(c.req.param('id'), userId);

  if (!deleted) {
    return c.json({ success: false, error: 'Item not found or not authorized' }, 404);
  }

  return c.json({ success: true });
});

// Save/unsave item
app.post('/api/items/:id/save', requireAuth, async (c) => {
  const userId = c.get('userId');
  await itemRepo.saveItem(userId, c.req.param('id'));
  return c.json({ success: true });
});

app.delete('/api/items/:id/save', requireAuth, async (c) => {
  const userId = c.get('userId');
  await itemRepo.unsaveItem(userId, c.req.param('id'));
  return c.json({ success: true });
});

// Get saved items
app.get('/api/saved', requireAuth, async (c) => {
  const userId = c.get('userId');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20;
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;

  const { items, total } = await itemRepo.getSavedItems(userId, limit, offset);

  return c.json({
    success: true,
    data: items,
    pagination: { total, limit, offset, hasMore: offset + items.length < total }
  });
});

// Get user's items
app.get('/api/users/:id/items', optionalAuth, async (c) => {
  const currentUserId = c.get('userId');
  const userId = c.req.param('id');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20;
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;

  const { items, total } = await itemRepo.findAll({ userId, limit, offset }, currentUserId);

  return c.json({
    success: true,
    data: items,
    pagination: { total, limit, offset, hasMore: offset + items.length < total }
  });
});

// ============== MESSAGE ROUTES ==============

// Get conversations
app.get('/api/conversations', requireAuth, async (c) => {
  const userId = c.get('userId');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20;
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;

  const { conversations, total } = await messageRepo.getUserConversations(userId, limit, offset);

  return c.json({
    success: true,
    data: conversations,
    pagination: { total, limit, offset, hasMore: offset + conversations.length < total }
  });
});

// Get single conversation
app.get('/api/conversations/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const conversation = await messageRepo.findConversationById(c.req.param('id'), userId);

  if (!conversation) {
    return c.json({ success: false, error: 'Conversation not found' }, 404);
  }

  // Get participants
  conversation.participants = await messageRepo.getParticipants(conversation.participantIds);

  return c.json({ success: true, data: conversation });
});

// Create conversation (start messaging about an item)
app.post('/api/conversations', requireAuth, async (c) => {
  const userId = c.get('userId');
  const data: ConversationCreate = await c.req.json();

  if (!data.itemId || !data.participantId || !data.initialMessage) {
    return c.json({ success: false, error: 'itemId, participantId, and initialMessage are required' }, 400);
  }

  // Can't message yourself
  if (data.participantId === userId) {
    return c.json({ success: false, error: 'Cannot start conversation with yourself' }, 400);
  }

  const conversation = await messageRepo.createConversation(userId, data);
  conversation.participants = await messageRepo.getParticipants(conversation.participantIds);

  return c.json({ success: true, data: conversation }, 201);
});

// Get messages in conversation
app.get('/api/conversations/:id/messages', requireAuth, async (c) => {
  const userId = c.get('userId');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;

  const { messages, total } = await messageRepo.getConversationMessages(c.req.param('id'), userId, limit, offset);

  return c.json({
    success: true,
    data: messages,
    pagination: { total, limit, offset, hasMore: offset + messages.length < total }
  });
});

// Send message
app.post('/api/conversations/:id/messages', requireAuth, async (c) => {
  const userId = c.get('userId');
  const { content } = await c.req.json();

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return c.json({ success: false, error: 'Message content is required' }, 400);
  }

  const message = await messageRepo.createMessage(userId, {
    conversationId: c.req.param('id'),
    content: content.trim()
  });

  if (!message) {
    return c.json({ success: false, error: 'Failed to send message' }, 400);
  }

  return c.json({ success: true, data: message }, 201);
});

// Mark messages as read
app.post('/api/conversations/:id/read', requireAuth, async (c) => {
  const userId = c.get('userId');
  await messageRepo.markMessagesAsRead(c.req.param('id'), userId);
  return c.json({ success: true });
});

// Get unread count
app.get('/api/messages/unread-count', requireAuth, async (c) => {
  const userId = c.get('userId');
  const count = await messageRepo.getUnreadCount(userId);
  return c.json({ success: true, data: { count } });
});

// ============== START SERVER ==============

const port = parseInt(process.env.PORT || '3000');

async function start() {
  console.log('🔄 Initializing database...');
  await initDb();
  console.log('✅ Database ready');

  console.log(`FreeShare API server starting on http://localhost:${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
}

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  start().catch(console.error);
}
