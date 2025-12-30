import { createContext, useContext, useState, ReactNode } from 'react';

interface Location {
  lat: number;
  lng: number;
  city: string;
  zip: string;
}

interface LocationContextType {
  location: Location;
  setLocation: (location: Location) => void;
}

//TODO: Get location from user's device
const defaultLocation: Location = {
  lat: 40.7128,
  lng: -74.0060,
  city: 'New York',
  zip: '10001',
};

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('freeshare_location');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultLocation;
  });

  const updateLocation = (newLocation: Location) => {
    setLocation(newLocation);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('freeshare_location', JSON.stringify(newLocation));
    }
  };

  return (
    <LocationContext.Provider value={{ location, setLocation: updateLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
}
