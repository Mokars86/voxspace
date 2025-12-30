import React, { useState } from 'react';
import { X, Loader2, Sparkles, Globe, Lock } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface CreateSpaceModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    const handleCreate = async () => {
        if (!name.trim() || !user) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.from('spaces').insert({
                name,
                description,
                owner_id: user.id,
                // Randomly assign a nice banner
                banner_url: null, // Will update below
                is_live: false,
                members_count: 1
            })
                .select()
                .single();

            if (error) throw error;
            const newSpace = data;

            // Upload Banner if selected
            let finalBannerUrl = `https://source.unsplash.com/random/800x600/?abstract,${name}`; // Default

            if (bannerFile) {
                const fileExt = bannerFile.name.split('.').pop();
                const fileName = `space-banner-${newSpace.id}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('VoxSpace_App').upload(fileName, bannerFile);

                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('VoxSpace_App').getPublicUrl(fileName);
                    finalBannerUrl = urlData.publicUrl;
                }
            }

            // Update with initial or uploaded banner
            await supabase.from('spaces').update({ banner_url: finalBannerUrl }).eq('id', newSpace.id);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error creating space:", error);
            alert("Failed to create space: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-lg">Create a Space</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Space Name</label>
                        <input
                            type="text"
                            placeholder="e.g. AI Enthusiasts"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-[#ff1744] font-medium"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Space Banner/Avatar</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border">
                                {bannerFile ? (
                                    <img src={URL.createObjectURL(bannerFile)} className="w-full h-full object-cover" />
                                ) : (
                                    <Globe className="text-gray-300" />
                                )}
                            </div>
                            <label className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold cursor-pointer hover:bg-gray-200">
                                Upload Image
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) setBannerFile(e.target.files[0]);
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Description</label>
                        <textarea
                            placeholder="What's this space about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-[#ff1744] min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            onClick={() => setIsPrivate(false)}
                            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${!isPrivate ? 'border-[#ff1744] bg-red-50 text-[#ff1744]' : 'border-gray-100 text-gray-400'}`}
                        >
                            <Globe size={24} />
                            <span className="text-xs font-bold">Public</span>
                        </button>
                        <button
                            onClick={() => setIsPrivate(true)}
                            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${isPrivate ? 'border-[#ff1744] bg-red-50 text-[#ff1744]' : 'border-gray-100 text-gray-400'}`}
                        >
                            <Lock size={24} />
                            <span className="text-xs font-bold">Private</span>
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || loading}
                        className="bg-[#ff1744] text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-transform active:scale-95"
                    >
                        {loading && <Loader2 className="animate-spin" size={18} />}
                        Create Space
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateSpaceModal;
