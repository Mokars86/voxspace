import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Smartphone, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SecuritySettings: React.FC = () => {
    const navigate = useNavigate();
    const { signOut } = useAuth();

    // Mock data for sessions
    const sessions = [
        { id: 1, device: 'iPhone 13 Pro', location: 'San Francisco, US', active: true },
        { id: 2, device: 'Chrome on Windows', location: 'San Francisco, US', active: false },
    ];

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                <button onClick={() => navigate(-1)} className="text-gray-600 p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Security</h1>
            </header>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-6">

                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Login & Recovery</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="text-gray-400"><Key size={20} /></div>
                                <div>
                                    <span className="font-medium text-gray-900 block">Change Password</span>
                                    <span className="text-xs text-gray-400">Last changed 3 months ago</span>
                                </div>
                            </div>
                            <div className="text-gray-300">→</div>
                        </button>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="text-gray-400"><Smartphone size={20} /></div>
                                <div>
                                    <span className="font-medium text-gray-900 block">Two-Factor Authentication</span>
                                    <span className="text-xs text-green-500 font-bold">Enabled</span>
                                </div>
                            </div>
                            <div className="text-gray-300">→</div>
                        </button>
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Active Sessions</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                        {sessions.map(session => (
                            <div key={session.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-400"><ShieldCheck size={20} /></div>
                                    <div>
                                        <span className="font-medium text-gray-900 block">{session.device}</span>
                                        <span className="text-xs text-gray-400">{session.location} • {session.active ? <span className="text-green-500">Active Now</span> : '2 hours ago'}</span>
                                    </div>
                                </div>
                                {!session.active && (
                                    <button className="text-xs font-bold text-red-500 px-3 py-1 bg-red-50 rounded-full hover:bg-red-100">
                                        Revoke
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <button
                    onClick={() => signOut()}
                    className="w-full p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                    <LogOut size={20} />
                    Log out of all devices
                </button>

            </div>
        </div>
    );
};

export default SecuritySettings;
