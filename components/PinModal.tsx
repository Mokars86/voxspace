import React, { useState, useRef, useEffect } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PinModalProps {
    isOpen: boolean;
    mode: 'create' | 'enter' | 'confirm';
    title?: string;
    onClose: () => void;
    onSuccess: (pin: string) => void;
    isLoading?: boolean;
}

const PinModal: React.FC<PinModalProps> = ({ isOpen, mode, title, onClose, onSuccess, isLoading }) => {
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const [isConfirming, setIsConfirming] = useState(false); // Local state for 'create' flow step 2
    const [error, setError] = useState<string | null>(null);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '']);
            setConfirmPin(['', '', '', '']);
            setIsConfirming(false);
            setError(null);
            // Focus first input
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleInput = (index: number, value: string, isConfirmStep: boolean) => {
        if (!/^\d*$/.test(value)) return;

        // Handle paste? MVP: just single char
        const newPin = [...(isConfirmStep ? confirmPin : pin)];
        newPin[index] = value.slice(-1);

        if (isConfirmStep) setConfirmPin(newPin);
        else setPin(newPin);

        // Auto advance
        if (value && index < 3) {
            if (isConfirmStep) confirmInputRefs.current[index + 1]?.focus();
            else inputRefs.current[index + 1]?.focus();
        }

        // Auto submit/verify
        if (newPin.every(d => d !== '') && index === 3) {
            handleComplete(newPin.join(''), isConfirmStep);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirmStep: boolean) => {
        if (e.key === 'Backspace') {
            const currentPin = isConfirmStep ? confirmPin : pin;
            if (!currentPin[index] && index > 0) {
                // Move back
                if (isConfirmStep) {
                    confirmInputRefs.current[index - 1]?.focus();
                    const newPin = [...confirmPin];
                    newPin[index - 1] = '';
                    setConfirmPin(newPin);
                } else {
                    inputRefs.current[index - 1]?.focus();
                    const newPin = [...pin];
                    newPin[index - 1] = '';
                    setPin(newPin);
                }
            } else {
                const newPin = [...currentPin];
                newPin[index] = '';
                if (isConfirmStep) setConfirmPin(newPin);
                else setPin(newPin);
            }
        }
    };

    const handleComplete = (enteredPin: string, isConfirmStep: boolean) => {
        if (mode === 'enter') {
            onSuccess(enteredPin);
        } else if (mode === 'create') {
            if (!isConfirming) {
                setIsConfirming(true);
                setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
            } else {
                // Check match
                if (enteredPin === pin.join('')) {
                    onSuccess(enteredPin);
                } else {
                    setError("PINs do not match. Try again.");
                    setConfirmPin(['', '', '', '']);
                    setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
                }
            }
        }
    };

    const renderInputs = (
        values: string[],
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
        isConfirmStep: boolean
    ) => (
        <div className="flex justify-center gap-3 my-6">
            {values.map((digit, i) => (
                <input
                    key={i}
                    ref={el => refs.current[i] = el}
                    type="number" // Shows numeric keyboard on mobile
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleInput(i, e.target.value, isConfirmStep)}
                    onKeyDown={(e) => handleKeyDown(i, e, isConfirmStep)}
                    className={cn(
                        "w-12 h-14 rounded-xl border-2 text-center text-2xl font-bold outline-none transition-colors",
                        digit
                            ? "border-[#ff1744] bg-red-50 dark:bg-red-900/20 text-[#ff1744]"
                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-[#ff1744]/50"
                    )}
                    maxLength={1}
                />
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm relative animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-[#ff1744] rounded-full flex items-center justify-center mb-4">
                        <Lock size={32} />
                    </div>

                    <h2 className="text-xl font-bold dark:text-white mb-1">
                        {title || (mode === 'enter' ? 'Enter PIN' : (isConfirming ? 'Confirm PIN' : 'Create PIN'))}
                    </h2>

                    <p className="text-gray-500 text-sm mb-2 text-center">
                        {error || (mode === 'enter'
                            ? 'Enter your 4-digit PIN to access this chat'
                            : (isConfirming ? 'Re-enter your PIN to confirm' : 'Create a 4-digit PIN for your locked chats')
                        )}
                    </p>

                    {mode === 'create' && isConfirming
                        ? renderInputs(confirmPin, confirmInputRefs, true)
                        : renderInputs(pin, inputRefs, false)
                    }

                    {isLoading && (
                        <div className="flex items-center gap-2 text-[#ff1744] mt-2">
                            <Loader2 size={16} className="animate-spin" /> Verifying...
                        </div>
                    )}

                    {mode === 'enter' && (
                        <button onClick={() => alert("Forgot PIN flow not implemented yet")} className="text-xs text-gray-400 hover:text-gray-600 mt-4 underline">
                            Forgot PIN?
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
};

export default PinModal;
