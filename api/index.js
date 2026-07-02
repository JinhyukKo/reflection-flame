const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join('/tmp', 'requests.log');
const PHOTO_FILE = path.join(process.cwd(), 'static', 'images-1.png');

function getMemoryLogs() {
  globalThis.requestLogs = globalThis.requestLogs || [];
  return globalThis.requestLogs;
}

function readRawLogs() {
  if (!fs.existsSync(LOG_FILE)) return '';

  return fs.readFileSync(LOG_FILE, 'utf8');
}

function readLogs() {
  const rawLogs = readRawLogs();

  if (!rawLogs) return getMemoryLogs();

  return rawLogs
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function saveLog(log) {
  getMemoryLogs().push(log);
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(log)}\n`);
}

function sendPhoto(res) {
  if (!fs.existsSync(PHOTO_FILE)) {
    res.status(404).send('Photo not found');
    return;
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'attachment; filename="images-1.png"');
  res.status(200).send(fs.readFileSync(PHOTO_FILE));
}

function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve('');
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString());
  if (req.body && Object.keys(req.body).length > 0) return Promise.resolve(JSON.stringify(req.body));

  return new Promise((resolve) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString());
    });
  });
}

function getPathname(req) {
  const pathQuery = req.query && req.query.path;

  if (typeof pathQuery === 'string') {
    return pathQuery ? `/${pathQuery}` : '/';
  }

  if (Array.isArray(pathQuery)) {
    return `/${pathQuery.join('/')}`;
  }

  return new URL(req.url, 'http://localhost').pathname;
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

module.exports = async function handler(req, res) {
  const body = await readBody(req);
  const pathname = getPathname(req);
  const log = {
    time: new Date().toISOString(),
    method: req.method,
    url: pathname,
    headers: req.headers,
    rawHeaders: req.rawHeaders,
    body,
  };

  saveLog(log);

  if (pathname === '/photo') {
    sendPhoto(res);
    return;
  }

  if (pathname === '/log') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(readRawLogs());
    return;
  }

  if (pathname === '/logs') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(renderLogsTable(readLogs()));
    return;
  }

  res.status(200).json({
    message: '요청을 로그로 저장했습니다.',
    photoUrl: '/photo',
    rawLogUrl: '/log',
    logsUrl: '/logs',
  });
};
