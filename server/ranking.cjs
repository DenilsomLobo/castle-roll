const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {randomUUID,randomInt}=require('node:crypto');
const {normalize}=require('../player-name.js');
const root=path.resolve(__dirname,'..');
const context={window:{}};vm.createContext(context);
for(const file of ['game-config.js','levels.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const config=context.window.CastleConfig,levels=context.window.CastleLevels;
const manifests=levels.map(stage=>({
  enemies:(typeof stage.enemies==='function'?stage.enemies():stage.enemies).map(e=>e.kind),
  candles:stage.candles.length,boss:stage.boss
}));
function ids(value,max,label) {
  if(!Array.isArray(value)||value.length>max||value.some(id=>!Number.isInteger(id)||id<0||id>=max)||new Set(value).size!==value.length)throw new Error(`${label} inválidos.`);
  return value;
}
function createRanking(file,{now=Date.now}={}) {
  let records=[];
  if(fs.existsSync(file)) {
    records=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!Array.isArray(records))throw new Error('Arquivo de ranking inválido.');
  }
  const runs=new Map();
  function begin(rawName) {
    const identity=normalize(rawName),time=now();
    for(const [id,run] of runs)if(time-run.created>86400000)runs.delete(id);
    if(runs.size>=10000)throw new Error('Servidor ocupado. Tente novamente mais tarde.');
    const drops=manifests.map(stage=>Array.from({length:stage.candles},()=>{
      const roll=randomInt(1000000)/1000000;
      return roll<config.coinDropChance?'coin':roll<1-config.superPotionDropChance?'potion':'super_potion';
    }));
    const id=randomUUID();runs.set(id,{...identity,drops,created:time,stageStarted:time,stage:0,score:0,seconds:0,results:[],kills:0,items:0});
    return {id,name:identity.name,drops};
  }
  function top(stage) {
    if(stage===undefined){
      const best=new Map();
      for(const record of records){const old=best.get(record.key);if(!old||record.score>old.score||(record.score===old.score&&record.seconds<old.seconds))best.set(record.key,record);}
      return [...best.values()].sort((a,b)=>b.score-a.score||a.seconds-b.seconds||a.date.localeCompare(b.date)).slice(0,10).map(({key,...record})=>record);
    }
    if(!Number.isInteger(stage)||stage<0||stage>=manifests.length)throw new Error('Fase inválida.');
    return records.filter(r=>r.stage===stage).sort((a,b)=>b.score-a.score||a.seconds-b.seconds||a.date.localeCompare(b.date)).slice(0,10).map(({key,...record})=>record);
  }
  function finish(id,data) {
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Resultado inválido.');
    if(data.partial!==undefined&&typeof data.partial!=='boolean')throw new Error('Resultado inválido.');
    const partial=data.partial===true;
    const run=runs.get(id);
    if(!run||now()-run.created>86400000)throw new Error('Partida expirada. Inicie uma nova partida.');
    const stage=data.stage;
    if(!Number.isInteger(stage)||stage<0||stage>=manifests.length)throw new Error('Fase inválida.');
    const previous=run.results[stage];
    if(previous)return {...previous,top:top()};
    if(run.closed)throw new Error('Partida encerrada.');
    if(stage!==run.stage)throw new Error('Conclua as fases na ordem.');
    const map=manifests[stage];
    const defeated=ids(data.defeated,map.enemies.length,'Inimigos');
    const bossDefeated=defeated.some(index=>map.enemies[index]===map.boss);
    if(!partial&&!bossDefeated)throw new Error('O chefe precisa ser derrotado.');
    const broken=ids(data.broken,map.candles,'Velas');
    const collected=data.collected;
    if(!Array.isArray(collected)||collected.length>broken.length)throw new Error('Itens inválidos.');
    ids(collected.map(item=>item?.candleId),map.candles,'Itens');
    if(collected.some(item=>!broken.includes(item.candleId)||item.kind!==run.drops[stage][item.candleId]))throw new Error('Origem do item inválida.');
    const seconds=data.seconds;
    if(!Number.isFinite(seconds)||seconds<0||seconds>(now()-run.stageStarted)/1000+2)throw new Error('Tempo de fase inválido.');
    if(bossDefeated&&seconds<1)throw new Error('Tempo de fase inválido.');
    const tier=bossDefeated&&config.timeBonus.enabled?config.timeBonus.stages[stage].find(t=>t.maxSeconds===null||seconds<=t.maxSeconds):null;
    const stageScore=defeated.reduce((sum,index)=>sum+config.points[map.enemies[index]],0)
      +collected.filter(item=>item.kind==='coin').length*config.points.coin
      +(broken.length===map.candles?config.points.allCandles:0)
      +(defeated.length===map.enemies.length?config.points.allMonsters:0)+(tier?.points||0)+(!partial&&stage===manifests.length-1?config.points.campaign:0);
    const score=run.score+stageScore,totalSeconds=run.seconds+seconds;
    const record={key:run.key,name:run.name,stage,score,seconds:totalSeconds,
      kills:run.kills+defeated.length,items:run.items+collected.length,boss:bossDefeated?map.boss:null,date:new Date(now()).toISOString()};
    const personalBest=records.filter(r=>r.key===run.key).sort((a,b)=>b.score-a.score||a.seconds-b.seconds)[0];
    const old=records.find(r=>r.key===run.key&&r.stage===stage);
    const improved=!old||score>old.score||(score===old.score&&totalSeconds<old.seconds);
    if(improved) {
      const next=records.filter(r=>r.key!==run.key||r.stage!==stage);next.push(record);
      if(next.length>100000)throw new Error('Limite de registros atingido.');
      fs.mkdirSync(path.dirname(file),{recursive:true});
      const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,file);records=next;
    }
    Object.assign(run,{score,seconds:totalSeconds,kills:record.kills,items:record.items,stage:stage+1,stageStarted:now(),closed:partial||stage===manifests.length-1});
    const result={score,improved:!personalBest||score>personalBest.score||(score===personalBest.score&&totalSeconds<personalBest.seconds),best:Math.max(personalBest?.score||0,score),top:top()};
    run.results[stage]=result;return result;
  }
  return {begin,finish,top};
}
module.exports={createRanking,manifests};
