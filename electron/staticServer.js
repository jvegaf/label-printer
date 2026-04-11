const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function isPathInside(baseDir, targetPath) {
  const relative = path.relative(baseDir, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

function createStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const requestPath = new URL(req.url, 'http://localhost').pathname;
    const normalizedPath = decodeURIComponent(requestPath);
    const candidatePath = normalizedPath === '/'
      ? path.join(rootDir, 'index.html')
      : path.resolve(rootDir, `.${normalizedPath}`);

    if (!isPathInside(rootDir, candidatePath) && candidatePath !== path.join(rootDir, 'index.html')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const filePath = candidatePath;
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });

  return {
    start: () => new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        resolve({
          port: address.port,
          close: () => new Promise((done) => server.close(() => done())),
        });
      });
    }),
  };
}

module.exports = {
  createStaticServer,
};
