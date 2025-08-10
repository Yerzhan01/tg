import { Request, Response, NextFunction } from 'express';
import path from 'path';

// Simple CDN middleware for static assets
export const cdnMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Static assets that should be cached aggressively
  const staticAssets = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  const isStaticAsset = staticAssets.some(ext => req.path.endsWith(ext));
  
  if (isStaticAsset) {
    // Cache static assets for 1 year
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000 * 1000).toUTCString());
    
    // Add ETag for better caching
    const etag = `"${Date.now()}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
  } else if (req.path.startsWith('/api/')) {
    // API responses should not be cached
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    // HTML pages - short cache
    res.setHeader('Cache-Control', 'public, max-age=60');
  }
  
  next();
};

// Compress responses for better performance
export const compressionSetup = (req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
  }
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};