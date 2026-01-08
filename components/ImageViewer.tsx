import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageViewerProps {
    isOpen: boolean;
    onClose: () => void;
    src?: string;
    images?: string[]; // Array of URLs
    alt?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, onClose, src, images, alt }) => {
    const [scale, setScale] = React.useState(1);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStart = React.useRef({ x: 0, y: 0 });

    // Gallery Logic
    const allImages = React.useMemo(() => {
        if (images && images.length > 0) return images;
        if (src) return [src];
        return [];
    }, [images, src]);

    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
        if (isOpen) {
            if (src && allImages.includes(src)) {
                setCurrentIndex(allImages.indexOf(src));
            } else {
                setCurrentIndex(0);
            }
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen, src, allImages]);

    const navigate = (dir: 1 | -1) => {
        const newIndex = currentIndex + dir;
        if (newIndex >= 0 && newIndex < allImages.length) {
            setCurrentIndex(newIndex);
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    // Swipe Logic
    const touchStartX = React.useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        if (scale === 1) {
            touchStartX.current = e.touches[0].clientX;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current !== null && scale === 1) {
            const diff = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(diff) > 50) {
                if (diff > 0) navigate(-1); // Swipe Right -> Prev
                else navigate(1); // Swipe Left -> Next
            }
            touchStartX.current = null;
        }
    };

    // Keyboard Nav
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') navigate(1);
            if (e.key === 'ArrowLeft') navigate(-1);
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, allImages]);


    if (!isOpen || allImages.length === 0) return null;

    const currentSrc = allImages[currentIndex];

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = e.deltaY * -0.01;
        const newScale = Math.min(Math.max(1, scale + delta), 4);
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
            onClick={onClose}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
            >
                <X size={24} />
            </button>
            <div className="absolute top-4 right-16 flex items-center gap-2 z-50">
                <span className="text-white/80 font-medium mr-4">
                    {currentIndex + 1} / {allImages.length}
                </span>
                <a
                    href={currentSrc}
                    download={`voxspace_image_${currentIndex}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    title="Download"
                >
                    <Download size={24} />
                </a>
            </div>

            {/* Nav Buttons (Desktop) */}
            {allImages.length > 1 && (
                <>
                    {currentIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-50 hidden md:flex"
                        >
                            ←
                        </button>
                    )}
                    {currentIndex < allImages.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate(1); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-50 hidden md:flex"
                        >
                            →
                        </button>
                    )}
                </>
            )}


            <img
                key={currentSrc} // Key forces re-render/animation reset on change
                src={currentSrc}
                alt={alt || "Full screen preview"}
                className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-75 ease-linear cursor-move animate-in fade-in zoom-in-95"
                style={{
                    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    cursor: scale > 1 ? 'grab' : 'default'
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                draggable={false}
            />
        </div>
    );
};

export default ImageViewer;
