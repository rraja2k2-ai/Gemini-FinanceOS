/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  Plus, 
  Trash2, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Budget } from '../types';

interface BudgetsProps {
  budgets: Budget[];
  onAddBudget: (newBudget: Omit<Budget, 'id'>) => void;
  onModifyAllocation: (id: string, newAllocation: number) => void;
  onRemoveBudget: (id: string) => void;
}

export default function Budgets({ budgets, onAddBudget, onModifyAllocation, onRemoveBudget }: BudgetsProps) {
  const [showAddBudgetForm, setShowAddBudgetForm] = useState<boolean>(false);
  const [newPrimary, setNewPrimary] = useState<string>('Food');
  const [newSpecific, setNewSpecific] = useState<string>('');
  const [newAllocated, setNewAllocated] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('06/2026');

  const [activeBudgetSliderId, setActiveBudgetSliderId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newSpecific.trim() || !newAllocated) return;
    onAddBudget({
      month: selectedMonth,
      primary_category: newPrimary,
      specific_category: newSpecific,
      allocated: Number(newAllocated),
      spent: 0
    });
    setNewSpecific('');
    setNewAllocated('');
    setShowAddBudgetForm(false);
  };

  return (
    <div className="space-y-6 text-left" id="budgets-container">
      {/* Header Banner */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold uppercase tracking-widest">monthly structural expense ceilings</span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">Sovereign Budget Limits</h1>
          <p className="text-slate-400 text-sm mt-1">Allocate maximum categorical margins for defensive financial strategies.</p>
        </div>
        <button 
          onClick={() => setShowAddBudgetForm(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-200" />
          Propose spend threshold
        </button>
      </div>

      {/* Main Budget Meters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="budgets-meters-grid">
        {budgets.map(b => {
          const spentPct = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
          const isWarning = spentPct > 85;
          const isCaution = spentPct > 55 && spentPct <= 85;

          return (
            <div 
              key={b.id} 
              className={`p-5 rounded-2xl bg-slate-900/95 border hover:border-slate-700/80 transition relative flex flex-col justify-between overflow-hidden group space-y-4`}
              id={`budget-card-${b.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 bg-slate-800 text-indigo-400 rounded-md">
                      {b.primary_category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono italic">{b.month}</span>
                  </div>
                  <h4 className="text-white font-sans font-bold text-base">{b.specific_category}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveBudgetSliderId(activeBudgetSliderId === b.id ? null : b.id)}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Calibrate budget allocation"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onRemoveBudget(b.id)}
                    className="p-1 rounded bg-slate-805 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Remove budget item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress meters layout */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-slate-400">Total Spent</span>
                  <div className="text-right">
                    <span className="font-bold text-white">SGD {b.spent.toFixed(2)}</span>
                    <span className="text-slate-500 text-[10px] ml-1">of {b.allocated.toFixed(0)}</span>
                  </div>
                </div>

                <div className="bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${isWarning ? 'bg-rose-500' : isCaution ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(spentPct, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isWarning ? 'text-rose-400 font-bold' : isCaution ? 'text-amber-400' : 'text-slate-500'}>
                    {spentPct.toFixed(0)}% Utilized
                  </span>
                  <span className="text-slate-500">
                    {b.spent > b.allocated 
                      ? `Overwritten by ${(b.spent - b.allocated).toFixed(2)}` 
                      : `Runway Left: ${(b.allocated - b.spent).toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Dynamic recalibrator inline slider */}
              {activeBudgetSliderId === b.id && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-2 animate-fadeIn text-xs">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>ADJUST CEILING</span>
                    <span className="font-bold text-white text-xs">SGD {b.allocated}</span>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="1500" 
                    step="50"
                    value={b.allocated}
                    onChange={(e) => onModifyAllocation(b.id, Number(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>SGD 50</span>
                    <span>SGD 1500</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Threshold Modal popover drawer */}
      {showAddBudgetForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-5 text-left glow-indigo">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-display font-semibold text-white">Create spend threshold</h3>
                <p className="text-slate-400 text-xs">Establish a new categorical target for bookkeeping.</p>
              </div>
              <button onClick={() => setShowAddBudgetForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Primary Theme</label>
                <select 
                  value={newPrimary}
                  onChange={(e) => setNewPrimary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Food">Food & Confectionery</option>
                  <option value="Transport">Transport & Transit</option>
                  <option value="Utilities">Utilities & Housekeep</option>
                  <option value="Entertainment">Entertainment & Subs</option>
                  <option value="Shopping">Shopping & Luxury</option>
                  <option value="Electronics">Electronics & Hardware</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Specific Category Item</label>
                <input 
                  type="text"
                  value={newSpecific}
                  onChange={(e) => setNewSpecific(e.target.value)}
                  placeholder="e.g. MRT/Taxis, Dining Out"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Allocated Cap (SGD)</label>
                  <input 
                    type="number"
                    value={newAllocated}
                    onChange={(e) => setNewAllocated(e.target.value)}
                    placeholder="300"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Month</label>
                  <input 
                    type="text"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    placeholder="06/2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button 
                onClick={() => setShowAddBudgetForm(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Assemble Budget
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
