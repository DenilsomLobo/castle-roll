const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sandbox={window:{},Image:class {set src(value){}}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'art.js'),'utf8'),sandbox);
const files=['index.html','style.css','art.js','game-config.js','audio.js','levels.js','game.js','player-name.js','runtime-config.js','ranking-sync.js','ranking-client.js','firebase-config.js','firebase-ranking.js','touch-controls.js','name-keyboard.js','assets/denilsom-avatar.png',...Object.values(sandbox.window.CastleArt.sources)];
const csp="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const headers={'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), fullscreen=(self)'};
module.exports={root,files,headers,csp};
