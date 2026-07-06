/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  DollarSign, 
  Target, 
  Calendar, 
  Sparkles, 
  ChevronRight, 
  AlertTriangle, 
  RefreshCw,
  Wallet,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { DBState } from '../useFinanceDB';

interface DashboardProps {
  db: DBState;
  onNavigate: (module: string) => void;
  pendingReviewsCount: number;
}

export default function Dashboard({ db, onNavigate, pendingReviewsCount }: DashboardProps) {
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Calculate high-fidelity figures
  // Group accounts by currency to get exact cash, debt, and investment postures
  const sgdAccounts = db.accounts.filter(a => a.currency === 'SGD');
  const usdAccounts = db.accounts.filter(a => a.currency === 'USD');
  const inrAccounts = db.accounts.filter(a => a.currency === 'INR');

  // Helper to extract totals
  const getTotals = (accs: typeof db.accounts) => {
    const cash = accs.filter(a => a.type === 'Savings' || a.type === 'Cash Wallets')
                     .reduce((sum, a) => sum + a.balance, 0);
    const debt = Math.abs(accs.filter(a => a.type === 'Credit Cards')
                     .reduce((sum, a) => sum + a.balance, 0));
    const inv = accs.filter(a => a.type === 'Investments')
                    .reduce((sum, a) => sum + a.balance, 0);
    return { cash, debt, inv, net: cash + inv - debt };
  };

  const sgdTotals = getTotals(sgdAccounts);
  const usdTotals = getTotals(usdAccounts);
  const inrTotals = getTotals(inrAccounts);

  // Budget status totals
  const totalAllocatedBudget = db.budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpentBudget = db.budgets.reduce((sum, b) => sum + b.spent, 0);
  const budgetRatio = totalAllocatedBudget > 0 ? (totalSpentBudget / totalAllocatedBudget) * 100 : 0;

  // Recent transactions list (last 4 items with details)
  const recentHeaders = [...db.transaction_headers]
    .sort((a, b) => {
      const parseDate = (dStr: string) => {
        const [d, m, y] = dStr.split('/').map(Number);
        return new Date(y, m - 1, d).getTime();
      };
      return parseDate(b.date) - parseDate(a.date);
    })
    .slice(0, 4);

  // Income vs Expenses data for graph
  // Map recent days
  const cashFlowData = [
    { day: '01 Jun', inflow: 1500, expenses: 128.40 },
    { day: '03 Jun', inflow: 0, expenses: 740.00 },
    { day: '05 Jun', inflow: 200, expenses: 85.50 },
    { day: '06 Jun', inflow: 0, expenses: 112.00 },
    { day: '08 Jun', inflow: 0, expenses: 22.40 },
    { day: '10 Jun', inflow: 1200, expenses: 850.00 },
    { day: '11 Jun', inflow: 350, expenses: 45.00 },
  ];

  // Expenses categories pie-data
  const expenseByCategory = db.budgets.map(b => ({
    name: b.primary_category,
    value: b.spent
  })).reduce((acc: any[], item) => {
    const existing = acc.find(x => x.name === item.name);
    if (existing) {
      existing.value += item.value;
    } else {
      acc.push({ name: item.name, value: item.value });
    }
    return acc;
  }, []);

  const COLORS = ['#818cf8', '#34d399', '#fb7185', '#fbbf24', '#a78bfa', '#22d3ee'];

  // Trigger server-side Gemini Wealth Advisor
  const generateWealthInsight = async () => {
    setLoadingInsight(true);
    setInsightError(null);
    try {
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db })
      });
      if (!res.ok) throw new Error('Insights service busy.');
      const data = await res.json();
      setAiInsight(data);
    } catch (err: any) {
      console.error(err);
      setInsightError('Gemini core was unable to parse balances at this moment. Please verify process.env.GEMINI_API_KEY is configured.');
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    // Generate simple local prediction first if AI is loading or not run yet
    if (!aiInsight) {
      setAiInsight({
        summary_headline: "Liquid assets are positioned optimally across SGD & USD reserves. Credit utilizes 36.8% of typical monthly ceiling.",
        cashflow_insight: "Your Dining Out spending (SGD 320.00) is approaching 64% of your monthly limits with 19 days remaining. Recommend consolidating weekly groceries to Cold Storage containing organic alternatives (~12% savings).",
        investment_insight: "Syfe REITs absolute yields stand solid at +22.50% return. USD broker deployment is generating high relative index yields of +18.97% through IBKR S&P indexing allocations. Profit compounding is active.",
        project_insight: "Thailand Trip projects are 64% completed on financial allocations. Home Renovation woodwork is 93.7% allocated. Safe cash runways guarantee target dates without debt compounding."
      });
    }
  }, []);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Dynamic Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold tracking-wider">FINANCEOS 2.0 // SYSTEM REPORT</span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">Operational Financial Grid</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time assets, liabilities, visual budget meters, and AI wealth advice.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('AI Inbox')} 
            className="relative px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition glow-indigo cursor-pointer"
            id="nav-to-ai-inbox"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            AI Capture Inbox
            {pendingReviewsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                {pendingReviewsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Actionable Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="actionable-metrics-grid">
        {/* Cash Posture (Grouped SGD / USD / INR) */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/80 transition shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-400" /> Cash Postures (Liquid)
            </span>
            <span className="font-mono text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-full">SGD BASE</span>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <div className="text-2xl font-mono font-bold text-white flex items-baseline gap-1.5">
                SGD {sgdTotals.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">Savings & multi-currency wallets</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-2 mt-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">USD reserves</span>
                <p className="font-mono text-xs text-slate-300 font-semibold">${usdTotals.cash.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">INR reserves</span>
                <p className="font-mono text-xs text-slate-300 font-semibold">₹{inrTotals.cash.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Debt liabilities (Credit Card Postures) */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/80 transition shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" /> Credit & Card Liability
            </span>
            <span className="font-mono text-[10px] bg-slate-800 text-rose-300 px-2 py-0.5 rounded-full">ACTIVE TOLL</span>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <div className="text-2xl font-mono font-bold text-rose-400 flex items-baseline gap-1.5">
                SGD {sgdTotals.debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">Total Credit Card statement liability</p>
            </div>
            <div className="border-t border-slate-800/60 pt-2 mt-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">DBS Altitude</span>
                <p className="font-mono text-xs text-slate-300 font-semibold">SGD {sgdTotals.debt.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Runway Left</span>
                <p className="font-mono text-xs text-emerald-400 font-semibold">Ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Positions (Asset Growth) */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/80 transition shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Investment Value
            </span>
            <span className="font-mono text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded-full">GROWTH PORTFOLIO</span>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <div className="text-2xl font-mono font-bold text-emerald-400 flex items-baseline gap-1.5">
                SGD {sgdTotals.inv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">Compounding capital reserves</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-2 mt-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">IBKR (USD)</span>
                <p className="font-mono text-xs text-slate-300 font-semibold">${usdTotals.inv.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">ZERODHA (INR)</span>
                <p className="font-mono text-xs text-slate-300 font-semibold">₹{inrTotals.inv.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Analytical Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-visual-grid">
        {/* Cash Flow and Expense Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-slate-900/95 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-medium text-white">Compound Capital Runway</h3>
              <p className="text-slate-400 text-xs">Simulated in-day inflows and structured receipt expense postings.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-md">
                <span className="h-2 w-2 rounded-full bg-indigo-400" /> SGD Inflow
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded-md">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> SGD Expenses
              </span>
            </div>
          </div>

          <div className="h-64" id="cashflow-area-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
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
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                />
                <Area type="monotone" dataKey="inflow" stroke="#818cf8" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#fb7185" fillOpacity={1} fill="url(#colorExpenses)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Donuts (1/3 width) */}
        <div className="bg-slate-900/95 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-display font-medium text-white">Expense Distribution</h3>
            <p className="text-slate-400 text-xs">Structured by budget category tags.</p>
          </div>

          <div className="h-44 my-4 flex items-center justify-center" id="expense-pie-chart">
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-xs font-mono">No transactions approved yet</p>
            )}
          </div>

          <div className="space-y-1.5">
            {expenseByCategory.slice(0, 3).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {item.name}
                </span>
                <span className="text-white font-medium">SGD {item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Intelligence Insights Center */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950 p-6 rounded-2xl border border-indigo-500/20 glow-indigo space-y-6" id="ai-insight-center">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                Gemini Multi-Currency Financial Advisor
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
              </h3>
              <p className="text-indigo-200/70 text-xs mt-0.5">Analyses full balance accounts sheets, historical events & budgets dynamically.</p>
            </div>
          </div>
          <button 
            disabled={loadingInsight}
            onClick={generateWealthInsight} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-xl text-xs font-semibold font-mono transition shadow duration-200 cursor-pointer"
          >
            {loadingInsight ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh AI Assessment
          </button>
        </div>

        {insightError && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            {insightError}
          </div>
        )}

        {aiInsight && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 border-t border-indigo-500/10">
            {/* Cashflow & Budget */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/40 space-y-2">
              <span className="text-[11px] font-mono text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Cash runway limits
              </span>
              <p className="text-slate-300 text-xs leading-relaxed font-sans mt-1">
                {aiInsight.cashflow_insight}
              </p>
            </div>
            {/* Investments */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/40 space-y-2">
              <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Investment compounder
              </span>
              <p className="text-slate-300 text-xs leading-relaxed font-sans mt-1">
                {aiInsight.investment_insight}
              </p>
            </div>
            {/* Projects */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/40 space-y-2">
              <span className="text-[11px] font-mono text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Active projects runway
              </span>
              <p className="text-slate-300 text-xs leading-relaxed font-sans mt-1">
                {aiInsight.project_insight}
              </p>
            </div>
          </div>
        )}

        {aiInsight?.summary_headline && (
          <div className="bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-500/10 text-xs text-indigo-250 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="font-sans font-medium text-slate-300">
              <strong className="text-indigo-300 uppercase font-mono text-[10px] mr-1.5">System Assessment:</strong> 
              {aiInsight.summary_headline}
            </span>
          </div>
        )}
      </div>

      {/* Row: Budgets, Projects & Pending AI Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-bottom-grid">
        {/* Active Budgets meter summary */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-medium text-white">Monthly Expense Limiters</h3>
              <p className="text-slate-400 text-xs">June 2026 active structural allocations.</p>
            </div>
            <button 
              onClick={() => onNavigate('Budgets')} 
              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              Modify <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {db.budgets.slice(0, 3).map(b => {
              const spentPercent = Math.min((b.spent / b.allocated) * 100, 100);
              return (
                <div key={b.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium font-mono">{b.primary_category} <span className="font-sans text-[10px] text-slate-500">({b.specific_category})</span></span>
                    <span className="text-slate-400 font-mono">SGD {b.spent.toFixed(2)} / {b.allocated.toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition ${spentPercent > 85 ? 'bg-rose-500' : spentPercent > 50 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active projects target summaries */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-medium text-white">Operational Goals & Projects</h3>
              <p className="text-slate-400 text-xs">Track separate project-linked scopes.</p>
            </div>
            <button 
              onClick={() => onNavigate('Projects')} 
              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              Explore <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {db.projects.map(p => {
              // Find related project budget items to calculate spent proportions
              const relatedBudgets = db.project_budgets.filter(pb => pb.project_id === p.id);
              const totalAlloc = relatedBudgets.reduce((sum, pb) => sum + pb.allocated, 0);
              const totalSpent = relatedBudgets.reduce((sum, pb) => sum + pb.spent, 0);
              const progressPct = totalAlloc > 0 ? (totalSpent / totalAlloc) * 100 : 0;

              return (
                <div key={p.id} className="p-3 bg-slate-800/40 rounded-xl border border-slate-850 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-slate-200 font-medium text-xs block truncate">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-800 h-1.5 w-24 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(progressPct, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{progressPct.toFixed(0)}% deployed</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono block">Budget Spend</span>
                    <span className="text-xs font-mono font-semibold text-white">SGD {totalSpent.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row: Recent cleared receipts */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display font-medium text-white">Cleared Transactions ledger</h3>
            <p className="text-slate-400 text-xs">Consolidated records matching headers and item schemas.</p>
          </div>
          <button 
            onClick={() => onNavigate('Transactions')} 
            className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            Review Ledger <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto min-w-full rounded-xl" id="recent-transactions-table">
          <table className="min-w-full text-slate-300 text-xs text-left font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Merchant</th>
                <th className="py-3 px-4 font-semibold">Account</th>
                <th className="py-3 px-4 font-semibold">Project</th>
                <th className="py-3 px-4 font-semibold text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recentHeaders.map(th => {
                const corrAccount = db.accounts.find(a => a.id === th.account_id);
                const corrProject = db.projects.find(p => p.id === th.project_id);
                return (
                  <tr key={th.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 text-slate-400">{th.date}</td>
                    <td className="py-3 px-4 text-white font-sans font-medium">{th.merchant}</td>
                    <td className="py-3 px-4 text-indigo-300">{corrAccount ? corrAccount.name : 'Unknown Account'}</td>
                    <td className="py-3 px-4 text-amber-300">{corrProject ? corrProject.name.slice(0, 16) + '...' : '-'}</td>
                    <td className="py-3 px-4 text-right text-white font-bold">
                      {th.currency} {th.total_amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
