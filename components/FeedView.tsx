import React, { useState, useEffect } from 'react';
import { PenLine, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import PostCard from './PostCard';
import { Post } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const FeedView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
            id,
            content,
            media_url,
            created_at,
            likes_count,
            comments_count,
            reposts_count,
            user_id,
            profiles:user_id (
                full_name,
                username,
                avatar_url,
                is_verified
            )
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'following' && user) {
        // 1. Get list of followed user IDs
        const { data: followsData, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followsError) throw followsError;

        const followingIds = followsData.map(f => f.following_id);

        // If following no one, return empty
        if (followingIds.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // 2. Filter posts by these IDs
        query = query.in('user_id', followingIds);
      } else if (activeTab === 'following' && !user) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedPosts: Post[] = data.map((item: any) => ({
        id: item.id,
        author: {
          name: item.profiles?.full_name || 'Unknown',
          username: item.profiles?.username || 'user',
          avatar: item.profiles?.avatar_url || '',
          isVerified: item.profiles?.is_verified || false,
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
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [activeTab, user]); // Re-fetch when tab or user changes

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10 pt-2">
        <button
          onClick={() => setActiveTab('foryou')}
          className="flex-1 py-3 text-center relative"
        >
          <span className={cn("font-bold text-[15px]", activeTab === 'foryou' ? "text-gray-900" : "text-gray-500")}>
            For you
          </span>
          {activeTab === 'foryou' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#ff1744] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className="flex-1 py-3 text-center relative"
        >
          <span className={cn("font-bold text-[15px]", activeTab === 'following' ? "text-gray-900" : "text-gray-500")}>
            Following
          </span>
          {activeTab === 'following' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#ff1744] rounded-full" />
          )}
        </button>
      </div>

      {/* Quick Create (Mini) */}
      <div className="p-4 flex gap-3 border-b border-gray-50">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1">
          <input
            type="text"
            placeholder="What's happening?"
            className="w-full py-2 bg-transparent outline-none text-lg placeholder:text-gray-500"
          />
          <div className="flex items-center gap-4 mt-2 text-[#ff1744]">
            <ImageIcon size={20} />
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex py-12 justify-center">
            <Loader2 className="animate-spin text-gray-300" />
          </div>
        ) : (
          posts.length > 0 ? (
            posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              {activeTab === 'following'
                ? <p>You aren't following anyone yet or they haven't posted.</p>
                : <p>No posts yet. be the first!</p>
              }
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default FeedView;
