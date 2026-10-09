const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createRanking}=require('./ranking.cjs');
const {root,files,headers}=require('./public-files.cjs');
function createServer({dataFile=path.join(__dirname,'data','ranking.json'),now,apiEnabled=false,publicOrigin, trustedProxies=[]}={}) {
  const origin=publicOrigin?new URL(publicOrigin).origin:null;
  const ranking=apiEnabled?createRanking(dataFile,{now}):null;
  const requests=new Map();
  return http.createServer({requestTimeout:15000,headersTimeout:10000,keepAliveTimeout:5000,maxHeaderSize:8192},async(req,res)=>{
    for(const [key,value] of Object.entries(headers))res.setHeader(key,value);
    if(origin?.startsWith('https://'))res.setHeader('Strict-Transport-Security','max-age=31536000');
    const respond=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/runtime-config.js'&&['GET','HEAD'].includes(req.method)) {
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        return res.end(req.method==='HEAD'?'':`window.CastleRuntime={ranking:'${apiEnabled?'online':'local'}'};`);
      }
      if(url.pathname.startsWith('/api/')) {
        if(!apiEnabled)return respond(404,{error:'API desativada.'});
        const time=Date.now();let ip=req.socket.remoteAddress;
        if(trustedProxies.includes(ip)){
          const forwarded=req.headers['x-forwarded-for']?.split(',').at(-1).trim();
          if(require('node:net').isIP(forwarded||''))ip=forwarded;
        }
        for(const [key,entry] of requests)if(entry.until<time)requests.delete(key);
        const rate=requests.get(ip)||{until:time+60000,count:0};
        if(requests.size>=10000&&!requests.has(ip))return respond(503,{error:'Servidor ocupado.'});
        requests.set(ip,rate);
        if(++rate.count>60){res.setHeader('Retry-After','60');return respond(429,{error:'Muitas solicitações. Tente novamente em um minuto.'});}
        if(req.headers['sec-fetch-site']==='cross-site')return respond(403,{error:'Origem não permitida.'});
        const expectedOrigin=origin||`http://${req.headers.host}`;
        if(req.headers.origin&&req.headers.origin!==expectedOrigin)return respond(403,{error:'Origem não permitida.'});
        if(req.method==='GET'&&url.pathname==='/api/ranking')return respond(200,{top:ranking.top(url.searchParams.has('stage')?Number(url.searchParams.get('stage')):undefined)});
        if(req.method!=='POST')return respond(405,{error:'Método não permitido.'});
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return respond(415,{error:'Use application/json.'});
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>16384)return respond(413,{error:'Dados muito grandes.'});chunks.push(chunk);}
        const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(!data||Array.isArray(data)||typeof data!=='object')return respond(400,{error:'Objeto JSON inválido.'});
        if(url.pathname==='/api/runs')return respond(201,ranking.begin(data.name));
        const match=url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)\/finish$/);
        if(match)return respond(200,ranking.finish(match[1],data));
        return respond(404,{error:'Rota não encontrada.'});
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
      const name=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
      const file=path.resolve(root,'.'+name);
      if(!files.includes(name.slice(1))||!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.realpathSync(file).startsWith(root+path.sep)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.txt':'text/plain; charset=utf-8'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    }catch(error){respond(error.code?503:400,{error:error.code?'Não foi possível salvar ou ler os dados. Tente novamente.':'Solicitação inválida. Confira o nome, a partida e os dados enviados.'});}
  });
}
if(require.main===module) {
  const port=Number(process.env.PORT)||8787;
  if(process.env.NODE_ENV==='production'&&!process.env.APP_ORIGIN?.startsWith('https://'))throw new Error('Configure APP_ORIGIN com o endereço HTTPS público do jogo.');
  if(process.env.NODE_ENV==='production'&&process.env.RANKING_MODE!=='local'&&!process.env.DATA_FILE)throw new Error('Configure DATA_FILE em um volume persistente para o ranking online.');
  createServer({apiEnabled:process.env.RANKING_MODE!=='local',dataFile:process.env.DATA_FILE||path.join(__dirname,'data','ranking.json'),publicOrigin:process.env.APP_ORIGIN,trustedProxies:(process.env.TRUSTED_PROXIES||'').split(',').filter(Boolean)}).on('error',error=>{
    console.error(error.code==='EADDRINUSE'?`A porta ${port} já está em uso. Feche a outra instância do jogo ou configure PORT.`:error.message);
    process.exitCode=1;
  }).listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Castle Roll: http://localhost:${port}`));
}
module.exports={createServer};
