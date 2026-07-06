/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

// Set up server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Configure JSON body parser with increased limit for images/voice payloads
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'finance_db.json');
const CONFIG_FILE = path.join(DATA_DIR, 'supabase_config.json');

// Get active Supabase configuration
function getSupabaseConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {
      // Ignore
    }
  }
  return {
    url: process.env.SUPABASE_URL || '',
    anon_key: process.env.SUPABASE_ANON_KEY || '',
    enabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  };
}

// Get initialized Supabase client
function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config.enabled || !config.url || !config.anon_key) {
    return null;
  }
  return createClient(config.url, config.anon_key, {
    auth: {
      persistSession: false
    }
  });
}

// Sequence synchronization state to Supabase tables
async function syncStateToSupabase(supabase: any, dbState: any) {
  const {
    accounts = [],
    budgets = [],
    projects = [],
    project_budgets = [],
    transaction_headers = [],
    transaction_items = [],
    investment_account_summary = [],
    investment_events = [],
    investment_snapshots = []
  } = dbState;

  const cleanList = (list: any[]) => list.map(({ supabaseConnected, supabaseTablesMissing, supabaseUrl, ...rest }: any) => rest);

  // 1. Delete items that do not exist in incoming lists (reverse dependency order to prevent FK errors)
  const syncDeletes = async (tableName: string, currentData: any[]) => {
    const ids = currentData.map(d => d.id);
    if (ids.length > 0) {
      // Delete records in Postgres that are not in the current list
      const { error } = await supabase.from(tableName).delete().filter('id', 'not.in', `(${ids.join(',')})`);
      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase.from(tableName).delete().neq('id', '');
      if (error) throw error;
    }
  };

  try {
    await syncDeletes('transaction_items', transaction_items);
    await syncDeletes('transaction_headers', transaction_headers);
    await syncDeletes('project_budgets', project_budgets);
    await syncDeletes('budgets', budgets);
    await syncDeletes('investment_snapshots', investment_snapshots);
    await syncDeletes('investment_events', investment_events);
    await syncDeletes('investment_account_summary', investment_account_summary);
    await syncDeletes('accounts', accounts);
    await syncDeletes('projects', projects);

    // 2. Upsert items (structural dependency order)
    const upsertDataExcludingMeta = async (tableName: string, data: any[]) => {
      if (data.length > 0) {
        const { error } = await supabase.from(tableName).upsert(cleanList(data));
        if (error) throw error;
      }
    };

    await upsertDataExcludingMeta('projects', projects);
    await upsertDataExcludingMeta('accounts', accounts);
    await upsertDataExcludingMeta('budgets', budgets);
    await upsertDataExcludingMeta('project_budgets', project_budgets);
    await upsertDataExcludingMeta('transaction_headers', transaction_headers);
    await upsertDataExcludingMeta('transaction_items', transaction_items);
    await upsertDataExcludingMeta('investment_account_summary', investment_account_summary);
    await upsertDataExcludingMeta('investment_events', investment_events);
    await upsertDataExcludingMeta('investment_snapshots', investment_snapshots);
  } catch (err: any) {
    console.error('syncStateToSupabase failed:', err);
    throw err;
  }
}

