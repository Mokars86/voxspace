import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, Mic, Globe, Share2, MoreVertical, Loader2, Camera, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const SpaceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Missing state restored
    const [space, setSpace] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isMember, setIsMember] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);

    // Handlers
    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert("Space link copied to clipboard!");
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDelete = async () => {
        if (!space || !user) return;
        if (!window.confirm("Are you sure you want to delete this space? This cannot be undone.")) return;

        try {
            const { error } = await supabase.from('spaces').delete().eq('id', space.id);
            if (error) throw error;
            navigate('/spaces');
        } catch (error: any) {
            console.error("Error deleting space:", error);
            alert("Failed to delete space: " + error.message);
        }
    };

    useEffect(() => {
        const fetchSpace = async () => {
            if (!id) return;
            try {
                // Fetch Space Details
                const { data, error } = await supabase
                    .from('spaces')
                    .select('*, owner:owner_id(full_name, avatar_url)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setSpace(data);

                // Check Membership if user is logged in
                if (user) {
                    const { data: memberData } = await supabase
                        .from('space_members')
                        .select('user_id')
                        .eq('space_id', id)
                        .eq('user_id', user.id)
                        .single();

                    setIsMember(!!memberData);
                }

            } catch (error) {
                console.error("Error fetching space:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSpace();
    }, [id, user]);

    const handleJoinLeave = async () => {
        if (!user || !space) return;
        setJoinLoading(true);
        try {
            if (isMember) {
                // Leave Space
                const { error } = await supabase
                    .from('space_members')
                    .delete()
                    .eq('space_id', id)
                    .eq('user_id', user.id);
                if (error) throw error;
                setIsMember(false);
                setSpace(prev => ({ ...prev, members_count: Math.max(0, prev.members_count - 1) }));
            } else {
                // Join Space
                const { error } = await supabase
                    .from('space_members')
                    .insert({ space_id: id, user_id: user.id });
                if (error) throw error;
                setIsMember(true);
                setSpace(prev => ({ ...prev, members_count: prev.members_count + 1 }));
            }
        } catch (error) {
            console.error("Error joining/leaving space:", error);
            alert("Action failed. Please try again.");
        } finally {
            setJoinLoading(false);
        }
    };

    const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // ... (existing implementation)
        try {
            if (!event.target.files || event.target.files.length === 0 || !space) return;
            setUploading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `space-banner-${space.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;
            const { error: uploadError } = await supabase.storage.from('VoxSpace_App').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('VoxSpace_App').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;
            const { error: updateError } = await supabase.from('spaces').update({ banner_url: publicUrl }).eq('id', space.id);
            if (updateError) throw updateError;
            setSpace({ ...space, banner_url: publicUrl });
        } catch (error: any) {
            console.error('Error uploading banner:', error);
            alert('Failed to upload banner: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <Loader2 className="animate-spin text-[#ff1744]" size={32} />
            </div>
        );
    }

    if (!space) return <div>Space not found</div>;

    const isOwner = user?.id === space.owner_id;

    return (
        <div className="flex flex-col h-screen bg-white relative">
            {/* Header Image */}
            <div className="h-64 relative group">
                <img
                    src={space.banner_url || "https://source.unsplash.com/random/800x600/?abstract"}
                    alt={space.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

                {/* Navbar over image */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-black/40">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex gap-2">
                        <button onClick={handleShare} className="p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-black/40">
                            <Share2 size={24} />
                        </button>
                        {isOwner && (
                            <button onClick={handleDelete} className="p-2 bg-red-500/80 backdrop-blur-md rounded-full hover:bg-red-600">
                                <Trash2 size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Edit Banner Button (Owner Only) */}
                {isOwner && (
                    <div className="absolute top-16 right-4 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 flex items-center gap-2 px-4 shadow-lg border border-white/20"
                            disabled={uploading}
                        >
                            {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                            <span className="text-sm font-bold">Edit Cover</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleBannerUpload}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                )}

                {/* Space Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h1 className="text-3xl font-bold mb-2 shadow-sm drop-shadow-md">{space.name}</h1>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-1">
                            <Globe size={16} />
                            <span>Public Group</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Users size={16} />
                            <span>{space.members_count || 1} members</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-t-3xl -mt-6 relative z-10 px-4 pt-8 pb-32">
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                    <h3 className="text-lg font-bold mb-2">About</h3>
                    <p className="text-gray-600 leading-relaxed">
                        {space.description || "No description provided."}
                    </p>

                    <div className="flex items-center gap-3 mt-6 pt-4 border-t">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                            {/* Owner Avatar */}
                            {space.owner?.avatar_url && <img src={space.owner.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Created by</p>
                            <p className="font-semibold text-gray-900">{space.owner?.full_name || "Unknown"}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-20">
                    <button
                        onClick={() => {
                            if (!isMember) {
                                alert("Join the space first!");
                                return;
                            }
                            navigate(`/space/${id}/chat`);
                        }}
                        className="p-4 bg-white rounded-2xl shadow-sm flex flex-col items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <MessageSquare size={24} />
                        </div>
                        <span className="font-bold text-gray-800">Chat Room</span>
                    </button>
                    <button className="p-4 bg-white rounded-2xl shadow-sm flex flex-col items-center gap-3 hover:bg-gray-50 transition-colors">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                            <Mic size={24} />
                        </div>
                        <span className="font-bold text-gray-800">Live Stage</span>
                    </button>
                </div>
            </div>

            {/* Join Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
                {isOwner ? (
                    <button className="w-full py-4 bg-gray-100 text-gray-400 font-bold rounded-2xl text-lg cursor-not-allowed">
                        You own this space
                    </button>
                ) : (
                    <button
                        onClick={handleJoinLeave}
                        disabled={joinLoading}
                        className={cn(
                            "w-full py-4 font-bold rounded-2xl text-lg shadow-lg transition-transform active:scale-95",
                            isMember
                                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                : "bg-[#ff1744] text-white shadow-red-200"
                        )}
                    >
                        {joinLoading ? <Loader2 className="animate-spin inline mr-2" /> : null}
                        {isMember ? "Leave Space" : "Join Space"}
                    </button>
                )}
            </div>
        </div>
    );
};
export default SpaceDetail;
