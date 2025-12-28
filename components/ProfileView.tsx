import React, { useState, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Settings, Grid, Image, Heart, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import PostCard from './PostCard';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

interface ProfileData {
  full_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  website: string;
  is_verified: boolean;
  created_at: string;
}

const ProfileView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'likes'>('posts');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If no profile exists, profileData is null.
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        setProfile(profileData);

        // Fetch User Posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const formattedPosts: Post[] = postsData.map((item: any) => ({
          id: item.id,
          author: {
            name: profileData?.full_name || 'User',
            username: profileData?.username || 'user',
            avatar: profileData?.avatar_url,
            isVerified: profileData?.is_verified,
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
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>;
  }

  // Default mock data if profile is technically "empty" / null from DB
  // but usually triggered creation happens on signup
  const displayProfile = profile || {
    full_name: user?.user_metadata?.full_name || 'New User',
    username: 'newuser',
    avatar_url: '',
    bio: 'Ready to set up your profile!',
    website: '',
    is_verified: false,
    created_at: new Date().toISOString()
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header/Cover */}
      <div className="h-32 bg-gradient-to-r from-pink-500 to-orange-500 relative">
        <button onClick={() => navigate('/settings')} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white backdrop-blur-sm hover:bg-black/30 transition-colors">
          <Settings size={20} />
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 relative">
        <div className="flex justify-between items-end -mt-10 mb-4">
          <img
            src={displayProfile.avatar_url || `https://ui-avatars.com/api/?name=${displayProfile.full_name || 'User'}&background=random`}
            alt="Profile"
            className="w-20 h-20 rounded-full border-4 border-white object-cover"
          />
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-1.5 border border-gray-300 rounded-full font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayProfile.full_name}</h1>
          <p className="text-gray-500 text-sm mb-3">@{displayProfile.username}</p>
          <p className="text-gray-900 mb-3 whitespace-pre-wrap">
            {displayProfile.bio || "No bio yet."}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              Joined {new Date(displayProfile.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="flex gap-4 text-sm mb-4">
            <div>
              <span className="font-bold text-gray-900">0</span>{' '}
              <span className="text-gray-500">Following</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">0</span>{' '}
              <span className="text-gray-500">Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => setActiveTab('posts')} className="flex-1 py-3 relative hover:bg-gray-50 transition-colors">
          <div className="flex justify-center items-center gap-2 text-gray-600">
            <Grid size={20} className={activeTab === 'posts' ? "text-gray-900" : ""} />
          </div>
          {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#ff1744] rounded-full" />}
        </button>
        <button onClick={() => setActiveTab('media')} className="flex-1 py-3 relative hover:bg-gray-50 transition-colors">
          <div className="flex justify-center items-center gap-2 text-gray-600">
            <Image size={20} className={activeTab === 'media' ? "text-gray-900" : ""} />
          </div>
          {activeTab === 'media' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#ff1744] rounded-full" />}
        </button>
        <button onClick={() => setActiveTab('likes')} className="flex-1 py-3 relative hover:bg-gray-50 transition-colors">
          <div className="flex justify-center items-center gap-2 text-gray-600">
            <Heart size={20} className={activeTab === 'likes' ? "text-gray-900" : ""} />
          </div>
          {activeTab === 'likes' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#ff1744] rounded-full" />}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'posts' && (
          <div>
            {posts.length > 0 ? (
              posts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="p-8 text-center text-gray-400">No posts yet</div>
            )}
          </div>
        )}
        {activeTab === 'media' && (
          <div className="p-8 text-center text-gray-400">
            No media
          </div>
        )}
        {activeTab === 'likes' && (
          <div className="p-8 text-center text-gray-400">
            No liked posts yet
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