// Ensure database directory and file exist with detailed seeded data
function initializeDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  if (!fs.existsSync(DB_FILE)) {
    const freshDb = {
      accounts: [
        { id: 'acc_posb_1', name: 'POSB Savings (SGD)', type: 'Savings', balance: 12450.20, currency: 'SGD', last_updated: '11/06/2026', account_number: 'POSB-124-5542' },
        { id: 'acc_dbs_alt', name: 'DBS Altitude Card (SGD)', type: 'Credit Cards', balance: -1840.40, currency: 'SGD', last_updated: '11/06/2026', account_number: 'VISA-9942' },
        { id: 'acc_syfe', name: 'Syfe REITs Premium (SGD)', type: 'Investments', balance: 24500.00, currency: 'SGD', last_updated: '11/06/2026', account_number: 'SYFE-REIT-09' },
        { id: 'acc_cash_sgd', name: 'Pocket Cash (SGD)', type: 'Cash Wallets', balance: 120.00, currency: 'SGD', last_updated: '11/06/2026' },
        { id: 'acc_ibkr_usd', name: 'IBKR Portfolio (USD)', type: 'Investments', balance: 45210.00, currency: 'USD', last_updated: '11/06/2026', account_number: 'IB-90554-A' },
        { id: 'acc_wise_usd', name: 'Wise Multi-Currency (USD)', type: 'Travel Wallets', balance: 1520.50, currency: 'USD', last_updated: '11/06/2026' },
        { id: 'acc_hdfc_inr', name: 'HDFC Bank Account (INR)', type: 'Savings', balance: 245600.00, currency: 'INR', last_updated: '11/06/2026', account_number: 'HDFC-0092341' },
        { id: 'acc_zerodha_inr', name: 'Zerodha Index Funds (INR)', type: 'Investments', balance: 580000.00, currency: 'INR', last_updated: '11/06/2026', account_number: 'Z-IN-5509' }
      ],
      budgets: [
        { id: 'b_1', month: '06/2026', primary_category: 'Food', specific_category: 'Dining Out', allocated: 500.00, spent: 320.00 },
        { id: 'b_2', month: '06/2026', primary_category: 'Food', specific_category: 'Groceries', allocated: 400.00, spent: 245.60 },
        { id: 'b_3', month: '06/2026', primary_category: 'Utilities', specific_category: 'Electricity', allocated: 150.00, spent: 112.00 },
        { id: 'b_4', month: '06/2026', primary_category: 'Transport', specific_category: 'MRT/Bus', allocated: 120.00, spent: 95.20 },
        { id: 'b_5', month: '06/2026', primary_category: 'Transport', specific_category: 'Grab/Taxi', allocated: 100.00, spent: 50.00 },
        { id: 'b_6', month: '06/2026', primary_category: 'Entertainment', specific_category: 'Streaming Subs', allocated: 50.00, spent: 45.00 },
        { id: 'b_7', month: '06/2026', primary_category: 'Entertainment', specific_category: 'Movies/Events', allocated: 100.00, spent: 80.00 }
      ],
      projects: [
        { id: 'p_thai', name: 'Thailand Winter Getaway 2026', description: 'Budgeting family vacation to Phuket & Bangkok in December.', target_amount: 2500, start_date: '15/05/2026', completed: false },
        { id: 'p_reno', name: 'Home Renovation 2026', description: 'Upgrades for bathroom tiling, living room lights, and kitchen cabinets.', target_amount: 15000, start_date: '01/01/2026', completed: false }
      ],
      project_budgets: [
        { id: 'pb_1', project_id: 'p_thai', description: 'Flights & Transit', allocated: 800.00, spent: 740.00 },
        { id: 'pb_2', project_id: 'p_thai', description: 'Phuket Resort & Lodging', allocated: 1000.00, spent: 850.00 },
        { id: 'pb_3', project_id: 'p_thai', description: 'Food & Activities', allocated: 700.00, spent: 120.00 },
        { id: 'pb_4', project_id: 'p_reno', description: 'Kitchen cabinet carpentry', allocated: 8000.00, spent: 7500.00 },
        { id: 'pb_5', project_id: 'p_reno', description: 'Bathroom wetwork & tiles', allocated: 5000.00, spent: 4200.00 },
        { id: 'pb_6', project_id: 'p_reno', description: 'Smart lighting system', allocated: 2000.00, spent: 1850.00 }
      ],
      transaction_headers: [
        { id: 'th_1', date: '01/06/2026', merchant: 'Paradise Diners (Dining Out)', account_id: 'acc_posb_1', project_id: null, total_amount: 128.40, currency: 'SGD', status: 'cleared', notes: 'Dinner with siblings' },
        { id: 'th_2', date: '03/06/2026', merchant: 'Singapore Airlines (Flight)', account_id: 'acc_dbs_alt', project_id: 'p_thai', total_amount: 740.00, currency: 'SGD', status: 'cleared', notes: 'Phuket round-trip family tickets' },
        { id: 'th_3', date: '05/06/2026', merchant: 'Cold Storage (Groceries)', account_id: 'acc_posb_1', project_id: null, total_amount: 85.50, currency: 'SGD', status: 'cleared', notes: 'Weekly grocery stocking' },
        { id: 'th_4', date: '06/06/2026', merchant: 'SP Group (Electricity)', account_id: 'acc_posb_1', project_id: null, total_amount: 112.00, currency: 'SGD', status: 'cleared', notes: 'May utilities bill' },
        { id: 'th_5', date: '08/06/2026', merchant: 'Grab Rides (Transport)', account_id: 'acc_dbs_alt', project_id: null, total_amount: 22.40, currency: 'SGD', status: 'cleared', notes: 'Commute to office' },
        { id: 'th_6', date: '10/06/2026', merchant: 'Grand Hotel Phuket (Lodging)', account_id: 'acc_dbs_alt', project_id: 'p_thai', total_amount: 850.00, currency: 'SGD', status: 'cleared', notes: 'Phuket hotel booking prepay' }
      ],
      transaction_items: [
        { id: 'ti_1', header_id: 'th_1', description: 'Standard Steamboat Set', quantity: 1, amount: 98.00, category: 'Food' },
        { id: 'ti_2', header_id: 'th_1', description: 'Chrysanthemum Teas', quantity: 4, amount: 12.00, category: 'Food' },
        { id: 'ti_3', header_id: 'th_1', description: 'GST + Service Charge', quantity: 1, amount: 18.40, category: 'Food' },
        { id: 'ti_4', header_id: 'th_2', description: 'Economy Class Tickets', quantity: 2, amount: 740.00, category: 'Transport' },
        { id: 'ti_5', header_id: 'th_3', description: 'Australian Beef Ribeye', quantity: 2, amount: 45.00, category: 'Food' },
        { id: 'ti_6', header_id: 'th_3', description: 'Suki Eggs & Fresh Milk', quantity: 3, amount: 20.50, category: 'Food' },
        { id: 'ti_7', header_id: 'th_3', description: 'Detergent & Tissue Rolls', quantity: 1, amount: 20.00, category: 'Utilities' },
        { id: 'ti_8', header_id: 'th_4', description: 'Electricity Usage 240kWh', quantity: 1, amount: 112.00, category: 'Utilities' },
        { id: 'ti_9', header_id: 'th_5', description: 'Grab RushHour Ride', quantity: 1, amount: 22.40, category: 'Transport' },
        { id: 'ti_10', header_id: 'th_6', description: 'Deluxe Ocean View Room', quantity: 3, amount: 850.00, category: 'Lodging' }
      ],
      investment_account_summary: [
        { id: 'ias_1', account_id: 'acc_syfe', fresh_capital: 20000.00, current_market_value: 24500.00, absolute_returns: 4500.00, profit_reinvested: 1200.00, dividends_reinvested: 800.00, realized_profit: 1500.00, realized_loss: 0.00 },
        { id: 'ias_2', account_id: 'acc_ibkr_usd', fresh_capital: 38000.00, current_market_value: 45210.00, absolute_returns: 7210.00, profit_reinvested: 2200.00, dividends_reinvested: 1300.00, realized_profit: 3500.00, realized_loss: -500.00 },
        { id: 'ias_3', account_id: 'acc_zerodha_inr', fresh_capital: 500000.00, current_market_value: 580000.00, absolute_returns: 80000.00, profit_reinvested: 0.00, dividends_reinvested: 12000.00, realized_profit: 0.00, realized_loss: 0.00 }
      ],
      investment_events: [
        { id: 'ie_1', account_id: 'acc_syfe', date: '15/01/2026', type: 'capital_in', description: 'Initial Syfe REIT lump sum', amount: 20000.00 },
        { id: 'ie_2', account_id: 'acc_syfe', date: '30/03/2026', type: 'dividend_reinvest', description: 'Q1 REIT Dividend payout', amount: 800.00 },
        { id: 'ie_3', account_id: 'acc_syfe', date: '10/05/2026', type: 'profit_reinvest', description: 'Automatic rebalancing reinvestment', amount: 1200.00 },
        { id: 'ie_4', account_id: 'acc_ibkr_usd', date: '01/02/2025', type: 'capital_in', description: 'Wire transfer to US Broker', amount: 38000.00 },
        { id: 'ie_5', account_id: 'acc_ibkr_usd', date: '15/12/2025', type: 'dividend_reinvest', description: 'S&P 500 quarterly ETF dividend', amount: 1300.00 }
      ],
      investment_snapshots: [
        { id: 'is_1', account_id: 'acc_syfe', date: '31/01/2026', value: 20100.00 },
        { id: 'is_2', account_id: 'acc_syfe', date: '28/02/2026', value: 21500.00 },
        { id: 'is_3', account_id: 'acc_syfe', date: '31/03/2026', value: 22800.00 },
        { id: 'is_4', account_id: 'acc_syfe', date: '30/04/2026', value: 23200.00 },
        { id: 'is_5', account_id: 'acc_syfe', date: '31/05/2026', value: 24100.00 },
        { id: 'is_6', account_id: 'acc_syfe', date: '11/06/2026', value: 24500.00 },
        { id: 'is_7', account_id: 'acc_ibkr_usd', date: '31/03/2026', value: 41000.00 },
        { id: 'is_8', account_id: 'acc_ibkr_usd', date: '31/05/2026', value: 44200.00 },
        { id: 'is_9', account_id: 'acc_ibkr_usd', date: '11/06/2026', value: 45210.00 }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(freshDb, null, 2), 'utf-8');
  }
}

