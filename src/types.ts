/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Schema definition matching the frozen tables configuration of FinanceOS 2.0

export interface Account {
  id: string;
  name: string;
  type: 'Savings' | 'Credit Cards' | 'Investments' | 'Cash Wallets' | 'Receivables';
  balance: number;
  currency: string; // "SGD", "USD", "INR", etc.
  last_updated: string; // DD/MM/YYYY
  account_number?: string;
}

export interface Budget {
  id: string;
  month: string; // "MM/YYYY" -> e.g. "06/2026"
  primary_category: string; // e.g. "Food", "Transport", "Utilities"
  specific_category: string; // e.g. "Dining Out", "MRT", "Electricity"
  allocated: number;
  spent: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  target_amount?: number;
  start_date: string; // DD/MM/YYYY
  end_date?: string; // DD/MM/YYYY
  completed: boolean;
}

export interface ProjectBudget {
  id: string;
  project_id: string;
  description: string;
  allocated: number;
  spent: number;
}

export interface TransactionHeader {
  id: string;
  date: string; // DD/MM/YYYY
  merchant: string;
  account_id: string; // Associated source account
  project_id: string | null; // Associated project (optional)
  total_amount: number;
  currency: string;
  status: 'pending' | 'cleared';
  notes?: string;
  is_ai_extracted?: boolean;
}

export interface TransactionItem {
  id: string;
  header_id: string;
  description: string;
  quantity: number;
  amount: number; // Unit price or total for this item
  category: string; // Budget category tagging
}

export interface InvestmentAccountSummary {
  id: string;
  account_id: string; // links to Account id of type 'Investments'
  fresh_capital: number;
  current_market_value: number;
  absolute_returns: number; // current_market_value - (fresh_capital + profit_reinvested + dividends_reinvested) or performance
  profit_reinvested: number;
  dividends_reinvested: number;
  realized_profit: number;
  realized_loss: number;
}

export interface InvestmentEvent {
  id: string;
  account_id: string;
  date: string; // DD/MM/YYYY
  type: 'capital_in' | 'dividend_reinvest' | 'profit_reinvest' | 'realized_gain' | 'realized_loss';
  description: string;
  amount: number;
}

export interface InvestmentSnapshot {
  id: string;
  account_id: string;
  date: string; // DD/MM/YYYY
  value: number;
}

// AI Inbox capturing stage types
export interface AIInboxItem {
  id: string;
  source_type: 'receipt' | 'text' | 'voice';
  source_data: string; // image base64, text prompt, or transcription
  capture_date: string; // ISO or DD/MM/YYYY
  status: 'parsing' | 'review' | 'saved' | 'failed';
  extracted_header?: Omit<TransactionHeader, 'id' | 'status'>;
  extracted_items?: Omit<TransactionItem, 'id' | 'header_id'>[];
  error_message?: string;
}
