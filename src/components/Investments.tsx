/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Coins, 
  ArrowUpRight, 
  Activity, 
  Plus, 
  RefreshCw, 
  Layers, 
  Share2, 
  Sliders,
  Calendar,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';
import { Account, InvestmentAccountSummary, InvestmentEvent, InvestmentSnapshot } from '../types';

interface InvestmentsProps {
  accounts: Account[];
  summaries: InvestmentAccountSummary[];
  events: InvestmentEvent[];
  snapshots: InvestmentSnapshot[];
  onAddInvestmentEvent: (payload: {
    account_id: string;
    type: 'capital_in' | 'dividend_reinvest' | 'profit_reinvest' | 'realized_gain' | 'realized_loss';
    amount: number;
    description: string;
    date: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function Investments({ accounts, summaries, events, snapshots, onAddInvestmentEvent }: InvestmentsProps) {
  const [showAllocateModal, setShowAllocateModal] = useState<boolean>(false);
  
  // Form states
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [eventType, setEventType] = useState<'capital_in' | 'dividend_reinvest' | 'profit_reinvest' | 'realized_gain' | 'realized_loss'>('capital_in');
  const [eventAmount, setEventAmount] = useState<string>('');
  const [eventDesc, setEventDesc] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('11/06/2026');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter accounts of type 'Investments'
  const investAccs = accounts.filter(a => a.type === 'Investments');

  // Trigger modal launch
  const handleOpenAllocate = () => {
    if (investAccs.length > 0) {
      setTargetAccountId(investAccs[0].id);
      setShowAllocateModal(true);
    }
  };

  const handleApplyAllocation = async () => {
    if (!targetAccountId || !eventAmount || !eventDate) return;
    setLoading(true);
    setErrorMsg(null);
    const res = await onAddInvestmentEvent({
      account_id: targetAccountId,
      type: eventType,
      amount: Number(eventAmount),
      description: eventDesc,
      date: eventDate
    });

    if (res.success) {
      setEventAmount('');
      setEventDesc('');
      setShowAllocateModal(false);
    } else {
      setErrorMsg(res.error || 'Server error deploying capital.');
    }
    setLoading(false);
  };

  // Convert snapshots to charting elements
  // We align timeline milestones for Syfe REIT snapshots specifically for graphing
  const chartData = snapshots
    .filter(s => s.account_id === 'acc_syfe')
    .map(s => ({
      date: s.date.split('/').slice(0, 2).join('/'), // '31/01/2026' -> '31/01'
      value: s.value
    }));

  return (
    <div className="space-y-6 text-left" id="investments-container">
      {/* Page Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold uppercase tracking-widest">operational capital compounder module</span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">Investments & Assets</h1>
          <p className="text-slate-400 text-sm mt-1">Track fresh integrations, compounding yield absolute returns, and active portfolio snapshots.</p>
        </div>
        <button 
          onClick={handleOpenAllocate}
          disabled={investAccs.length === 0}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-200" />
          Deploy capital
        </button>
      </div>

      {/* Main Portfolios summaries list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="investment-summaries-grid">
        {summaries.map(sum => {
          const acc = accounts.find(a => a.id === sum.account_id);
          const yieldPct = sum.fresh_capital > 0 ? (sum.absolute_returns / sum.fresh_capital) * 100 : 0;

          return (
            <div 
              key={sum.id} 
              className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700/80 transition shadow-lg relative overflow-hidden group min-h-[220px]"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/5 py-0.5 px-2 rounded-full">
                      compounded portfolio
                    </span>
                    <h3 className="text-white font-sans font-bold text-base mt-1">{acc ? acc.name : 'Unknown Assets'}</h3>
                  </div>
                  <span className="text-emerald-400 font-bold font-mono text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    +{yieldPct.toFixed(1)}% Yield
                  </span>
                </div>

                {/* Quantitative statistics list breakdown */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-850 pt-3 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 uppercase block">Fresh Deployment</span>
                    <span className="font-bold text-slate-350">{acc?.currency} {sum.fresh_capital.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 uppercase block font-sans">Dividends Reinvested</span>
                    <span className="font-semibold text-indigo-300">{acc?.currency} {sum.dividends_reinvested.toLocaleString()}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 uppercase block">Profit reinvested</span>
                    <span className="font-semibold text-indigo-300">{acc?.currency} {sum.profit_reinvested.toLocaleString()}</span>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-slate-500 uppercase block">Realized profits</span>
                    <span className="font-semibold text-emerald-400">{acc?.currency} {sum.realized_profit.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Total evaluations */}
              <div className="border-t border-slate-805 pt-4 mt-4 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-sans leading-[1]">absolute yield returns</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{acc?.currency} {sum.absolute_returns.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans leading-[1]">market evaluation val</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {acc?.currency} {sum.current_market_value.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Area snap charts and transactional ledger events split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="investments-deep-split">
        
        {/* Syfe REIT historical growth chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl space-y-4">
          <div>
            <h3 className="text-lg font-display font-medium text-white">Time-series assets evaluation</h3>
            <p className="text-slate-400 text-xs">Simulated active valuation trends for Syfe REIT premium portfolio holdings.</p>
          </div>

          <div className="h-64" id="investments-recharts-curve">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorInvSnap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontFamily="JetBrains Mono" 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  fontFamily="JetBrains Mono" 
                  tickLine={false} 
                  axisLine={false}
                  domain={['dataMin - 1000', 'dataMax + 1000']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorInvSnap)" strokeWidth={2.5} name="Evaluation" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic transaction events ledger list (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 p-6 rounded-2xl border border-slate-805 space-y-4">
          <div>
            <h3 className="text-lg font-display font-medium text-white">Operational Events Ledger</h3>
            <p className="text-slate-400 text-xs">Historical capital infusions and rebalancings.</p>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {events.map(ev => {
              const acc = accounts.find(a => a.id === ev.account_id);
              return (
                <div key={ev.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded ${ev.type === 'capital_in' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {ev.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500">{ev.date}</span>
                    </div>
                    <span className="text-white font-sans text-xs block font-medium pt-1">{ev.description}</span>
                  </div>
                  <span className="font-bold text-white pl-2">
                    {acc?.currency} {ev.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Capital deployment modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-5 text-left glow-indigo">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-display font-semibold text-white">Deploy capital</h3>
                <p className="text-slate-400 text-xs">Register a new funding event, dividend distribution, or rebalancing profit.</p>
              </div>
              <button onClick={() => setShowAllocateModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Asset Holding Portfolio</label>
                <select 
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none"
                >
                  {investAccs.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Event Type</label>
                  <select 
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="capital_in">Fresh Capital</option>
                    <option value="dividend_reinvest">Dividend Reinvest</option>
                    <option value="profit_reinvest">Profit Reinvest</option>
                    <option value="realized_gain">Realized Gain</option>
                    <option value="realized_loss">Realized Loss</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Amount (Holdings)</label>
                  <input 
                    type="number"
                    value={eventAmount}
                    onChange={(e) => setEventAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-right focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Description note</label>
                  <input 
                    type="text"
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="e.g. Q2 Dividend Payout Reinvested"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Transaction Date</label>
                <input 
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-center focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button 
                onClick={() => setShowAllocateModal(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                disabled={loading}
                onClick={handleApplyAllocation}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                Deploy Allocation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
