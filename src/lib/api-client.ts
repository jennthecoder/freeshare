const API_BASE = '/api';

let authToken: string | null = typeof localStorage !== 'undefined' 
  ? localStorage.getItem('freeshare_token') 
  : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem('freeshare_token', token);
    } else {
      localStorage.removeItem('freeshare_token');
    }
  }
}

export function getAuthToken() {
  return authToken;
}

export async function api<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; pagination?: any }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  demoLogin: (name: string) => 
    api<{ user: any; token: string }>('/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  
  logout: () => api('/auth/logout', { method: 'POST' }),
  
  me: () => api('/auth/me'),
};

// Items API
export const itemsApi = {
  list: (params: Record<string, any> = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    return api(`/items?${searchParams}`);
  },
  
  get: (id: string) => api(`/items/${id}`),
  
  create: (data: any) => api('/items', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: any) => api(`/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  delete: (id: string) => api(`/items/${id}`, { method: 'DELETE' }),
  
  save: (id: string) => api(`/items/${id}/save`, { method: 'POST' }),
  
  unsave: (id: string) => api(`/items/${id}/save`, { method: 'DELETE' }),
  
  saved: () => api('/saved'),
};

// Users API
export const usersApi = {
  get: (id: string) => api(`/users/${id}`),
  
  updateMe: (data: any) => api('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  items: (id: string) => api(`/users/${id}/items`),
};

// Conversations API
export const conversationsApi = {
  list: () => api('/conversations'),
  
  get: (id: string) => api(`/conversations/${id}`),
  
  create: (data: { itemId: string; participantId: string; initialMessage: string }) =>
    api('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  messages: (id: string) => api(`/conversations/${id}/messages`),
  
  sendMessage: (id: string, content: string) =>
    api(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  
  markRead: (id: string) => api(`/conversations/${id}/read`, { method: 'POST' }),
  
  unreadCount: () => api('/messages/unread-count'),
};
