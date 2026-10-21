import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResumeVersion, JobPosting, MatchResult } from '../types';
import { ScoreGauge } from '../components/ScoreGauge';
import { SkillGapMatrix } from '../components/SkillGapMatrix';
import { TailoredDiffView } from '../components/TailoredDiffView';
import { EmptyState } from '../components/EmptyState';
import { ConfettiCelebration } from '../components/ConfettiCelebration';
import { DEMO_JOBS } from '../mockData';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  Briefcase, 
  RotateCcw, 
  Layers, 
  AlertCircle, 
  Key,
  Check,
  FileCheck,
  Building,
  ArrowRight,
  Printer
} from 'lucide-react';

export const CandidateDashboard: React.FC = () => {
  const { user, token } = useAuth();

  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [jobs, setJobs] = useState<JobPosting[]>(DEMO_JOBS);
  const [selectedJobId, setSelectedJobId] = useState<string>(DEMO_JOBS[0].id);
  const [customJdText, setCustomJdText] = useState<string>('');

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Analysis & Pipeline States
  const [pipelineState, setPipelineState] = useState<'idle' | 'uploading' | 'parsing' | 'embedding' | 'scoring' | 'done'>('idle');
  const [activeMatch, setActiveMatch] = useState<MatchResult | null>(null);
  const [tailoredResult, setTailoredResult] = useState<any | null>(null);
  const [loadingTailor, setLoadingTailor] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchResumes();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setJobs(data);
          setSelectedJobId(data[0].id);
          return;
        }
      }
    } catch {
      setJobs(DEMO_JOBS);
      setSelectedJobId(DEMO_JOBS[0].id);
    }
  };

  const fetchResumes = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/resumes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setResumes(data);
          if (data.length > 0 && !selectedResumeId) {
            setSelectedResumeId(data[0].id);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleResetWorkspace = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setValidationError('');
    setPipelineState('idle');
    setActiveMatch(null);
    setTailoredResult(null);
    setCustomJdText('');
    setShowConfetti(false);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setValidationError('');
    setPipelineState('idle');
    setActiveMatch(null);
    setTailoredResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setValidationError('');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setActiveMatch(null);
      setTailoredResult(null);
      setPipelineState('idle');
      setSelectedResumeId('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setValidationError('');
      setActiveMatch(null);
      setTailoredResult(null);
      setPipelineState('idle');
      setSelectedResumeId('');
    }
  };

  const runFullPipeline = async () => {
    setValidationError('');
    setActiveMatch(null);
    setTailoredResult(null);

    // Mandatory upload validation: either a file has been selected or an existing uploaded resume is picked
    if (!file && !selectedResumeId) {
      setValidationError('Resume upload required: Please upload a resume PDF/DOCX file to compute your ATS score.');
      return;
    }

    const targetJob = jobs.find(j => j.id === selectedJobId) || DEMO_JOBS[0];
    let resumeIdToScore = selectedResumeId;

    try {
      // 1. If user provided a new file, upload and parse it
      if (file) {
        setPipelineState('uploading');
        const formData = new FormData();
        formData.append('resume', file);
        
        const uploadRes = await fetch('/api/resumes/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload and parse resume document.');
        }

        const uploadData = await uploadRes.json();
        resumeIdToScore = uploadData.resume?.id;
        if (!resumeIdToScore) throw new Error('Resume record was not created properly.');
        
        setSelectedResumeId(resumeIdToScore);
        fetchResumes();
      }

      // 2. Parse & Embedding stage
      setPipelineState('parsing');
      await new Promise(r => setTimeout(r, 400));
      
      setPipelineState('embedding');
      await new Promise(r => setTimeout(r, 500));

      // 3. True Hybrid ATS Match Scoring
      setPipelineState('scoring');
      const scoreRes = await fetch('/api/matches/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeId: resumeIdToScore,
          jobPostingId: selectedJobId || undefined,
          jobDescriptionText: customJdText || targetJob.descriptionRaw || ''
        })
      });

      if (!scoreRes.ok) {
        const errData = await scoreRes.json().catch(() => ({}));
        throw new Error(errData.error || 'ATS scoring engine computation failed. Ensure GEMINI_API_KEY is configured.');
      }

      const matchData = await scoreRes.json();
      setActiveMatch(matchData);
      setPipelineState('done');

      if (matchData.finalScore >= 75) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4200);
      }

    } catch (e: any) {
      console.error('Scoring error:', e);
      setValidationError(e.message || 'Error occurred while computing ATS score.');
      setPipelineState('idle');
    }
  };

  const handleGenerateTailored = async () => {
    if (!activeMatch) return;
    setLoadingTailor(true);
    setValidationError('');

    const targetJob = jobs.find(j => j.id === selectedJobId) || DEMO_JOBS[0];

    try {
      const res = await fetch(`/api/resumes/${activeMatch.resumeId}/tailor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          jobPostingId: activeMatch.jobPostingId,
          missingSkills: activeMatch.missingSkills
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTailoredResult(data);
        fetchResumes();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Tailoring service returned an error.');
      }
    } catch (e: any) {
      setValidationError(e.message || 'Failed to generate tailored resume. Verify Gemini API key.');
    } finally {
      setLoadingTailor(false);
    }
  };

  const currentSelectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0] || DEMO_JOBS[0];
  const hasResumeReady = Boolean(file || selectedResumeId);

  return (
    <div className="relative min-h-screen">
      {/* Confetti celebration */}
      <ConfettiCelebration active={showConfetti} score={activeMatch?.finalScore || 0} />

      {/* Top Background Glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#FF5C00]/10 via-[#0B1019]/5 to-transparent pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1019]/85 border border-white/[0.09] p-6 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FF5C00]">
                Candidate ATS Optimization Studio
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/20">
                Hybrid Gemini Embeddings Active
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white mt-1 tracking-tight">
              Resume Diagnostics &amp; Keyword Tailoring
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
              Upload your genuine resume to compute true ATS scores, inspect missing requirements, and generate an executive 1-page tailored resume.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetWorkspace}
              className="px-3.5 py-2 rounded-xl bg-[#05070B] border border-white/[0.10] hover:border-white/[0.20] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Clear current state and reset workspace"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#FFA133]" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <div className="flex-1">
              <strong className="block font-semibold">Validation Notice</strong>
              <span>{validationError}</span>
            </div>
          </div>
        )}

        {/* Main Grid: Upload & JD Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Resume Upload (Mandatory) */}
          <div className="bg-[#0B1019]/85 border border-white/[0.09] rounded-2xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#FF5C00]" />
                  1. Resume Document (Required)
                </h2>
                {file && (
                  <span className="text-[11px] font-mono text-[#00F5A0] font-semibold">
                    File Selected
                  </span>
                )}
              </div>

              {/* Upload Drag & Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  file 
                    ? 'border-[#00F5A0]/50 bg-[#00F5A0]/10' 
                    : (dragActive ? 'border-[#FF5C00] bg-[#FF5C00]/15' : 'border-white/[0.12] hover:border-[#FF5C00]/40 bg-[#05070B]')
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className={`h-11 w-11 mb-2 transition-colors ${file ? 'text-[#00F5A0]' : 'text-slate-500 hover:text-[#FF5C00]'}`} />
                  
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-[#00F5A0]" />
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {(file.size / 1024).toFixed(1)} KB • Ready for ATS Scoring
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleRemoveFile(); }}
                        className="mt-2 text-[10px] text-rose-400 hover:text-rose-300 underline font-semibold"
                      >
                        Remove and choose another file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Click to upload or drag &amp; drop resume file
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Supported formats: PDF, DOCX (Max 5MB)
                      </p>
                      <div className="mt-3 inline-block px-3 py-1 bg-white/[0.06] rounded-lg text-[10px] font-mono text-slate-300 border border-white/[0.08]">
                        Mandatory for score calculation
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {/* Previously Uploaded Resumes */}
              {resumes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                  <p className="text-[11px] text-slate-400 font-semibold mb-2">
                    Or select previously uploaded resume:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resumes.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedResumeId(r.id); setFile(null); setValidationError(''); }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                          selectedResumeId === r.id && !file
                            ? 'bg-[#FF5C00]/20 border-[#FF5C00] text-white font-bold'
                            : 'bg-[#05070B] border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                        }`}
                      >
                        <FileText className="h-3 w-3 text-[#FF5C00]" />
                        <span className="truncate max-w-[150px]">{r.fileName}</span>
                        {selectedResumeId === r.id && !file && <Check className="h-3 w-3 text-[#00F5A0]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status */}
            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-[#FFA133]" />
              <span>Requires backend Gemini API Key for hybrid neural matching</span>
            </div>
          </div>

          {/* Card 2: Target Job Requisition */}
          <div className="bg-[#0B1019]/85 border border-white/[0.09] rounded-2xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl flex flex-col justify-between space-y-4">
            <div>
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#00C9FF]" />
                2. Target Job Requisition
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                    Select Target Job Posting:
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full bg-[#05070B] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                  >
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} — {job.companyName} ({job.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                    Or Paste Custom Job Description:
                  </label>
                  <textarea
                    rows={4}
                    value={customJdText}
                    onChange={(e) => setCustomJdText(e.target.value)}
                    placeholder="Paste job description requirements to benchmark against..."
                    className="w-full bg-[#05070B] border border-white/[0.12] rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#FF5C00] transition-colors resize-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Compute Button */}
            <div className="pt-2">
              <button
                onClick={runFullPipeline}
                disabled={!hasResumeReady || pipelineState !== 'idle' && pipelineState !== 'done'}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                  hasResumeReady && (pipelineState === 'idle' || pipelineState === 'done')
                    ? 'bg-gradient-to-r from-[#FF5C00] to-[#FF7A00] hover:from-[#FF6E1A] hover:to-[#FF8D24] text-white shadow-[0_0_20px_rgba(255,92,0,0.35)] cursor-pointer active:scale-[0.99]'
                    : 'bg-white/[0.05] text-slate-500 border border-white/[0.08] cursor-not-allowed'
                }`}
              >
                {pipelineState === 'uploading' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Uploading Resume Document...</span>
                  </>
                )}
                {pipelineState === 'parsing' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Extracting Skills &amp; Credentials...</span>
                  </>
                )}
                {pipelineState === 'embedding' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Generating Gemini 3072-Dim Embeddings...</span>
                  </>
                )}
                {pipelineState === 'scoring' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Computing Hybrid Lexical &amp; Semantic Match...</span>
                  </>
                )}
                {(pipelineState === 'idle' || pipelineState === 'done') && (
                  <>
                    <Sparkles className="h-4 w-4 stroke-[2.5]" />
                    <span>
                      {hasResumeReady ? 'Compute Genuine ATS Match Score' : 'Upload Resume PDF to Compute Score'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* ATS Score & Diagnostic Matrix Results */}
        {activeMatch && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Score & Gaps Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Score Gauge */}
              <div className="lg:col-span-1 space-y-4">
                <ScoreGauge
                  finalScore={activeMatch.finalScore}
                  lexicalScore={activeMatch.lexicalScore}
                  semanticScore={activeMatch.semanticScore}
                />
                {activeMatch.explanation && (
                  <div className="bg-[#0B1019]/85 border border-white/[0.09] rounded-2xl p-4 text-xs text-slate-300 leading-relaxed shadow-sm">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFA133] mb-1">
                      ATS Scoring Summary
                    </div>
                    {activeMatch.explanation}
                  </div>
                )}
              </div>

              {/* Skill Gap Matrix */}
              <div className="lg:col-span-2">
                <SkillGapMatrix
                  skillGaps={activeMatch.skillGaps || []}
                  matchedSkills={activeMatch.matchedSkills || []}
                  missingSkills={activeMatch.missingSkills || []}
                />
              </div>

            </div>

            {/* Tailor Action Banner */}
            {!tailoredResult && (
              <div className="bg-gradient-to-r from-[#FF5C00]/15 via-[#0B1019] to-[#0B1019] border border-[#FF5C00]/30 rounded-2xl p-6 shadow-[0_16px_40px_rgba(255,92,0,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#FFA133] text-xs font-bold uppercase tracking-wider font-mono">
                    <Sparkles className="h-4 w-4" />
                    <span>Intelligent Resume Optimization Engine</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    Ready to generate your tailored 1-page resume?
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inject missing target competencies while 100% preserving your authentic education, GPA, and projects.
                  </p>
                </div>

                <button
                  onClick={handleGenerateTailored}
                  disabled={loadingTailor}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#FF7A00] hover:from-[#FF6E1A] hover:to-[#FF8D24] text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,92,0,0.35)] flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-60"
                >
                  {loadingTailor ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Synthesizing 1-Page Layout...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 stroke-[2.5]" />
                      <span>Generate Tailored 1-Page Resume</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tailored Diff & 1-Page Document View */}
            {tailoredResult && (
              <div className="animate-in fade-in duration-300">
                <TailoredDiffView
                  versionNumber={tailoredResult.tailoredResume?.version || 2}
                  tailoredText={tailoredResult.tailoredText}
                  beforeAfterDiff={tailoredResult.beforeAfterDiff || []}
                  matchedSkillsAdded={tailoredResult.matchedSkillsAdded || []}
                  candidateName={tailoredResult.candidateName}
                  contactInfo={tailoredResult.contactInfo}
                  targetTitle={tailoredResult.targetTitle}
                  summary={tailoredResult.summary}
                  skills={tailoredResult.skills}
                  education={tailoredResult.education}
                  projects={tailoredResult.projects}
                  experience={tailoredResult.experience}
                />
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};