// Initializing DB
initializeDatabase();

// Atomic Helper to Read DB
function getDb() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed reading database file, returning basic structure', err);
    return {
      accounts: [],
      budgets: [],
      projects: [],
      project_budgets: [],
      transaction_headers: [],
      transaction_items: [],
      investment_account_summary: [],
      investment_events: [],
      investment_snapshots: []
    };
  }
}

// Atomic Helper to Write DB
function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------

// 1. Fetch entire DB state (local + Supabase synchronization)
app.get('/api/db', async (req, res) => {
  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();
  
  if (supabase && config.enabled) {
    try {
      const [
        accountsRes,
        budgetsRes,
        projectsRes,
        projectBudgetsRes,
        headersRes,
        itemsRes,
        summariesRes,
        eventsRes,
        snapshotsRes
      ] = await Promise.all([
        supabase.from('accounts').select('*'),
        supabase.from('budgets').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('project_budgets').select('*'),
        supabase.from('transaction_headers').select('*'),
        supabase.from('transaction_items').select('*'),
        supabase.from('investment_account_summary').select('*'),
        supabase.from('investment_events').select('*'),
        supabase.from('investment_snapshots').select('*')
      ]);

      const anyTableMissing = [
        accountsRes, budgetsRes, projectsRes, projectBudgetsRes,
        headersRes, itemsRes, summariesRes, eventsRes, snapshotsRes
      ].some((r: any) => r.error && (r.error.code === '42P01' || r.error.message?.includes('does not exist')));

      if (anyTableMissing) {
        const localDb = getDb();
        res.json({
          ...localDb,
          supabaseConnected: true,
          supabaseTablesMissing: true,
          supabaseUrl: config.url
        });
        return;
      }

      const anyOtherError = [
        accountsRes, budgetsRes, projectsRes, projectBudgetsRes,
        headersRes, itemsRes, summariesRes, eventsRes, snapshotsRes
      ].find((r: any) => r.error);

      if (anyOtherError) {
        throw new Error(anyOtherError.error!.message);
      }

      const dbState = {
        accounts: accountsRes.data || [],
        budgets: budgetsRes.data || [],
        projects: projectsRes.data || [],
        project_budgets: projectBudgetsRes.data || [],
        transaction_headers: headersRes.data || [],
        transaction_items: itemsRes.data || [],
        investment_account_summary: summariesRes.data || [],
        investment_events: eventsRes.data || [],
        investment_snapshots: snapshotsRes.data || [],
        supabaseConnected: true,
        supabaseTablesMissing: false,
        supabaseUrl: config.url
      };

      res.json(dbState);
      return;
    } catch (err: any) {
      console.error('Failed fetching from Supabase, falling back to local JSON:', err);
      const localDb = getDb();
      res.json({
        ...localDb,
        supabaseConnected: true,
        supabaseError: err.message || 'Supabase retrieval failed',
        supabaseUrl: config.url
      });
      return;
    }
  }

  // Fallback to local DB
  const localDb = getDb();
  res.json({
    ...localDb,
    supabaseConnected: false,
    supabaseUrl: config.url || ''
  });
});

