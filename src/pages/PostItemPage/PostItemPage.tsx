import { useState, FormEvent } from 'react';
import { ArrowLeft, ImagePlus, MapPin, Gift, X } from 'lucide-react';
import { Button } from '../../components';
import { useLocation } from '../../context/LocationContext';
import styles from './PostItemPage.module.css';

interface PostItemPageProps {
  onBack: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    condition: string;
    images: string[];
  }) => Promise<void>;
  onLocationChange: () => void;
}

export function PostItemPage({ onBack, onSubmit, onLocationChange }: PostItemPageProps) {
  const { location } = useLocation();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await onSubmit({
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        condition: formData.get('condition') as string,
        images,
      });
    } catch (err) {
      alert('Failed to post item: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={20} />
        Cancel
      </button>

      <div className={styles.container}>
        <h1 className={styles.title}>Share an Item</h1>
        <p className={styles.subtitle}>Help a neighbor by giving away something you no longer need</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title">What are you giving away?</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., Wooden Bookshelf"
              required
              minLength={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Tell us about the item, its dimensions, any defects, pickup instructions..."
              required
              minLength={10}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="category">Category</label>
              <select id="category" name="category" required>
                <option value="">Select category</option>
                <option value="furniture">Furniture</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="books">Books</option>
                <option value="kitchen">Kitchen</option>
                <option value="outdoor">Outdoor</option>
                <option value="kids">Kids</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="condition">Condition</label>
              <select id="condition" name="condition" required>
                <option value="">Select condition</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Images (optional)</label>
            <div
              className={styles.uploadArea}
              onClick={() => document.getElementById('images')?.click()}
            >
              <ImagePlus size={32} />
              <span>Click to add photos</span>
              <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageChange}
              />
            </div>
            {images.length > 0 && (
              <div className={styles.imagePreviews}>
                {images.map((img, i) => (
                  <div key={i} className={styles.imagePreview}>
                    <img src={img} alt={`Preview ${i + 1}`} />
                    <button type="button" onClick={() => removeImage(i)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Pickup Location</label>
            <div className={styles.locationDisplay}>
              <MapPin size={18} />
              <span>{location.city}, {location.zip}</span>
              <button type="button" className={styles.changeBtn} onClick={onLocationChange}>
                Change
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" fullWidth disabled={loading}>
            <Gift size={20} />
            {loading ? 'Posting...' : 'Post Item'}
          </Button>
        </form>
      </div>
    </main>
  );
}
