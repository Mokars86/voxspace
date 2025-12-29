import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Story } from '../types';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';

const StoryBar: React.FC = () => {
    const { user } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);
    const [myStories, setMyStories] = useState<Story[]>([]);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [openedStoryIndex, setOpenedStoryIndex] = useState(0);
    const [groupedStories, setGroupedStories] = useState<Record<string, Story[]>>({});

    useEffect(() => {
        fetchStories();
        // Optional: Poll for new stories every 30s
        const interval = setInterval(fetchStories, 30000);
        return () => clearInterval(interval);
    }, [user]); // Re-fetch if user changes

    const fetchStories = async () => {
        try {
            const { data, error } = await supabase
                .from('stories')
                .select(`
          *,
          user:user_id (
            username,
            avatar_url
          )
        `)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Supabase error:", error);
                throw error;
            }

            if (data) {
                // Separate my stories from others
                const mine = data.filter(s => s.user_id === user?.id);
                const others = data.filter(s => s.user_id !== user?.id);

                setMyStories(mine);

                // Group others by user_id
                const grouped: Record<string, Story[]> = {};
                others.forEach((s: any) => {
                    if (!grouped[s.user_id]) grouped[s.user_id] = [];
                    grouped[s.user_id].push(s);
                });
                setGroupedStories(grouped);
            }
        } catch (err) {
            console.error("Error fetching stories:", err);
        }
    };

    const openStory = (userId: string) => {
        const userStories = groupedStories[userId];
        if (userStories) {
            setStories(userStories);
            setOpenedStoryIndex(0);
            setViewerOpen(true);
        }
    };

    const handleMyStoryClick = () => {
        if (myStories.length > 0) {
            setStories(myStories);
            setOpenedStoryIndex(0);
            setViewerOpen(true);
        } else {
            setCreateModalOpen(true);
        }
    };

    return (
        <>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2 px-1 mb-2">
                {/* Create / My Story */}
                <div className="flex flex-col items-center gap-1 cursor-pointer min-w-[72px] relative group h-[90px]">
                    <div className="relative w-[68px] h-[68px]" onClick={handleMyStoryClick}>
                        <div className={`w-full h-full rounded-full p-[2px] ${myStories.length > 0 ? 'bg-gradient-to-tr from-[#ff1744] to-yellow-500' : 'border-2 border-gray-100 dark:border-gray-800 border-dashed'}`}>
                            <img
                                src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=Me`}
                                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-900"
                                alt="Me"
                            />
                        </div>
                    </div>

                    {/* Always visible Add Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setCreateModalOpen(true); }}
                        className="absolute bottom-[22px] right-0 bg-[#ff1744] text-white rounded-full p-1 border-2 border-white dark:border-gray-900 shadow-sm z-10 hover:scale-110 transition-transform"
                    >
                        <Plus size={14} strokeWidth={3} />
                    </button>

                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">My Story</span>
                </div>

                {/* Other Users Stories */}
                {Object.entries(groupedStories).map(([userId, userStories]) => {
                    const firstStory = userStories[0];
                    return (
                        <div key={userId} className="flex flex-col items-center gap-1 cursor-pointer min-w-[72px] h-[90px]" onClick={() => openStory(userId)}>
                            <div className="w-[68px] h-[68px] rounded-full p-[2px] bg-gradient-to-tr from-[#ff1744] to-yellow-500">
                                <img
                                    src={firstStory.user?.avatar_url || `https://ui-avatars.com/api/?name=${firstStory.user?.username}`}
                                    className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-900"
                                    alt={firstStory.user?.username}
                                />
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-full text-center truncate px-1">
                                {firstStory.user?.username}
                            </span>
                        </div>
                    );
                })}
            </div>

            {viewerOpen && (
                <StoryViewer
                    stories={stories}
                    initialIndex={openedStoryIndex}
                    onClose={() => setViewerOpen(false)}
                />
            )}

            {createModalOpen && (
                <CreateStoryModal
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={fetchStories}
                />
            )}
        </>
    );
};

export default StoryBar;
