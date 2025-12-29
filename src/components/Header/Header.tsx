import { MapPin, ChevronDown, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { classNames } from '../../lib/utils';
import styles from './Header.module.css';

interface HeaderProps {
  onLocationClick: () => void;
  onSavedClick: () => void;
  onMessagesClick: () => void;
  onProfileClick: () => void;
  onLoginClick: () => void;
  onLogoClick: () => void;
  activeNav?: 'saved' | 'messages' | 'profile';
  unreadCount?: number;
}

export function Header({
  onLocationClick,
  onSavedClick,
  onMessagesClick,
  onProfileClick,
  onLoginClick,
  onLogoClick,
  activeNav,
  unreadCount = 0,
}: HeaderProps) {
  const { user } = useAuth();
  const { location } = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <button className={styles.logo} onClick={onLogoClick}>
          <span className={styles.logoText}>FreeShare</span>
        </button>

        <button className={styles.location} onClick={onLocationClick}>
          <MapPin size={16} />
          <span>{location.city || 'Set Location'}</span>
          <ChevronDown size={14} />
        </button>

        <nav className={styles.nav}>
          {user ? (
            <>
              <button
                className={classNames(styles.navBtn, activeNav === 'saved' && styles.active)}
                onClick={onSavedClick}
                aria-label="Saved items"
              >
                <Heart size={20} />
              </button>
              <button
                className={classNames(styles.navBtn, activeNav === 'messages' && styles.active)}
                onClick={onMessagesClick}
                aria-label="Messages"
              >
                <MessageCircle size={20} />
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
              </button>
              <button
                className={classNames(styles.navBtn, styles.avatarBtn)}
                onClick={onProfileClick}
                aria-label="Profile"
              >
                <Avatar src={user.avatar} name={user.name} size="sm" />
              </button>
            </>
          ) : (
            <Button onClick={onLoginClick}>Sign In</Button>
          )}
        </nav>
      </div>
    </header>
  );
}
