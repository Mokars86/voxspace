import React, { useState } from 'react';
import { X, Shield, Trash2, Download, LogOut, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';

interface BagSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLock: () => void;
}

const BagSettingsModal: React.FC<BagSettingsModalProps> = ({ isOpen, onClose, onLock }) => {
    if (!isOpen) return null;
    const navigate = useNavigate();

    const handleClearBag = async () => {
        if (confirm("Are you sure you want to delete ALL items in My Bag? This cannot be undone.")) {
            if (confirm("Really delete everything locally?")) {
                await db.my_bag.clear();
                alert("Bag cleared locally. (Sync deletion not implemented for safety)");
                onClose();
            }
        }
    };

    const handleExport = async () => {
        try {
            const items = await db.my_bag.toArray();
            const dataStr = JSON.stringify(items, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `my-bag-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`Exported ${items.length} items successfully!`);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2 dark:text-white">
                        <Shield className="text-[#ff1744]" size={20} />
                        Bag Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    <button
                        onClick={onLock}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg">
                            <LogOut size={20} />
                        </div>
                        <div>
                            <div className="font-semibold dark:text-gray-200">Lock Bag Now</div>
                            <div className="text-xs text-gray-500">Require PIN to re-enter</div>
                        </div>
                    </button>

                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left opacity-50 cursor-not-allowed">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <KeyRound size={20} />
                        </div>
                        <div>
                            <div className="font-semibold dark:text-gray-200">Change PIN</div>
                            <div className="text-xs text-gray-500">Currently fixed to '1234'</div>
                        </div>
                    </button>

                    <button
                        onClick={handleExport}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                            <Download size={20} />
                        </div>
                        <div>
                            <div className="font-semibold dark:text-gray-200">Export / Backup</div>
                            <div className="text-xs text-gray-500">Download data as JSON</div>
                        </div>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />

                    <button
                        onClick={handleClearBag}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-left group"
                    >
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <div className="font-semibold text-red-600">Clear All Data</div>
                            <div className="text-xs text-red-400">Delete local storage</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BagSettingsModal;