// 2. Put entire DB state (syncs to both local JSON and Supabase if active)
app.put('/api/db', async (req, res) => {
  const dbState = req.body;
  saveDb(dbState);
  
  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();
  
  if (supabase && config.enabled) {
    try {
      await syncStateToSupabase(supabase, dbState);
      res.json({ success: true, status: 'Database state updated on both local disk and Supabase!' });
      return;
    } catch (err: any) {
      console.error('Failed pushing updates to Supabase:', err);
      res.json({ success: true, status: 'Database state updated locally, but Supabase sync failed: ' + err.message });
      return;
    }
  }

  res.json({ success: true, status: 'Database state updated locally.' });
});

// 3. Clear/Reset database to seed
app.post('/api/db/reset', async (req, res) => {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  initializeDatabase();
  const db = getDb();
  
  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();
  
  if (supabase && config.enabled) {
    try {
      await syncStateToSupabase(supabase, db);
    } catch (err: any) {
      console.error('Supabase write-thru reset seed failed:', err);
    }
  }
  
  res.json({ success: true, db, status: 'Database reset to default seed data' });
});

// 4. Custom endpoint to submit a cleared/approved transaction
// Inserts header + items, updates correlated budget & bank account aggregates atomically
app.post('/api/db/transaction', (req, res) => {
  const { header, items } = req.body;
  if (!header || !items || !Array.isArray(items)) {
    res.status(400).json({ error: 'Invalid transaction payload. Ensure header and items array are provided.' });
    return;
  }

  const db = getDb();

  // Create unique transaction header ID
  const newHeaderId = `th_${Date.now()}`;
  const preparedHeader = {
    id: newHeaderId,
    date: header.date || '11/06/2026',
    merchant: header.merchant || 'Unknown Merchant',
    account_id: header.account_id || '',
    project_id: header.project_id || null,
    total_amount: Number(header.total_amount) || 0,
    currency: header.currency || 'SGD',
    status: 'cleared',
    notes: header.notes || ''
  };

  const preparedItems = items.map((item: any, idx: number) => ({
    id: `ti_${Date.now()}_${idx}`,
    header_id: newHeaderId,
    description: item.description || 'General Item',
    quantity: Number(item.quantity) || 1,
    amount: Number(item.amount) || 0,
    category: item.category || 'Food'
  }));

  // Append records
  db.transaction_headers.push(preparedHeader);
  db.transaction_items.push(...preparedItems);

  // Apply accounts balance update (Savings/Wallets reduce if debit/spending, credit card balance increases as liability, etc.)
  // For simplicity, spending transactions decrease Savings/Wallets and increase Credit Card liabilities.
  const targetAcc = db.accounts.find((acc: any) => acc.id === preparedHeader.account_id);
  if (targetAcc) {
    if (targetAcc.type === 'Credit Cards') {
      // Credit card balances go higher (more debt)
      targetAcc.balance += preparedHeader.total_amount;
    } else {
      // Savings, Cash, Wallets decrease in balance
      targetAcc.balance -= preparedHeader.total_amount;
    }
    targetAcc.last_updated = preparedHeader.date;
  }

  // Update categories spent budget
  const transMonth = preparedHeader.date.split('/').slice(1).join('/'); // '11/06/2026' -> '06/2026'
  preparedItems.forEach((item: any) => {
    // Find corresponding budget matching MM/YYYY and category (primary_category)
    const activeBudget = db.budgets.find(
      (b: any) => b.month === transMonth && b.primary_category.toLowerCase() === item.category.toLowerCase()
    );
    if (activeBudget) {
      activeBudget.spent += item.amount;
    }
  });

  // Update optional project budget spent
  if (preparedHeader.project_id) {
    // For simplicity, we allocate spent to the first corresponding project budget item or distribute by items
    const activeProjBudgets = db.project_budgets.filter((pb: any) => pb.project_id === preparedHeader.project_id);
    if (activeProjBudgets.length > 0) {
      // Accumulate spent on the first budget matching category or description, fallback to first item
      preparedItems.forEach((item: any) => {
        const pbItem = activeProjBudgets.find((pb: any) => pb.description.toLowerCase().includes(item.category.toLowerCase())) || activeProjBudgets[0];
        if (pbItem) {
          pbItem.spent += item.amount;
        }
      });
    }
  }

  // Save the modified database
  saveDb(db);

  // Write-thru to Supabase if active
  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();
  if (supabase && config.enabled) {
    syncStateToSupabase(supabase, db).catch((err: any) => {
      console.error('Database transaction Supabase sync defer failed:', err);
    });
  }

  res.json({
    success: true,
    transaction_id: newHeaderId,
    db, // Return full synchronized updated DB
    status: 'Transaction approved and synchronized successfully across accounts and budgets!'
  });
});

