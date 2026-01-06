import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { MyBagItem } from '../../types/mybag';
import { db } from '../../services/db';
import BagItemCard from '../../components/my-bag/BagItemCard';
import { ArrowLeft, Search, Plus, Settings, Lock, Unlock, Loader2, Grid as GridIcon, List as ListIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import AddNoteModal from '../../components/my-bag/AddNoteModal';
import BagSettingsModal from '../../components/my-bag/BagSettingsModal';

const MyBag: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLocked, setIsLocked] = useState(true); // Default to locked
    const [pin, setPin] = useState('');
    const [showAddNote, setShowAddNote] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [items, setItems] = useState<MyBagItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'messages' | 'media' | 'files' | 'notes' | 'links'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Mock PIN - In reality, fetch hashed PIN from secure storage or require App Auth
    const USER_PIN = '1234';

    useEffect(() => {
        if (!isLocked && user) {
            fetchItems();
        }
    }, [isLocked, user]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            // 1. Try Local DB first (Offline support)
            const localItems = await db.my_bag.toArray();
            if (localItems.length > 0) {
                setItems(localItems);
            }

            // 2. Fetch from Supabase (Sync)
            const { data, error } = await supabase
                .from('my_bag_items')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                // Don't throw if just no table yet - handle gracefully during dev
                console.warn("Error fetching bag items (table might not exist yet):", error);
            } else if (data) {
                setItems(data as MyBagItem[]);
                // Sync to local
                await db.my_bag.bulkPut(data as MyBagItem[]);
            }
        } catch (e) {
            console.error("Fetch error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === USER_PIN) {
            setIsLocked(false);
        } else {
            alert("Incorrect PIN (Default is 1234)");
            setPin('');
        }
    };

    const handleItemClick = (item: MyBagItem) => {
        if (item.type === 'link') {
            window.open(item.content, '_blank');
        } else if (item.type === 'image' || item.type === 'video') {
            // Show media viewer (simplified alert for now)
            alert(`Opening ${item.type}: ${item.title}`);
        } else {
            alert(item.content);
        }
    };

    const filteredItems = items.filter(item => {
        if (filter !== 'all' && item.category !== filter && item.type !== filter) return false; // Simple mapping
        if (searchQuery && !item.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !item.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    if (isLocked) {
        return (
            <div className="h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
                <Lock size={48} className="mb-4 text-[#ff1744]" />
                <h2 className="text-2xl font-bold mb-2">My Bag Locked</h2>
                <p className="text-gray-400 mb-6 text-center">Enter your PIN to access your private storage.</p>
                <form onSubmit={handleUnlock} className="flex flex-col gap-4 w-full max-w-xs">
                    <input
                        type="password"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        placeholder="Enter PIN"
                        className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center text-2xl tracking-widest outline-none focus:border-[#ff1744]"
                        maxLength={4}
                        autoFocus
                    />
                    <button type="submit" className="bg-[#ff1744] font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">
                        Unlock
                    </button>
                    <button type="button" onClick={() => navigate(-1)} className="text-gray-500 text-sm">Cancel</button>
                </form>
            </div>
        );
    }

    // Standard rendering
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10 transition-all">
                {showSearch ? (
                    <div className="flex items-center gap-3 w-full animate-in slide-in-from-right-10 duration-200">
                        <div className="flex-1 relative">
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search items..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[#ff1744]/50 dark:text-white"
                            />
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800">
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/profile')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-gray-200">
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                My Bag <Lock size={14} className="text-[#ff1744]" />
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowSearch(true)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-gray-400"
                            >
                                <Search size={20} />
                            </button>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-gray-400"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </>
                )}
            </header>

            {/* Filter Tabs */}
            <div className="overflow-x-auto whitespace-nowrap px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
                {(['all', 'messages', 'media', 'files', 'notes', 'links'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium mr-2 transition-colors",
                            filter === f
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        )}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && items.length === 0 ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#ff1744]" /></div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {filteredItems.map(item => (
                            <BagItemCard
                                key={item.id}
                                item={item}
                                onPress={handleItemClick}
                                onLongPress={(i) => confirm("Delete?")}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Lock size={48} className="mb-4 opacity-20" />
                        <p>Your bag is empty.</p>
                        <p className="text-sm">Save items here for private keeping.</p>
                    </div>
                )}
            </div>

            <button
                onClick={() => setShowAddNote(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-[#ff1744] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
            >
                <Plus size={28} />
            </button>

            <AddNoteModal
                isOpen={showAddNote}
                onClose={() => setShowAddNote(false)}
                onSave={async (title, content) => {
                    if (!user) return;
                    const newItem: any = {
                        user_id: user.id,
                        type: 'note',
                        content: content,
                        title: title,
                        created_at: new Date().toISOString(),
                        category: 'notes',
                        is_locked: false
                    };

                    // Offline First
                    await db.my_bag.add({ ...newItem, id: `local-${Date.now()}` });
                    setItems(prev => [newItem, ...prev]);

                    // Sync
                    supabase.from('my_bag_items').insert(newItem).then(({ error }) => {
                        if (error) console.error("Sync error", error);
                    });
                }}
            />

            <BagSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onLock={() => {
                    setIsLocked(true);
                    setPin('');
                    setShowSettings(false);
                }}
            />
        </div>
    );
};



export default MyBag;
