import React, { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'dark' | 'light';

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultMode?: Mode;
    storageKey?: string;
}

interface ThemeProviderState {
    mode: Mode;
    setMode: (mode: Mode) => void;
}

const initialState: ThemeProviderState = {
    mode: 'light',
    setMode: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultMode = 'light',
    storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
    const [mode, setMode] = useState<Mode>(() => {
        const stored = localStorage.getItem(`${storageKey}-mode`);
        return (stored === 'dark' || stored === 'light') ? stored : defaultMode;
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old classes
        root.classList.remove('light', 'dark');

        // Add Mode
        root.classList.add(mode);
    }, [mode]);

    const value = React.useMemo(() => ({
        mode,
        setMode: (m: Mode) => {
            localStorage.setItem(`${storageKey}-mode`, m);
            setMode(m);
        }
    }), [mode, storageKey]);

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
