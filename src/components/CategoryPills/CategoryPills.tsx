import { 
  LayoutGrid, Sofa, Smartphone, Shirt, BookOpen, 
  UtensilsCrossed, Tent, Baby, Box 
} from 'lucide-react';
import { classNames } from '../../lib/utils';
import styles from './CategoryPills.module.css';

const categories = [
  { id: '', label: 'All', icon: LayoutGrid },
  { id: 'furniture', label: 'Furniture', icon: Sofa },
  { id: 'electronics', label: 'Electronics', icon: Smartphone },
  { id: 'clothing', label: 'Clothing', icon: Shirt },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { id: 'outdoor', label: 'Outdoor', icon: Tent },
  { id: 'kids', label: 'Kids', icon: Baby },
  { id: 'other', label: 'Other', icon: Box },
];

interface CategoryPillsProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryPills({ selected, onSelect }: CategoryPillsProps) {
  return (
    <div className={styles.container}>
      {categories.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={classNames(styles.pill, selected === id && styles.active)}
          onClick={() => onSelect(id)}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
