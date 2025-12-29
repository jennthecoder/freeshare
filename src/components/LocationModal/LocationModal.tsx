import { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (city: string, zip: string) => void;
    initialCity?: string;
    initialZip?: string;
}

export function LocationModal({
    isOpen,
    onClose,
    onSubmit,
    initialCity = '',
    initialZip = ''
}: LocationModalProps) {
    const [city, setCity] = useState(initialCity);
    const [zip, setZip] = useState(initialZip);

    useEffect(() => {
        if (isOpen) {
            setCity(initialCity);
            setZip(initialZip);
        }
    }, [isOpen, initialCity, initialZip]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (city.trim() && zip.trim()) {
            onSubmit(city.trim(), zip.trim());
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Set Location">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New York"
                    required
                />
                <Input
                    label="ZIP Code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="e.g. 10001"
                    required
                />
                <Button type="submit" fullWidth>
                    Save Location
                </Button>
            </form>
        </Modal>
    );
}
