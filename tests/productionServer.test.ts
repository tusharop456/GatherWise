import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../server/index';

describe('Production Server & Single Origin Routing', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      // Bind to ephemeral port on 127.0.0.1 for testing
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('API Endpoints on Same Origin', () => {
    it('serves GET /api/health with status 200 and JSON response', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('liveAIConfigured');
      expect(body).toHaveProperty('mode');
      expect(body).toHaveProperty('model');
      expect(body).toHaveProperty('verifiedOperations');
    });

    it('returns JSON 404 for unmatched GET /api routes (not HTML fallback)', async () => {
      const res = await fetch(`${baseUrl}/api/non-existent-endpoint`);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'API route not found' });
    });

    it('returns JSON 404 for unmatched POST /api routes', async () => {
      const res = await fetch(`${baseUrl}/api/unknown/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'API route not found' });
    });

    it('returns JSON 404 for root /api request', async () => {
      const res = await fetch(`${baseUrl}/api`);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'API route not found' });
    });

    it('returns JSON 400 for invalid payload on known /api/ai/proposal endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/ai/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      });
      expect(res.status).toBe(400);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('Frontend Static & SPA Fallback Serving', () => {
    it('serves index.html at root GET /', async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const text = await res.text();
      expect(text).toContain('<!DOCTYPE html>');
      expect(text).toContain('id="root"');
      expect(text).toContain('GatherWise');
    });

    it('serves index.html as SPA fallback for non-API client routes (e.g. /plan/wedding)', async () => {
      const res = await fetch(`${baseUrl}/plan/wedding`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const text = await res.text();
      expect(text).toContain('<!DOCTYPE html>');
      expect(text).toContain('id="root"');
    });
  });

  describe('Configuration & Security Headers', () => {
    it('has trust proxy enabled for Render load balancer environments', () => {
      expect(app.get('trust proxy')).toBeTruthy();
    });
  });
});
