/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Coins, 
  ArrowRightLeft, 
  Trash2, 
  CreditCard, 
  UserSquare2,
  X,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Account } from '../types';

interface AccountsProps {
  accounts: Account[];
  onAddAccount: (newAcc: Omit<Account, 'id' | 'last_updated'>) => void;
  onRemoveAccount: (id: string) => void;
}

export default function Accounts({ accounts, onAddAccount, onRemoveAccount }: AccountsProps) {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<Account['type']>('Savings');
  const [newBalance, setNewBalance] = useState<string>('');
  const [newCurrency, setNewCurrency] = useState<string>('SGD');
  const [newNumber, setNewNumber] = useState<string>('');

  // Extract all unique currencies
  const currencies = Array.from(new Set(accounts.map(a => a.currency)));

  const handleCreate = () => {
    if (!newName.trim()) return;
    onAddAccount({
      name: newName,
      type: newType,
      balance: Number(newBalance) || 0,
      currency: newCurrency,
      account_number: newNumber || undefined
    });
    // Reset
    setNewName('');
    setNewBalance('');
    setNewNumber('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 text-left" id="accounts-container">
      {/* Page Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold uppercase tracking-widest">operational safe accounts holdings</span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">Accounts & Ledgers</h1>
          <p className="text-slate-400 text-sm mt-1">Multi-currency savings channels, credit cards, and broker portfolios.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-indigo-200" />
          Propose holding channel
        </button>
      </div>

      {/* Multi-Currency accounts grouping layout */}
      <div className="space-y-8" id="currency-ledgers-wrapper">
        {currencies.map(curr => {
          const currAccs = accounts.filter(a => a.currency === curr);
          const totalBalance = currAccs.reduce((sum, a) => sum + (a.type === 'Credit Cards' ? a.balance : a.balance), 0);

          return (
            <div key={curr} className="space-y-4 filter-currency-section">
              {/* Currency Header bar summary */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-display font-medium text-white tracking-widest">{curr}</span>
                  <span className="text-slate-500 text-xs font-mono">reconciled portfolio</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-500 uppercase block">Currency Balance (Net)</span>
                  <span className="text-sm font-bold text-slate-300">
                    {curr} {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Sub-Grouping by operational account types */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currAccs.map(acc => (
                  <div 
                    key={acc.id} 
                    className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-slate-700/80 transition relative flex flex-col justify-between overflow-hidden group min-h-[140px]"
                    id={`acc-card-${acc.id}`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition" />
                    
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                          {acc.type}
                        </span>
                        <h4 className="text-white font-sans font-semibold text-sm truncate">{acc.name}</h4>
                        {acc.account_number && (
                          <span className="text-[10px] text-slate-500 font-mono font-medium block">#{acc.account_number}</span>
                        )}
                      </div>
                      <button 
                        onClick={() => onRemoveAccount(acc.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-850 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Remove bank channel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between mt-6 border-t border-slate-800/40 pt-3">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">reconciled</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{acc.last_updated}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-mono font-bold text-white">
                          {curr} {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Account addition overlay modal drawer */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 text-left glow-indigo">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-display font-semibold text-white">Propose holding channel</h3>
                <p className="text-slate-400 text-xs">Append new liquid or credit accounts to the core ledger database.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Channel name</label>
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Wise USD Debit Card"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Holding Type</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Credit Cards">Credit Card Account</option>
                    <option value="Investments">Investments Portfolio</option>
                    <option value="Cash Wallets">Cash Wallet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Base Currency</label>
                  <select 
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SGD">SGD (S$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Opening Balance</label>
                  <input 
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-right font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Account Number (Optional)</label>
                  <input 
                    type="text"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="e.g. VISA-3324"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Register Holdings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
