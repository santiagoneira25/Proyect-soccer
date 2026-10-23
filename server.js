// Servidor de salas para Fútbol en Bloques. Sin dependencias: solo Node 18+.
// Sirve el juego (index.html) y un WebSocket en la misma dirección.
const http=require('http'),fs=require('fs'),crypto=require('crypto'),path=require('path');
const PORT=process.env.PORT||3000,HTML=path.join(__dirname,'index.html'),MAX=8;
const srv=http.createServer((q,s)=>{
 if(q.url.split('?')[0]=='/health'){s.end('ok');return}
 fs.readFile(HTML,(e,d)=>{if(e){s.writeHead(500);s.end('Falta index.html');return}s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(d)})});
const rooms=new Map();
function frame(data,op){const p=Buffer.isBuffer(data)?data:Buffer.from(data);let h;
 if(p.length<126)h=Buffer.from([128|op,p.length]);
 else if(p.length<65536){h=Buffer.alloc(4);h[0]=128|op;h[1]=126;h.writeUInt16BE(p.length,2)}
 else{h=Buffer.alloc(10);h[0]=128|op;h[1]=127;h.writeBigUInt64BE(BigInt(p.length),2)}
 return Buffer.concat([h,p])}
const send=(c,data,op=1)=>{if(!c.sock.destroyed&&c.sock.writable)c.sock.write(frame(data,op))};
function parse(c){const b=c.buf;if(b.length<2)return null;const op=b[0]&15;let len=b[1]&127,o=2;
 if(len==126){if(b.length<4)return null;len=b.readUInt16BE(2);o=4}
 else if(len==127){if(b.length<10)return null;len=Number(b.readBigUInt64BE(2));o=10}
 if(len>262144){c.sock.destroy();return null}
 const masked=b[1]&128;if(masked)o+=4;if(b.length<o+len)return null;
 const data=Buffer.from(b.subarray(o,o+len));
 if(masked){const m=b.subarray(o-4,o);for(let i=0;i<len;i++)data[i]^=m[i&3]}
 c.buf=b.subarray(o+len);return{op,data}}
function peers(room){const set=rooms.get(room);if(!set)return;const p={};set.forEach(c=>p[c.id]=c.pr);const m=JSON.stringify({t:'peers',p});set.forEach(c=>send(c,m))}
function leave(c){if(!c.room)return;const set=rooms.get(c.room);const r=c.room;c.room=null;if(!set)return;set.delete(c);if(!set.size)rooms.delete(r);else peers(r)}
function onMsg(c,txt){let m;try{m=JSON.parse(txt)}catch(e){return}
 if(m.t=='j'){leave(c);const r=String(m.r||'').slice(0,48);if(!r)return;let set=rooms.get(r);if(!set)rooms.set(r,set=new Set());
  if(set.size>=MAX){send(c,JSON.stringify({t:'full'}));return}
  c.room=r;c.id=String(m.id||Math.random()).slice(0,16);c.pr={};set.add(c);peers(r)}
 else if(!c.room)return;
 else if(m.t=='p'){const s=JSON.stringify(m.pr||{});if(s.length>4000)return;c.pr=m.pr||{};peers(c.room)}
 else if(m.t=='e'){const out=JSON.stringify({t:'e',topic:String(m.topic).slice(0,48),data:m.data});rooms.get(c.room).forEach(o=>{if(o!==c)send(o,out)})}}
srv.on('upgrade',(req,sock)=>{const key=req.headers['sec-websocket-key'];if(!key)return sock.destroy();
 sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
 const c={sock,room:null,id:null,pr:{},buf:Buffer.alloc(0)};
 sock.on('data',d=>{c.buf=Buffer.concat([c.buf,d]);let f;while((f=parse(c))!==null){if(f.op==8){sock.end();return}if(f.op==9){send(c,f.data,10);continue}if(f.op==1)onMsg(c,f.data.toString())}});
 sock.on('close',()=>leave(c));sock.on('error',()=>{leave(c);sock.destroy()})});
setInterval(()=>rooms.forEach(s=>s.forEach(c=>send(c,'',9))),25000);
srv.listen(PORT,()=>console.log('Fútbol en Bloques en http://localhost:'+PORT));
