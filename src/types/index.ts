// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  locationLat: number | null;
  locationLng: number | null;
  city: string | null;
  zip: string | null;
  authProvider: 'google' | 'facebook' | 'apple';
  authProviderId: string;
  createdAt: string;
  lastActive: string;
}

export interface UserCreate {
  email: string;
  name: string;
  avatar?: string;
  authProvider: 'google' | 'facebook' | 'apple';
  authProviderId: string;
}

export interface UserUpdate {
  name?: string;
  avatar?: string;
  bio?: string;
  locationLat?: number;
  locationLng?: number;
  city?: string;
  zip?: string;
}

// Item types
export type ItemCategory = 
  | 'furniture'
  | 'electronics'
  | 'clothing'
  | 'books'
  | 'kitchen'
  | 'outdoor'
  | 'kids'
  | 'other';

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair';

export type ItemStatus = 'available' | 'pending' | 'claimed';

export interface Item {
  id: string;
  userId: string;
  title: string;
  description: string;
  images: string[];
  category: ItemCategory;
  condition: ItemCondition;
  locationLat: number;
  locationLng: number;
  city: string;
  zip: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  user?: Pick<User, 'id' | 'name' | 'avatar'>;
  distance?: number;
  isSaved?: boolean;
}

export interface ItemCreate {
  title: string;
  description: string;
  images: string[];
  category: ItemCategory;
  condition: ItemCondition;
  locationLat: number;
  locationLng: number;
  city: string;
  zip: string;
}

export interface ItemUpdate {
  title?: string;
  description?: string;
  images?: string[];
  category?: ItemCategory;
  condition?: ItemCondition;
  status?: ItemStatus;
  locationLat?: number;
  locationLng?: number;
  city?: string;
  zip?: string;
}

export interface ItemFilters {
  category?: ItemCategory;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  search?: string;
  sortBy?: 'newest' | 'closest' | 'popular';
  status?: ItemStatus;
  userId?: string;
  limit?: number;
  offset?: number;
}

// Message types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  // Joined
  sender?: Pick<User, 'id' | 'name' | 'avatar'>;
}

export interface MessageCreate {
  conversationId: string;
  content: string;
}

// Conversation types
export interface Conversation {
  id: string;
  itemId: string;
  participantIds: string[];
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined
  item?: Pick<Item, 'id' | 'title' | 'images' | 'status'>;
  participants?: Pick<User, 'id' | 'name' | 'avatar'>[];
  unreadCount?: number;
}

export interface ConversationCreate {
  itemId: string;
  participantId: string; // The other participant (current user is implicit)
  initialMessage: string;
}

// Saved items
export interface SavedItem {
  id: string;
  userId: string;
  itemId: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Auth types
export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface OAuthCallback {
  provider: 'google' | 'facebook' | 'apple';
  code: string;
  state?: string;
}
