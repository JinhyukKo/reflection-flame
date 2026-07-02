const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4000;
const LOG_FILE = path.join(__dirname, 'requests.log');

function readLogs() {
  if (!fs.existsSync(LOG_FILE)) return [];

  return fs
    .readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readRawLogs() {
  if (!fs.existsSync(LOG_FILE)) return '';

  return fs.readFileSync(LOG_FILE, 'utf8');
}

function saveLog(log) {
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(log)}\n`);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderLogsTable(logs) {
  const rows = logs
    .map((log) => {
      const ip = log.headers['x-forwarded-for'] || log.headers['x-real-ip'] || log.headers.host || '';
      const contentType = log.headers['content-type'] || '';

      return `
        <tr>
          <td>${escapeHtml(log.time)}</td>
          <td>${escapeHtml(log.method)}</td>
          <td>${escapeHtml(log.url)}</td>
          <td>${escapeHtml(ip)}</td>
          <td>${escapeHtml(contentType)}</td>
          <td><pre>${escapeHtml(log.body)}</pre></td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>Request Logs</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <h1>Request Logs</h1>
  <table>
    <thead>
      <tr>
        <th>Time</th>
        <th>Method</th>
        <th>URL</th>
        <th>IP / Host</th>
        <th>Content-Type</th>
        <th>Body</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const chunks = [];

  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    const log = {
      time: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      rawHeaders: req.rawHeaders,
      body,
    };

    saveLog(log);

    if (req.url === '/log') {
      sendText(res, 200, readRawLogs());
      return;
    }

    if (req.url === '/logs') {
      sendHtml(res, 200, renderLogsTable(readLogs()));
      return;
    }

    sendJson(res, 200, {
      message: '요청을 로그로 저장했습니다.',
      rawLogUrl: '/log',
      logsUrl: '/logs',
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`Raw logs: http://localhost:${PORT}/log`);
  console.log(`Logs: http://localhost:${PORT}/logs`);
});
