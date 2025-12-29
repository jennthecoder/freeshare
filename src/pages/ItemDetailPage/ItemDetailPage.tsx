import { useState } from 'react';
import { ArrowLeft, MapPin, Clock, Heart, MessageCircle, Edit, Trash2 } from 'lucide-react';
import { Button, Avatar } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { formatCondition, formatCategory, formatTimeAgo, classNames } from '../../lib/utils';
import type { Item } from '../../types';
import styles from './ItemDetailPage.module.css';

interface ItemDetailPageProps {
  item: Item;
  onBack: () => void;
  onSave: () => void;
  onMessage: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onLogin: () => void;
}

export function ItemDetailPage({
  item,
  onBack,
  onSave,
  onMessage,
  onEdit,
  onDelete,
  onStatusChange,
  onLogin,
}: ItemDetailPageProps) {
  const { user } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isOwner = user?.id === item.userId;
  const images = item.images?.length
    ? item.images
    : ['https://placehold.co/600x400/FBF8F4/9B9B9B?text=No+Image'];

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item? This cannot be undone.')) {
      onDelete();
    }
  };

  return (
    <main className={styles.main}>
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={20} />
        Back
      </button>

      <div className={styles.content}>
        <div className={styles.gallery}>
          <img
            src={images[activeImageIndex]}
            alt={item.title}
            className={styles.mainImage}
          />
          {images.length > 1 && (
            <div className={styles.thumbnails}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className={classNames(styles.thumb, i === activeImageIndex && styles.activeThumb)}
                  onClick={() => setActiveImageIndex(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.header}>
            <div className={styles.tags}>
              <span className={styles.categoryTag}>{formatCategory(item.category)}</span>
              <span className={classNames(styles.conditionTag, styles[`condition_${item.condition}`])}>
                {formatCondition(item.condition)}
              </span>
            </div>
            {user && !isOwner && (
              <button
                className={classNames(styles.saveBtn, item.isSaved && styles.saved)}
                onClick={onSave}
              >
                <Heart size={20} fill={item.isSaved ? 'currentColor' : 'none'} />
                {item.isSaved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>

          <h1 className={styles.title}>{item.title}</h1>

          <div className={styles.meta}>
            <span><MapPin size={16} /> {item.city}</span>
            <span><Clock size={16} /> {formatTimeAgo(item.createdAt)}</span>
          </div>

          <div className={styles.description}>
            <h3>Description</h3>
            <p>{item.description}</p>
          </div>

          <div className={styles.giver}>
            <Avatar src={item.user?.avatar} name={item.user?.name || 'Unknown'} size="lg" />
            <div>
              <span className={styles.giverLabel}>Shared by</span>
              <span className={styles.giverName}>{item.user?.name || 'Anonymous'}</span>
            </div>
          </div>

          {isOwner ? (
            <div className={styles.ownerActions}>
              <select
                className={styles.statusSelect}
                value={item.status}
                onChange={e => onStatusChange(e.target.value)}
              >
                <option value="available">Available</option>
                <option value="pending">Pending Pickup</option>
                <option value="claimed">Claimed</option>
              </select>
              <Button variant="outline" onClick={onEdit}>
                <Edit size={16} /> Edit
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          ) : user ? (
            <Button size="lg" fullWidth onClick={onMessage}>
              <MessageCircle size={20} />
              Message {item.user?.name?.split(' ')[0] || 'Giver'}
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={onLogin}>
              Sign in to contact giver
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
