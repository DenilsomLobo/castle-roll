// Durable outbox: one key per campaign avoids overwriting another tab's queue.
(function(root) {
  const prefix='castle-roll.sync.v1.';
  function describeError(error) {
    const code=error?.code||'';
    if(code==='permission-denied')return 'O Firestore bloqueou o envio. Revise a regra de criação de ranking_castle_roll para usuários anônimos autenticados (permission-denied).';
    if(['auth/operation-not-allowed','auth/admin-restricted-operation'].includes(code))return 'Ative Authentication → Sign-in method → Anonymous no Firebase Console ('+code+').';
    if(code==='auth/configuration-not-found')return 'Configure Firebase Authentication e ative o provedor Anonymous (auth/configuration-not-found).';
    if(code==='auth/unauthorized-domain')return 'Inclua o domínio usado no teste em Authentication → Settings → Authorized domains (auth/unauthorized-domain).';
    if(['unavailable','auth/network-request-failed'].includes(code))return 'Conexão com o Firebase indisponível. O resultado continua salvo localmente ('+code+').';
    return (code?code+': ':'')+(error?.message||'Não foi possível sincronizar.');
  }
  function create({storage,submit,onState=()=>{}}) {
    let running=null,lastError=null,confirmed=false;
    function entries() {
      const rows=[];
      for(let i=0;i<storage.length;i++) {
        const key=storage.key(i);
        if(!key?.startsWith(prefix))continue;
        const row=JSON.parse(storage.getItem(key));
        if(!row || key!==prefix+row.runId || !/^[0-9a-f-]{36}$/.test(row.runId) || typeof row.nome!=='string' || !Number.isSafeInteger(row.pontos) || ![1,2,3].includes(row.fase) || (row.uid!==null&&typeof row.uid!=='string'))throw new Error('Fila de sincronização local inválida.');
        rows.push(row);
      }
      return rows;
    }
    function summary() {
      try {
        const count=entries().length;
        if(count)return `${count} resultado(s) salvo(s) localmente; sincronização pendente${running?' (envio em andamento)':''}. ${lastError?describeError(lastError)+' ':''}`;
        return confirmed?'Pontuação confirmada no Firebase. ':'Resultados de mortes e campanhas completas são enviados automaticamente. ';
      }catch(error){return 'Não foi possível acessar a fila local de sincronização. '+error.message+' ';}
    }
    function enqueue(report) {
      const key=prefix+report.runId,previous=storage.getItem(key);
      if(previous) {
        const old=JSON.parse(previous);
        if(old.nome!==report.nome || old.pontos!==report.pontos || old.fase!==report.fase)throw new Error('Campanha já registrada com outro resultado.');
      } else storage.setItem(key,JSON.stringify({...report,uid:null}));
      lastError=null;onState();
    }
    function flush() {
      if(running)return running;
      let refresh=false;
      // Assign running before notifying UI or invoking the asynchronous work.
      running=Promise.resolve().then(async()=>{
        lastError=null;onState();
        const attempted=new Set();
        let row;
        while((row=entries().find(entry=>!attempted.has(entry.runId)))) {
          attempted.add(row.runId);
          try {
            const result=await submit(row,uid=>{
              const key=prefix+row.runId,current=storage.getItem(key);
              if(!current)return; // Another tab may already have confirmed it.
              const bound=JSON.parse(current);
              if(bound.uid&&bound.uid!==uid)throw new Error('UID original da campanha não corresponde à sessão.');
              storage.setItem(key,JSON.stringify({...bound,uid}));
            });
            if(!result?.confirmed)throw new Error('O Firebase não confirmou o resultado.');
            storage.removeItem(prefix+row.runId);confirmed=true;refresh=true;
          }catch(error){lastError=error;}
        }
      }).catch(error=>{lastError=error;}).finally(()=>{running=null;onState({refresh});});
      return running;
    }
    return {enqueue,flush,summary,hasPending:()=>{try{return entries().length>0;}catch{return true;}}};
  }
  root.CastleRankingSync={create};
})(globalThis);
