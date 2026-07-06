/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  RefreshCw, 
  Info, 
  Key, 
  HardDrive,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Database,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';

interface SettingsProps {
  onResetDb: () => Promise<{ success: boolean; message?: string }>;
  saveSupabaseConfig: (payload: { url: string; anon_key: string; enabled: boolean }) => Promise<{
    success: boolean;
    connectionStatus: string;
    tablesState: string;
    error?: string;
  }>;
  pushLocalConfigToSupabase: () => Promise<{ success: boolean; error?: string; message?: string }>;
  fetchSupabaseConfig: () => Promise<any>;
  supabaseConnected?: boolean;
  supabaseTablesMissing?: boolean;
  supabaseUrl?: string;
  supabaseError?: string;
}

export default function Settings({ 
  onResetDb, 
  saveSupabaseConfig, 
  pushLocalConfigToSupabase, 
  fetchSupabaseConfig,
  supabaseConnected,
  supabaseTablesMissing,
  supabaseUrl,
  supabaseError
}: SettingsProps) {
  const [resetting, setResetting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Supabase input states
  const [supabaseUrlInput, setSupabaseUrlInput] = useState<string>('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState<string>('');
  const [supabaseEnabled, setSupabaseEnabled] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [pushingSeeds, setPushingSeeds] = useState<boolean>(false);
  const [connectionFeedback, setConnectionFeedback] = useState<{
    status: 'unconfigured' | 'connected' | 'connected_schema_missing' | 'error' | 'success';
    message?: string;
    tables?: 'unknown' | 'missing' | 'healthy';
  } | null>(null);

  const [copysuccess, setCopySuccess] = useState<boolean>(false);
  const [showSql, setShowSql] = useState<boolean>(false);

  // Load existing Supabase configs on mount
  useEffect(() => {
    fetchSupabaseConfig().then(cfg => {
      if (cfg) {
        setSupabaseUrlInput(cfg.url || '');
        setSupabaseKeyInput(cfg.hasKey ? '••••••••••••••••••••' : '');
        setSupabaseEnabled(cfg.enabled || false);
        
        if (cfg.enabled) {
          // Determine existing state based on actual database connectivity flags
          if (supabaseConnected) {
            if (supabaseTablesMissing) {
              setConnectionFeedback({ status: 'connected_schema_missing', tables: 'missing' });
            } else {
              setConnectionFeedback({ status: 'connected', tables: 'healthy' });
            }
          } else if (supabaseError) {
            setConnectionFeedback({ status: 'error', message: supabaseError });
          } else {
            setConnectionFeedback({ status: 'connected', tables: 'healthy' });
          }
        }
      }
    });
  }, [fetchSupabaseConfig, supabaseConnected, supabaseTablesMissing, supabaseError]);

  const triggerReset = async () => {
    if (!window.confirm('Are you absolutely sure you want to reset the entire FinanceOS database back to baseline seeded SGD, USD, and INR values?')) return;
    setResetting(true);
    setFeedback(null);
    const res = await onResetDb();
    if (res.success) {
      setFeedback('Database successfully re-seeded with premium multi-currency test assets!');
    } else {
      setFeedback('Reseeding operation failed.');
    }
    setResetting(false);
  };

  const handleSaveConfig = async () => {
    setTestingConnection(true);
    setConnectionFeedback(null);
    const payload = {
      url: supabaseUrlInput,
      anon_key: supabaseKeyInput === '••••••••••••••••••••' ? '' : supabaseKeyInput, // let server keep current if unchanged (empty handled on backend)
      enabled: supabaseEnabled
    };
    
    const res = await saveSupabaseConfig(payload);
    if (res.success) {
      setConnectionFeedback({
        status: res.connectionStatus as any,
        message: res.error,
        tables: res.tablesState as any
      });
    } else {
      setConnectionFeedback({
        status: 'error',
        message: res.error || 'Failed setting up Supabase parameters.'
      });
    }
    setTestingConnection(false);
  };

  const handlePushSeeds = async () => {
    setPushingSeeds(true);
    setFeedback(null);
    const res = await pushLocalConfigToSupabase();
    if (res.success) {
      setFeedback('Successfully synchronization! All local budget datasets, accounts, ledger records exported to Supabase.');
    } else {
      setFeedback(`Export phase failed: ${res.error || 'Verify schema existence.'}`);
    }
    setPushingSeeds(false);
  };

  const sqlSchema = `-- FinanceOS 2.0 SQL Schema setup for Supabase SQL Editor
-- Copy and execute this script inside your Supabase project's SQL Editor to set up everything with one click.

-- 1. Create Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  last_updated TEXT,
  account_number TEXT
);

-- 2. Create Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  primary_category TEXT NOT NULL,
  specific_category TEXT NOT NULL,
  allocated NUMERIC NOT NULL,
  spent NUMERIC NOT NULL
);

-- 3. Create Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC,
  start_date TEXT,
  completed BOOLEAN DEFAULT false
);

-- 4. Create Project Budgets
CREATE TABLE IF NOT EXISTS project_budgets (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  allocated NUMERIC NOT NULL,
  spent NUMERIC NOT NULL
);

-- 5. Create Transaction Headers
CREATE TABLE IF NOT EXISTS transaction_headers (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  merchant TEXT NOT NULL,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'cleared',
  notes TEXT
);

-- 6. Create Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  header_id TEXT REFERENCES transaction_headers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL
);

-- 7. Create Investment summaries
CREATE TABLE IF NOT EXISTS investment_account_summary (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  fresh_capital NUMERIC NOT NULL,
  current_market_value NUMERIC NOT NULL,
  absolute_returns NUMERIC NOT NULL,
  profit_reinvested NUMERIC NOT NULL,
  dividends_reinvested NUMERIC NOT NULL,
  realized_profit NUMERIC NOT NULL,
  realized_loss NUMERIC NOT NULL
);

-- 8. Create Investment events
CREATE TABLE IF NOT EXISTS investment_events (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

-- 9. Create Investment snapshots
CREATE TABLE IF NOT EXISTS investment_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value NUMERIC NOT NULL
);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-6 text-left" id="settings-container">
      {/* Page Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold uppercase tracking-widest">operating system system configurations</span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">System Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure your real external database integrations, manage secure credentials, and reset sandbox systems.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Supabase connection portal (Requested) */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Supabase Real Data Integration
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={supabaseEnabled} 
                  onChange={(e) => setSupabaseEnabled(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-900"></div>
                <span className="ml-2 text-xs font-mono text-slate-400">ACTIVE ENGINE</span>
              </label>
            </div>
            
            <h3 className="text-lg font-display font-bold text-white">External Database Connection</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Unlock true durability. By providing your custom Supabase connection parameters, FinanceOS will synchronize and load live account, transaction, and portfolio records directly from your cloud relational cluster.
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-wider block font-semibold">Project REST URL</label>
                <input 
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-wider block font-semibold">Anon Public Key</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Key className="w-3.5 h-3.5 text-slate-600" />
                  </span>
                  <input 
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-850 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Connection Feedback States */}
            {connectionFeedback && (
              <div className="mt-3">
                {connectionFeedback.status === 'connected' && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Supabase Cloud Connected. </span>
                      <span>The 9 database tables are structured and fully sync-active with zero-latency read/writes.</span>
                    </div>
                  </div>
                )}
                {connectionFeedback.status === 'connected_schema_missing' && (
                  <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-xl text-amber-400 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Tables Not Created Yet</span>
                        <span className="text-[11px] text-slate-400">Connection established successfully, but the expected 9 relational tables do not exist in your Postgres database yet. Copy the SQL schema script below and execute it inside your Supabase project.</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button 
                        onClick={() => setShowSql(!showSql)}
                        className="text-[11px] px-3 py-1 bg-amber-900/10 hover:bg-amber-900/30 border border-amber-800/40 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer text-amber-300"
                      >
                        <FileCode className="w-3 h-3" /> {showSql ? 'Hide SQL Script' : 'View SQL Migration Script'}
                      </button>
                      <button 
                        onClick={handlePushSeeds}
                        disabled={pushingSeeds}
                        className="text-[11px] px-3 py-1 bg-amber-500 text-slate-950 font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-400 disabled:opacity-40"
                      >
                        {pushingSeeds ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />}
                        Export Local Seed Data to Supabase
                      </button>
                    </div>
                  </div>
                )}
                {connectionFeedback.status === 'error' && (
                  <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-rose-400 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block flex items-center gap-1">Parameters Incorrect or Unresolved</span>
                      <span className="text-[11px] text-slate-400 font-mono block mt-1">{connectionFeedback.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="pt-4 flex items-center gap-3">
            <button 
              onClick={handleSaveConfig}
              disabled={testingConnection || !supabaseUrlInput}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {testingConnection ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Save & Verify Cloud Credentials
            </button>
            {supabaseEnabled && connectionFeedback?.status === 'connected' && (
              <button 
                onClick={handlePushSeeds}
                disabled={pushingSeeds}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/50 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {pushingSeeds ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5 text-emerald-400" />}
                Export Current Portfolio to Supabase
              </button>
            )}
          </div>
        </div>

        {/* Core database seed modifier */}
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" /> Database Registry State
            </span>
            <h3 className="text-lg font-display font-bold text-white">Reset/Refurbish Sandbox</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Cleanse all outstanding transaction modifications and completely rebuild the 9-table personal balance sheet. This resets SGD, USD, and INR active reserves to original default portfolios.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {feedback && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-xl text-indigo-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-[11px] leading-normal">{feedback}</span>
              </div>
            )}

            <button 
              disabled={resetting}
              onClick={triggerReset}
              className="w-full py-2.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-transparent text-rose-350 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Re-seed SQLite/JSON Tables
            </button>
          </div>
        </div>
      </div>

      {/* Copyable SQL migration accordion */}
      {(showSql || (connectionFeedback?.status === 'connected_schema_missing')) && (
        <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-6 space-y-4 mt-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-base font-display font-bold text-white">Postgres Schema Migration Script</h3>
                <p className="text-slate-400 text-xs">Run this inside the Supabase SQL editor to scaffold the complete FinanceOS 2.0 schema.</p>
              </div>
            </div>
            <button 
              onClick={copyToClipboard}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copysuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copysuccess ? 'Copied SQL Schema' : 'Copy SQL Schema'}
            </button>
          </div>
          
          <div className="relative mt-2">
            <pre className="max-h-72 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-850 text-slate-330 text-[10px] font-mono leading-relaxed text-left scrolling-beauty select-all">
              {sqlSchema}
            </pre>
          </div>
        </div>
      )}

      {/* Relational Database architecture visualizer */}
      <div className="bg-slate-900/95 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-lg font-display font-bold text-white">Relational Database Table Architecture</h3>
            <p className="text-slate-400 text-xs">A comprehensive schema map representing the transactional boundaries of FinanceOS 2.0.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-3 text-[11px] font-mono">
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">accounts</span>
            <span className="text-slate-500 text-[10px] block font-sans">Cash, CC & savings</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">budgets</span>
            <span className="text-slate-500 text-[10px] block font-sans">Monthly envelope caps</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">projects</span>
            <span className="text-slate-500 text-[10px] block font-sans">Goals (renovation, trips)</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">project_budgets</span>
            <span className="text-slate-500 text-[10px] block font-sans">Subcontracted caps</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">transaction_headers</span>
            <span className="text-slate-500 text-[10px] block font-sans">Master header records</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">transaction_items</span>
            <span className="text-slate-500 text-[10px] block font-sans">Collateral lines list</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850 col-span-2">
            <span className="text-white font-bold block mb-1 truncate">investment_account_summary</span>
            <span className="text-slate-500 text-[10px] block font-sans">Fresh capital, yields & evaluations</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">investment_events</span>
            <span className="text-slate-500 text-[10px] block font-sans">Transactions history ledger</span>
          </div>
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-white font-bold block mb-1 truncate">investment_snapshots</span>
            <span className="text-slate-500 text-[10px] block font-sans">Asset valuation timelines</span>
          </div>
        </div>
      </div>
    </div>
  );
}
