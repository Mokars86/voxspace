import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, QrCode, CreditCard, Loader2, Send, X, Check } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface Transaction {
   id: string;
   type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
   amount: number;
   description: string;
   created_at: string;
   related_user?: {
      full_name: string;
      username: string;
   };
}

const WalletView: React.FC = () => {
   const { user } = useAuth();
   const [balance, setBalance] = useState<number>(0);
   const [transactions, setTransactions] = useState<Transaction[]>([]);
   const [loading, setLoading] = useState(true);
   const [walletId, setWalletId] = useState<string | null>(null);

   // Modal States
   const [showTopUp, setShowTopUp] = useState(false);
   const [showSend, setShowSend] = useState(false);

   // Form States
   const [amount, setAmount] = useState('');
   const [recipientUsername, setRecipientUsername] = useState('');
   const [processing, setProcessing] = useState(false);

   useEffect(() => {
      if (user) fetchWalletData();
   }, [user]);

   const fetchWalletData = async () => {
      if (!user) return;
      try {
         // 1. Get Wallet
         const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', user.id)
            .single();

         if (walletError && walletError.code !== 'PGRST116') throw walletError;

         if (wallet) {
            setBalance(wallet.balance);
            setWalletId(wallet.id);

            // 2. Get Transactions
            const { data: txs, error: txError } = await supabase
               .from('transactions')
               .select(`
                        *,
                        related_user:related_user_id(full_name, username)
                    `)
               .eq('wallet_id', wallet.id)
               .order('created_at', { ascending: false });

            if (txError) throw txError;
            setTransactions(txs || []);
         }
      } catch (error) {
         console.error("Error fetching wallet:", error);
      } finally {
         setLoading(false);
      }
   };

   const handleTopUp = async () => {
      if (!amount || isNaN(parseFloat(amount)) || !walletId) return;
      setProcessing(true);
      const val = parseFloat(amount);

      try {
         // 1. Update Balance
         const newBalance = balance + val;
         const { error: balError } = await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', walletId);

         if (balError) throw balError;

         // 2. Record Transaction
         const { error: txError } = await supabase
            .from('transactions')
            .insert({
               wallet_id: walletId,
               amount: val,
               type: 'deposit',
               description: 'Top Up'
            });

         if (txError) throw txError;

         setBalance(newBalance);
         setShowTopUp(false);
         setAmount('');
         fetchWalletData(); // Refresh history
         alert("Top Up Successful!");

      } catch (error: any) {
         console.error("Top Up Failed:", error);
         alert("Failed: " + error.message);
      } finally {
         setProcessing(false);
      }
   };

   const handleSendMoney = async () => {
      if (!amount || !recipientUsername || !walletId || !user) return;
      setProcessing(true);
      const val = parseFloat(amount);

      if (val > balance) {
         alert("Insufficient funds");
         setProcessing(false);
         return;
      }

      try {
         // 1. Find Recipient
         const { data: recipient, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('username', recipientUsername)
            .single();

         if (userError || !recipient) {
            alert("User not found");
            setProcessing(false);
            return;
         }

         if (recipient.id === user.id) {
            alert("Cannot send money to yourself");
            setProcessing(false);
            return;
         }

         // 2. Get Recipient Wallet
         const { data: recipientWallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', recipient.id)
            .single();

         if (!recipientWallet) {
            // Should exist but handle case
            alert("Recipient wallet not active");
            setProcessing(false);
            return;
         }

         // 3. Perform Transfer (Ideally invalidates RLS if client-side, but simulating logic)
         // Deduct from Sender
         await supabase.from('wallets').update({ balance: balance - val }).eq('id', walletId);
         // Add to Recipient
         await supabase.from('wallets').update({ balance: recipientWallet.balance + val }).eq('id', recipientWallet.id);

         // 4. Record Transactions (Sender)
         await supabase.from('transactions').insert({
            wallet_id: walletId,
            amount: val,
            type: 'transfer_out',
            description: `Sent to @${recipientUsername}`,
            related_user_id: recipient.id
         });

         // 5. Record Transactions (Recipient)
         await supabase.from('transactions').insert({
            wallet_id: recipientWallet.id,
            amount: val,
            type: 'transfer_in',
            description: `Received from @${user.email?.split('@')[0] || 'user'}`, // fallback
            related_user_id: user.id
         });

         setBalance(prev => prev - val);
         setShowSend(false);
         setAmount('');
         setRecipientUsername('');
         fetchWalletData();
         alert("Transfer Successful!");

      } catch (error: any) {
         console.error("Transfer failed:", error);
         alert("Transfer failed: " + error.message);
      } finally {
         setProcessing(false);
      }
   };

   return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 relative">
         {/* Header Card */}
         <div className="p-6 bg-white dark:bg-gray-900 pb-8 rounded-b-[2rem] shadow-sm z-10 transition-colors">
            <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Wallet</h2>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl shadow-gray-200 mb-8">
               <p className="text-gray-400 font-medium mb-2">Total Balance</p>
               <h1 className="text-4xl font-bold mb-8">
                  {loading ? <Loader2 className="animate-spin" /> : `$${balance.toFixed(2)}`}
               </h1>

               <div className="flex justify-between items-center text-sm font-medium">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-[#ff1744] font-bold">V</span>
                     </div>
                     <span>VoxCoin</span>
                  </div>
                  <span className="text-gray-400">**** {walletId?.slice(-4) || '----'}</span>
               </div>
            </div>

            <div className="flex justify-around">
               <WalletAction icon={<ArrowUpRight />} label="Send" onClick={() => setShowSend(true)} />
               <WalletAction icon={<ArrowDownLeft />} label="Receive" onClick={() => alert("Your Username is your address!")} />
               <WalletAction icon={<QrCode />} label="Scan" onClick={() => alert("Scanner coming soon!")} />
               <WalletAction icon={<CreditCard />} label="Top Up" onClick={() => setShowTopUp(true)} />
            </div>
         </div>

         {/* Transactions */}
         <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Recent Transactions</h3>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-2 shadow-sm space-y-1 transition-colors">
               {transactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No transactions yet</div>
               ) : (
                  transactions.map((tx) => (
                     <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center",
                              (tx.type === 'deposit' || tx.type === 'transfer_in') ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                           )}>
                              {(tx.type === 'deposit' || tx.type === 'transfer_in') ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                           </div>
                           <div>
                              <p className="font-bold text-gray-900 dark:text-gray-100">{tx.description}</p>
                              <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={cn("font-bold", (tx.type === 'deposit' || tx.type === 'transfer_in') ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-gray-100")}>
                              {(tx.type === 'deposit' || tx.type === 'transfer_in') ? '+' : '-'}${tx.amount.toFixed(2)}
                           </p>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* Top Up Modal */}
         {showTopUp && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in">
               <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold">Top Up Wallet</h3>
                     <button onClick={() => setShowTopUp(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="text-sm font-bold text-gray-600">Amount ($)</label>
                        <input
                           type="number"
                           value={amount}
                           onChange={e => setAmount(e.target.value)}
                           className="w-full text-3xl font-bold p-4 bg-gray-50 rounded-xl border-none focus:ring-2 ring-[#ff1744] outline-none text-center"
                           placeholder="0.00"
                           autoFocus
                        />
                     </div>
                     <button
                        onClick={handleTopUp}
                        disabled={processing || !amount}
                        className="w-full bg-[#ff1744] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-200 active:scale-95 transition-transform disabled:opacity-50"
                     >
                        {processing ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm Payment'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Send Money Modal */}
         {showSend && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in">
               <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold">Send Money</h3>
                     <button onClick={() => setShowSend(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="text-sm font-bold text-gray-600">Recipient Username</label>
                        <div className="flex items-center bg-gray-50 rounded-xl px-4 border focus-within:border-[#ff1744]">
                           <span className="text-gray-400 font-bold">@</span>
                           <input
                              type="text"
                              value={recipientUsername}
                              onChange={e => setRecipientUsername(e.target.value)}
                              className="w-full p-4 bg-transparent border-none outline-none font-bold"
                              placeholder="username"
                           />
                        </div>
                     </div>
                     <div>
                        <label className="text-sm font-bold text-gray-600">Amount ($)</label>
                        <input
                           type="number"
                           value={amount}
                           onChange={e => setAmount(e.target.value)}
                           className="w-full text-3xl font-bold p-4 bg-gray-50 rounded-xl border-none focus:ring-2 ring-[#ff1744] outline-none text-center"
                           placeholder="0.00"
                        />
                     </div>
                     <button
                        onClick={handleSendMoney}
                        disabled={processing || !amount || !recipientUsername}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                        {processing ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Send Money</>}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

const WalletAction = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
   <div onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer group">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center justify-center group-hover:bg-[#ff1744] group-hover:text-white transition-all shadow-sm active:scale-90">
         {icon}
      </div>
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
   </div>
);

export default WalletView;
