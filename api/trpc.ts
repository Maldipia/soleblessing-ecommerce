import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import { appRouter } from '../server/routers';
import { createContext } from '../server/_core/context';

const app = express();

// CORS for Vercel deployment
app.use(cors({
  origin: [
    'https://www.soleblessingofficial.com',
    'https://soleblessingofficial.com',
    'https://soleblessing-ecommerce.vercel.app',
  ],
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// tRPC middleware
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Forward to Express app
  return app(req as any, res as any);
}