// 5. Update investment record & trigger market dynamic fluctuation
app.post('/api/db/investment', (req, res) => {
  const { account_id, type, amount, description, date } = req.body;
  if (!account_id || !type || amount === undefined) {
    res.status(400).json({ error: 'Missing parameter values' });
    return;
  }

  const db = getDb();
  const summary = db.investment_account_summary.find((s: any) => s.account_id === account_id);
  const account = db.accounts.find((a: any) => a.id === account_id);

  if (!summary || !account) {
    res.status(404).json({ error: 'Specified investment account data not found' });
    return;
  }

  // Insert event
  const newEvent = {
    id: `ie_${Date.now()}`,
    account_id,
    date: date || '11/06/2026',
    type,
    description: description || 'Investment event transaction',
    amount: Number(amount)
  };
  db.investment_events.push(newEvent);

  // Process rules:
  // Fresh Capital, Profit Reinvested, Dividends Reinvested, Realized Profit, Realized Loss, Current Investment, Current Market Value, Absolute Returns
  const parsedAmt = Number(amount);
  if (type === 'capital_in') {
    summary.fresh_capital += parsedAmt;
    summary.current_market_value += parsedAmt; // Initial balance adds capital
    account.balance += parsedAmt;
  } else if (type === 'dividend_reinvest') {
    summary.dividends_reinvested += parsedAmt;
    summary.current_market_value += parsedAmt; // reinvest adds value
    account.balance += parsedAmt;
  } else if (type === 'profit_reinvest') {
    summary.profit_reinvested += parsedAmt;
    summary.current_market_value += parsedAmt;
    account.balance += parsedAmt;
  } else if (type === 'realized_gain') {
    summary.realized_profit += parsedAmt;
    summary.fresh_capital -= parsedAmt; // realized reduction
    summary.current_market_value -= parsedAmt;
    account.balance -= parsedAmt;
  } else if (type === 'realized_loss') {
    summary.realized_loss += parsedAmt;
    summary.current_market_value -= parsedAmt;
    account.balance -= parsedAmt;
  }

  // Absolute Returns = Current Market Value - Fresh Capital
  summary.absolute_returns = summary.current_market_value - summary.fresh_capital;

  // Insert value snapshot
  db.investment_snapshots.push({
    id: `is_${Date.now()}`,
    account_id,
    date: date || '11/06/2026',
    value: summary.current_market_value
  });

  saveDb(db);

  // Write-thru to Supabase if active
  const configVal = getSupabaseConfig();
  const supabaseVal = getSupabaseClient();
  if (supabaseVal && configVal.enabled) {
    syncStateToSupabase(supabaseVal, db).catch((err: any) => {
      console.error('Database investment Supabase sync defer failed:', err);
    });
  }

  res.json({ success: true, db });
});

