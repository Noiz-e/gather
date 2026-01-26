import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Religion, RELIGIONS } from '../types';
import { religionThemes, ThemeColors } from '../themes';
import { storage } from '../utils/storage';

interface ThemeContextType {
  religion: Religion;
  setReligion: (religion: Religion) => void;
  theme: ThemeColors;
  religionInfo: typeof RELIGIONS[number];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default theme (modern gradient style)
const DEFAULT_RELIGION: Religion = 'default';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [religion, setReligionState] = useState<Religion>(DEFAULT_RELIGION);

  useEffect(() => {
    const savedReligion = storage.getCurrentReligion();
    if (savedReligion) {
      setReligionState(savedReligion);
    } else {
      // Set default religion if none saved
      storage.setCurrentReligion(DEFAULT_RELIGION);
    }
  }, []);

  const setReligion = (newReligion: Religion) => {
    setReligionState(newReligion);
    storage.setCurrentReligion(newReligion);
  };

  const theme = religionThemes[religion];
  const religionInfo = RELIGIONS.find((r) => r.id === religion) || RELIGIONS[0];

  return (
    <ThemeContext.Provider value={{ religion, setReligion, theme, religionInfo }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
