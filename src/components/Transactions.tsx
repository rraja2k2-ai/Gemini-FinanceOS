/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  CreditCard, 
  Folder, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { Account, Project, TransactionHeader, TransactionItem } from '../types';

interface TransactionsProps {
  accounts: Account[];
  projects: Project[];
  headers: TransactionHeader[];
  items: TransactionItem[];
}

export default function Transactions({ accounts, projects, headers, items }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [expandedHeaderId, setExpandedHeaderId] = useState<string | null>(null);

  // Toggle row expansion (itemised visibility)
  const toggleRow = (id: string) => {
    setExpandedHeaderId(prev => prev === id ? null : id);
  };

  // Get list of unique categories for filters
  const uniqueCategories = Array.from(new Set(items.map(i => i.category)));

  // Filter criteria application
  const filteredHeaders = headers.filter(h => {
    // 1. Matches Search Term
    const corrAccount = accounts.find(a => a.id === h.account_id);
    const corrProject = projects.find(p => p.id === h.project_id);
    const headerItems = items.filter(i => i.header_id === h.id);

    // Search terms check: Merchant, notes, account name, project name, or item description
    const merchantMatch = h.merchant.toLowerCase().includes(searchTerm.toLowerCase());
    const notesMatch = h.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const accountMatch = corrAccount?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const projectMatch = corrProject?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const anyItemMatch = headerItems.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchText = merchantMatch || notesMatch || accountMatch || projectMatch || anyItemMatch;

    // 2. Matches Category Filter
    const matchCategory = !selectedCategory || headerItems.some(item => item.category === selectedCategory);

    // 3. Matches Account Filter
    const matchAccount = !selectedAccountId || h.account_id === selectedAccountId;

    return matchText && matchCategory && matchAccount;
  }).sort((a, b) => {
    const parseDate = (dStr: string) => {
      const [d, m, y] = dStr.split('/').map(Number);
      return new Date(y, m - 1, d).getTime();
    };
    return parseDate(b.date) - parseDate(a.date); // Newest first
  });

  return (
    <div className="space-y-6 text-left" id="transactions-container">
      {/* Overview Card */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold uppercase tracking-widest">ledger audit registry</span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">Transaction Ledger</h1>
          <p className="text-slate-400 text-sm mt-1">A consolidated join of master header details and itemised ledger rows.</p>
        </div>
      </div>

      {/* Audit filter bar controls */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-12 gap-3" id="filters-panel">
        
        {/* Universal Search bar input */}
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search merchant, account, projects, or description..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none font-sans"
          />
        </div>

        {/* Category filtering selection */}
        <div className="md:col-span-3">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-400 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Account filtering selection */}
        <div className="md:col-span-3">
          <select 
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-400 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Accounts</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <div className="md:col-span-1">
          <button 
            onClick={() => { setSearchTerm(''); setSelectedCategory(''); setSelectedAccountId(''); }}
            className="w-full h-full text-xs font-mono font-medium border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl py-2.5 transition cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Ledger Database table */}
      <div className="bg-slate-900/95 rounded-2xl border border-slate-800 overflow-hidden shadow-xl" id="ledger-table-panel">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-805 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-950/40">
                <th className="py-3.5 px-5 font-semibold text-center w-12">Expand</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold">Merchant / Narrative</th>
                <th className="py-3.5 px-4 font-semibold">Target Account</th>
                <th className="py-3.5 px-4 font-semibold">Project Goal</th>
                <th className="py-3.5 px-4 font-semibold text-right">Value amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHeaders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono italic">
                    No matching ledger headers recovered. Refine active constraints.
                  </td>
                </tr>
              ) : (
                filteredHeaders.map(h => {
                  const corrAccount = accounts.find(a => a.id === h.account_id);
                  const corrProject = projects.find(p => p.id === h.project_id);
                  const headerItems = items.filter(i => i.header_id === h.id);
                  const isExpanded = expandedHeaderId === h.id;

                  return (
                    <React.Fragment key={h.id}>
                      {/* Main Header row */}
                      <tr 
                        onClick={() => toggleRow(h.id)}
                        className={`hover:bg-slate-850/30 transition cursor-pointer ${isExpanded ? 'bg-slate-850/10' : ''}`}
                      >
                        <td className="py-4 px-5 text-center text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 mx-auto" /> : <ChevronDown className="w-4 h-4 text-slate-500 mx-auto" />}
                        </td>
                        <td className="py-4 px-4 text-slate-400 font-medium font-mono text-[11px]">{h.date}</td>
                        <td className="py-4 px-4">
                          <span className="font-sans font-semibold text-white block text-sm">{h.merchant}</span>
                          {h.notes && <span className="text-[11px] text-slate-500 font-sans block truncate max-w-xs">{h.notes}</span>}
                        </td>
                        <td className="py-4 px-4 text-slate-350">
                          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-slate-800/40 text-indigo-300 rounded-lg">
                            <CreditCard className="w-3 h-3 text-indigo-400" />
                            {corrAccount ? corrAccount.name : 'Unassigned'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-amber-300">
                          {corrProject ? (
                            <span className="inline-flex items-center gap-1 py-1 px-2 bg-amber-500/5 text-amber-400 rounded-lg text-[11px]">
                              {corrProject.name}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm font-bold text-white tracking-tight">{h.currency} {h.total_amount.toFixed(2)}</span>
                        </td>
                      </tr>

                      {/* Collapsible itemised nested grid layout */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-950/50 p-4 border-l-2 border-indigo-500">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                                  Expanded dual entry matching breakdown // header_id: {h.id}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  {headerItems.map((item, idx) => (
                                    <div key={item.id} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                                      <div className="space-y-0.5">
                                        <span className="text-white font-sans font-medium text-xs">{item.description}</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] font-mono font-bold bg-slate-800 text-slate-400 py-0.5 px-1.5 rounded uppercase">
                                            {item.category}
                                          </span>
                                          <span className="text-[10px] text-slate-500 font-mono">Qty: {item.quantity}</span>
                                        </div>
                                      </div>
                                      <span className="font-mono font-bold text-slate-200">
                                        {h.currency} {item.amount.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="p-3 bg-slate-800/10 border border-slate-850 rounded-lg flex flex-col justify-between">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 block">TRANSACTION JOURNAL NOTES</span>
                                    <p className="text-slate-300 font-sans leading-relaxed text-xs">
                                      {h.notes || "No custom annotations recorded. Extracted from original AI capturer modules."}
                                    </p>
                                  </div>
                                  <div className="text-[9px] font-mono text-indigo-400">
                                    Persisted atomically // reconciled cleared date: {h.date}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
