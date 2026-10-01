const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url === '/' ? '/index.html' : req.url;
  const parsed = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsed.pathname;

  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  let filePath = path.join(root, pathname);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.exists(filePath, (exists) => {
    if (!exists) {
      const fallback = path.join(root, 'index.html');
      fs.readFile(fallback, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes['.html'] || 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Servidor activo en http://localhost:${port}`);
});
