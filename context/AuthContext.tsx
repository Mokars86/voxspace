import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: any | null; // Add profile to context
    loading: boolean;
    signOut: () => Promise<void>;
    signInAsDemo: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    signInAsDemo: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                setProfile(data);
            }
        } catch (error) {
            console.error("Error fetching profile", error);
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            else setProfile(null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
    };

    const signInAsDemo = async () => {
        const mockUser = {
            id: 'demo-user-123',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'demo@voxspace.app',
            email_confirmed_at: new Date().toISOString(),
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: 'Demo User' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phone: '',
        } as User;

        const mockSession = {
            access_token: 'demo-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'demo-refresh',
            user: mockUser,
        } as Session;

        const mockProfile = {
            id: mockUser.id,
            full_name: 'Demo User',
            username: 'demouser',
            avatar_url: '',
            is_verified: true
        };

        setSession(mockSession);
        setUser(mockUser);
        setProfile(mockProfile);
        setLoading(false);
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut, signInAsDemo, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
