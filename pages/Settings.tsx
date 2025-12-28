import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Shield, Bell, Moon, Globe, Database, Lock, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
        navigate('/welcome');
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 z-10">
                <button onClick={() => navigate(-1)} className="text-gray-600">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Settings</h1>
            </header>

            <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="p-4 space-y-6">

                    <SettingsSection title="Account">
                        <div onClick={() => navigate('/edit-profile')}>
                            <SettingsItem icon={<User size={20} />} label="Account Information" />
                        </div>
                        <div onClick={() => navigate('/settings/privacy')}>
                            <SettingsItem icon={<Shield size={20} />} label="Privacy" />
                        </div>
                        <div onClick={() => navigate('/settings/security')}>
                            <SettingsItem icon={<Lock size={20} />} label="Security" />
                        </div>
                    </SettingsSection>

                    <SettingsSection title="Preferences">
                        <SettingsItem icon={<Bell size={20} />} label="Notifications" />
                        <div onClick={() => navigate('/settings/appearance')}>
                            <SettingsItem icon={<Moon size={20} />} label="Appearance" value="Light" />
                        </div>
                        <SettingsItem icon={<Globe size={20} />} label="Language" value="English" />
                    </SettingsSection>

                    <SettingsSection title="Data">
                        <SettingsItem icon={<Database size={20} />} label="Data Usage" />
                    </SettingsSection>

                    <button
                        onClick={handleLogout}
                        className="w-full bg-white p-4 rounded-2xl flex items-center gap-3 text-red-600 font-bold shadow-sm active:scale-[0.98] transition-all"
                    >
                        <LogOut size={20} />
                        Log Out
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        VoxSpace v1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
};

const SettingsSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">{title}</h3>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
            {children}
        </div>
    </div>
);

const SettingsItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => (
    <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
            <div className="text-gray-400">{icon}</div>
            <span className="font-medium text-gray-900">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-sm text-gray-400">{value}</span>}
            <ChevronRight size={18} className="text-gray-300" />
        </div>
    </button>
);

export default Settings;
