import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist');const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.txt':'text/plain'};
http.createServer(async(req,res)=>{try{let p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==root&&!p.startsWith(root+'/')){res.writeHead(403);return res.end();}if((await stat(p)).isDirectory())p+='/index.html';const bytes=await readFile(p);res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404,{'Content-Type':'text/html'});res.end(await readFile(root+'/404.html'));}}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Heritage CCE preview on port '+(process.env.PORT||4173)));
