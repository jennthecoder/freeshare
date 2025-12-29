import { Heart, MapPin } from 'lucide-react';
import { classNames, formatCondition, formatDistance, formatTimeAgo } from '../../lib/utils';
import type { Item } from '../../types';
import styles from './ItemCard.module.css';

interface ItemCardProps {
  item: Item;
  onClick: () => void;
  onSave?: () => void;
  showSaveButton?: boolean;
}

export function ItemCard({ item, onClick, onSave, showSaveButton = true }: ItemCardProps) {
  const image = item.images?.[0] || 'https://placehold.co/400x300/FBF8F4/9B9B9B?text=No+Image';

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.();
  };

  return (
    <article className={styles.card} onClick={onClick}>
      <div className={styles.imageWrapper}>
        <img src={image} alt={item.title} className={styles.image} loading="lazy" />
        <span className={classNames(styles.condition, styles[`condition_${item.condition}`])}>
          {formatCondition(item.condition)}
        </span>
        {showSaveButton && onSave && (
          <button
            className={classNames(styles.saveButton, item.isSaved && styles.saved)}
            onClick={handleSaveClick}
            aria-label={item.isSaved ? 'Unsave item' : 'Save item'}
          >
            <Heart size={18} fill={item.isSaved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{item.title}</h3>
        <div className={styles.meta}>
          <span className={styles.location}>
            <MapPin size={14} />
            {item.distance !== undefined ? formatDistance(item.distance) : item.city}
          </span>
          <span className={styles.time}>{formatTimeAgo(item.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
