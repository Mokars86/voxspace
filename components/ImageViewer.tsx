import React from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
    isOpen: boolean;
    onClose: () => void;
    src: string;
    alt?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, onClose, src, alt }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
                <X size={24} />
            </button>
            <img
                src={src}
                alt={alt || "Full screen preview"}
                className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

export default ImageViewer;
