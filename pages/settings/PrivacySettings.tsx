import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, Shield, Users } from 'lucide-react';

const PrivacySettings: React.FC = () => {
    const navigate = useNavigate();
    const [privateProfile, setPrivateProfile] = useState(false);
    const [readReceipts, setReadReceipts] = useState(true);
    const [onlineStatus, setOnlineStatus] = useState(true);

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                <button onClick={() => navigate(-1)} className="text-gray-600 p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Privacy</h1>
            </header>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-6">

                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Discoverability</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                        <ToggleItem
                            icon={<Lock size={20} />}
                            label="Private Profile"
                            description="Only followers can see your posts and info"
                            checked={privateProfile}
                            onChange={setPrivateProfile}
                        />
                        <ToggleItem
                            icon={<Eye size={20} />}
                            label="Online Status"
                            description="Let others see when you're online"
                            checked={onlineStatus}
                            onChange={setOnlineStatus}
                        />
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Messaging</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                        <ToggleItem
                            icon={<Shield size={20} />}
                            label="Read Receipts"
                            description="Show when you've viewed messages"
                            checked={readReceipts}
                            onChange={setReadReceipts}
                        />
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Connections</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="text-gray-400"><Users size={20} /></div>
                                <div>
                                    <span className="font-medium text-gray-900 block">Blocked Users</span>
                                    <span className="text-xs text-gray-400">Manage accounts you've blocked</span>
                                </div>
                            </div>
                            <div className="text-gray-300">→</div>
                        </button>
                    </div>
                </section>

            </div>
        </div>
    );
};

interface ToggleItemProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleItem: React.FC<ToggleItemProps> = ({ icon, label, description, checked, onChange }) => (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
            <div className="text-gray-400">{icon}</div>
            <div>
                <span className="font-medium text-gray-900 block">{label}</span>
                <span className="text-xs text-gray-400">{description}</span>
            </div>
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#ff1744]' : 'bg-gray-200'}`}
        >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-7' : 'left-1'}`} />
        </button>
    </div>
);

export default PrivacySettings;
