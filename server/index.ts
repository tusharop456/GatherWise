import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { validateEventPayload } from './validator';
import {
  isLiveAIConfigured,
  getModelIdentifier,
  verifiedOperations,
  generateProposal,
  generateBudgetReduction,
  generateIdeas,
} from './gemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const indexPath = path.join(distPath, 'index.html');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = '0.0.0.0';

// Enable trust proxy for Render reverse proxy environment (ensures correct client IP for rate limiting)
app.set('trust proxy', 1);

// Middlewares
app.use(cors());
// Security: limit incoming payload size to 100kb to prevent payload flood attacks
app.use(express.json({ limit: '100kb' }));

/**
 * In-Memory Sliding-Window Rate Limiter
 * Limits requests per client IP to 25 requests per minute.
 */
interface RateLimitBucket {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25;

function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();

  let bucket = rateLimitMap.get(ip);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitMap.set(ip, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (bucket.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: 'Rate limit exceeded. Maximum 25 AI requests per minute allowed.',
      retryAfterSeconds: Math.ceil((bucket.timestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000),
    });
    return;
  }

  bucket.timestamps.push(now);
  next();
}

// Clean up stale rate-limit IP records every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitMap.entries()) {
    bucket.timestamps = bucket.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (bucket.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

// Health & Capability Check
app.get('/api/health', (_req: Request, res: Response) => {
  const configured = isLiveAIConfigured();
  const anyVerified = verifiedOperations.proposal || verifiedOperations.budgetReduction || verifiedOperations.ideas;

  let mode: 'live_verified' | 'configured_unverified' | 'sample';
  let statusLabel: string;
  let notice: string;

  if (!configured) {
    mode = 'sample';
    statusLabel = 'Sample Mode Active';
    notice = 'Sample Mode is active because GEMINI_API_KEY is not configured in .env. All features work with curated domain templates.';
  } else if (!anyVerified) {
    mode = 'configured_unverified';
    statusLabel = 'AI configured — unverified';
    notice = `GEMINI_API_KEY is detected for model ${getModelIdentifier()}. Live verification pending until an actual upstream generation succeeds against Google.`;
  } else {
    mode = 'live_verified';
    statusLabel = 'Live Gemini Verified';
    notice = `Live Gemini integration is verified and active using model: ${getModelIdentifier()}`;
  }

  res.json({
    status: 'ok',
    liveAIConfigured: configured,
    mode,
    statusLabel,
    model: configured ? getModelIdentifier() : 'GatherWise Deterministic Sample Engine',
    notice,
    verifiedOperations: {
      proposal: verifiedOperations.proposal,
      budgetReduction: verifiedOperations.budgetReduction,
      ideas: verifiedOperations.ideas,
    },
  });
});

// Endpoint 1: Generate Initial Event Proposal
app.post('/api/ai/proposal', rateLimiter, async (req: Request, res: Response) => {
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const validation = validateEventPayload(req.body);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error || 'Invalid event payload.' });
      return;
    }

    const { proposal, isSampleMode, isLiveVerified, modelIdentifier } = await generateProposal(
      validation.data,
      abortController.signal
    );

    res.json({
      success: true,
      proposal,
      isSampleMode,
      isLiveVerified,
      modelIdentifier,
    });
  } catch (err) {
    console.error('[API /api/ai/proposal Error]:', err);
    res.status(502).json({
      error: 'Failed to generate proposal.',
      details: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

// Endpoint 2: Suggest Ways to Reduce Planned Spending
app.post('/api/ai/budget-reduction', rateLimiter, async (req: Request, res: Response) => {
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const eventValidation = validateEventPayload(req.body?.event);
    if (!eventValidation.valid || !eventValidation.data) {
      res.status(400).json({ error: eventValidation.error || 'Invalid event payload.' });
      return;
    }

    const rawCategories = req.body?.categories;
    if (!Array.isArray(rawCategories) || rawCategories.length === 0) {
      res.status(400).json({ error: 'Budget categories array is required.' });
      return;
    }

    const sanitizedCategories = rawCategories.map((c: any) => ({
      id: String(c.id || ''),
      name: String(c.name || 'Category'),
      plannedAmount: Number(c.plannedAmount) || 0,
    }));

    const { result, isSampleMode, isLiveVerified } = await generateBudgetReduction(
      eventValidation.data,
      sanitizedCategories,
      abortController.signal
    );

    res.json({
      success: true,
      result,
      isSampleMode,
      isLiveVerified,
    });
  } catch (err) {
    console.error('[API /api/ai/budget-reduction Error]:', err);
    res.status(502).json({
      error: 'Failed to generate budget reduction advice.',
      details: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

// Endpoint 3: Generate Personalized Theme & Activity Ideas
app.post('/api/ai/ideas', rateLimiter, async (req: Request, res: Response) => {
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const eventValidation = validateEventPayload(req.body);
    if (!eventValidation.valid || !eventValidation.data) {
      res.status(400).json({ error: eventValidation.error || 'Invalid event payload.' });
      return;
    }

    const { result, isSampleMode, isLiveVerified } = await generateIdeas(
      eventValidation.data,
      abortController.signal
    );

    res.json({
      success: true,
      result,
      isSampleMode,
      isLiveVerified,
    });
  } catch (err) {
    console.error('[API /api/ai/ideas Error]:', err);
    res.status(502).json({
      error: 'Failed to generate personalized ideas.',
      details: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

// 404 handler for unmatched /api routes - MUST return JSON 404, never fallback to frontend HTML
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API route not found' });
});

// In production or when the dist directory is present, serve the Vite frontend build
if (process.env.NODE_ENV === 'production' || fs.existsSync(indexPath)) {
  app.use(
    express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // SPA fallback: any remaining non-API GET requests receive index.html
  app.get('*', (_req: Request, res: Response) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build not found. Please run npm run build.');
    }
  });
}

// Start Server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[GatherWise Server] listening on http://${HOST}:${PORT}`);
    console.log(`[GatherWise Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[GatherWise Server] Live AI Configured: ${isLiveAIConfigured()}`);
    if (isLiveAIConfigured()) {
      console.log(`[GatherWise Server] Model configured: ${getModelIdentifier()}`);
    }
  });
}

export default app;
