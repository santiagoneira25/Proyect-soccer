// Head League: sirve el juego (index.html) y reenvía mensajes entre anfitrión e invitado.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000, HTML = path.join(__dirname, 'index.html');
const srv = http.createServer((q, r) => {
  if (q.url === '/health') { r.end('ok'); return; }
  fs.readFile(HTML, (e, d) => {
    if (e) { r.writeHead(500); return r.end('Falta index.html'); }
    r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(d);
  });
});
const wss = new WebSocketServer({ server: srv }), rooms = new Map(), RELAY = ['st', 'in', 'start', 'end'];
const code = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c; do { c = Array.from({ length: 4 }, () => a[Math.random() * a.length | 0]).join(''); } while (rooms.has(c)); return c; };
const send = (w, o) => { if (w && w.readyState === 1) w.send(JSON.stringify(o)); };
wss.on('connection', ws => {
  ws.alive = true; ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    if (raw.length > 4096) return;
    let d; try { d = JSON.parse(raw); } catch (e) { return; }
    if (d.t === 'create' && !ws.room) {
      const c = code(); rooms.set(c, { h: ws, g: null }); ws.room = c; ws.role = 'h'; send(ws, { t: 'created', c });
    } else if (d.t === 'join' && !ws.room) {
      const c = String(d.c || '').toUpperCase(), r = rooms.get(c);
      if (!r || r.g) return send(ws, { t: 'err', m: r ? 'La sala está llena' : 'No existe esa sala' });
      r.g = ws; ws.room = c; ws.role = 'g'; send(ws, { t: 'joined' }); send(r.h, { t: 'peer' });
    } else if (ws.room && RELAY.includes(d.t)) {
      const r = rooms.get(ws.room); if (r) send(ws.role === 'h' ? r.g : r.h, d);
    }
  });
  ws.on('close', () => {
    const r = rooms.get(ws.room); if (!r) return;
    const o = ws.role === 'h' ? r.g : r.h; send(o, { t: 'left' }); rooms.delete(ws.room); if (o) o.room = null;
  });
});
setInterval(() => wss.clients.forEach(w => { if (!w.alive) return w.terminate(); w.alive = false; w.ping(); }), 30000);
srv.listen(PORT, () => console.log('Head League en puerto ' + PORT));
