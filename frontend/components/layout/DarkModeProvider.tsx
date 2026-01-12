'use client';

import React, { createContext, useContext } from 'react';

interface DarkModeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

// Dark mode is disabled - always use light theme
export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // No-op functions since dark mode is disabled
  const toggleDarkMode = () => {};
  const setDarkMode = () => {};

  return (
    <DarkModeContext.Provider value={{ isDark: false, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};
