/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Account, 
  Budget, 
  Project, 
  ProjectBudget, 
  TransactionHeader, 
  TransactionItem, 
  InvestmentAccountSummary, 
  InvestmentEvent, 
  InvestmentSnapshot 
} from './types';

export interface DBState {
  accounts: Account[];
  budgets: Budget[];
  projects: Project[];
  project_budgets: ProjectBudget[];
  transaction_headers: TransactionHeader[];
  transaction_items: TransactionItem[];
  investment_account_summary: InvestmentAccountSummary[];
  investment_events: InvestmentEvent[];
  investment_snapshots: InvestmentSnapshot[];
  supabaseConnected?: boolean;
  supabaseTablesMissing?: boolean;
  supabaseUrl?: string;
  supabaseError?: string;
}

export function useFinanceDB() {
  const [db, setDb] = useState<DBState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch complete DB state from the full-stack server
  const fetchDb = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/db');
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      const data = await response.json();
      setDb(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed fetching FinanceOS database:', err);
      setError(err.message || 'Failed connecting to FinanceOS API.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync complete updated client state back to server
  const syncDb = useCallback(async (newState: DBState) => {
    try {
      const response = await fetch('/api/db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      });
      if (!response.ok) {
        throw new Error('Failed to update server database state.');
      }
      setDb(newState);
      setError(null);
    } catch (err: any) {
      console.error('Failed syncing state:', err);
      setError(err.message || 'Failed to persist updates.');
    }
  }, []);

  // Submit approved transaction (inserts both header + item rows, updates ledger balances)
  const submitTransaction = useCallback(async (header: Omit<TransactionHeader, 'id' | 'status'>, items: Omit<TransactionItem, 'id' | 'header_id'>[]) => {
    try {
      const response = await fetch('/api/db/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ header, items }),
      });
      if (!response.ok) {
        throw new Error('Server transaction insert execution failed.');
      }
      const data = await response.json();
      if (data.success && data.db) {
        setDb(data.db);
        return { success: true, transaction_id: data.transaction_id, message: data.status };
      }
      throw new Error(data.error || 'Server returned unsuccessful transaction response.');
    } catch (err: any) {
      console.error('Transaction submit error:', err);
      return { success: false, error: err.message || 'Failed submitting transaction.' };
    }
  }, []);

  // Submit investment event (reinvestment, capital infusion, realized gains)
  const submitInvestmentEvent = useCallback(async (payload: {
    account_id: string;
    type: 'capital_in' | 'dividend_reinvest' | 'profit_reinvest' | 'realized_gain' | 'realized_loss';
    amount: number;
    description: string;
    date: string;
  }) => {
    try {
      const response = await fetch('/api/db/investment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Investment operation execution failed.');
      }
      const data = await response.json();
      if (data.success && data.db) {
        setDb(data.db);
        return { success: true };
      }
      throw new Error(data.error || 'Investment update failed.');
    } catch (err: any) {
      console.error('Investment insert error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Reset/seed database
  const resetDb = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/db/reset', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset database state.');
      }
      const data = await response.json();
      setDb(data.db);
      setError(null);
      return { success: true, message: data.status };
    } catch (err: any) {
      console.error('Failed to reset database:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Save Supabase credentials config
  const saveSupabaseConfig = useCallback(async (payload: { url: string; anon_key: string; enabled: boolean }) => {
    try {
      setLoading(true);
      const response = await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Failed to update Supabase configuration.');
      }
      const data = await response.json();
      await fetchDb(); // Refresh entire state
      return {
        success: true,
        connectionStatus: data.connectionStatus,
        tablesState: data.tablesState,
        error: data.error
      };
    } catch (err: any) {
      console.error('Failed to save Supabase config:', err);
      return { success: false, error: err.message, connectionStatus: 'error', tablesState: 'unknown' };
    } finally {
      setLoading(false);
    }
  }, [fetchDb]);

  // Push local SQLite/JSON seed data to newly created Supabase tables
  const pushLocalConfigToSupabase = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/supabase/push-data', { method: 'POST' });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Push operation returned error.');
      }
      const data = await response.json();
      await fetchDb(); // Refresh state to pick up Supabase as loaded
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error('Failed pushing dataset to Supabase:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchDb]);

  // Fetch active Supabase info
  const fetchSupabaseConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/supabase/config');
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error('Failed fetching active config', err);
    }
    return null;
  }, []);

  // Initial load on mount
  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  return {
    db,
    loading,
    error,
    refresh: fetchDb,
    syncDb,
    submitTransaction,
    submitInvestmentEvent,
    resetDb,
    saveSupabaseConfig,
    pushLocalConfigToSupabase,
    fetchSupabaseConfig,
  };
}
