/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFinanceDB } from './useFinanceDB';
import { 
  Sparkles, 
  LayoutDashboard, 
  FileText, 
  Wallet, 
  PiggyBank, 
  Target, 
  TrendingUp, 
  Settings as SettingsIcon,
  RefreshCw,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

// Import subcomponents
import Dashboard from './components/Dashboard';
import AIInbox from './components/AIInbox';
import Transactions from './components/Transactions';
import Accounts from './components/Accounts';
import Budgets from './components/Budgets';
import Projects from './components/Projects';
import Investments from './components/Investments';
import Settings from './components/Settings';

export default function App() {
  const { 
    db, 
    loading, 
    error, 
    refresh, 
    syncDb, 
    submitTransaction, 
    submitInvestmentEvent, 
    resetDb,
    saveSupabaseConfig,
    pushLocalConfigToSupabase,
    fetchSupabaseConfig
  } = useFinanceDB();
  const [activeModule, setActiveModule] = useState<string>('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Simple state transitions to inject updates via our sync hook
  const handleAddAccount = async (newAcc: any) => {
    if (!db) return;
    const prepared = {
      ...newAcc,
      id: `acc_${Date.now()}`,
      last_updated: '11/06/2026'
    };
    const updated = {
      ...db,
      accounts: [...db.accounts, prepared]
    };
    await syncDb(updated);
  };

  const handleRemoveAccount = async (id: string) => {
    if (!db) return;
    const updated = {
      ...db,
      accounts: db.accounts.filter(a => a.id !== id),
      investment_account_summary: db.investment_account_summary.filter(ias => ias.account_id !== id)
    };
    await syncDb(updated);
  };

  const handleAddBudget = async (newB: any) => {
    if (!db) return;
    const prepared = {
      ...newB,
      id: `b_${Date.now()}`
    };
    const updated = {
      ...db,
      budgets: [...db.budgets, prepared]
    };
    await syncDb(updated);
  };

  const handleModifyBudget = async (id: string, newAllocated: number) => {
    if (!db) return;
    const updated = {
      ...db,
      budgets: db.budgets.map(b => b.id === id ? { ...b, allocated: newAllocated } : b)
    };
    await syncDb(updated);
  };

  const handleRemoveBudget = async (id: string) => {
    if (!db) return;
    const updated = {
      ...db,
      budgets: db.budgets.filter(b => b.id !== id)
    };
    await syncDb(updated);
  };

  const handleAddProject = async (newP: any) => {
    if (!db) return;
    const prepared = {
      ...newP,
      id: `p_${Date.now()}`,
      completed: false
    };
    const updated = {
      ...db,
      projects: [...db.projects, prepared]
    };
    await syncDb(updated);
  };

  const handleAddProjectBudget = async (newPb: any) => {
    if (!db) return;
    const prepared = {
      ...newPb,
      id: `pb_${Date.now()}`
    };
    const updated = {
      ...db,
      project_budgets: [...db.project_budgets, prepared]
    };
    await syncDb(updated);
  };

  const handleRemoveProject = async (id: string) => {
    if (!db) return;
    const updated = {
      ...db,
      projects: db.projects.filter(p => p.id !== id),
      project_budgets: db.project_budgets.filter(pb => pb.project_id !== id)
    };
    await syncDb(updated);
  };

  // Nav menus roster
  const mainNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'AI Inbox', icon: Sparkles, badge: true },
    { name: 'Transactions', icon: FileText },
    { name: 'Accounts', icon: Wallet },
    { name: 'Budgets', icon: PiggyBank },
    { name: 'Projects', icon: Target },
    { name: 'Investments', icon: TrendingUp },
    { name: 'Settings', icon: SettingsIcon }
  ];

  if (loading && !db) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-center p-6">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <div>
          <h2 className="text-white font-display font-bold text-lg">Powering up FinanceOS 2.0</h2>
          <p className="text-slate-500 text-xs mt-1 font-mono">Reconciling internal ledgers and spinning Express containers...</p>
        </div>
      </div>
    );
  }

  if (error || !db) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-14 w-14 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/30">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-white font-display font-extrabold text-xl">Operational Desync</h2>
          <p className="text-slate-400 text-sm max-w-sm">
            {error || 'Database registry desynchronisation occurred.'}
          </p>
        </div>
        <button 
          onClick={refresh}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Re-trigger Sync
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans" id="financeos-workspace">
      
      {/* 1. Left hand drawer Navbar sidebar (desktop first) */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-850 z-30 w-64 transform lg:translate-x-0 lg:static transition duration-200 flex flex-col justify-between ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        id="side-navigator"
      >
        <div className="flex flex-col flex-1">
          {/* Brand header */}
          <div className="h-16 border-b border-slate-850 flex items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-white font-display font-black tracking-tight text-md">FinanceOS 2.0</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items list */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {mainNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeModule === item.name;

              return (
                <button 
                  key={item.name}
                  onClick={() => {
                    setActiveModule(item.name);
                    setSidebarOpen(false);
                  }}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${isActive ? 'bg-indigo-600/15 text-indigo-400 font-bold border-l-2 border-indigo-500' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                  id={`nav-item-${item.name.replace(' ', '')}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info lockup */}
        <div className="p-4 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>{db?.supabaseConnected ? "EMBEDDED CLOUD SYNC" : "LOCAL SANDBOX ENGINE"}</span>
          <span className={`flex h-2 w-2 rounded-full animate-pulse ${db?.supabaseConnected ? "bg-emerald-500" : "bg-indigo-500"}`} />
        </div>
      </aside>

      {/* 2. Main operational container window */}
      <div className="flex-1 flex flex-col min-w-0" id="operational-window">
        {/* Top bar header */}
        <header className="h-16 border-b border-slate-850 flex items-center justify-between px-6 lg:px-8 bg-slate-900/40 backdrop-blur-md">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block text-xs font-mono text-slate-500">
            Operating Date: <span className="text-slate-300 font-medium">11 Jun 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-500">USER:</span>
            <span className="text-indigo-300 font-semibold uppercase">{db?.accounts[0]?.currency ? "SGD CENTRAL" : "OFFLINE"}</span>
          </div>
        </header>

        {/* Dynamic sub-module viewport */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8" id="viewport-stage">
          {activeModule === 'Dashboard' && (
            <Dashboard 
              db={db} 
              onNavigate={(mod) => setActiveModule(mod)} 
              pendingReviewsCount={1} 
            />
          )}

          {activeModule === 'AI Inbox' && (
            <AIInbox 
              accounts={db.accounts}
              projects={db.projects}
              onSubmitTransaction={submitTransaction}
            />
          )}

          {activeModule === 'Transactions' && (
            <Transactions 
              accounts={db.accounts}
              projects={db.projects}
              headers={db.transaction_headers}
              items={db.transaction_items}
            />
          )}

          {activeModule === 'Accounts' && (
            <Accounts 
              accounts={db.accounts}
              onAddAccount={handleAddAccount}
              onRemoveAccount={handleRemoveAccount}
            />
          )}

          {activeModule === 'Budgets' && (
            <Budgets 
              budgets={db.budgets}
              onAddBudget={handleAddBudget}
              onModifyAllocation={handleModifyBudget}
              onRemoveBudget={handleRemoveBudget}
            />
          )}

          {activeModule === 'Projects' && (
            <Projects 
              projects={db.projects}
              projectBudgets={db.project_budgets}
              onAddProject={handleAddProject}
              onAddProjectBudget={handleAddProjectBudget}
              onRemoveProject={handleRemoveProject}
            />
          )}

          {activeModule === 'Investments' && (
            <Investments 
              accounts={db.accounts}
              summaries={db.investment_account_summary}
              events={db.investment_events}
              snapshots={db.investment_snapshots}
              onAddInvestmentEvent={submitInvestmentEvent}
            />
          )}

          {activeModule === 'Settings' && (
            <Settings 
              onResetDb={resetDb}
              saveSupabaseConfig={saveSupabaseConfig}
              pushLocalConfigToSupabase={pushLocalConfigToSupabase}
              fetchSupabaseConfig={fetchSupabaseConfig}
              supabaseConnected={db?.supabaseConnected}
              supabaseTablesMissing={db?.supabaseTablesMissing}
              supabaseUrl={db?.supabaseUrl}
              supabaseError={db?.supabaseError}
            />
          )}
        </main>
      </div>

    </div>
  );
}