// 5.5 Supabase Configuration and Seeding endpoints
app.get('/api/supabase/config', (req, res) => {
  const config = getSupabaseConfig();
  res.json({
    url: config.url,
    anon_key: config.anon_key ? `${config.anon_key.substring(0, Math.min(10, config.anon_key.length))}...` : '',
    hasKey: !!config.anon_key,
    enabled: config.enabled
  });
});

app.post('/api/supabase/config', async (req, res) => {
  const { url, anon_key, enabled } = req.body;
  const current = getSupabaseConfig();
  const nextConfig = {
    url: url !== undefined ? url.trim() : current.url,
    anon_key: anon_key !== undefined ? anon_key.trim() : current.anon_key,
    enabled: enabled !== undefined ? !!enabled : current.enabled
  };
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(nextConfig, null, 2), 'utf-8');
  
  let connectionStatus = 'unconfigured';
  let tablesState = 'unknown';
  let testError = null;
  
  if (nextConfig.enabled && nextConfig.url && nextConfig.anon_key) {
    try {
      const testClient = createClient(nextConfig.url, nextConfig.anon_key, { auth: { persistSession: false } });
      const { data, error } = await testClient.from('accounts').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          connectionStatus = 'connected_schema_missing';
          tablesState = 'missing';
        } else {
          throw error;
        }
      } else {
        connectionStatus = 'connected';
        tablesState = 'healthy';
      }
    } catch (err: any) {
      connectionStatus = 'error';
      testError = err.message || 'Connecting to Supabase failed';
    }
  }
  
  res.json({
    success: true,
    config: {
      url: nextConfig.url,
      hasKey: !!nextConfig.anon_key,
      enabled: nextConfig.enabled
    },
    connectionStatus,
    tablesState,
    error: testError
  });
});

app.post('/api/supabase/push-data', async (req, res) => {
  const config = getSupabaseConfig();
  const supabase = getSupabaseClient();
  
  if (!supabase || !config.enabled) {
    res.status(400).json({ error: 'Supabase connection is not enabled or credentials are missing' });
    return;
  }
  
  try {
    const db = getDb();
    await syncStateToSupabase(supabase, db);
    res.json({ success: true, message: 'All local portfolio datasets successfully exported and synced to Supabase!' });
  } catch (err: any) {
    console.error('Failed pushing seeds to Supabase:', err);
    res.status(500).json({ error: err.message || 'Failed syncing seed data to Supabase' });
  }
});

// ------------------------------------------------------------------
// AI LAYER: GEMINI API TRANSLATION AGENTS
// ------------------------------------------------------------------

