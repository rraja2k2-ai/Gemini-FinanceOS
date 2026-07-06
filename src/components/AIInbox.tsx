/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Upload, 
  Mic, 
  Square, 
  Check, 
  Trash2, 
  Plus, 
  X, 
  AlertCircle,
  Clock,
  CheckCircle,
  FileText,
  Volume2,
  Cpu,
  BrainCircuit,
  Info,
  ShieldCheck,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Account, Project, TransactionHeader, TransactionItem } from '../types';

interface AIInboxProps {
  accounts: Account[];
  projects: Project[];
  onSubmitTransaction: (header: any, items: any[]) => Promise<{ success: boolean; transaction_id?: string; message?: string; error?: string }>;
}

interface PendingReview {
  id: string;
  source: 'receipt' | 'text' | 'voice';
  transcription?: string;
  header: {
    date: string;
    merchant: string;
    account_id: string;
    project_id: string | null;
    total_amount: number;
    currency: string;
    notes: string;
  };
  items: {
    description: string;
    quantity: number;
    amount: number;
    category: string;
  }[];
}

export default function AIInbox({ accounts, projects, onSubmitTransaction }: AIInboxProps) {
  // Input UI choices
  const [activeTab, setActiveTab] = useState<'receipt' | 'text' | 'voice'>('receipt');
  
  // Pending reviews queue state
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);

  // States for text prompt
  const [textPrompt, setTextPrompt] = useState<string>('');
  
  // States for Image Upload
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  // States for Voice Note Capturing
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Suggested quick prompts for the text area (makes the UX delightful to test)
  const quickSuggestions = [
    { label: "Grab ride", text: "Spent USD 15.00 with POSB on a Grab ride to a local meeting yesterday" },
    { label: "NTUC FairPrice", text: "Paid SGD 54.10 at NTUC FairPrice for milk, premium ribeye steak, and oats" },
    { label: "Apple store", text: "Bought magsafe charger accessories from Apple Store for USD 120.00" }
  ];

  // Demo receipt structures for cold run preview
  useEffect(() => {
    if (pendingReviews.length === 0) {
      setPendingReviews([
        {
          id: 'pending_demo_1',
          source: 'receipt',
          header: {
            date: '11/06/2026',
            merchant: 'NTUC FairPrice',
            account_id: 'acc_posb_1',
            project_id: null,
            total_amount: 54.10,
            currency: 'SGD',
            notes: 'Weekly grocery basket containing dairy, meats, and fresh eggs.'
          },
          items: [
            { description: 'Fresh Farm Eggs 30s', quantity: 1, amount: 6.80, category: 'Food' },
            { description: 'Premium Marbling Wagyu Steak', quantity: 2, amount: 38.50, category: 'Food' },
            { description: 'Barista Milk Oats Drink 1L', quantity: 2, amount: 8.80, category: 'Food' }
          ]
        }
      ]);
    }
  }, []);

  // ------------------------------------------------------------------
  // TEXT PROMPT ANALYSIS
  // ------------------------------------------------------------------
  const handleTextSubmit = async (customPrompt?: string) => {
    const promptToSubmit = customPrompt || textPrompt;
    if (!promptToSubmit.trim()) return;
    
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/gemini/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSubmit,
          accounts,
          projects
        })
      });
      if (!res.ok) throw new Error('AI analysis service returned error ' + res.status);
      const parsedData = await res.json();
      
      const newReview: PendingReview = {
        id: `pending_${Date.now()}`,
        source: 'text',
        header: parsedData.header,
        items: parsedData.items
      };

      setPendingReviews(prev => [newReview, ...prev]);
      setSelectedReview(newReview);
      if (!customPrompt) setTextPrompt('');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed connecting to Gemini parsing models.');
    } finally {
      setAiLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // IMAGE DRAG & UPLOAD HANDLERS
  // ------------------------------------------------------------------
  const processImageFile = async (file: File) => {
    setUploadingImage(true);
    setAiLoading(true);
    setAiError(null);
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const res = await fetch('/api/gemini/parse-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Image: base64String,
            mimeType: file.type,
            accounts,
            projects
          })
        });

        if (!res.ok) throw new Error('AI Vision parsing returned error.');
        const parsedData = await res.json();

        const newReview: PendingReview = {
          id: `pending_${Date.now()}`,
          source: 'receipt',
          header: parsedData.header,
          items: parsedData.items
        };

        setPendingReviews(prev => [newReview, ...prev]);
        setSelectedReview(newReview);
      };
    } catch (err: any) {
      console.error(err);
      setAiError('Vision interpreter encountered an issue reading the receipt layout.');
    } finally {
      setUploadingImage(false);
      setAiLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // ------------------------------------------------------------------
  // VOICE NOTE RECORDER HANDLERS
  // ------------------------------------------------------------------
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioSpeech(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setAiError('Microphone permissions are required or unsupported on this device.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const processAudioSpeech = async (audioBlob: Blob) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const res = await fetch('/api/gemini/parse-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Audio: base64String,
            mimeType: 'audio/webm',
            accounts,
            projects
          })
        });

        if (!res.ok) throw new Error('AI Voice parsing failed ' + res.status);
        const parsedData = await res.json();

        const newReview: PendingReview = {
          id: `pending_${Date.now()}`,
          source: 'voice',
          transcription: parsedData.transcription,
          header: parsedData.header,
          items: parsedData.items
        };

        setPendingReviews(prev => [newReview, ...prev]);
        setSelectedReview(newReview);
      };
    } catch (err: any) {
      console.error(err);
      setAiError('Voice Note processor was unable to transcribe the auditory accents.');
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ------------------------------------------------------------------
  // ACTIVE REVIEW FIELD AMENDMENT HANDLERS
  // ------------------------------------------------------------------
  const updateReviewField = (field: string, val: any) => {
    if (!selectedReview) return;
    const updated = {
      ...selectedReview,
      header: {
        ...selectedReview.header,
        [field]: val
      }
    };
    setSelectedReview(updated);
    // Sync into queue
    setPendingReviews(prev => prev.map(p => p.id === selectedReview.id ? updated : p));
  };

  const updateItemField = (index: number, field: string, val: any) => {
    if (!selectedReview) return;
    const newItems = [...selectedReview.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'quantity' || field === 'amount' ? Number(val) : val
    };

    // Calculate sum of parts
    const totalSum = newItems.reduce((acc, item) => acc + (item.amount), 0);

    const updated = {
      ...selectedReview,
      header: {
        ...selectedReview.header,
        total_amount: Number(totalSum.toFixed(2))
      },
      items: newItems
    };
    setSelectedReview(updated);
    setPendingReviews(prev => prev.map(p => p.id === selectedReview.id ? updated : p));
  };

  const handleAddNewItemRow = () => {
    if (!selectedReview) return;
    const newItem = { description: 'New item position', quantity: 1, amount: 0, category: 'Food' };
    const updated = {
      ...selectedReview,
      items: [...selectedReview.items, newItem]
    };
    setSelectedReview(updated);
    setPendingReviews(prev => prev.map(p => p.id === selectedReview.id ? updated : p));
  };

  const handleRemoveItemRow = (index: number) => {
    if (!selectedReview) return;
    const newItems = selectedReview.items.filter((_, i) => i !== index);
    const totalSum = newItems.reduce((acc, item) => acc + (item.amount), 0);
    const updated = {
      ...selectedReview,
      header: {
        ...selectedReview.header,
        total_amount: Number(totalSum.toFixed(2))
      },
      items: newItems
    };
    setSelectedReview(updated);
    setPendingReviews(prev => prev.map(p => p.id === selectedReview.id ? updated : p));
  };

  // Reject/Delete pending item
  const handleRejectPending = (id: string) => {
    setPendingReviews(prev => prev.filter(p => p.id !== id));
    if (selectedReview?.id === id) {
      setSelectedReview(null);
    }
  };

  // Commit and write to full-stack tables
  const handleApproveAndSave = async () => {
    if (!selectedReview) return;
    setAiLoading(true);
    setAiError(null);

    const result = await onSubmitTransaction(selectedReview.header, selectedReview.items);
    if (result.success) {
      // Clear approved review from queue
      setPendingReviews(prev => prev.filter(p => p.id !== selectedReview.id));
      setSelectedReview(null);
    } else {
      setAiError(result.error || 'Server error saving transaction details.');
    }
    setAiLoading(false);
  };

  return (
    <div className="space-y-6 text-left" id="ai-capture-module">
      
      {/* 1. Module Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] text-indigo-400 font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-indigo-500" /> intelligent ingestion engine
          </span>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mt-1">Universal Capture</h1>
          <p className="text-slate-400 text-sm mt-1">Zero-friction ledger entry. Upload receipts, dictate voice notes, or write natural descriptions to stream directly into Postgres.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ai-inbox-grid">
        
        {/* LEFT COLUMN: Input and pending queue (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Core Input capture console */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-850 backdrop-blur-sm space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-slate-800">
              <Sparkles className="w-16 h-16 opacity-[0.02]" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-bold text-white tracking-tight">Capture Entry</h2>
                <p className="text-slate-500 text-xs">Transform unstructured assets instantly.</p>
              </div>
              <div className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </div>

            {/* Apple-style Segmented Tab selector */}
            <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-850 flex relative">
              <button 
                onClick={() => setActiveTab('receipt')} 
                className={`flex-1 py-1.5 text-xs font-semibold font-mono tracking-wider transition-all duration-200 rounded-lg relative z-10 ${activeTab === 'receipt' ? 'text-white' : 'text-slate-500 hover:text-slate-350'}`}
              >
                RECEIPT
                {activeTab === 'receipt' && (
                  <motion.div 
                    layoutId="activeIngestTab" 
                    className="absolute inset-0 bg-slate-900 rounded-lg -z-10 border border-slate-800/80 shadow" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('text')} 
                className={`flex-1 py-1.5 text-xs font-semibold font-mono tracking-wider transition-all duration-200 rounded-lg relative z-10 ${activeTab === 'text' ? 'text-white' : 'text-slate-500 hover:text-slate-350'}`}
              >
                PROMPT
                {activeTab === 'text' && (
                  <motion.div 
                    layoutId="activeIngestTab" 
                    className="absolute inset-0 bg-slate-900 rounded-lg -z-10 border border-slate-800/80 shadow" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('voice')} 
                className={`flex-1 py-1.5 text-xs font-semibold font-mono tracking-wider transition-all duration-200 rounded-lg relative z-10 ${activeTab === 'voice' ? 'text-white' : 'text-slate-500 hover:text-slate-350'}`}
              >
                DICTATION
                {activeTab === 'voice' && (
                  <motion.div 
                    layoutId="activeIngestTab" 
                    className="absolute inset-0 bg-slate-900 rounded-lg -z-10 border border-slate-800/80 shadow" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>

            <div className="min-h-[160px] flex flex-col justify-center" id="capture-console-stage">
              {/* 1. Receipt image drag area */}
              {activeTab === 'receipt' && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer min-h-[170px] transition-all duration-300 relative ${dragActive ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850/20'}`}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileInputChange} 
                    className="hidden" 
                    id="receipt-file-input" 
                  />
                  <label htmlFor="receipt-file-input" className="flex flex-col items-center cursor-pointer w-full h-full space-y-3">
                    <div className="bg-slate-850 p-3 rounded-xl text-indigo-400 border border-slate-800 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-200 text-xs font-medium block">Drag & drop receipt screenshot here</span>
                      <span className="text-slate-500 text-[10px] font-mono block">JPEG, PNG, WebP or click to browse</span>
                    </div>
                  </label>
                </div>
              )}

              {/* 2. Text NLP prompt input */}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea 
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                      placeholder={`Example: "Spent SGD 42.10 on cold storage using POSB for Prime Ribeye Steak on Thursday"`}
                      className="w-full h-24 p-3 rounded-xl bg-slate-950/90 border border-slate-850 text-slate-200 text-xs focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none resize-none font-sans leading-relaxed transition-all"
                    />
                  </div>
                  
                  {/* ChatGPT-style Quick Suggestion Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {quickSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTextPrompt(suggestion.text);
                          handleTextSubmit(suggestion.text);
                        }}
                        className="px-2.5 py-1 bg-slate-950/80 hover:bg-indigo-950/40 border border-slate-850 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 rounded-lg text-[10px] font-medium transition-all duration-150 cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                        {suggestion.label}
                      </button>
                    ))}
                  </div>

                  <button 
                    disabled={aiLoading || !textPrompt.trim()}
                    onClick={() => handleTextSubmit()}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-lg"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Transcribe with Gemini 3.5
                  </button>
                </div>
              )}

              {/* 3. Voice capture */}
              {activeTab === 'voice' && (
                <div className="flex flex-col items-center justify-center min-h-[170px] text-center border border-slate-850 bg-slate-950/10 p-5 rounded-xl">
                  {isRecording ? (
                    <div className="space-y-4 w-full">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2 text-rose-400 font-mono text-xs tracking-wider">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          LIVE DICTATION ACTIVE // {formatTime(recordingTime)}
                        </div>
                        <p className="text-[10px] text-slate-500 italic">Dictating transaction narration...</p>
                      </div>

                      {/* Moving Soundwave Animation */}
                      <div className="flex items-center justify-center gap-1.5 h-8 my-2">
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              scaleY: [0.3, 1.0, 0.3],
                              height: ["10px", "28px", "10px"]
                            }}
                            transition={{
                              duration: 0.5 + i * 0.08,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="w-1 bg-indigo-500 rounded-full"
                          />
                        ))}
                      </div>

                      <button 
                        onClick={stopRecording}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer mx-auto transition-colors duration-150"
                      >
                        <Square className="w-3 h-3 fill-white" /> Complete Recording
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <motion.button 
                        onClick={startRecording}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-4 bg-indigo-600 hover:bg-indigo-500 text-slate-950 rounded-full transition-all duration-200 shadow-xl flex items-center justify-center mx-auto cursor-pointer border border-indigo-400/20 relative"
                      >
                        {/* Soft pulsing breath ring */}
                        <div className="absolute inset-0 rounded-full border border-indigo-500/30 scale-125 animate-pulse" />
                        <Mic className="w-5 h-5" />
                      </motion.button>
                      <div className="space-y-1">
                        <p className="text-slate-300 text-xs font-semibold">Initiate Dictation</p>
                        <p className="text-slate-500 text-[10px] font-mono leading-relaxed max-w-[280px] mx-auto">
                          "Spent USD 12 on local transit at the MRT counter with my POSB savings card"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {aiLoading && (
              <div className="flex items-center gap-3 p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl text-indigo-300 text-xs animate-pulse">
                <Cpu className="w-4 h-4 text-indigo-400 rotate-12 flex-shrink-0 animate-spin" />
                <span className="font-mono text-[11px]">Gemini extracting structured entities...</span>
              </div>
            )}

            {aiError && (
              <div className="flex items-start gap-2.5 p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Extraction Interrupted</span>
                  <span className="text-[10px] text-rose-300/80 leading-normal font-mono">{aiError}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pending review items queue */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-850 backdrop-blur-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-display font-bold text-white">Extraction Ledger Queue</h3>
                <p className="text-slate-500 text-xs">Verify metadata boundaries before committing.</p>
              </div>
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-850 rounded-lg text-[10px] font-mono text-indigo-400 font-bold shadow">
                {pendingReviews.length} INBOX
              </span>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {pendingReviews.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-xs font-mono border border-dashed border-slate-850/60 rounded-xl flex flex-col items-center justify-center space-y-2">
                  <Clock className="w-5 h-5 text-slate-700" />
                  <span>No entries awaiting validation</span>
                </div>
              ) : (
                pendingReviews.map(item => {
                  const isSelected = selectedReview?.id === item.id;
                  return (
                    <motion.div 
                      key={item.id} 
                      onClick={() => setSelectedReview(item)}
                      whileHover={{ x: 2 }}
                      className={`p-3 rounded-xl border transition-all duration-200 text-left cursor-pointer flex justify-between items-center relative overflow-hidden ${isSelected ? 'bg-indigo-950/20 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.08)]' : 'bg-slate-950/40 border-slate-850/80 hover:bg-slate-900/60'}`}
                    >
                      {/* Left border active bar */}
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500" />}
                      
                      <div className="space-y-1.5 min-w-0 flex-1 pl-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono font-bold uppercase py-0.5 px-1.5 rounded ${
                            item.source === 'receipt' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                            item.source === 'voice' ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30' :
                            'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30'
                          }`}>
                            {item.source}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{item.header.date}</span>
                        </div>
                        <span className="text-slate-200 font-bold font-sans text-xs block truncate">
                          {item.header.merchant || 'Unknown Merchant'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[200px]">
                          {item.items.length} line item{item.items.length === 1 ? '' : 's'} • {item.header.notes ? item.header.notes : 'No system notes'}
                        </span>
                      </div>
                      <div className="text-right pl-3 flex flex-col items-end justify-between min-h-[50px]">
                        <span className="text-xs font-mono font-bold text-white block bg-slate-950/80 px-2 py-1 rounded border border-slate-850">
                          {item.header.currency} {item.header.total_amount.toFixed(2)}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectPending(item.id);
                          }} 
                          className="text-slate-600 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-900 transition-colors duration-150 cursor-pointer"
                          title="Reject entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Review screen (7 cols) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedReview ? (
              <motion.div 
                key={selectedReview.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900/80 p-5 rounded-2xl border border-slate-850 shadow-2xl space-y-6 text-left relative overflow-hidden"
                id="review-screen-panel"
              >
                {/* Visual glass sheen overlay */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-indigo-400">
                  <Cpu className="w-24 h-24" />
                </div>

                {/* Verification Chamber Header */}
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-850 relative z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> verification chamber
                    </span>
                    <h3 className="text-xl font-display font-extrabold text-white tracking-tight">Validate Structured Fields</h3>
                    <p className="text-slate-400 text-xs">Verify parsed entities and account mappings against original context.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Confidence Indicator Widget */}
                    <div className="bg-slate-950 border border-slate-850 rounded-xl p-2 flex items-center gap-2 shadow">
                      <div className="relative flex items-center justify-center">
                        {/* Circular track */}
                        <svg className="w-6 h-6 transform -rotate-90">
                          <circle cx="12" cy="12" r="9" className="stroke-slate-850 fill-none" strokeWidth="2" />
                          <circle cx="12" cy="12" r="9" className="stroke-indigo-500 fill-none" strokeWidth="2" strokeDasharray={`${2 * Math.PI * 9}`} strokeDashoffset={`${2 * Math.PI * 9 * 0.05}`} />
                        </svg>
                        <span className="absolute text-[8px] font-mono font-bold text-indigo-400">95%</span>
                      </div>
                      <div className="text-[9px] font-mono leading-none">
                        <span className="text-slate-400 block font-semibold">GEMINI EXTRACTED</span>
                        <span className="text-emerald-500 block font-bold mt-0.5">HIGH CONFIDENCE</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedReview(null)}
                      className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-950 transition-colors duration-150 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Voice Note Transcription details if voice is active */}
                {selectedReview.transcription && (
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 text-xs text-slate-300 font-sans leading-relaxed relative flex items-start gap-2.5">
                    <Volume2 className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-[9px] text-indigo-400 uppercase font-bold block mb-1">Parsed Audio Narration:</span>
                      "{selectedReview.transcription}"
                    </div>
                  </div>
                )}

                {/* Header Editor Grid (Form factor inspired by Notion / Linear) */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Merchant */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold block">Merchant</label>
                    <input 
                      type="text" 
                      value={selectedReview.header.merchant}
                      onChange={(e) => updateReviewField('merchant', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 text-xs font-mono font-medium focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold block">Date (DD/MM/YYYY)</label>
                    <input 
                      type="text" 
                      value={selectedReview.header.date}
                      placeholder="DD/MM/YYYY"
                      onChange={(e) => updateReviewField('date', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 text-xs font-mono font-medium focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Account destination */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold block">Source Asset Account</label>
                    <select 
                      value={selectedReview.header.account_id}
                      onChange={(e) => updateReviewField('account_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 text-xs font-mono font-medium focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    >
                      <option value="">Select Target Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                      ))}
                    </select>
                  </div>

                  {/* Project associations */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold block">Project Target Target</label>
                    <select 
                      value={selectedReview.header.project_id || ''}
                      onChange={(e) => updateReviewField('project_id', e.target.value || null)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 text-xs font-mono font-medium focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    >
                      <option value="">No Associated Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Currency */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold block">Currency</label>
                    <input 
                      type="text" 
                      value={selectedReview.header.currency}
                      onChange={(e) => updateReviewField('currency', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 text-xs font-mono font-medium focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold block">Transaction Narrative</label>
                    <input 
                      type="text" 
                      value={selectedReview.header.notes}
                      onChange={(e) => updateReviewField('notes', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 text-xs font-sans focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Itemized list details editor */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Itemized Ledger Breakdown</span>
                    <button 
                      onClick={handleAddNewItemRow}
                      className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-indigo-950/20 px-2.5 py-1 rounded-lg border border-indigo-900/40 hover:border-indigo-800 transition-all duration-150"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add line position
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-slate-300">
                    {selectedReview.items.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center border border-dashed border-slate-850/60 rounded-xl">No positions declared. Append at least one line.</p>
                    ) : (
                      selectedReview.items.map((item, idx) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex flex-wrap items-center gap-3 shadow-md"
                        >
                          {/* Description */}
                          <div className="flex-1 min-w-[140px]">
                            <span className="text-[9px] text-slate-550 block font-mono uppercase font-semibold pl-1">LINE ITEM DESCRIPTION</span>
                            <input 
                              type="text" 
                              value={item.description}
                              placeholder="Description"
                              onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-indigo-500/50 focus:outline-none text-xs font-sans text-white w-full font-semibold pt-1 transition-all"
                            />
                          </div>

                          {/* Category */}
                          <div className="w-[110px]">
                            <span className="text-[9px] text-slate-550 block font-mono uppercase font-semibold pl-1">CATEGORY</span>
                            <select 
                              value={item.category}
                              onChange={(e) => updateItemField(idx, 'category', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 mt-1 text-slate-300 text-xs font-sans w-full focus:outline-none transition-all cursor-pointer"
                            >
                              <option value="Food">Food</option>
                              <option value="Transport">Transport</option>
                              <option value="Utilities">Utilities</option>
                              <option value="Lodging">Lodging</option>
                              <option value="Entertainment">Entertainment</option>
                              <option value="Shopping">Shopping</option>
                              <option value="Electronics">Electronics</option>
                            </select>
                          </div>

                          {/* Quantity */}
                          <div className="w-[50px]">
                            <span className="text-[9px] text-slate-550 block font-mono uppercase font-semibold text-center">QTY</span>
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg p-1 mt-1 text-center text-slate-300 text-xs font-mono w-full focus:outline-none transition-all"
                              placeholder="Qty"
                            />
                          </div>

                          {/* Amount */}
                          <div className="w-[85px]">
                            <span className="text-[9px] text-slate-550 block font-mono uppercase font-semibold text-right pr-1">TOTAL PRICE</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateItemField(idx, 'amount', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg p-1 mt-1 text-right text-white text-xs font-mono w-full focus:outline-none font-bold transition-all"
                              placeholder="Price"
                            />
                          </div>

                          {/* Delete row */}
                          <div className="pt-4">
                            <button 
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-slate-600 hover:text-rose-400 p-1.5 hover:bg-slate-900 rounded-lg transition-all duration-150 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Summary and approval trigger */}
                <div className="pt-4 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider block">Accumulated total amount</span>
                    <div className="text-2xl font-mono font-bold text-white mt-0.5">
                      {selectedReview.header.currency} {selectedReview.header.total_amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => handleRejectPending(selectedReview.id)} 
                      className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150"
                    >
                      Reject Layout
                    </button>
                    <button 
                      disabled={aiLoading || selectedReview.items.length === 0 || !selectedReview.header.account_id}
                      onClick={handleApproveAndSave} 
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 transition duration-150 cursor-pointer shadow-lg"
                    >
                      <CheckCircle className="w-4 h-4 fill-slate-950 stroke-emerald-500" /> Commit to Ledger
                    </button>
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="h-full min-h-[460px] border border-slate-850/60 bg-slate-900/40 rounded-3xl flex flex-col items-center justify-center text-center p-8 backdrop-blur-md">
                <div className="h-16 w-16 bg-slate-950/60 rounded-full flex items-center justify-center text-indigo-400 mb-5 border border-slate-850 shadow-inner">
                  <Clock className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-md font-display font-bold text-slate-330">Validation Sandbox Chamber</h3>
                <p className="text-slate-500 text-xs max-w-xs mt-2 leading-relaxed font-sans">
                  No transaction is currently selected for review. Scan a receipt, dictating narrations, or try clicking our prompt suggestion pills to begin the validation cycle.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}

