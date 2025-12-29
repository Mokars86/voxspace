import React, { useState } from 'react';
import {
    MessageCircle,
    Rss,
    Users,
    Search,
    User,
    Plus,
    Wallet,
    Bell,
    X,
    Zap
} from 'lucide-react';
import { TabType } from '../types';
import FeedView from '../components/FeedView';
import ChatView from '../components/ChatView';
import SpacesView from '../components/SpacesView';
import DiscoverView from '../components/DiscoverView';
import ProfileView from '../components/ProfileView';
import WalletView from '../components/WalletView';
import CreateModal from '../components/CreateModal';

const MainApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('feed');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'feed': return <FeedView />;
            case 'chats': return <ChatView />;
            case 'spaces': return <SpacesView />;
            case 'discover': return <DiscoverView />;
            case 'profile': return <ProfileView />;
            case 'wallet': return <WalletView />;
            default: return <FeedView />;
        }
    };

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-white dark:bg-gray-900 shadow-xl relative overflow-hidden border-x border-gray-100 dark:border-gray-800">
            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10 w-full">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#ff1744] rounded-full flex items-center justify-center shadow-sm">
                        <Zap size={16} className="text-white fill-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tighter">
                        <span className="text-black dark:text-white">Vox</span><span className="text-[#ff1744]">Space</span>
                    </h1>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setActiveTab('wallet')}
                        className={`p-1.5 rounded-full transition-colors ${activeTab === 'wallet' ? 'bg-red-50 dark:bg-red-900/20 text-[#ff1744]' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                        <Wallet size={22} />
                    </button>
                    <button
                        onClick={() => setShowNotifications(true)}
                        className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 relative"
                    >
                        <Bell size={22} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff1744] rounded-full"></span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 w-full">
                {renderContent()}
            </main>

            {/* FAB */}
            <button
                onClick={() => setShowCreateModal(true)}
                className="fixed bottom-20 right-4 w-14 h-14 bg-[#ff1744] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-20"
            >
                <Plus size={30} strokeWidth={3} />
            </button>

            {/* Navigation */}
            <nav className="flex items-center justify-around py-3 border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md safe-bottom sticky bottom-0 z-10 w-full">
                <NavButton active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} icon={<MessageCircle size={24} />} label="Chats" />
                <NavButton active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} icon={<Rss size={24} />} label="Feed" />
                <NavButton active={activeTab === 'spaces'} onClick={() => setActiveTab('spaces')} icon={<Users size={24} />} label="Spaces" />
                <NavButton active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} icon={<Search size={24} />} label="Discover" />
                <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={24} />} label="Profile" />
            </nav>

            {/* Modals & Overlays */}
            {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} />}
            {showNotifications && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="text-xl font-bold">Notifications</h2>
                        <button onClick={() => setShowNotifications(false)}><X /></button>
                    </div>
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex space-x-3 items-start border-b border-gray-50 pb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[#ff1744]">
                                    <Bell size={18} />
                                </div>
                                <div>
                                    <p className="text-sm"><span className="font-bold">Alex Johnson</span> liked your post about AI discovery.</p>
                                    <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center transition-all ${active ? 'text-[#ff1744]' : 'text-gray-400 hover:text-gray-600'}`}
    >
        {icon}
        <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
);

export default MainApp;
