import { useState, useEffect, useCallback } from 'react';
import { Header, Modal, Button, Avatar, EmptyState } from './components';
import { LocationModal } from './components/LocationModal';
import { FeedPage, ItemDetailPage, PostItemPage } from './pages';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider, useLocation } from './context/LocationContext';
import { itemsApi, conversationsApi } from './lib/api-client';
import { formatTimeAgo } from './lib/utils';
import type { Item, Conversation, Message } from './types';
import './styles/global.css';

type View = 'feed' | 'item' | 'post' | 'messages' | 'conversation' | 'saved' | 'profile';

function AppContent() {
  const { user, loading, login, logout } = useAuth();
  const { location, setLocation } = useLocation();

  // All hooks must be declared before any conditional returns
  const [view, setView] = useState<View>('feed');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{ itemId: string; userId: string; title: string } | null>(null);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await conversationsApi.unreadCount();
      setUnreadCount(data?.count || 0);
    } catch { }
  }, [user]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Show loading state while checking session (AFTER all hooks)
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const handleItemClick = async (item: Item) => {
    try {
      const { data } = await itemsApi.get(item.id);
      setCurrentItem(data);
      setView('item');
    } catch (err) {
      console.error('Failed to load item:', err);
    }
  };

  const handleSaveItem = async () => {
    if (!currentItem) return;
    try {
      if (currentItem.isSaved) {
        await itemsApi.unsave(currentItem.id);
      } else {
        await itemsApi.save(currentItem.id);
      }
      setCurrentItem({ ...currentItem, isSaved: !currentItem.isSaved });
    } catch (err) {
      console.error('Failed to save item:', err);
    }
  };

  const handleUpdateItemStatus = async (status: string) => {
    if (!currentItem) return;
    try {
      const { data } = await itemsApi.update(currentItem.id, { status });
      setCurrentItem(data);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteItem = async () => {
    if (!currentItem) return;
    try {
      await itemsApi.delete(currentItem.id);
      setCurrentItem(null);
      setView('feed');
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handlePostItem = async (data: any) => {
    await itemsApi.create({
      ...data,
      locationLat: location.lat,
      locationLng: location.lng,
      city: location.city,
      zip: location.zip,
    });
    setView('feed');
  };

  const handleLocationSubmit = (city: string, zip: string) => {
    setLocation({
      ...location,
      city,
      zip,
      lat: 40.7128 + (Math.random() - 0.5) * 0.1, // Simulated coordinates
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
    });
    setLocationModalOpen(false);
  };

  const handleLocationChange = () => {
    setLocationModalOpen(true);
  };

  const loadConversations = async () => {
    try {
      const { data } = await conversationsApi.list();
      setConversations(data || []);
      setView('messages');
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadConversation = async (conv: Conversation) => {
    try {
      const [convRes, msgRes] = await Promise.all([
        conversationsApi.get(conv.id),
        conversationsApi.messages(conv.id),
      ]);
      setCurrentConversation(convRes.data);
      setMessages(msgRes.data || []);
      setView('conversation');
      await conversationsApi.markRead(conv.id);
      loadUnreadCount();
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const handleStartMessage = (itemId: string, userId: string, title: string) => {
    setMessageTarget({ itemId, userId, title });
    setMessageModalOpen(true);
  };

  const handleSendInitialMessage = async (message: string) => {
    if (!messageTarget) return;
    try {
      const { data } = await conversationsApi.create({
        itemId: messageTarget.itemId,
        participantId: messageTarget.userId,
        initialMessage: message,
      });
      setMessageModalOpen(false);
      setMessageTarget(null);
      await loadConversation(data);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentConversation) return;
    try {
      const { data } = await conversationsApi.sendMessage(currentConversation.id, content);
      setMessages(prev => [...prev, data]);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const loadSavedItems = async () => {
    try {
      const { data } = await itemsApi.saved();
      setSavedItems(data || []);
      setView('saved');
    } catch (err) {
      console.error('Failed to load saved items:', err);
    }
  };

  const handleLogin = async (name: string) => {
    await login(name);
    setLoginModalOpen(false);
    loadUnreadCount();
  };

  const renderView = () => {
    switch (view) {
      case 'item':
        return currentItem ? (
          <ItemDetailPage
            item={currentItem}
            onBack={() => { setCurrentItem(null); setView('feed'); }}
            onSave={handleSaveItem}
            onMessage={() => handleStartMessage(currentItem.id, currentItem.userId, currentItem.title)}
            onEdit={() => { }}
            onDelete={handleDeleteItem}
            onStatusChange={handleUpdateItemStatus}
            onLogin={() => setLoginModalOpen(true)}
          />
        ) : null;

      case 'post':
        return (
          <PostItemPage
            onBack={() => setView('feed')}
            onSubmit={handlePostItem}
            onLocationChange={handleLocationChange}
          />
        );

      case 'messages':
        return (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: 24 }}>Messages</h1>
            {conversations.length === 0 ? (
              <EmptyState icon={null} title="No messages yet" description="When you contact someone about an item, your conversation will appear here" />
            ) : (
              <div style={{ background: 'var(--color-surface)', borderRadius: 16, overflow: 'hidden' }}>
                {conversations.map(conv => {
                  const other = conv.participants?.find(p => p.id !== user?.id);
                  return (
                    <button key={conv.id} onClick={() => loadConversation(conv)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, width: '100%', background: conv.unreadCount ? 'var(--color-bg-alt)' : 'none', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left' }}>
                      <Avatar src={other?.avatar} name={other?.name || 'Unknown'} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600 }}>{other?.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ''}</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>{conv.item?.title}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.lastMessageContent}</div>
                      </div>
                      {(conv.unreadCount ?? 0) > 0 && <span style={{ width: 20, height: 20, background: 'var(--color-primary)', color: 'white', fontSize: '0.75rem', fontWeight: 600, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unreadCount}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'conversation':
        const otherUser = currentConversation?.participants?.find(p => p.id !== user?.id);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)', maxWidth: 600, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
              <button onClick={loadConversations} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>←</button>
              <Avatar src={otherUser?.avatar} name={otherUser?.name || 'Unknown'} size="sm" />
              <div>
                <div style={{ fontWeight: 600 }}>{otherUser?.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{currentConversation?.item?.title}</div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ alignSelf: msg.senderId === user?.id ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                  <div style={{ padding: '10px 16px', borderRadius: 16, background: msg.senderId === user?.id ? 'var(--color-primary)' : 'var(--color-surface)', color: msg.senderId === user?.id ? 'white' : 'inherit' }}>{msg.content}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', marginTop: 4, textAlign: msg.senderId === user?.id ? 'right' : 'left' }}>{formatTimeAgo(msg.createdAt)}</div>
                </div>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); const input = e.currentTarget.message as HTMLInputElement; if (input.value.trim()) { handleSendMessage(input.value.trim()); input.value = ''; } }} style={{ display: 'flex', gap: 8, padding: 16, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
              <input name="message" placeholder="Type a message..." style={{ flex: 1, padding: '10px 16px', background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', borderRadius: 50, fontSize: '0.9375rem', outline: 'none' }} />
              <Button type="submit">Send</Button>
            </form>
          </div>
        );

      case 'saved':
        return (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: 24 }}>Saved Items</h1>
            {savedItems.length === 0 ? (
              <EmptyState icon={null} title="No saved items" description="Items you save will appear here for easy access" action={<Button onClick={() => setView('feed')}>Browse Items</Button>} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {savedItems.map(item => (
                  <div key={item.id} onClick={() => handleItemClick(item)} style={{ cursor: 'pointer' }}>
                    <img src={item.images?.[0] || 'https://placehold.co/400x300'} alt={item.title} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12 }} />
                    <h3 style={{ marginTop: 8, fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            <div style={{ textAlign: 'center', padding: 32, background: 'var(--color-surface)', borderRadius: 16, marginBottom: 24 }}>
              <Avatar src={user?.avatar} name={user?.name || ''} size="xl" />
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginTop: 16, marginBottom: 4 }}>{user?.name}</h1>
              <p style={{ color: 'var(--color-muted)' }}>{user?.email}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Button variant="outline" fullWidth onClick={handleLocationChange}>Update Location</Button>
              <Button variant="danger" fullWidth onClick={logout}>Sign Out</Button>
            </div>
          </div>
        );

      default:
        return <FeedPage onItemClick={handleItemClick} onPostClick={() => setView('post')} />;
    }
  };

  return (
    <>
      <Header
        onLocationClick={handleLocationChange}
        onSavedClick={loadSavedItems}
        onMessagesClick={loadConversations}
        onProfileClick={() => setView('profile')}
        onLoginClick={() => setLoginModalOpen(true)}
        onLogoClick={() => setView('feed')}
        activeNav={view === 'saved' ? 'saved' : view === 'messages' || view === 'conversation' ? 'messages' : view === 'profile' ? 'profile' : undefined}
        unreadCount={unreadCount}
      />
      {renderView()}

      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSubmit={handleLocationSubmit}
        initialCity={location.city}
        initialZip={location.zip}
      />

      <Modal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} title="Welcome to FreeShare">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <Button
            variant="outline"
            fullWidth
            onClick={() => window.location.href = '/api/auth/google'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" width={20} alt="" />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => window.location.href = '/api/auth/facebook'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" width={20} alt="" />
            Continue with Facebook
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => window.location.href = '/api/auth/apple'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <img src="https://www.svgrepo.com/show/445610/brand-apple.svg" width={20} alt="" />
            Continue with Apple
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={e => { e.preventDefault(); const formData = new FormData(e.currentTarget); const name = formData.get('name') as string; handleLogin(name); }} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <input name="name" placeholder="Enter your name (Demo)" required minLength={2} style={{ padding: 14, background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', borderRadius: 12, fontSize: '1rem' }} />
          <Button type="submit" fullWidth>Continue with Demo</Button>
        </form>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', textAlign: 'center' }}>By continuing, you agree to our Terms of Service</p>
      </Modal>
      <Modal isOpen={messageModalOpen} onClose={() => setMessageModalOpen(false)} title="Send a Message">
        {messageTarget && (
          <>
            <p style={{ color: 'var(--color-muted)', marginBottom: 16 }}>About: {messageTarget.title}</p>
            <form onSubmit={e => { e.preventDefault(); const message = (e.currentTarget.message as HTMLTextAreaElement).value; handleSendInitialMessage(message); }}>
              <textarea name="message" rows={4} placeholder="Hi! I'm interested in this item. Is it still available?" required style={{ width: '100%', padding: 14, background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', borderRadius: 12, fontSize: '1rem', resize: 'vertical', marginBottom: 16 }} />
              <Button type="submit" fullWidth>Send Message</Button>
            </form>
          </>
        )}
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </AuthProvider>
  );
}
