import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Make sure upload directory exists in root
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Support JSON payload with larger limits for PDFs uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // File Upload Endpoint
  app.post('/api/upload', (req, res) => {
    try {
      const { filename, base64 } = req.body;

      if (!filename || !base64) {
        return res.status(400).json({ error: 'Filename and base64 context are required.' });
      }

      // Extract raw base64 data
      const base64Data = base64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Sanitize and suffix filename with timestamp to avoid duplicates
      const fileExt = path.extname(filename) || '.pdf';
      const fileBaseName = path.basename(filename, fileExt)
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 100);
      
      const UniqueName = `${Date.now()}_${fileBaseName}${fileExt}`;
      const destPath = path.join(uploadsDir, UniqueName);

      // Save to disk
      fs.writeFileSync(destPath, buffer);

      // Return client-accessible URL
      const fileUrl = `/uploads/${UniqueName}`;
      return res.json({ url: fileUrl, filename: UniqueName });
    } catch (error: any) {
      console.error('File write error:', error);
      return res.status(500).json({ error: 'Failed to save file on server.' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uploadsCount: fs.readdirSync(uploadsDir).length });
  });

  // Vite development server / production fallback middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
