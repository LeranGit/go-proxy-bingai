'use strict';
const http = require('node:http');
const net = require('node:net');

const host = '198.138.205.41';
const port = 443;

function checkSocks5() {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.createConnection({ host, port });
    let done = false;
    function finish(result) {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ...result, elapsed_ms: Date.now() - started });
    }
    socket.setTimeout(8000);
    socket.on('connect', () => {
      socket.write(Buffer.from([0x05, 0x01, 0x02]));
    });
    socket.on('data', (chunk) => {
      const reply = chunk.subarray(0, 2).toString('hex');
      finish({ tcp: 'connected', socks5_reply: reply, success: reply === '0502' });
    });
    socket.on('timeout', () => finish({ success: false, error: 'timeout' }));
    socket.on('error', err => finish({ success: false, error: err.code || err.message }));
    socket.on('end', () => finish({ success: false, error: 'connection closed' }));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.url !== '/check') {
    res.end(JSON.stringify({ status: 'ready', test_path: '/check' }));
    return;
  }
  const result = await checkSocks5();
  res.statusCode = result.success ? 200 : 502;
  res.end(JSON.stringify(result));
});
server.listen(Number(process.env.PORT) || 10000, '0.0.0.0');
