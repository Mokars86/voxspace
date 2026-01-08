import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Smartphone, LogOut, ShieldCheck, Lock, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import PinModal from '../../components/PinModal';

const SecuritySettings: React.FC = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [hasPin, setHasPin] = useState(false);

    // Pin Modal State
    const [pinModal, setPinModal] = useState<{ isOpen: boolean, mode: 'create' | 'enter' | 'confirm', action?: 'manage' }>({ isOpen: false, mode: 'enter' });

    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        checkPinStatus();
    }, [user]);

    const checkPinStatus = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('chat_lock_pin').eq('id', user.id).single();
        if (data?.chat_lock_pin) setHasPin(true);
        else setHasPin(false);
    };

    const handlePinParams = () => {
        if (hasPin) {
            // If has PIN, verify old first (enter) -> then create new
            // For MVP simplicity: Just "Create" (Overwrite) but requires "Enter" first maybe? 
            // Let's do: Enter old PIN to verify, then Open Create for new.
            // Using 'enter' mode first. 
            // However, PinModal doesn't inherently support a multi-step "Change PIN" flow easily without external state.
            // Let's just allow Overwrite with 'create' for now, or trigger 'enter' then 'create'.

            // Flow: Click -> PinModal (Enter) -> Success -> PinModal (Create) -> Success -> Done.
            setPinModal({ isOpen: true, mode: 'enter', action: 'manage' });
        } else {
            setPinModal({ isOpen: true, mode: 'create', action: 'manage' });
        }
    };

    const handlePinSuccess = async (pin: string) => {
        // 1. If we were verifying existing PIN to change it
        if (pinModal.mode === 'enter' && hasPin) {
            // Verify against DB (or local check if we had it, but verify against DB for security)
            // But PinModal doesn't fetch. We need to verify here.
            const { data } = await supabase.from('profiles').select('chat_lock_pin').eq('id', user!.id).single();
            if (data?.chat_lock_pin === pin) {
                // Correct PIN, now allow creating new one
                setPinModal({ isOpen: true, mode: 'create', action: 'manage' });
            } else {
                alert("Incorrect PIN");
            }
            return;
        }

        // 2. Creating/Updating PIN
        if (pinModal.mode === 'create') {
            const { error } = await supabase.from('profiles').update({ chat_lock_pin: pin }).eq('id', user!.id);
            if (error) {
                alert("Failed to update PIN");
            } else {
                setHasPin(true);
                setPinModal({ ...pinModal, isOpen: false });
                alert("PIN updated successfully");
            }
        }
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');
        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setIsLoading(false);

        if (error) {
            setPasswordError(error.message);
        } else {
            setPasswordSuccess("Password updated successfully");
            setTimeout(() => {
                setShowPasswordModal(false);
                setNewPassword('');
                setConfirmPassword('');
                setPasswordSuccess('');
            }, 1500);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-gray-900 transition-colors">
            <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold dark:text-white">Security</h1>
            </header>

            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 space-y-6">

                <section>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Login & Security</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-gray-800 border border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500"><Key size={20} /></div>
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white block">Change Password</span>
                                    <span className="text-xs text-gray-400">Update your account password</span>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-300" />
                        </button>

                        <button
                            onClick={handlePinParams}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-[#ff1744]"><Lock size={20} /></div>
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white block">Chat Lock PIN</span>
                                    <span className="text-xs text-gray-400">{hasPin ? "Change or remove your PIN" : "Setup a PIN for locking chats"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400">{hasPin ? "Set" : "Off"}</span>
                                <ChevronRight size={20} className="text-gray-300" />
                            </div>
                        </button>
                    </div>
                </section>

                <button
                    onClick={() => signOut()}
                    className="w-full p-4 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                >
                    <LogOut size={20} />
                    Log Out
                </button>

            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-800 shadow-2xl animate-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Change Password</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-[#ff1744] outline-none mt-1 dark:text-white"
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-[#ff1744] outline-none mt-1 dark:text-white"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        {passwordError && <p className="text-red-500 text-sm mt-3 font-medium">{passwordError}</p>}
                        {passwordSuccess && <p className="text-green-500 text-sm mt-3 font-medium">{passwordSuccess}</p>}

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                disabled={isLoading || !newPassword}
                                className="flex-1 py-3 bg-[#ff1744] text-white font-bold rounded-xl shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                            >
                                {isLoading && <Loader2 size={18} className="animate-spin" />}
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PinModal
                isOpen={pinModal.isOpen}
                mode={pinModal.mode}
                onClose={() => setPinModal({ ...pinModal, isOpen: false })}
                onSuccess={handlePinSuccess}
                title={pinModal.mode === 'enter' ? "Enter Current PIN" : "Set New PIN"}
            />
        </div>
    );
};

export default SecuritySettings;
