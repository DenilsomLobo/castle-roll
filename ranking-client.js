(() => {
  const $=selector=>document.querySelector(selector),storageKey='castle-roll.ranking.v1';
  let identity=null,pending=null,completed=new Map();
  const online=window.CastleRuntime?.ranking==='online';
  let session=null, viewVersion=0,runId=null,campaignQueued=false;
  const globalRanking=window.CastleRuntime?.ranking==='firestore';
  let firebaseModule;
  function firebase() {
    if(!firebaseModule)firebaseModule=import('./firebase-ranking.js').catch(error=>{firebaseModule=null;throw error;});
    return firebaseModule;
  }
  const REQUEST_TIMEOUT_MS = 3000;
  const sync=globalRanking?window.CastleRankingSync.create({
    storage:localStorage,
    submit:(report,persistUid)=>firebase().then(module=>module.submitCompletedRun(report,persistUid)),
    onState:(state={})=>{
      if($('#ranking-panel').hidden||pending)return;
      if(state.refresh){void viewGlobal();return;}
      $('#ranking-status').textContent=sync.summary();
      $('#ranking-retry').textContent='TENTAR SINCRONIZAR NOVAMENTE';
      $('#ranking-retry').hidden=!sync.hasPending();
    }
  }):null;
  async function synchronize() {
    try {await withTimeout(sync.flush());}
    catch(error){console.warn('Castle Roll: sincronização continua pendente',error);}
  }
  async function withTimeout(work) {
    let timer;
    try { return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('A conexão demorou para responder.')),REQUEST_TIMEOUT_MS);})]); }
    finally {clearTimeout(timer);}
  }
  async function viewGlobal(prefix='') {
    const version=++viewVersion;
    $('#ranking-title').textContent='TOP 10 GLOBAL · PONTUAÇÃO GERAL';
    $('#ranking-rows').replaceChildren();
    $('#ranking-status').textContent=sync.summary()+prefix+'Carregando ranking global…';
    $('#ranking-retry').hidden=true;$('#ranking-abandon').hidden=true;
    try {
      const rows=await withTimeout(firebase().then(module=>module.getTopRanking()));
      if(version!==viewVersion)return;
      render(rows,true);
      $('#ranking-status').textContent=sync.summary()+prefix+(rows.length?'Maiores resultados globais.':'Nenhum resultado global registrado. Ao morrer em qualquer fase ou concluir a campanha, sua pontuação será enviada automaticamente.');
      $('#ranking-retry').textContent='TENTAR SINCRONIZAR NOVAMENTE';$('#ranking-retry').hidden=!sync.hasPending();
    } catch(error) {
      if(version!==viewVersion)return;
      $('#ranking-title').textContent='TOP 10 LOCAL · SEM CONEXÃO GLOBAL';
      let detail='Exibindo os resultados deste navegador.';
      try {render(overall(read()).slice(0,10));} catch(localError) {$('#ranking-rows').replaceChildren();detail=localError.message;}
      console.warn('Castle Roll: leitura global indisponível',error);
      $('#ranking-status').textContent=sync.summary()+prefix+'Ranking global indisponível. '+detail;
      $('#ranking-retry').textContent=sync.hasPending()?'TENTAR SINCRONIZAR NOVAMENTE':'TENTAR CARREGAR NOVAMENTE';$('#ranking-retry').hidden=false;
    }
  }
  async function api(url,data) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try {
      const response=await fetch(url,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:controller.signal,credentials:'same-origin',cache:'no-store'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Não foi possível acessar o ranking.');
      return result;
    }catch(error){if(error.name==='AbortError')throw new Error('O servidor demorou para responder. Tente novamente.');throw error;}
    finally{clearTimeout(timer);}
  }
  const compare=(a,b)=>b.score-a.score||a.seconds-b.seconds||a.name.localeCompare(b.name);
  function read() {
    let records;
    try {
      const stored=localStorage.getItem(storageKey)||'[]';
      if(stored.length>2000000)throw new Error();
      records=JSON.parse(stored);
      if(!Array.isArray(records)||records.length>5000||records.some(r=>{
        if(!r||typeof r.name!=='string'||typeof r.key!=='string'||![0,1,2].includes(r.stage)||!Number.isSafeInteger(r.score)||r.score<0||!Number.isFinite(r.seconds)||r.seconds<0)return true;
        const normalized=window.CastlePlayerName.normalize(r.name);
        return normalized.key!==r.key||normalized.name!==r.name;
      }))throw new Error();
    }catch{throw new Error('Não foi possível ler o ranking deste navegador. Verifique se o armazenamento local está permitido.');}
    return records;
  }
  // Stage results already contain cumulative scores. Keep the best run per name,
  // never add scores from different attempts or count a name twice.
  function overall(records) {
    const best=new Map();
    for(const record of records)if(!best.has(record.key)||compare(record,best.get(record.key))<0)best.set(record.key,record);
    return [...best.values()].sort(compare);
  }
  function save(report) {
    if(!report.partial&&completed.has(report.stage))return completed.get(report.stage);
    const score=report.score,seconds=report.totalSeconds;
    if(!identity||![0,1,2].includes(report.stage)||!Number.isSafeInteger(score)||score<0||!Number.isFinite(seconds)||seconds<0)throw new Error('Resultado inválido.');
    let records=read();
    const previous=overall(records).find(r=>r.key===identity.key);
    const old=records.find(r=>r.key===identity.key&&r.stage===report.stage);
    const improved=!old||score>old.score||(score===old.score&&seconds<old.seconds);
    if(improved) {
      records=records.filter(r=>r.key!==identity.key||r.stage!==report.stage);
      records.push({...identity,stage:report.stage,score,seconds,date:new Date().toISOString()});
      if(records.length>5000)throw new Error('Limite de jogadores neste navegador atingido.');
      try{localStorage.setItem(storageKey,JSON.stringify(records));}
      catch{throw new Error('O navegador bloqueou o salvamento ou está sem espaço. Permita o armazenamento local e tente novamente.');}
    }
    const ranking=overall(records),best=ranking.find(r=>r.key===identity.key);
    const result={score,improved:!previous||compare(best,previous)<0,best:best.score,top:ranking.slice(0,10)};
    if(!report.partial)completed.set(report.stage,result);
    return result;
  }
  function render(rows,global=false) {
    const body=$('#ranking-rows');body.replaceChildren();
    $('#ranking-last-column').textContent=global?'Fase':'Tempo';
    rows.forEach((row,index)=>{
      const tr=document.createElement('tr');if(!global&&(row.key||window.CastlePlayerName.normalize(row.name).key)===identity?.key)tr.className='current-player';
      for(const value of [index+1,row.name,row.score,global?row.stage:`${Math.floor(row.seconds/60)}:${String(Math.floor(row.seconds%60)).padStart(2,'0')}`]) {
        const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);
      }
      body.appendChild(tr);
    });
  }
  async function submit() {
    if(!pending)return;
    $('#ranking-retry').textContent='TENTAR SALVAR NOVAMENTE';
    $('#ranking-status').textContent=online?'Salvando no ranking online…':'Salvando neste navegador…';$('#ranking-retry').hidden=true;$('#ranking-abandon').hidden=true;$('#start').disabled=true;
    try {
      const result=online?await api(`/api/runs/${session.id}/finish`,pending):save(pending);render(result.top);
      $('#ranking-status').textContent=result.improved?`Novo recorde ${online?'online':'local'}! ${result.score} pontos.`:`Seu recorde continua em ${result.best} pontos. Resultado: ${result.score}.`;
      const report=pending;
      if(globalRanking) {
        if((report.death===true||(!report.partial&&report.stage===window.CastleLevels.length-1))&&!campaignQueued) {
          sync.enqueue({runId,nome:identity.name,pontos:report.score,fase:report.stage+1});
          campaignQueued=true;
        }
      }
      pending=null;
      if(globalRanking) {
        if(sync.hasPending())void synchronize().then(()=>viewGlobal());
        else void viewGlobal('Resultado salvo neste navegador. ');
      }
    }catch(error) {
      $('#ranking-status').textContent=`Falha ao salvar ou preparar a sincronização. ${error.message}`;$('#ranking-retry').hidden=false;$('#ranking-abandon').hidden=false;
    }finally{$('#start').disabled=!!pending;}
  }
  window.CastleRanking={
    async begin(name) {
      const candidate=window.CastlePlayerName.normalize(name);
      if(online)session=await api('/api/runs',{name:candidate.name});
      ++viewVersion;identity=candidate;completed=new Map();pending=null;campaignQueued=false;
      runId=globalRanking?crypto.randomUUID():null;
      $('#ranking-panel').hidden=true;
      if(globalRanking)void withTimeout(firebase().then(module=>module.authenticatePlayer())).catch(error=>console.warn('Castle Roll: autenticação será repetida na sincronização',error));
      return identity.name;
    },
    candleKind(stage,id){return online?session?.drops[stage]?.[id]:undefined;},
    async view() {
      if(globalRanking){$('#ranking-panel').hidden=false;if(sync.hasPending())void synchronize();return viewGlobal();}
      $('#ranking-panel').hidden=false;$('#ranking-title').textContent=`TOP 10 ${online?'ONLINE':'LOCAL'} · PONTUAÇÃO GERAL`;
      $('#ranking-retry').hidden=true;$('#ranking-abandon').hidden=true;
      try {
        $('#ranking-status').textContent='Carregando ranking…';
        const rows=online?(await api('/api/ranking')).top:overall(read()).slice(0,10);render(rows);
        $('#ranking-status').textContent=rows.length?'Melhor pontuação por jogador, mesmo sem concluir o jogo.':'Nenhuma partida registrada ainda. Seja o primeiro!';
      }catch(error){$('#ranking-rows').replaceChildren();$('#ranking-status').textContent=error.message;}
    },
    finish(report) {
      pending=report;$('#ranking-panel').hidden=false;$('#ranking-title').textContent=`TOP 10 ${online?'ONLINE':'LOCAL'} · PONTUAÇÃO GERAL`;
      $('#ranking-rows').replaceChildren();return submit();
    }
  };
  $('#ranking-retry').onclick=()=>pending?submit():globalRanking?synchronize().then(()=>viewGlobal()):window.CastleRanking.view();
  if(globalRanking){
    $('#name-help').textContent='Mortes em qualquer fase e campanhas completas entram no ranking global. Resultados também são salvos neste navegador. ← → mover · ↑ pular · Espaço atacar';
    window.addEventListener('online',()=>{if(sync.hasPending())void synchronize();});
    window.addEventListener('storage',event=>{if(event.key?.startsWith('castle-roll.sync.v1.')&&sync.hasPending())void synchronize();});
    if(sync.hasPending())void synchronize();
  }
  if(online){$('#name-help').textContent='Use o mesmo nome para tentar superar seu recorde no ranking compartilhado. Nomes não são contas protegidas por senha.';}
})();
