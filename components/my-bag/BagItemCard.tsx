import React from 'react';
import { MyBagItem } from '../../types/mybag';
import { FileText, Image, Video, Music, Link, StickyNote, MessageCircle, Lock, MoreVertical, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BagItemCardProps {
    item: MyBagItem;
    onPress: (item: MyBagItem) => void;
    onLongPress: (item: MyBagItem) => void;
}

const BagItemCard: React.FC<BagItemCardProps> = ({ item, onPress, onLongPress }) => {
    const getIcon = () => {
        switch (item.type) {
            case 'image': return <Image size={24} className="text-purple-500" />;
            case 'video': return <Video size={24} className="text-blue-500" />;
            case 'audio': return <Music size={24} className="text-orange-500" />;
            case 'file': return <FileText size={24} className="text-gray-500" />;
            case 'link': return <Link size={24} className="text-green-500" />;
            case 'note': return <StickyNote size={24} className="text-yellow-500" />;
            case 'message': return <MessageCircle size={24} className="text-[#ff1744]" />;
            default: return <FileText size={24} className="text-gray-500" />;
        }
    };

    const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric'
    });

    return (
        <div
            onClick={() => onPress(item)}
            onContextMenu={(e) => { e.preventDefault(); onLongPress(item); }}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-gray-700 active:scale-98 transition-transform cursor-pointer"
        >
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                {item.type === 'image' && item.content ? (
                    <img src={item.content} alt={item.title} className="w-full h-full object-cover rounded-lg" />
                ) : (
                    getIcon()
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm">
                    {item.title || (item.type === 'note' || item.type === 'message' ? item.content : 'Untitled Item')}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="capitalize">{item.type}</span>
                    <span>•</span>
                    <span>{formattedDate}</span>
                    {item.metadata?.size && (
                        <>
                            <span>•</span>
                            <span>{(item.metadata.size / 1024).toFixed(0)} KB</span>
                        </>
                    )}
                </div>
            </div>

            {item.is_locked && (
                <Lock size={16} className="text-gray-400" />
            )}

            {item.type === 'link' && (
                <ExternalLink size={16} className="text-gray-300" />
            )}
        </div>
    );
};

export default BagItemCard;
