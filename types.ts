
export type TabType = 'chats' | 'feed' | 'spaces' | 'discover' | 'profile' | 'wallet';

export interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  reposts: number;
  media?: string;
  isLiked?: boolean;
}

export interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  isOnline: boolean;
  isTyping?: boolean;
  isArchived?: boolean;
  isGroup?: boolean;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  members: number;
  isLive: boolean;
  banner: string;
  speakers?: string[];
}
