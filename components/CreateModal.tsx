import React, { useState } from 'react';
import { X, Image, Music, MapPin, Smile, Send, Sparkles, Loader2 } from 'lucide-react';
import { generatePostDraft } from '../services/gemini';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface CreateModalProps {
  onClose: () => void;
}

const CreateModal: React.FC<CreateModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const handleAiDraft = async () => {
    if (!topic) return;
    setIsGenerating(true);
    const draft = await generatePostDraft(topic);
    setContent(draft || '');
    setIsGenerating(false);
  };

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setIsPosting(true);

    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content,
      });

      if (error) throw error;
      onClose();
      // Optionally trigger a refresh in FeedView via context or event, 
      // but FeedView subscription should handle it.
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to post");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
        <button onClick={onClose} className="p-2 -ml-2">
          <X size={24} />
        </button>
        <button
          onClick={handlePost}
          disabled={!content.trim() || isPosting}
          className="bg-[#ff1744] text-white px-6 py-2 rounded-full font-bold text-sm disabled:opacity-50 disabled:bg-gray-300 transition-all active:scale-95 flex items-center gap-2"
        >
          {isPosting && <Loader2 size={16} className="animate-spin" />}
          Post
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex items-start gap-4">
          <img src="https://picsum.photos/seed/me/200" className="w-10 h-10 rounded-full" alt="Profile" />
          <textarea
            autoFocus
            placeholder="What's happening?"
            className="flex-1 text-lg py-2 resize-none focus:outline-none min-h-[120px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* AI Assistant Section */}
        <div className="mt-auto border-t border-gray-100 pt-4">
          <div className="bg-red-50/50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-[#ff1744]" size={16} />
              <h4 className="text-xs font-black text-[#ff1744] uppercase tracking-widest">AI Post Assistant</h4>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic for an AI draft..."
                className="flex-1 bg-white px-4 py-2 rounded-xl text-sm border-none focus:ring-1 focus:ring-[#ff1744]"
              />
              <button
                onClick={handleAiDraft}
                disabled={isGenerating || !topic}
                className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold disabled:bg-gray-400"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : 'Draft'}
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-[#ff1744]">
              <button className="hover:bg-red-50 p-2 rounded-full transition-colors"><Image size={22} /></button>
              <button className="hover:bg-red-50 p-2 rounded-full transition-colors"><Music size={22} /></button>
              <button className="hover:bg-red-50 p-2 rounded-full transition-colors"><MapPin size={22} /></button>
              <button className="hover:bg-red-50 p-2 rounded-full transition-colors"><Smile size={22} /></button>
            </div>
            <div className="text-xs text-gray-400 font-medium">
              {content.length}/280
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
