import React, { useState, useRef } from 'react';
import { X, Image, Type, Send, Loader2, Video } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface CreateStoryModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [mode, setMode] = useState<'select' | 'text' | 'media'>('select');
    const [text, setText] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('from-purple-500 to-blue-500');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const colors = [
        'from-purple-500 to-blue-500',
        'from-red-500 to-orange-500',
        'from-green-400 to-blue-500',
        'from-pink-500 to-rose-500',
        'from-gray-700 to-gray-900',
    ];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const isVideo = file.type.startsWith('video/');

            const { error: uploadError } = await supabase.storage
                .from('stories')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('stories').getPublicUrl(filePath);

            await createStory({
                type: isVideo ? 'video' : 'image',
                media_url: data.publicUrl
            });

        } catch (error) {
            console.error(error);
            alert('Failed to upload media');
            setLoading(false);
        }
    };

    const handleTextPost = async () => {
        if (!text.trim()) return;
        setLoading(true);
        await createStory({
            type: 'text',
            content: text,
            // Store background class or generic text
        });
    };

    const createStory = async (storyData: any) => {
        try {
            const { error } = await supabase.from('stories').insert({
                user_id: user?.id,
                ...storyData
            });
            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to create story');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10">
                <X size={24} />
            </button>

            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                {mode === 'select' && (
                    <div className="p-8 flex flex-col gap-4">
                        <h2 className="text-2xl font-bold text-center mb-4 dark:text-white">Add to Story</h2>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                <Image size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold dark:text-white">Photo / Video</h3>
                                <p className="text-sm text-gray-500">Upload from gallery</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setMode('text')}
                            className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                                <Type size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold dark:text-white">Text</h3>
                                <p className="text-sm text-gray-500">Share a thought</p>
                            </div>
                        </button>
                    </div>
                )}

                {mode === 'text' && (
                    <div className={`aspect-[9/16] w-full bg-gradient-to-br ${backgroundColor} flex flex-col p-6 relative transition-colors duration-500`}>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type something..."
                            className="flex-1 w-full bg-transparent text-white text-3xl font-bold text-center placeholder-white/50 outline-none resize-none pt-20"
                            autoFocus
                        />

                        <div className="flex justify-between items-center mt-4">
                            <div className="flex gap-2">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setBackgroundColor(c)}
                                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${c} border-2 ${backgroundColor === c ? 'border-white' : 'border-transparent'}`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleTextPost}
                                disabled={!text.trim() || loading}
                                className="p-3 bg-white text-black rounded-full shadow-lg disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default CreateStoryModal;
