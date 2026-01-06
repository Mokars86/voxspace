export interface MyBagItem {
    id: string;
    user_id: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'link' | 'note' | 'message';
    content: string; // URL for media, text content for notes/messages
    title?: string;
    metadata?: {
        size?: number;
        mimeType?: string;
        original_sender?: string;
        original_chat_id?: string;
        original_post_id?: string;
        fileName?: string;
        duration?: number;
        thumbnail?: string;
    };
    created_at: string;
    is_locked?: boolean;
    category?: 'all' | 'messages' | 'media' | 'files' | 'notes' | 'links' | 'purchases';
}
