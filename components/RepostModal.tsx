import React, { useState } from 'react';
import { Repeat, PenTool, X, Quote } from 'lucide-react';
import { Post } from '../types';

interface RepostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRepost: (type: 'repost' | 'quote', content?: string) => void;
    post: Post;
}

const RepostModal: React.FC<RepostModalProps> = ({ isOpen, onClose, onRepost, post }) => {
    const [quoteContent, setQuoteContent] = useState('');
    const [mode, setMode] = useState<'select' | 'quote'>('select');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">
                        {mode === 'select' ? 'Repost' : 'Quote Post'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {mode === 'select' ? (
                        <div className="space-y-2">
                            <button
                                onClick={() => onRepost('repost')}
                                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-left group"
                            >
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full group-hover:scale-110 transition-transform">
                                    <Repeat size={20} />
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-900 dark:text-white">Repost</span>
                                    <span className="text-xs text-gray-500">Instantly share this post to your feed</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode('quote')}
                                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-left group"
                            >
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full group-hover:scale-110 transition-transform">
                                    <PenTool size={20} />
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-900 dark:text-white">Quote Post</span>
                                    <span className="text-xs text-gray-500">Add your own thoughts before sharing</span>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <textarea
                                value={quoteContent}
                                onChange={(e) => setQuoteContent(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none outline-none resize-none focus:ring-1 focus:ring-[#ff1744] dark:text-white"
                                autoFocus
                            />

                            {/* Original Post Snippet */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 opacity-60 pointer-events-none">
                                <div className="flex items-center gap-2 mb-2">
                                    <img src={post.author.avatar} className="w-5 h-5 rounded-full" />
                                    <span className="font-bold text-xs">{post.author.name}</span>
                                </div>
                                <p className="text-xs line-clamp-2">{post.content}</p>
                            </div>

                            <button
                                onClick={() => onRepost('quote', quoteContent)}
                                disabled={!quoteContent.trim()}
                                className="w-full py-3 bg-[#ff1744] text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                            >
                                Post Quote
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RepostModal;
