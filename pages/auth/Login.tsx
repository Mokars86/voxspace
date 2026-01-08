import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, CheckCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Forgot Password State
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            setSuccessMessage("Password reset link sent! Please check your email.");
            setShowForgotPassword(false);
            setResetEmail('');
        } catch (err: any) {
            setError(err.message || "Failed to send reset link");
        } finally {
            setResetLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // Auto-redirect happens via AuthContext listener
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };



    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || "An error occurred");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="p-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-900" />
                </button>
            </header>

            <main className="flex-1 p-8 flex flex-col justify-center">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {isSignUp ? "Create Account" : "Welcome Back"}
                    </h1>
                    <p className="text-gray-500">
                        {isSignUp
                            ? "Sign up to start chatting and exploring."
                            : "Enter your email and password to sign in."}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#ff1744]/20 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-900"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-[#ff1744]/20 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-900"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-green-50 text-green-600 rounded-2xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                            <CheckCheck size={16} />
                            {successMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 text-white bg-[#ff1744] hover:bg-[#d50000] rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-200 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                        {isSignUp ? "Create Account" : "Sign In"}
                    </button>
                    {!isSignUp && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-sm font-medium text-gray-500 hover:text-[#ff1744] transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}
                </form>

                {/* Forgot Password Modal */}
                {showForgotPassword && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
                            <p className="text-gray-500 mb-6">Enter your email address and we'll send you a link to reset your password.</p>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#ff1744]/20 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-900"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setError(null);
                                            setSuccessMessage(null);
                                        }}
                                        className="flex-1 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="flex-1 py-3 text-white bg-[#ff1744] hover:bg-[#d50000] rounded-2xl font-bold shadow-lg shadow-red-200 disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
                                    >
                                        {resetLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                                        Send Link
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-gray-500 font-medium hover:text-[#ff1744] transition-colors"
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                    </button>
                </div>


                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full mt-4 py-3 text-gray-900 bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Google
                    </button>
                </div>

            </main>
        </div>
    );
};

export default Login;
