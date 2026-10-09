const fs=require('node:fs'),path=require('node:path');
const {root,files,headers,csp}=require('../server/public-files.cjs');
const out=path.join(root,'dist');
// Refuse stale output instead of risking publication of unexpected files.
if(fs.existsSync(out))throw new Error('A pasta dist já existe. Renomeie ou remova essa pasta antes de gerar uma nova versão.');
fs.mkdirSync(out);
for(const file of files){
  const from=path.resolve(root,file),to=path.resolve(out,file);
  if(!from.startsWith(root+path.sep)||!to.startsWith(out+path.sep)||fs.lstatSync(from).isSymbolicLink())throw new Error('Caminho de publicação inválido.');
  fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);
}
const htmlFile=path.join(out,'index.html');
fs.writeFileSync(htmlFile,fs.readFileSync(htmlFile,'utf8').replace('<meta charset="utf-8">',`<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="${csp.replace("; frame-ancestors 'none'",'')}">\n  <meta name="referrer" content="no-referrer">`));
fs.writeFileSync(path.join(out,'_headers'),'/*\n'+Object.entries(headers).map(([key,value])=>`  ${key}: ${value}`).join('\n')+'\n');
fs.writeFileSync(path.join(out,'.htaccess'),`Options -Indexes\n<IfModule mod_headers.c>\n${Object.entries(headers).map(([key,value])=>`Header always set ${key} "${value}"`).join('\n')}\n</IfModule>\n`);
console.log(`Pacote estático criado em ${out}: ${files.length} arquivos públicos, sem API ou dados privados.`);
