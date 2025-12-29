import { useState, useEffect, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { CategoryPills, ItemCard, EmptyState, Input } from '../../components';
import { itemsApi } from '../../lib/api-client';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import type { Item } from '../../types';
import styles from './FeedPage.module.css';

interface FeedPageProps {
  onItemClick: (item: Item) => void;
  onPostClick: () => void;
}

export function FeedPage({ onItemClick, onPostClick }: FeedPageProps) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(25);
  const [sort, setSort] = useState('newest');

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await itemsApi.list({
        category: category || undefined,
        search: search || undefined,
        lat: location.lat,
        lng: location.lng,
        radius,
        sort,
        limit: 50,
      });
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  }, [category, search, location, radius, sort]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (item: Item) => {
    try {
      if (item.isSaved) {
        await itemsApi.unsave(item.id);
      } else {
        await itemsApi.save(item.id);
      }
      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, isSaved: !i.isSaved } : i))
      );
    } catch (err) {
      console.error('Failed to save item:', err);
    }
  };

  return (
    <main className={styles.main}>
      <CategoryPills selected={category} onSelect={setCategory} />

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <select
            className={styles.select}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
          >
            <option value={1}>1 mile</option>
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
          </select>

          <select
            className={styles.select}
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="closest">Closest</option>
            <option value="popular">Popular</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array(8).fill(null).map((_, i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonText} />
              <div className={styles.skeletonTextShort} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No items found"
          description="Try adjusting your filters or check back later"
        />
      ) : (
        <div className={styles.grid}>
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
              onSave={user ? () => handleSave(item) : undefined}
              showSaveButton={!!user}
            />
          ))}
        </div>
      )}

      {user && (
        <button className={styles.fab} onClick={onPostClick} aria-label="Post new item">
          <Plus size={24} />
        </button>
      )}
    </main>
  );
}
