const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function storage(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function outbox(store,submit){const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'ranking-sync.js'),'utf8'),context);return context.CastleRankingSync.create({storage:store,submit});}
function backend(){
  const docs=new Map();let writes=0,signIns=0,tail=Promise.resolve();
  const auth={currentUser:null,authStateReady:async()=>{}};
  const context={firebaseConfig:{},getApps:()=>[],initializeApp:()=>({}),getFirestore:()=>({}),getAuth:()=>auth,setPersistence:async()=>{},browserLocalPersistence:{},signInAnonymously:async()=>{signIns++;auth.currentUser={uid:'original-uid'};return {user:auth.currentUser};},doc:(_db,_collection,id)=>id,serverTimestamp:()=>({server:true}),runTransaction:(_db,fn)=>{
    const task=tail.then(async()=>{const pending=[];const result=await fn({get:async id=>({exists:()=>docs.has(id),data:()=>docs.get(id)}),set:(id,data)=>pending.push([id,data])});for(const [id,data] of pending){docs.set(id,data);writes++;}return result;});tail=task.catch(()=>{});return task;
  }};
  vm.createContext(context);
  const source=fs.readFileSync(path.join(root,'firebase-ranking.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
  vm.runInContext(source,context);
  return {submit:context.submitCompletedRun,auth,docs,get writes(){return writes;},get signIns(){return signIns;}};
}
(async()=>{
  const db=backend(),store=storage(),report={runId:crypto.randomUUID(),nome:'Bob',pontos:12345,fase:3};
  let lostAck=true;
  const first=outbox(store,async(row,bind)=>{const result=await db.submit(row,bind);if(lostAck){lostAck=false;throw Error('lost acknowledgement');}return result;});
  first.enqueue(report);await first.flush();
  assert.equal(db.writes,1);assert.equal(first.hasPending(),true);
  assert.equal(JSON.parse(store.getItem('castle-roll.sync.v1.'+report.runId)).uid,'original-uid');
  const afterReload=outbox(store,db.submit);await afterReload.flush();
  assert.equal(afterReload.hasPending(),false);assert.equal(db.writes,1);assert.equal(db.signIns,1);
  const row=db.docs.get(report.runId);assert.equal(row.uid,'original-uid');assert.equal(row.criadoEm.server,true);
  afterReload.enqueue(report);await afterReload.flush();assert.equal(db.writes,1);
  const wrongUid={...report,runId:crypto.randomUUID(),uid:'different-uid'};
  await assert.rejects(db.submit(wrongUid,()=>{}),/identidade Firebase mudou/);assert.equal(db.writes,1);
  await assert.rejects(db.submit({...report,pontos:999},()=>{}),/outro resultado/);
  await assert.rejects(db.submit({...report,fase:0},()=>{}),/inválido/);
  await assert.rejects(db.submit({...report,runId:crypto.randomUUID()},()=>{throw Error('storage full');}),/storage full/);assert.equal(db.writes,1);
  // Concurrent reconnection events and campaigns enqueued while a flush is active.
  let release,calls=0;
  const gate=new Promise(resolve=>release=resolve),multiStore=storage();
  const queue=outbox(multiStore,async()=>{calls++;await gate;return {confirmed:true};});
  queue.enqueue(report);const a=queue.flush(),b=queue.flush();assert.equal(a,b);
  await new Promise(resolve=>setImmediate(resolve));queue.enqueue({...report,runId:crypto.randomUUID()});release();await a;
  assert.equal(calls,2);assert.equal(queue.hasPending(),false);
  // Tabs share independent keys, and a transaction makes retries idempotent.
  const shared=storage(),tabA=outbox(shared,db.submit),tabB=outbox(shared,db.submit);
  tabA.enqueue({...report,runId:crypto.randomUUID()});tabB.enqueue({...report,runId:crypto.randomUUID()});
  await Promise.all([tabA.flush(),tabB.flush()]);assert.equal(db.writes,3);assert.equal(shared.length,0);
  const deathStore=storage(),deathQueue=outbox(deathStore,db.submit);
  deathQueue.enqueue({...report,runId:crypto.randomUUID(),pontos:0,fase:1});await deathQueue.flush();
  assert.equal(deathQueue.hasPending(),false);assert.equal(db.writes,4);
  console.log('OK: persisted UID/outbox, page reload, lost acknowledgement, immutable idempotent transaction, timestamp, UID mismatch, storage failure, concurrent retries, tabs and phase-one result.');
})().catch(error=>{console.error(error);process.exitCode=1;});