// POST /api/gemini/parse-text: Parses a text query like the POSB/NTUC manual examples
app.post('/api/gemini/parse-text', async (req, res) => {
  const { prompt, accounts, projects } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Text prompt description is required' });
    return;
  }

  const queryAccountsStr = accounts && Array.isArray(accounts)
    ? accounts.map((a: any) => `* "${a.name}" (ID: "${a.id}", Currency: "${a.currency}")`).join('\n')
    : '* "POSB Savings" (ID: "acc_posb_1", SGD)\n* "DBS Altitude" (ID: "acc_dbs_alt", SGD)';

  const queryProjectsStr = projects && Array.isArray(projects)
    ? projects.map((p: any) => `* "${p.name}" (ID: "${p.id}")`).join('\n')
    : '* "Thailand Trip 2026" (ID: "p_thai")\n* "Home Renovation 2026" (ID: "p_reno")';

  const systemInstruction = `
You are the lead AI Data extraction agent for FinanceOS 2.0.
Your task is to take a natural language narrative of a financial transaction, and correctly map it into structured fields matching the transaction database schema.

Today's structural metadata:
Available Destination Accounts:
${queryAccountsStr}

Active Projects:
${queryProjectsStr}

Strict parsing rules:
1. Identify the transaction date, merchant, target account, project association, currency, total amount, and multiple line items with granular price categories (e.g., Food, Transport, Utilities, Lodging, Entertainment, Electronics).
2. Dates: Map date strictly to "DD/MM/YYYY". If not mentioned or implied, use "11/06/2026" (today).
3. Account Matching: Smart match the text to one of the provided accounts. For example: "POSB" maps to "acc_posb_1". Default to the first account (id) if unsure or mismatched.
4. Total amount: This must be the sum of the transaction item amounts. Convert all line prices to numbers.
5. Project Identification: Smart match project ID if the narration mentions trips or home improvements related to active projects.
6. Return structured JSON exactly matching the ResponseSchema. Do not include markdown code block qualifiers like "\`\`\`json". Just pure formatted JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['header', 'items'],
          properties: {
            header: {
              type: Type.OBJECT,
              required: ['date', 'merchant', 'account_id', 'project_id', 'total_amount', 'currency', 'notes'],
              properties: {
                date: { type: Type.STRING, description: "Transaction date in 'DD/MM/YYYY' format." },
                merchant: { type: Type.STRING, description: "Name of the merchant/shop." },
                account_id: { type: Type.STRING, description: "Matched account ID from available list." },
                project_id: { type: Type.STRING, description: "Matched project ID from available list, or null if no project applies." },
                total_amount: { type: Type.NUMBER, description: "Sum of item costs." },
                currency: { type: Type.STRING, description: "Currency symbol, e.g. 'SGD', 'USD', 'INR'." },
                notes: { type: Type.STRING, description: "Brief notes about the transaction details." }
              }
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['description', 'quantity', 'amount', 'category'],
                properties: {
                  description: { type: Type.STRING, description: "Line item product/service description." },
                  quantity: { type: Type.NUMBER, description: "Quantity purchased." },
                  amount: { type: Type.NUMBER, description: "Cost for this item line entirely." },
                  category: { type: Type.STRING, description: "Category name matching typical household budgets." }
                }
              }
            }
          }
        }
      }
    });

    const parsedJson = JSON.parse(response.text?.trim() || '{}');
    res.json(parsedJson);
  } catch (error: any) {
    console.error('Gemini natural language parse failure:', error);
    res.status(500).json({ error: error.message || 'AI text interpreter crashed' });
  }
});

// POST /api/gemini/parse-image: Vision extraction on base64 receipt screenshots
app.post('/api/gemini/parse-image', async (req, res) => {
  const { base64Image, mimeType, accounts, projects } = req.body;
  if (!base64Image) {
    res.status(400).json({ error: 'Base64 image string is required' });
    return;
  }

  const queryAccountsStr = accounts && Array.isArray(accounts)
    ? accounts.map((a: any) => `* "${a.name}" (ID: "${a.id}", Currency: "${a.currency}")`).join('\n')
    : '* "Receipt Wallet" (ID: "acc_cash_sgd", SGD)';

  const queryProjectsStr = projects && Array.isArray(projects)
    ? projects.map((p: any) => `* "${p.name}" (ID: "${p.id}")`).join('\n')
    : '* None';

  const systemInstruction = `
You are a state-of-the-art receipt visual reading agent optimized for FinanceOS 2.0.
Your task is to analyze the image of the provided receipt and extract structured header and line item data.

Available Destination Accounts to match (select the most appropriate based on name, cash, credit or wallet matching the receipt):
${queryAccountsStr}

Active Projects to associate if applicable:
${queryProjectsStr}

Strict parsing rules:
1. Parse merchant name, receipt date (ensure format "DD/MM/YYYY"), total price, currency, and extract EVERY individual bought product item.
2. For line items, extract the specific description, quantity (integer, default to 1 if unknown), individual amount item line, and map to a primary consumer category (Food, Transport, Utilities, Lodging, Entertainment, Accessories, Electronics, or Shopping).
3. If the receipt date is unclear or missing, use "11/06/2026" (today).
4. Strictly return JSON format matching responseSchema. Avoid any backtick qualifiers.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: base64Image,
          },
        },
        {
          text: 'Analyze this receipt and extract structured header context and clear individual line item breakdowns.',
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['header', 'items'],
          properties: {
            header: {
              type: Type.OBJECT,
              required: ['date', 'merchant', 'account_id', 'project_id', 'total_amount', 'currency', 'notes'],
              properties: {
                date: { type: Type.STRING, description: "Extract date. Strictly format as 'DD/MM/YYYY'. Always convert MM/DD to DD/MM/YYYY where possible based on receipt origin, do not mess up format." },
                merchant: { type: Type.STRING, description: "Extracted official merchant brand name." },
                account_id: { type: Type.STRING, description: "The ID of the matched account. Defaults to acc_cash_sgd if cash payment, or card if paid by VISA/Master." },
                project_id: { type: Type.STRING, description: "Matched active project ID or null." },
                total_amount: { type: Type.NUMBER, description: "The total payment value printed on receipt." },
                currency: { type: Type.STRING, description: "Currency, e.g. SGD, USD, INR, etc." },
                notes: { type: Type.STRING, description: "Short caption summarising receipt. Mention payment method highlighted in receipt." }
              }
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['description', 'quantity', 'amount', 'category'],
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  amount: { type: Type.NUMBER, description: 'Line total amount' },
                  category: { type: Type.STRING, description: 'Target consumer budget category' }
                }
              }
            }
          }
        },
      }
    });

    const parsedJson = JSON.parse(response.text?.trim() || '{}');
    res.json(parsedJson);
  } catch (error: any) {
    console.error('Gemini vision receipt parse failure:', error);
    res.status(500).json({ error: error.message || 'AI receipt vision scan crashed' });
  }
});

