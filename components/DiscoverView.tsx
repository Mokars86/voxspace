import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Hash, Music, Play, Users, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const DiscoverView: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Data States
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [popularSpaces, setPopularSpaces] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<{ users: any[], spaces: any[] }>({ users: [], spaces: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Initial Fetch (Trending)
  useEffect(() => {
    const fetchDiscoverData = async () => {
      setLoading(true);
      try {
        // Fetch Popular Posts (Trend proxy)
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('*, user:user_id(username, full_name, avatar_url)')
          .order('likes_count', { ascending: false })
          .limit(5);

        if (posts) setTrendingPosts(posts);

        // Fetch Popular Spaces
        const { data: spaces, error: spacesError } = await supabase
          .from('spaces')
          .select('*')
          .order('members_count', { ascending: false })
          .limit(5);

        if (spaces) setPopularSpaces(spaces);

      } catch (error) {
        console.error("Error fetching discover data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscoverData();
  }, []);

  // Search Handler
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        try {
          // Search Users
          const { data: users } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${searchTerm}%`)
            .limit(5);

          // Search Spaces
          const { data: spaces } = await supabase
            .from('spaces')
            .select('*')
            .ilike('name', `%${searchTerm}%`)
            .limit(5);

          setSearchResults({
            users: users || [],
            spaces: spaces || []
          });
        } catch (error) {
          console.error("Search error", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults({ users: [], spaces: [] });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 sticky top-0 bg-white z-10 border-b border-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search people, spaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl border-none focus:ring-2 focus:ring-[#ff1744]/20 focus:bg-white outline-none font-medium transition-all"
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={18} />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">

        {/* Search Results Mode */}
        {searchTerm.length > 0 && (
          <div className="p-4 space-y-6">
            {searchResults.users.length > 0 && (
              <section>
                <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs tracking-wider">People</h3>
                <div className="space-y-3">
                  {searchResults.users.map(user => (
                    <div key={user.id} onClick={() => navigate(`/user/${user.id}`)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold">
                            {user.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {searchResults.spaces.length > 0 && (
              <section>
                <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs tracking-wider">Spaces</h3>
                <div className="space-y-3">
                  {searchResults.spaces.map(space => (
                    <div
                      key={space.id}
                      onClick={() => navigate(`/space/${space.id}`)}
                      className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-xl"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden">
                        <img src={space.banner_url || "https://source.unsplash.com/random"} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{space.name}</p>
                        <p className="text-xs text-gray-500">{space.members_count} members</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {searchResults.users.length === 0 && searchResults.spaces.length === 0 && !isSearching && (
              <div className="text-center text-gray-400 py-10">
                No results found for "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* Discovery Mode (No Search) */}
        {searchTerm.length === 0 && (
          <>
            {/* Categories */}
            <div className="bg-white border-b border-gray-100">
              <div className="flex overflow-x-auto hide-scrollbar p-4 gap-3">
                {['For you', 'Trending', 'News', 'Sports', 'Entertainment', 'Tech'].map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${i === 0 ? 'bg-[#ff1744] text-white' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Posts */}
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <TrendingUp className="text-[#ff1744]" size={20} />
                Trending Posts
              </h3>
              {trendingPosts.length > 0 ? trendingPosts.map((post, index) => (
                <div key={post.id} className="flex justify-between items-start py-4 border-b border-gray-50 last:border-0">
                  <div className="flex gap-3">
                    <div className="text-lg font-bold text-gray-300 w-6">{index + 1}</div>
                    <div>
                      <p className="font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{post.content}</p>
                      <p className="text-xs text-gray-500">
                        Posted by <span className="text-gray-900 font-medium">@{post.user?.username || 'user'}</span> · {post.likes_count} likes
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-gray-400 text-sm py-4">No trending posts yet.</div>
              )}
            </div>

            {/* Popular Spaces */}
            <div className="p-4">
              <h3 className="font-bold text-xl mb-4">Popular Communities</h3>
              <div className="flex overflow-x-auto hide-scrollbar gap-3 -mx-4 px-4 pb-4">
                {popularSpaces.map(space => (
                  <div
                    key={space.id}
                    onClick={() => navigate(`/space/${space.id}`)}
                    className="relative w-40 aspect-[3/4] flex-shrink-0 rounded-2xl overflow-hidden bg-gray-200 cursor-pointer group"
                  >
                    <img src={space.banner_url || "https://source.unsplash.com/random"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <h4 className="text-white font-bold text-sm leading-tight mb-1">{space.name}</h4>
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <Users size={10} />
                        <span>{space.members_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DiscoverView;
