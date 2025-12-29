import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Mail, Megaphone, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

const NotificationSettings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState({
        email_notifications: true,
        push_notifications: true,
        marketing_notifications: false
    });

    useEffect(() => {
        if (user) fetchPreferences();
    }, [user]);

    const fetchPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setPreferences({
                    email_notifications: data.email_notifications,
                    push_notifications: data.push_notifications,
                    marketing_notifications: data.marketing_notifications
                });
            }
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (key: string, value: boolean) => {
        if (!user) return;
        setPreferences(prev => ({ ...prev, [key]: value }));

        try {
            const { error } = await supabase
                .from('notification_preferences')
                .upsert({
                    user_id: user.id,
                    ...preferences,
                    [key]: value,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating preference:', error);
            // Revert on error
            setPreferences(prev => ({ ...prev, [key]: !value }));
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#ff1744]" /></div>;

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-gray-900 dark:text-gray-100">
            <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Notifications</h1>
            </header>

            <div className="p-4 space-y-6">
                <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-2xl space-y-6">
                    <ToggleItem
                        icon={<Bell size={24} />}
                        label="Push Notifications"
                        description="Receive alerts on your device"
                        checked={preferences.push_notifications}
                        onChange={(v) => updatePreference('push_notifications', v)}
                    />
                    <ToggleItem
                        icon={<Mail size={24} />}
                        label="Email Notifications"
                        description="Receive digests and updates via email"
                        checked={preferences.email_notifications}
                        onChange={(v) => updatePreference('email_notifications', v)}
                    />
                    <ToggleItem
                        icon={<Megaphone size={24} />}
                        label="Marketing"
                        description="Receive news and special offers"
                        checked={preferences.marketing_notifications}
                        onChange={(v) => updatePreference('marketing_notifications', v)}
                    />
                </div>
            </div>
        </div>
    );
};

const ToggleItem = ({ icon, label, description, checked, onChange }: any) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm text-gray-700 dark:text-gray-300">
                {icon}
            </div>
            <div>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </div>
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${checked ? 'bg-[#ff1744]' : 'bg-gray-300 dark:bg-gray-700'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

export default NotificationSettings;
