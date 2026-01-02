import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export const usePushNotifications = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        const registerNotifications = async () => {
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.log('User denied permissions!');
                return;
            }

            await PushNotifications.register();
        };

        const addListeners = async () => {
            await PushNotifications.removeAllListeners();

            await PushNotifications.addListener('registration', async token => {
                console.log('Push registration success, token: ' + token.value);
                if (user) {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ fcm_token: token.value })
                        .eq('id', user.id);

                    if (error) console.error("Error saving FCM token:", error);
                    else console.log("FCM Token saved to profile");
                }
            });

            await PushNotifications.addListener('registrationError', err => {
                console.error('Push registration error: ', err.error);
            });

            await PushNotifications.addListener('pushNotificationReceived', notification => {
                console.log('Push received: ', notification);
            });

            await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
                console.log('Push action performed: ', notification);
                const data = notification.notification.data;
                if (data.url) {
                    navigate(data.url);
                }
            });
        };

        registerNotifications();
        addListeners();

        return () => {
            if (Capacitor.isNativePlatform()) {
                PushNotifications.removeAllListeners();
            }
        };

    }, [navigate, user]);
};
