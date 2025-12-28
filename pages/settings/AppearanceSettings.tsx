import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Smartphone, Palette, Check } from 'lucide-react';

const AppearanceSettings: React.FC = () => {
    const navigate = useNavigate();
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
    const [color, setColor] = useState('#ff1744');

    const colors = ['#ff1744', '#2962ff', '#00c853', '#aa00ff', '#ff6d00'];

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                <button onClick={() => navigate(-1)} className="text-gray-600 p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Appearance</h1>
            </header>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-8">

                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Theme</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <ThemeCard
                            icon={<Sun size={24} />}
                            label="Light"
                            selected={theme === 'light'}
                            onClick={() => setTheme('light')}
                        />
                        <ThemeCard
                            icon={<Moon size={24} />}
                            label="Dark"
                            selected={theme === 'dark'}
                            onClick={() => setTheme('dark')}
                        />
                        <ThemeCard
                            icon={<Smartphone size={24} />}
                            label="System"
                            selected={theme === 'system'}
                            onClick={() => setTheme('system')}
                        />
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Accent Color</h3>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                style={{ backgroundColor: c }}
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
                            >
                                {color === c && <Check className="text-white" size={16} />}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                    <h4 className="font-bold text-gray-900 mb-1" style={{ color: color }}>Preview</h4>
                    <p className="text-xs text-gray-500">This is how your accent color looks.</p>
                    <button
                        className="mt-3 px-6 py-2 rounded-full text-white font-bold text-sm shadow-md"
                        style={{ backgroundColor: color }}
                    >
                        Button
                    </button>
                </div>

            </div>
        </div>
    );
};

const ThemeCard = ({ icon, label, selected, onClick }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${selected
                ? 'border-[#ff1744] bg-red-50 text-[#ff1744]'
                : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
    >
        {icon}
        <span className="font-bold text-sm">{label}</span>
    </button>
);

export default AppearanceSettings;