// POST /api/gemini/parse-audio: transcribes audio notes of transaction narration
app.post('/api/gemini/parse-audio', async (req, res) => {
  const { base64Audio, mimeType, accounts, projects } = req.body;
  if (!base64Audio) {
    res.status(400).json({ error: 'Base64 audio string is required' });
    return;
  }

  const queryAccountsStr = accounts && Array.isArray(accounts)
    ? accounts.map((a: any) => `* "${a.name}" (ID: "${a.id}", Currency: "${a.currency}")`).join('\n')
    : '* "Cash Roll" (ID: "acc_cash_sgd")';

  const queryProjectsStr = projects && Array.isArray(projects)
    ? projects.map((p: any) => `* "${p.name}" (ID: "${p.id}")`).join('\n')
    : '* None';

  const systemInstruction = `
You are the voice-processing AI transcriber for FinanceOS 2.0.
First, listen to the user audio recording, transcribe the speech text completely.
Then, translate the transcription text into a structured personal finance receipt JSON model matching the responseSchema.

Available Accounts:
${queryAccountsStr}

Active Projects:
${queryProjectsStr}

Transcription matching guidelines:
1. Transcribe the raw text accurately and state it in the "transcription" field.
2. Formulate header: Merchant, Date ("DD/MM/YYYY"), account_id, project_id, total amount, currency, notes.
3. Formulate items list: product line descriptions, quant, total cost, consumer spending category.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/wav',
            data: base64Audio,
          },
        },
        {
          text: 'Listen and transcribe this audio voice note, then structure it into a financial transaction.',
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['transcription', 'header', 'items'],
          properties: {
            transcription: { type: Type.STRING, description: 'Raw high-quality text transcription of the spoken words.' },
            header: {
              type: Type.OBJECT,
              required: ['date', 'merchant', 'account_id', 'project_id', 'total_amount', 'currency', 'notes'],
              properties: {
                date: { type: Type.STRING },
                merchant: { type: Type.STRING },
                account_id: { type: Type.STRING },
                project_id: { type: Type.STRING, description: 'Matched project ID or null.' },
                total_amount: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                notes: { type: Type.STRING }
              }
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['description', 'quantity', 'amount', 'category'],
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                }
              }
            }
          }
        },
      }
    });

    const parsedJson = JSON.parse(response.text?.trim() || '{}');
    res.json(parsedJson);
  } catch (error: any) {
    console.error('Gemini voice processing parse failure:', error);
    res.status(500).json({ error: error.message || 'AI Voice Note translation crashed' });
  }
});

// POST /api/gemini/insights: Generates comprehensive personal finance advice using the complete data state
app.post('/api/gemini/insights', async (req, res) => {
  const { db } = req.body;
  if (!db) {
    res.status(400).json({ error: 'Database payload is required to generate insights' });
    return;
  }

  const systemInstruction = `
You are the Senior AI Wealth Manager and Portfolio Architect of FinanceOS 2.0.
Your mandate is to review the complete personal balance sheets, monthly budget performance, active projects, and investment snapshots, and deliver high-value, actionable, tactical insights to improve cash flows, save on debt, and optimize relative investment yield.

Provide advice structured into EXACTLY 3 key focal directions:
1. Cash Flow & Budget Optimization (review accounts and budgets, point out categories nearing allocation limits or cash-to-debt balances)
2. Investment Yield & Risk Allocation (review the fresh capital vs absolute returns, dividends reinvestment, evaluate index growth)
3. Project Progress Advisor (evaluate start date progress, target amounts, and project-specific budget spent rates)

Guidelines:
- Keep the writing tone incredibly modern, razor-sharp, sophisticated, encouraging, and quantitative.
- Refer to actual figures from the database where applicable (such as POSB balances, REIT yield, or Thailand trip spending).
- Structure responses into clean, elegant HTML-safe or JSON blocks with brief paragraphs. Avoid long blocks of dry text.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Generate custom insights on this active financial system: ${JSON.stringify(db)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['cashflow_insight', 'investment_insight', 'project_insight', 'summary_headline'],
          properties: {
            summary_headline: { type: Type.STRING, description: 'A bold, punchy, inspiring one-sentence overview of the operational financial health.' },
            cashflow_insight: { type: Type.STRING, description: 'Optimization advice for savings, credit cards, and budget categories.' },
            investment_insight: { type: Type.STRING, description: 'Advice analyzing absolute returns, dividend payouts, and broker deployments.' },
            project_insight: { type: Type.STRING, description: 'Status and advisory on outstanding projects and targets.' }
          }
        }
      }
    });

    const parsedJson = JSON.parse(response.text?.trim() || '{}');
    res.json(parsedJson);
  } catch (error: any) {
    console.error('Gemini insights engine failure:', error);
    res.status(500).json({ error: error.message || 'AI Investment Advisor crashed' });
  }
});

// ------------------------------------------------------------------
// CLIENT VITE MIDDLEWARE INTERFACE INTEGRATION
// ------------------------------------------------------------------

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Use vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    // Static assets distribution serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinanceOS server listening on port ${PORT}`);
  });
}

setupServer();
