'use strict';
// Loopback-only transport adapter; forwards actual application and WebSocket bytes.
const http = require('node:http');
const net = require('node:net');
if (process.env.APP_ENV !== 'audit' || process.env.DB_DATABASE !== '/scratch/e2e.sqlite') throw Error('Disposable fixture required');
const server = http.createServer((req, res) => {
  const port = /^\/(api|sanctum)(\/|$)/.test(req.url) ? 18080 : 13000;
  const upstream = http.request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers: req.headers }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  req.pipe(upstream);
});
server.on('upgrade', (req, socket, head) => {
  const port = req.url.startsWith('/app/') ? 18081 : req.url.startsWith('/_next/') ? 13000 : null;
  if (!port) return socket.destroy();
  const upstream = net.connect(port, '127.0.0.1', () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (let i = 0; i < req.rawHeaders.length; i += 2) upstream.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
    upstream.write('\r\n');
    if (head.length) upstream.write(head);
    socket.pipe(upstream); upstream.pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
});
server.listen(14000, '127.0.0.1');
