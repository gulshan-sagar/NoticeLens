import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { analyzeNotice, askAboutNotice } from './gemini.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/markdown']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) return callback(new Error('Unsupported file type. Upload a PDF, PNG, JPG, WEBP, or TXT file.'));
    callback(null, true);
  },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 25, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',
  });
});

app.post('/api/analyze', upload.single('notice'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a notice file before analysing it.' });
    const result = await analyzeNotice(req.file);
    res.json({ ...result, fileName: req.file.originalname });
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat', upload.single('notice'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please attach the notice again and retry your question.' });
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    if (!question) return res.status(400).json({ error: 'Enter a question about this notice.' });
    if (question.length > 1000) return res.status(400).json({ error: 'Keep your question under 1,000 characters.' });
    let history = [];
    if (req.body.history) {
      try { history = JSON.parse(req.body.history); } catch { return res.status(400).json({ error: 'Chat history could not be read. Start a new question.' }); }
      if (!Array.isArray(history)) history = [];
    }
    const answer = await askAboutNotice(req.file, question, history);
    res.json(answer);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('[NoticeLens API]', error?.message || error);
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'That file is larger than 10 MB. Please use a smaller file.' : 'The file could not be uploaded.';
    return res.status(400).json({ error: message });
  }
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
  const message = status === 500
    ? 'Something went wrong while analysing the notice. Check the server logs and API key, then retry.'
    : error.message;
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`NoticeLens API running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.warn('GEMINI_API_KEY is missing. Add it to server/.env to enable Gemma analysis.');
});
