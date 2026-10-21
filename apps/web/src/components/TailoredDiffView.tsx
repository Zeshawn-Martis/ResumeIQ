import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  Columns, 
  FileText,
  Printer
} from 'lucide-react';

export interface DiffItem {
  section: string;
  originalText: string;
  tailoredText: string;
  explanation: string;
}

export interface TailoredResumeData {
  versionNumber: number;
  tailoredText: string;
  beforeAfterDiff: DiffItem[];
  matchedSkillsAdded: string[];
  candidateName?: string;
  contactInfo?: string;
  targetTitle?: string;
  summary?: string;
  skills?: Record<string, string[]>;
  education?: Array<{ institution: string; degree: string; period: string; details?: string }>;
  projects?: Array<{ title: string; period?: string; techStack?: string; bullets: string[] }>;
  experience?: Array<{ company: string; role: string; period?: string; location?: string; bullets: string[] }>;
  onDownload?: () => void;
}

// Clean any markdown formatting asterisks (**bold** or *italic*)
export const cleanText = (str?: string): string => {
  if (!str) return '';
  return str
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
};

export const TailoredDiffView: React.FC<TailoredResumeData> = ({
  versionNumber,
  tailoredText,
  beforeAfterDiff,
  matchedSkillsAdded,
  candidateName = "Candidate",
  contactInfo = "",
  targetTitle = "Software Engineer",
  summary = "",
  skills,
  education,
  projects,
  experience,
  onDownload
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'diff'>('preview');

  // Dynamic values without hardcoding
  const displaySkills: Record<string, string[]> = skills || {};
  const displayEducation = education || [];
  const displayProjects = projects || [];

  const handleCopy = () => {
    const rawCopyText = cleanText(tailoredText) || `${cleanText(candidateName)}\n${cleanText(contactInfo)}\n\nSummary:\n${cleanText(summary)}`;
    navigator.clipboard.writeText(rawCopyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPDF = () => {
    if (onDownload) onDownload();

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const skillsHtml = Object.entries(displaySkills)
      .map(([category, items]) => {
        const cleanedCategory = cleanText(category);
        const cleanedList = Array.isArray(items) 
          ? items.map(cleanText).join(', ') 
          : cleanText(String(items));
        return `
          <div style="margin-bottom: 3.5px; font-size: 11px; line-height: 1.4;">
            <strong style="color: #0f172a; font-weight: 700;">${cleanedCategory}:</strong>
            <span style="color: #334155;"> ${cleanedList}</span>
          </div>
        `;
      }).join('');

    const eduHtml = displayEducation
      .map(edu => `
        <div style="margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 14px; width: 100%;">
            <div style="flex: 1 1 auto; min-width: 0; word-break: break-word; font-weight: 700; font-size: 11.5px; color: #0f172a;">
              ${cleanText(edu.institution)}
            </div>
            <div style="flex: 0 0 auto; white-space: nowrap; text-align: right; font-weight: 600; color: #475569; font-size: 10.5px;">
              ${cleanText(edu.period)}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 14px; width: 100%; font-size: 11px; color: #1e293b;">
            <div style="flex: 1 1 auto; min-width: 0; word-break: break-word;">
              ${cleanText(edu.degree)}
            </div>
            <div style="flex: 0 0 auto; white-space: nowrap; text-align: right; color: #64748b; font-size: 10.5px; font-weight: 500;">
              ${cleanText(edu.details || '')}
            </div>
          </div>
        </div>
      `).join('');

    const projHtml = displayProjects
      .map(proj => `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 14px; width: 100%;">
            <div style="flex: 1 1 auto; min-width: 0; word-break: break-word; font-weight: 700; font-size: 11.5px; color: #0f172a;">
              ${cleanText(proj.title)}
              ${proj.techStack ? `<span style="font-weight: 400; font-style: italic; color: #475569; font-size: 10.5px;"> | ${cleanText(proj.techStack)}</span>` : ''}
            </div>
            <div style="flex: 0 0 auto; white-space: nowrap; text-align: right; font-weight: 600; color: #475569; font-size: 10.5px;">
              ${cleanText(proj.period || '')}
            </div>
          </div>
          <ul style="margin: 2.5px 0 0 16px; padding: 0;">
            ${(proj.bullets || []).map(b => `<li style="margin-bottom: 2.5px; font-size: 10.5px; color: #1e293b; line-height: 1.4;">${cleanText(b)}</li>`).join('')}
          </ul>
        </div>
      `).join('');

    const expHtml = (experience && experience.length > 0)
      ? `
        <div style="margin-top: 8px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 2px; margin-bottom: 6px;">
            Professional Experience
          </div>
          ${experience.map(exp => `
            <div style="margin-bottom: 7px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 14px; width: 100%;">
                <div style="flex: 1 1 auto; min-width: 0; word-break: break-word; font-weight: 700; font-size: 11.5px; color: #0f172a;">
                  ${cleanText(exp.role)} — <span style="font-weight: 500; color: #334155;">${cleanText(exp.company)}</span>
                </div>
                <div style="flex: 0 0 auto; white-space: nowrap; text-align: right; font-weight: 600; color: #475569; font-size: 10.5px;">
                  ${cleanText(exp.period || '')}
                </div>
              </div>
              <ul style="margin: 2.5px 0 0 16px; padding: 0;">
                ${(exp.bullets || []).map(b => `<li style="margin-bottom: 2.5px; font-size: 10.5px; color: #1e293b; line-height: 1.4;">${cleanText(b)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${cleanText(candidateName).replace(/\\s+/g, '_')}_Tailored_Resume.pdf</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #0f172a;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .resume-wrapper {
              max-width: 180mm;
              margin: 0 auto;
              padding: 0 2mm;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 7px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 5px;
            }
            .header h1 {
              font-size: 20px;
              font-weight: 900;
              margin: 0 0 2px 0;
              letter-spacing: 0.03em;
              text-transform: uppercase;
              color: #0f172a;
            }
            .header .subtitle {
              font-size: 11.5px;
              font-weight: 700;
              color: #1d4ed8;
              margin-bottom: 2px;
            }
            .header .contact {
              font-size: 10px;
              color: #475569;
              word-spacing: 0.1em;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #0f172a;
              border-bottom: 1.5px solid #0f172a;
              padding-bottom: 2px;
              margin-top: 8px;
              margin-bottom: 5px;
            }
            .summary-text {
              font-size: 10.5px;
              color: #1e293b;
              line-height: 1.4;
              text-align: justify;
              margin: 0;
            }
            @media print {
              html, body {
                width: 100%;
                height: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="resume-wrapper">
            <div class="header">
              <h1>${cleanText(candidateName)}</h1>
              ${targetTitle ? `<div class="subtitle">${cleanText(targetTitle)}</div>` : ''}
              ${contactInfo ? `<div class="contact">${cleanText(contactInfo)}</div>` : ''}
            </div>

            ${summary ? `
              <div class="section-title">Professional Summary</div>
              <p class="summary-text">${cleanText(summary)}</p>
            ` : ''}

            ${skillsHtml ? `
              <div class="section-title">Technical Competencies</div>
              ${skillsHtml}
            ` : ''}

            ${projHtml ? `
              <div class="section-title">Technical Projects</div>
              ${projHtml}
            ` : ''}

            ${expHtml}

            ${eduHtml ? `
              <div class="section-title">Education</div>
              ${eduHtml}
            ` : ''}
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="bg-[#0B1019]/90 border border-white/[0.10] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 backdrop-blur-xl">
      
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00F5A0] shadow-[0_0_8px_#00F5A0] animate-pulse" />
            <h3 className="font-display text-lg font-bold text-white">
              Tailored Executive Resume (1-Page ATS Edition)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30 text-[10px] font-mono font-bold">
              Revision v{versionNumber}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Formatted strictly within a 1-page executive printable boundary. Zero asterisks or raw symbols. Real academic records and project accomplishments preserved.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-[#05070B] border border-white/[0.10] hover:border-white/[0.20] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#00F5A0]" />
                <span className="text-[#00F5A0]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Text</span>
              </>
            )}
          </button>
          
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#FF7A00] hover:from-[#FF6E1A] hover:to-[#FF8D24] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,92,0,0.35)] active:scale-95"
          >
            <Printer className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Print / Save 1-Page PDF</span>
          </button>
        </div>
      </div>

      {/* Target Keywords High-Density Ribbon */}
      {matchedSkillsAdded.length > 0 && (
        <div className="p-3.5 bg-[#00F5A0]/10 border border-[#00F5A0]/25 rounded-xl flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#00F5A0] text-xs font-semibold shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Requisition Keywords Integrated:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkillsAdded.map((skill, idx) => (
              <span 
                key={idx} 
                className="px-2.5 py-0.5 rounded-lg bg-[#00F5A0]/20 text-[#00F5A0] font-mono text-[11px] font-bold border border-[#00F5A0]/35 shadow-[0_0_8px_rgba(0,245,160,0.15)]"
              >
                +{cleanText(skill)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-[#FF5C00] text-[#FFA133]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>1-Page Printable Document</span>
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'diff'
                ? 'border-[#FF5C00] text-[#FFA133]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Optimization Diff ({beforeAfterDiff.length} Bullet Improvements)</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
          Strict 1-Page Layout Standard • Safe Margins
        </span>
      </div>

      {/* Tab 1: Authentic 1-Page Executive Sheet Container */}
      {activeTab === 'preview' && (
        <div className="flex justify-center p-2 sm:p-4 bg-[#05070B] rounded-2xl border border-white/[0.06] overflow-x-auto">
          {/* Paper Sheet Mockup with uncropped margins */}
          <div className="w-full max-w-[780px] bg-white text-slate-900 rounded-lg shadow-2xl p-7 sm:p-9 font-sans text-xs leading-relaxed space-y-4 border border-slate-200">
            
            {/* Header */}
            <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950 font-display">
                {cleanText(candidateName)}
              </h1>
              <div className="text-xs font-bold text-blue-700 tracking-wide">
                {cleanText(targetTitle)}
              </div>
              <div className="text-[10px] text-slate-600 font-sans tracking-tight">
                {cleanText(contactInfo)}
              </div>
            </div>

            {/* Professional Summary */}
            {summary && (
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-1.5 flex items-center justify-between">
                  <span>Professional Summary</span>
                </div>
                <p className="text-[11px] text-slate-800 leading-relaxed text-justify">
                  {cleanText(summary)}
                </p>
              </div>
            )}

            {/* Technical Competencies */}
            {Object.keys(displaySkills).length > 0 && (
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-1.5 flex items-center justify-between">
                  <span>Technical Competencies</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  {Object.entries(displaySkills).map(([cat, list], i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                      <span className="font-bold text-slate-950 sm:w-44 shrink-0">{cleanText(cat)}:</span>
                      <span className="text-slate-800 font-normal">
                        {Array.isArray(list) ? list.map(cleanText).join(', ') : cleanText(String(list))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Projects */}
            {displayProjects.length > 0 && (
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-2 flex items-center justify-between">
                  <span>Technical Projects</span>
                </div>
                <div className="space-y-2.5">
                  {displayProjects.map((p, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline gap-3 w-full">
                        <div className="flex-1 min-w-0 font-bold text-[11.5px] text-slate-950">
                          {cleanText(p.title)}
                          {p.techStack && (
                            <span className="font-normal italic text-[10.5px] text-slate-600 ml-1.5">
                              | {cleanText(p.techStack)}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 whitespace-nowrap text-right font-semibold text-[10px] text-slate-600">
                          {cleanText(p.period)}
                        </div>
                      </div>
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-[10.5px] text-slate-800">
                        {p.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-snug">
                            {cleanText(b)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience if present */}
            {experience && experience.length > 0 && (
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-2">
                  <span>Professional Experience</span>
                </div>
                <div className="space-y-2.5">
                  {experience.map((exp, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline gap-3 w-full">
                        <div className="flex-1 min-w-0 font-bold text-[11.5px] text-slate-950">
                          {cleanText(exp.role)} — <span className="font-normal text-slate-700">{cleanText(exp.company)}</span>
                        </div>
                        <div className="shrink-0 whitespace-nowrap text-right font-semibold text-[10px] text-slate-600">
                          {cleanText(exp.period)}
                        </div>
                      </div>
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-[10.5px] text-slate-800">
                        {exp.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-snug">{cleanText(b)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {displayEducation.length > 0 && (
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-950 border-b border-slate-900 pb-0.5 mb-1.5 flex items-center justify-between">
                  <span>Education</span>
                </div>
                <div className="space-y-2">
                  {displayEducation.map((edu, idx) => (
                    <div key={idx} className="text-[11px]">
                      <div className="flex justify-between items-baseline gap-3 w-full font-bold text-slate-950">
                        <div className="flex-1 min-w-0">
                          {cleanText(edu.institution)}
                        </div>
                        <div className="shrink-0 whitespace-nowrap text-right font-semibold text-[10px] text-slate-600">
                          {cleanText(edu.period)}
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline gap-3 w-full text-slate-800 text-[10.5px]">
                        <div className="flex-1 min-w-0">
                          {cleanText(edu.degree)}
                        </div>
                        {edu.details && (
                          <div className="shrink-0 whitespace-nowrap text-right font-medium text-slate-600">
                            {cleanText(edu.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Tab 2: Synchronized Diff */}
      {activeTab === 'diff' && (
        <div className="space-y-4">
          {beforeAfterDiff.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-[#05070B] rounded-xl border border-white/[0.06]">
              All bullet points already aligned strongly with target competencies.
            </div>
          ) : (
            beforeAfterDiff.map((diff, idx) => (
              <div key={idx} className="bg-[#05070B] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
                
                {/* Header */}
                <div className="bg-[#0F1623] px-4 py-2 border-b border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 font-display">{cleanText(diff.section) || 'Technical Projects'}</span>
                  <span className="text-[10px] font-mono text-[#FFA133] uppercase font-bold tracking-wider">
                    Transformation #{idx + 1}
                  </span>
                </div>

                {/* Side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] p-4 gap-4 md:gap-0">
                  <div className="md:pr-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                        Original Resume Phrasing
                      </span>
                      <span className="text-[10px] font-mono text-[#FF2E63]">Prior</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0B1019] border border-white/[0.06] text-xs text-slate-400 font-mono leading-relaxed">
                      {cleanText(diff.originalText)}
                    </div>
                  </div>

                  <div className="md:pl-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5A0] font-mono">
                        Target-Tailored Phrasing
                      </span>
                      <span className="text-[10px] font-mono text-[#00F5A0] font-bold">Tailored</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/25 text-xs font-mono leading-relaxed shadow-[0_0_12px_rgba(0,245,160,0.1)]">
                      {cleanText(diff.tailoredText)}
                    </div>
                  </div>
                </div>

                {/* Rationale */}
                <div className="bg-[#0F1623]/60 px-4 py-2.5 border-t border-white/[0.06] text-[11px] text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#00F5A0] shrink-0" />
                  <span><strong className="text-white">Optimization Rationale:</strong> {cleanText(diff.explanation)}</span>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* Factual Integrity Guarantee Footer */}
      <div className="flex items-center gap-2.5 text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
        <ShieldCheck className="h-4 w-4 text-[#FF5C00] shrink-0" />
        <span>
          <strong>Factual Integrity Guarantee:</strong> Revisions are strictly derived from your authentic background. All institutions, GPA metrics, and core accomplishments remain strictly genuine.
        </span>
      </div>

    </div>
  );
};
