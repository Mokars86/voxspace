import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageSquare, Calendar, MapPin, Link as LinkIcon, Loader2 } from 'lucide-react';
import PostCard from '../components/PostCard';
import { Post } from '../types';

interface ProfileData {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    bio: string;
    website: string;
    created_at: string;
}

const UserProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [messingLoading, setMessagingLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Fetch Profile
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProfile(data);

                // Fetch Posts
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('user_id', id)
                    .order('created_at', { ascending: false });

                if (postsError) throw postsError;

                const formattedPosts: Post[] = postsData.map((item: any) => ({
                    id: item.id,
                    author: {
                        name: data.full_name,
                        username: data.username,
                        avatar: data.avatar_url,
                        isVerified: false,
                    },
                    content: item.content,
                    timestamp: new Date(item.created_at).toLocaleDateString(),
                    likes: item.likes_count || 0,
                    comments: item.comments_count || 0,
                    reposts: item.reposts_count || 0,
                    media: item.media_url
                }));
                setPosts(formattedPosts);

            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    const handleMessage = async () => {
        if (!currentUser || !id) return;
        setMessagingLoading(true);
        try {
            // Check if conversation exists (Simplified: just create new for now)

            // Use RPC to safely create chat on server side
            const { data: chatId, error: rpcError } = await supabase
                .rpc('create_direct_chat', { other_user_id: id });

            if (rpcError) throw rpcError;

            navigate(`/chat/${chatId}`);

        } catch (error: any) {
            console.error("Error starting chat:", error);
            alert(`Could not start chat: ${error.message || JSON.stringify(error)}`);
        } finally {
            setMessagingLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>;
    if (!profile) return <div>User not found</div>;

    const isOwnProfile = currentUser?.id === profile.id;

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 relative">
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 bg-black/20 rounded-full text-white backdrop-blur-sm hover:bg-black/30 transition-colors">
                    <ArrowLeft size={20} />
                </button>
            </div>

            <div className="px-4 pb-4 relative">
                <div className="flex justify-between items-end -mt-10 mb-4">
                    <img
                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=random`}
                        alt="Profile"
                        className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-sm bg-white"
                    />
                    {isOwnProfile ? (
                        <button onClick={() => navigate('/edit-profile')} className="px-4 py-1.5 border border-gray-300 rounded-full font-bold text-sm hover:bg-gray-50">
                            Edit Profile
                        </button>
                    ) : (
                        <button
                            onClick={handleMessage}
                            disabled={messingLoading}
                            className="px-4 py-1.5 bg-[#ff1744] text-white rounded-full font-bold text-sm hover:bg-red-600 flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                        >
                            {messingLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                            Message
                        </button>
                    )}
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
                    <p className="text-gray-500 text-sm mb-3">@{profile.username}</p>
                    <p className="text-gray-900 mb-3 whitespace-pre-wrap">{profile.bio || "No bio yet."}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1"><Calendar size={16} /> Joined {new Date(profile.created_at).toLocaleDateString()}</div>
                        {profile.website && (
                            <div className="flex items-center gap-1"><LinkIcon size={16} /> <a href={profile.website} target="_blank" className="text-[#ff1744]">{new URL(profile.website).hostname}</a></div>
                        )}
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100">
                {posts.map(post => <PostCard key={post.id} post={post} />)}
                {posts.length === 0 && <div className="p-8 text-center text-gray-400">No posts yet</div>}
            </div>
        </div>
    );
};

export default UserProfile;
