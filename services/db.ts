import Dexie, { Table } from 'dexie';
import { MyBagItem } from '../types/mybag';

export interface ChatMessageDB {
    id: string; // UUID from supabase
    chat_id: string;
    content: string;
    sender_id: string;
    type: string;
    created_at: string;
    media_url?: string;
    metadata?: any;
    status?: string;
    is_deleted?: boolean;
    is_pinned?: boolean;
}

export interface ChatDB {
    id: string;
    name: string;
    is_group: boolean;
    avatar_url?: string;
    disappearing_duration?: number;
    updated_at: string;
}

class VoxSpaceDB extends Dexie {
    messages!: Table<ChatMessageDB>;
    chats!: Table<ChatDB>;
    my_bag!: Table<MyBagItem>;

    constructor() {
        super('VoxSpaceDB');
        this.version(3).stores({
            messages: 'id, chat_id, created_at, [chat_id+created_at]', // Primary key and indexes
            chats: 'id',
            my_bag: 'id, type, created_at, category'
        });
    }
}

export const db = new VoxSpaceDB();
