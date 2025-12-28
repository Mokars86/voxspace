import React from 'react';
import { ArrowUpRight, ArrowDownLeft, QrCode, CreditCard, Clock, ChevronRight } from 'lucide-react';

const WalletView: React.FC = () => {
   return (
      <div className="flex flex-col h-full bg-gray-50">
         {/* Header Card */}
         <div className="p-6 bg-white pb-8 rounded-b-[2rem] shadow-sm z-10">
            <h2 className="text-2xl font-bold mb-6 text-center">Wallet</h2>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl shadow-gray-200 mb-8">
               <p className="text-gray-400 font-medium mb-2">Total Balance</p>
               <h1 className="text-4xl font-bold mb-8">$2,450.50</h1>

               <div className="flex justify-between items-center text-sm font-medium">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-[#ff1744] font-bold">V</span>
                     </div>
                     <span>VoxCoin</span>
                  </div>
                  <span className="text-gray-400">**** 8842</span>
               </div>
            </div>

            <div className="flex justify-around">
               <WalletAction icon={<ArrowUpRight />} label="Send" />
               <WalletAction icon={<ArrowDownLeft />} label="Receive" />
               <WalletAction icon={<QrCode />} label="Scan" />
               <WalletAction icon={<CreditCard />} label="Top Up" />
            </div>
         </div>

         {/* Transactions */}
         <div className="flex-1 p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-900">Recent Transactions</h3>
               <button className="text-[#ff1744] font-bold text-sm">See All</button>
            </div>

            <div className="bg-white rounded-2xl p-2 shadow-sm">
               {TRANSACTIONS.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                           {tx.type === 'in' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div>
                           <p className="font-bold text-gray-900">{tx.name}</p>
                           <p className="text-xs text-gray-400">{tx.date}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`font-bold ${tx.type === 'in' ? 'text-green-600' : 'text-gray-900'}`}>
                           {tx.type === 'in' ? '+' : '-'}${tx.amount}
                        </p>
                        <p className="text-xs text-gray-400">Completed</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

const WalletAction = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
   <div className="flex flex-col items-center gap-2 cursor-pointer group">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-900 flex items-center justify-center group-hover:bg-[#ff1744] group-hover:text-white transition-all shadow-sm">
         {icon}
      </div>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
   </div>
);

const TRANSACTIONS = [
   { name: 'Sarah Connor', date: 'Today, 10:45 AM', amount: '50.00', type: 'out' },
   { name: 'VoxSpace Rewards', date: 'Yesterday', amount: '120.00', type: 'in' },
   { name: 'Premium Space', date: 'Dec 24', amount: '9.99', type: 'out' },
   { name: 'John Wick', date: 'Dec 20', amount: '250.00', type: 'in' },
];

export default WalletView;
