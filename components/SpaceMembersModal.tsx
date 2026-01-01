import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Shield, User } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import ImageViewer from './ImageViewer';

interface SpaceMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    spaceId: string;
    isOwner: boolean;
}

const SpaceMembersModal: React.FC<SpaceMembersModalProps> = ({ isOpen, onClose, spaceId, isOwner }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen, spaceId]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('space_members')
                .select(`
                    joined_at,
                    profiles:user_id (
                        id,
                        full_name,
                        username,
                        avatar_url,
                        is_verified
                    )
                `)
                .eq('space_id', spaceId)
                .order('joined_at', { ascending: false });

            if (error) throw error;

            // Flatten the structure for easier usage
            const formatted = data.map((item: any) => ({
                ...item.profiles,
                joined_at: item.joined_at
            }));

            setMembers(formatted);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;

        try {
            const { error } = await supabase
                .from('space_members')
                .delete()
                .eq('space_id', spaceId)
                .eq('user_id', memberId);

            if (error) throw error;

            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (error) {
            console.error("Error removing member:", error);
            alert("Failed to remove member.");
        }
    };

    const filteredMembers = members.filter(member =>
        member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg dark:text-white">Space Members</h3>
                        <p className="text-xs text-gray-500">{members.length} members</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-1 focus:ring-[#ff1744] text-sm dark:text-white"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : filteredMembers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setPreviewImage(member.avatar_url)}
                                            disabled={!member.avatar_url}
                                            className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden transition-transform hover:scale-105 ${member.avatar_url ? 'cursor-pointer ring-2 ring-transparent hover:ring-[#ff1744]' : ''}`}
                                        >
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                                    {member.username?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{member.full_name}</span>
                                                {/* If we had owner ID passed in details, we could show a badge */}
                                            </div>
                                            <span className="text-xs text-gray-500">@{member.username}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {isOwner && member.id !== user?.id && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove member"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No members found.
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Preview */}
            <ImageViewer
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                src={previewImage || ''}
            />
        </div>
    );
};

export default SpaceMembersModal;
