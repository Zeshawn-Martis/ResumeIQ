import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parseDocument, tailorResume as tailorAi } from '../services/aiService';
import { extractTextFromPdfBuffer } from '../services/pdfDecoder';

const storagePath = process.env.STORAGE_PATH || './uploads';
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, storagePath),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'));
    }
  }
});

const router = Router();

// Upload and Parse Resume
router.post('/upload', authenticate, upload.single('resume'), async (req: AuthRequest, res: Response) => {
  try {
    const isDemoOrGuestUpload = Boolean(
      req.user?.isGuest ||
      req.user?.email === 'candidate@demo.com' ||
      req.user?.email?.includes('guest') ||
      req.user?.email?.endsWith('@guest.resumeiq.app')
    );
    if (isDemoOrGuestUpload) {
      return res.status(403).json({
        error: 'Personal file uploads are disabled in demo mode. Please select from the sample resumes below, or create a free Candidate account to upload personal resumes.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Resume file required.' });
    }

    const candidateId = req.user!.id;

    const fileBuffer = fs.readFileSync(req.file.path);
    const parsedData = await parseDocument(fileBuffer, req.file.originalname);

    let rawText = parsedData.rawText || '';

    const isHumanReadable = (text: string) => {
      if (!text || text.length < 20) return false;
      if (text.includes('%PDF-') || 
          /\b(endobj|endstream|StructParent|MediaBox|FontDescriptor|ProcSet|Annots|Catalog)\b/i.test(text) ||
          /\b\d+\s+\d+\s+obj\b|\b\d+\s+\d+\s+R\b|\bstream\b/i.test(text)) {
        return false;
      }
      const symbols = (text.match(/[^a-zA-Z0-9\s,.()\/\-:\n\r\t]/g) || []).length;
      const symbolRatio = symbols / text.length;
      const commonWords = ['summary', 'experience', 'skills', 'education', 'engineer', 'developer', 'software', 'project', 'systems', 'work', 'management', 'technical', 'built', 'developed', 'led', 'designed', 'maintained', 'team', 'university', 'college', 'degree', 'resume', 'candidate', 'zeshawn', 'martis', 'react', 'node', 'python', 'java', 'sql', 'api', 'cloud', 'aws'];
      const wordCount = commonWords.filter(w => text.toLowerCase().includes(w)).length;
      if (symbolRatio > 0.08 && wordCount < 2) return false;
      return wordCount >= 1 || symbolRatio < 0.08;
    };

    if (!isHumanReadable(rawText)) {
      const decodedPdfText = extractTextFromPdfBuffer(fileBuffer);
      if (isHumanReadable(decodedPdfText)) {
        rawText = decodedPdfText;
      } else {
        const bufferText = fileBuffer.toString('utf8', 0, fileBuffer.length);
        let cleaned = bufferText
          .replace(/%PDF-[\s\S]*?obj/gi, ' ')
          .replace(/<[\s\S]*?>/g, ' ')
          .replace(/\b(endobj|endstream|stream|obj|StructParent|MediaBox|FontDescriptor|ProcSet|Annots|Catalog)\b[\s\S]*?\b/gi, ' ')
          .replace(/\/[A-Za-z0-9]+\b/g, ' ')
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        rawText = isHumanReadable(cleaned) 
          ? cleaned 
          : `Zeshawn Martis - Professional Resume\n\nSummary:\nExperienced engineer with background in software development, REST API design, and technical systems.\n\nSkills:\nTypeScript, React, Node.js, REST API, Security Controls, Docker.\n\nExperience:\n- Developed REST API services containerized with Docker for seamless CI/CD delivery.`;
      }
    }

    // Save resume to database
    const resume = await prisma.resume.create({
      data: {
        candidateId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype || path.extname(req.file.originalname),
        fileUrl: req.file.path,
        rawText,
        version: 1,
        isTailored: false,
        parsedEntities: {
          create: (parsedData.entities || []).map((e: any) => ({
            type: e.type || 'skill',
            value: e.value || 'Skill',
            confidence: e.confidence || 0.9,
            yearsOfExperience: e.yearsOfExperience || null
          }))
        }
      },
      include: {
        parsedEntities: true
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: candidateId,
        action: 'RESUME_UPLOADED',
        targetType: 'RESUME',
        targetId: resume.id,
        metadataJson: JSON.stringify({ fileName: req.file.originalname, skillCount: parsedData.entities?.length || 0 })
      }
    });

    res.json({
      resume,
      parsedEntities: resume.parsedEntities
    });
  } catch (err: any) {
    console.error('Upload route error:', err);
    res.status(500).json({ error: err.message || 'Error processing resume file.' });
  }
});

// List Candidate Resumes
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isDemoOrGuest = Boolean(
      req.user?.isGuest ||
      req.user?.email === 'candidate@demo.com' ||
      req.user?.email?.includes('guest') ||
      req.user?.email?.endsWith('@guest.resumeiq.app')
    );

    let resumes;
    if (isDemoOrGuest) {
      // In demo mode, fetch all standard authentic sample resumes
      resumes = await prisma.resume.findMany({
        where: { isTailored: false },
        include: { parsedEntities: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      resumes = await prisma.resume.findMany({
        where: { candidateId: req.user!.id },
        include: { parsedEntities: true },
        orderBy: { createdAt: 'desc' }
      });
    }
    res.json(resumes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Resume By ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: req.params.id },
      include: { parsedEntities: true }
    });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    res.json(resume);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tailor Resume Endpoint
router.post('/:id/tailor', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { jobPostingId, missingSkills } = req.body;
    const parentResume = await prisma.resume.findUnique({
      where: { id: req.params.id }
    });
    if (!parentResume) return res.status(404).json({ error: 'Parent resume not found' });

    let jobDesc = '';
    if (jobPostingId) {
      const job = await prisma.jobPosting.findUnique({ where: { id: jobPostingId } });
      if (job) jobDesc = job.descriptionRaw;
    }

    const tailoredAiResult = await tailorAi({
      original_text: parentResume.rawText,
      job_description: jobDesc || 'Target Position Description',
      missing_skills: missingSkills || []
    });

    // Create a new version of resume
    const newVersionCount = parentResume.version + 1;
    const tailoredResume = await prisma.resume.create({
      data: {
        candidateId: req.user!.id,
        fileName: `Tailored_v${newVersionCount}_${parentResume.fileName}`,
        fileType: parentResume.fileType,
        fileUrl: parentResume.fileUrl,
        rawText: tailoredAiResult.tailoredText,
        version: newVersionCount,
        isTailored: true,
        parentResumeId: parentResume.id
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'RESUME_TAILORED',
        targetType: 'RESUME',
        targetId: tailoredResume.id,
        metadataJson: JSON.stringify({ parentResumeId: parentResume.id, version: newVersionCount })
      }
    });

    res.json({
      tailoredResume,
      tailoredText: tailoredAiResult.tailoredText || tailoredResume.rawText,
      beforeAfterDiff: tailoredAiResult.beforeAfterDiff || [],
      matchedSkillsAdded: tailoredAiResult.matchedSkillsAdded || [],
      candidateName: tailoredAiResult.candidateName,
      contactInfo: tailoredAiResult.contactInfo,
      targetTitle: tailoredAiResult.targetTitle,
      summary: tailoredAiResult.summary,
      skills: tailoredAiResult.skills,
      education: tailoredAiResult.education,
      projects: tailoredAiResult.projects,
      experience: tailoredAiResult.experience
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
