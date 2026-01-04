import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const AppearanceSettings: React.FC = () => {
    const navigate = useNavigate();
    const { mode, setMode } = useTheme();

    return (
        <div className="flex flex-col h-screen bg-transparent transition-colors duration-300">
            <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <button onClick={() => navigate(-1)} className="text-muted-foreground p-2 hover:bg-muted rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Appearance</h1>
            </header>

            <div className="flex-1 p-4 flex flex-col gap-8 overflow-y-auto">
                {/* Mode Selection */}
                <section>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 ml-1">Theme Mode</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <ThemeCard
                            icon={<Sun size={24} />}
                            label="Light Mode"
                            selected={mode === 'light'}
                            onClick={() => setMode('light')}
                            colorClass="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                        <ThemeCard
                            icon={<Moon size={24} />}
                            label="Dark Mode"
                            selected={mode === 'dark'}
                            onClick={() => setMode('dark')}
                            colorClass="bg-gray-900 text-white"
                        />
                    </div>
                </section>
            </div>
        </div>
    );
};

const ThemeCard = ({ icon, label, selected, onClick, colorClass }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${selected
            ? 'border-primary ring-2 ring-primary/20 scale-[1.02]'
            : 'border-transparent hover:bg-muted/50'
            } ${colorClass}`}
    >
        {icon}
        <span className="font-bold text-sm">{label}</span>
    </button>
);

export default AppearanceSettings;
