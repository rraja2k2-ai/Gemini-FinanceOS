/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  FolderLock, 
  Activity,
  PlusSquare,
  X
} from 'lucide-react';
import { Project, ProjectBudget } from '../types';

interface ProjectsProps {
  projects: Project[];
  projectBudgets: ProjectBudget[];
  onAddProject: (newP: Omit<Project, 'id' | 'completed'>) => void;
  onAddProjectBudget: (newPb: Omit<ProjectBudget, 'id'>) => void;
  onRemoveProject: (id: string) => void;
}

export default function Projects({ projects, projectBudgets, onAddProject, onAddProjectBudget, onRemoveProject }: ProjectsProps) {
  const [showAddProject, setShowAddProject] = useState<boolean>(false);
  const [showAddBudget, setShowAddBudget] = useState<boolean>(false);

  // New project states
  const [pName, setPName] = useState<string>('');
  const [pDesc, setPDesc] = useState<string>('');
  const [pTarget, setPTarget] = useState<string>('');
  const [pStart, setPStart] = useState<string>('11/06/2026');

  // New project budget states
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [pbDesc, setPbDesc] = useState<string>('');
  const [pbAlloc, setPbAlloc] = useState<string>('');

  const handleCreateProject = () => {
    if (!pName.trim() || !pStart.trim()) return;
    onAddProject({
      name: pName,
      description: pDesc,
      target_amount: pTarget ? Number(pTarget) : undefined,
      start_date: pStart
    });
    setPName('');
    setPDesc('');
    setPTarget('');
    setShowAddProject(false);
  };

  const handleCreateBudget = () => {
    if (!selectedProjectId || !pbDesc.trim() || !pbAlloc) return;
    onAddProjectBudget({
      project_id: selectedProjectId,
      description: pbDesc,
      allocated: Number(pbAlloc),
      spent: 0
    });
    setPbDesc('');
    setPbAlloc('');
    setShowAddBudget(false);
  };

  return (
    <div className="space-y-6 text-left" id="projects-container">
      {/* Page Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-indigo-400 font-semibold uppercase tracking-widest">sovereign goal budget registries</span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">Operational Projects</h1>
          <p className="text-slate-400 text-sm mt-1">Allocate independent funding and caps for specific travel plans, health checks, or acquisitions.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (projects.length > 0) {
                setSelectedProjectId(projects[0].id);
                setShowAddBudget(true);
              }
            }}
            disabled={projects.length === 0}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Add budget allocation
          </button>
          <button 
            onClick={() => setShowAddProject(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Target className="w-4 h-4 text-indigo-200" />
            Initiate Project
          </button>
        </div>
      </div>

      {/* Main projects lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="projects-parent-grid">
        {projects.length === 0 ? (
          <div className="lg:col-span-2 text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 font-mono text-xs">
            No active project directories initialized. Register a vacation or target goal above.
          </div>
        ) : (
          projects.map(p => {
            const relatedBudgets = projectBudgets.filter(pb => pb.project_id === p.id);
            const totalAlloc = relatedBudgets.reduce((sum, pb) => sum + pb.allocated, 0);
            const totalSpent = relatedBudgets.reduce((sum, pb) => sum + pb.spent, 0);
            const progressPct = totalAlloc > 0 ? (totalSpent / totalAlloc) * 100 : 0;

            return (
              <div 
                key={p.id} 
                className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-5 flex flex-col justify-between hover:border-slate-700/80 transition relative overflow-hidden group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-indigo-450 uppercase flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Active since {p.start_date}
                      </span>
                      <h3 className="text-white font-sans font-bold text-lg">{p.name}</h3>
                    </div>
                    <button 
                      onClick={() => onRemoveProject(p.id)}
                      className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-850 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-slate-400 text-xs font-sans leading-relaxed">{p.description}</p>

                  {/* Target Goal parameters */}
                  {p.target_amount && (
                    <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-xs font-mono">
                      <span className="text-slate-500">Global target cap</span>
                      <span className="font-bold text-white">SGD {p.target_amount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Budget Spent metrics */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Deployed allocations</span>
                      <span className="text-white font-bold">
                        SGD {totalSpent.toLocaleString()} <span className="text-slate-500">of {totalAlloc.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(progressPct, 100)}%` }} />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {progressPct.toFixed(0)}% fund structure allocated
                    </div>
                  </div>
                </div>

                {/* Sub-itemized allocations table */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold block mb-1">Items Deployed</span>
                  {relatedBudgets.length === 0 ? (
                    <p className="text-[11px] font-mono text-slate-600 italic">No custom thresholds registered yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {relatedBudgets.map(pb => {
                        const pct = pb.allocated > 0 ? (pb.spent / pb.allocated) * 100 : 0;
                        return (
                          <div key={pb.id} className="p-2 bg-slate-950/30 rounded-lg flex justify-between items-center text-xs">
                            <div>
                              <span className="text-slate-300 font-sans font-medium">{pb.description}</span>
                              <span className="text-[9px] text-slate-500 font-mono block">Util: {pct.toFixed(0)}%</span>
                            </div>
                            <span className="font-mono text-slate-200 font-semibold">
                              SGD {pb.spent} / {pb.allocated}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Project addition overlay modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-5 text-left glow-indigo">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-display font-semibold text-white">Initiate goal project</h3>
                <p className="text-slate-400 text-xs">Bootstrap a dedicated workspace directory for custom allocations.</p>
              </div>
              <button onClick={() => setShowAddProject(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Project Title</label>
                <input 
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g. Thailand Trip 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Goal Description Summary</label>
                <textarea 
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  placeholder="Summarise objective details..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 h-16 text-white text-xs resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Target Cap (SGD)</label>
                  <input 
                    type="number"
                    value={pTarget}
                    onChange={(e) => setPTarget(e.target.value)}
                    placeholder="2500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-right focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Start Date</label>
                  <input 
                    type="text"
                    value={pStart}
                    onChange={(e) => setPStart(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-center focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button 
                onClick={() => setShowAddProject(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Assemble Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project budget threshold popover overlay */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-5 text-left glow-indigo">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-display font-semibold text-white">Create budget allocation</h3>
                <p className="text-slate-400 text-xs">Append specific line items to direct the core project goal.</p>
              </div>
              <button onClick={() => setShowAddBudget(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Destination Project</label>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus:outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Budget Category Description</label>
                <input 
                  type="text"
                  value={pbDesc}
                  onChange={(e) => setPbDesc(e.target.value)}
                  placeholder="e.g. Flight Tickets, Hotel booking"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-semibold">Allocated Currency Cap (SGD)</label>
                <input 
                  type="number"
                  value={pbAlloc}
                  onChange={(e) => setPbAlloc(e.target.value)}
                  placeholder="800"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-right focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button 
                onClick={() => setShowAddBudget(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateBudget}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Propose Allocation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
