import { classNames } from '../../lib/utils';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={classNames(styles.avatar, styles[size], className)}>
      {src ? (
        <img src={src} alt={name} className={styles.image} />
      ) : (
        <span className={styles.initial}>{initial}</span>
      )}
    </div>
  );
}
