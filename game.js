/* Castle Roll: Canvas platformer with reference-based Hiper Roll artwork. */
(() => {
  'use strict';

  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const $ = selector => document.querySelector(selector), keys = new Set();
  const config = window.CastleConfig, art = window.CastleArt;
  // Older configuration files may not include the boss defeat sequence yet.
  const endingSettings={burnDuration:3,sitDuration:1.2,danceDuration:10,danceFps:5,throneOffset:144,...config.ending};
  const W = 960, H = 480;
  let WORLD = config.worldWidth, arenaActive=false;
  let state = 'title', player, enemies, candles, drops, particles, labels;
  let camera = 0, time = 0, elapsed = 0, score = 0, sound = false, finalBonus;
  let stageIndex=0, stageStarted=0, stageCleared=false, ground, platforms;
  let collectedItems=[],stageFinishSeconds=0,starting=false;
  let ending=null,touchControls;
  function clearInput(){touchControls?.reset();keys.clear();}
  const isBoss = e => e.kind==='boss'||e.kind==='boss_2'||e.kind==='boss_3';
  const isProjectile = e => ['orb','ember','chemical','flame','saw','scythe','knife'].includes(e.kind);
  const isFinalStage = () => stageIndex===window.CastleLevels.length-1;
  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const rect = (x,y,w,h,color) => {ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const formatTime = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  $('#start').disabled = true;
  $('#start').textContent = 'CARREGANDO ARTE…';
  art.load.then(() => {
    $('#start').disabled = false;
    $('#start').textContent = 'ENTRAR NO CASTELO →';
    $('#message').textContent = 'QUEBRE VELAS PARA ENCONTRAR MOEDAS OU POÇÕES';
  }).catch(error => {
    $('#message').textContent = error.message;
    $('#overlay-text').textContent = 'Não foi possível carregar a arte. Verifique a pasta assets e recarregue a página.';
    $('#start').textContent = 'ARTE INDISPONÍVEL';
  });

  function tone(freq,duration=.1,type='square',volume=.035) { window.CastleAudio?.tone(freq,duration,type,volume); }
  function sfx(name) { window.CastleAudio?.effect(name); }
  function syncAudio(dt=0) {
    window.CastleAudio?.update(dt,{active:state==='playing',music:ending?.phase==='dancing'?'victory':ending?'':arenaActive&&!stageCleared?'boss':'stage',superPower:player?.superInv>0,burning:ending?.phase==='burning'});
  }
  function reset() {
    player={x:80,y:340,w:25,h:48,vx:0,vy:0,dir:1,hp:config.maxHealth,inv:0,superInv:0,attack:0,cooldown:0,onGround:false,checkpoint:80,hit:new Set()};
    score=0;elapsed=0;camera=0;time=0;particles=[];labels=[];drops=[];finalBonus=null;
    loadStage(0);
    hud();
  }
  function hud() {
    $('#health').textContent=config.maxHealth>8?`♥ ${player.hp}/${config.maxHealth}`:Array.from({length:config.maxHealth},(_,i)=>i<player.hp?'♥':'♡').join(' ');
    $('#health').setAttribute('aria-label',`${player.hp} de ${config.maxHealth} pontos de vida`);
    $('#score').textContent=String(score).padStart(6,'0');
    $('#timer').textContent=formatTime(elapsed);
    $('.stage').textContent=window.CastleLevels[stageIndex].name;
    $('#overlay-kicker').textContent=`CASTLE ROLL · CAPÍTULO ${stageIndex+1}`;
  }
  function loadStage(index) {
    stageIndex=index;stageStarted=elapsed;stageCleared=false;ending=null;
    player.dropPlatform=null;$('#final-credits').hidden=true;
    const stage=window.CastleLevels[index];
    WORLD=stage.worldWidth||config.worldWidth;arenaActive=false;
    ground=stage.ground;platforms=stage.platforms;
    const placements=typeof stage.enemies==='function'?stage.enemies():stage.enemies;
    enemies=placements.map((e,i)=>({...e,id:i,
      w:isBoss(e)?54:e.kind.startsWith('bat')?30:26,
      h:e.kind==='boss_2'||e.kind==='boss_3'?82:isBoss(e)?72:e.kind.startsWith('bat')?22:42,
      hp:config.health[e.kind],dir:-1,baseY:e.y,t:i,flash:0,cooldown:2,windup:0,melee:0}));
    candles=stage.candles.map(([x,surface],id)=>({id,x,y:surface-58,w:24,h:40,broken:false}));
    collectedItems=[];stageFinishSeconds=0;
    drops=[];
    particles=[];labels=[];camera=0;clearInput();
    Object.assign(player,{x:80,y:340,vx:0,vy:0,dir:1,attack:0,cooldown:0,onGround:false,checkpoint:80,hit:new Set()});
    hud();
  }
  function show(title,text,button) {
    $('#final-credits').hidden=state!=='won';
    $('#overlay-title').textContent=title;$('#overlay-text').textContent=text;
    $('#start').textContent=button;$('#overlay').hidden=false;
    $('#view-ranking').hidden=state!=='title'&&state!=='ranking';
  }
  function start() {
    if(!art.ready)return;
    clearInput();reset();state='playing';$('#overlay').hidden=true;$('#pause').textContent='PAUSAR';
    $('#name-panel').hidden=true;$('#ranking-panel').hidden=true;
    $('#message').textContent='QUEBRE VELAS · MOEDAS +100 · POÇÕES +1 VIDA';canvas.focus();tone(220,.25);
  }
  async function beginGame() {
    if(starting||!art.ready)return;
    starting=true;$('#start').disabled=true;$('#name-error').textContent='';
    try {
      $('#player-name').value=await window.CastleRanking.begin($('#player-name').value);
      start();
    }catch(error){$('#name-panel').hidden=false;$('#name-error').textContent=error.message;$('#player-name').focus();}
    finally{starting=false;$('#start').disabled=false;}
  }
  function finishStage() {
    state=isFinalStage()?'won':'results';clearInput();
    show(isFinalStage()?'Você conquistou o castelo!':`Fase ${stageIndex+1} concluída!`,`Pontuação: ${score} · Tempo total: ${formatTime(elapsed)} · ${finalBonus.name} +${finalBonus.points}${isFinalStage()?` · Bônus de campanha: +${config.points.campaign}`:''}`,isFinalStage()?'JOGAR NOVAMENTE →':`SEGUIR PARA A FASE ${stageIndex+2} →`);
    saveRun();
  }
  function saveRun(partial=false) {
    return window.CastleRanking.finish({stage:stageIndex,partial,death:state==='dead',seconds:stageCleared?stageFinishSeconds:elapsed-stageStarted,score,totalSeconds:elapsed,
      defeated:enemies.filter(e=>!isProjectile(e)&&e.hp<=0).map(e=>e.id),
      broken:candles.filter(c=>c.broken).map(c=>c.id),collected:collectedItems.slice()});
  }
  function continueStage() {
    if(state!=='results')return;
    loadStage(stageIndex+1);state='playing';$('#overlay').hidden=true;$('#ranking-panel').hidden=true;
    $('#message').textContent=`FASE ${stageIndex+1} · SUBA AS PLATAFORMAS · PROCURE AS SUPER POÇÕES`;canvas.focus();
  }
  function resume() {clearInput();state='playing';$('#overlay').hidden=true;$('#pause').textContent='PAUSAR';canvas.focus();}
  function pause() {
    if(state==='playing') {state='paused';clearInput();show('A aventura pode esperar.','Seu tempo e sua pontuação estão pausados.','CONTINUAR →');$('#pause').textContent='CONTINUAR';}
    else if(state==='paused')resume();
    syncAudio();
  }
  function burst(x,y,color,n=12) {for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*170,life:.4+Math.random()*.35,color});}
  function label(text,x,y,color='#f8d17f') {labels.push({text,x,y,color,life:1});}
  function addScore(points,x,y) {score+=points;label(`+${points}`,x,y);hud();}
  function timeBonus(seconds,index=stageIndex) {
    const bonus=config.timeBonus;
    if(!bonus.enabled)return {name:'A definir',points:0};
    const tiers=bonus.stages[index];
    if(!tiers||tiers.length!==4)return {name:'A definir',points:0};
    const limits=tiers.slice(0,3);
    if(limits.some((tier,i)=>!Number.isFinite(tier.maxSeconds)||tier.maxSeconds<=0||(i>0&&tier.maxSeconds<=limits[i-1].maxSeconds)))return {name:'A definir',points:0};
    const tier=limits.find(tier=>seconds<=tier.maxSeconds)||tiers[3];
    return {name:tier.name,points:tier.points};
  }
  function win() {
    if(state!=='playing'||stageCleared)return;
    stageCleared=true;finalBonus=timeBonus(elapsed-stageStarted);score+=finalBonus.points;hud();
    stageFinishSeconds=elapsed-stageStarted;
    ending={phase:'burning',clock:0,boss:{...enemies.find(isBoss)},throneX:WORLD-endingSettings.throneOffset};
    enemies=enemies.filter(e=>!isProjectile(e));drops=[];
    player.attack=0;player.inv=0;player.superInv=0;player.vx=0;
    $('#message').textContent='O CHEFE ESTÁ EM CHAMAS!';
  }
  function hurt(fall=false) {
    if(ending)return;
    if(state==='playing'&&player.superInv>0) {
      if(fall){player.x=player.checkpoint;player.y=320;player.vy=0;}
      return;
    }
    if(state!=='playing'||(player.inv>0&&!fall))return;
    player.hp=Math.max(0,player.hp-1);player.inv=1.6;sfx('hurt');burst(player.x+12,player.y+20,'#cc696d');
    if(player.hp===0) {state='dead';clearInput();$('#name-panel').hidden=true;show('Bob Roll nunca desiste !',`Pontuação: ${score} · Tempo: ${formatTime(elapsed)}. Tente novamente.`,'TENTAR NOVAMENTE →');$('#message').textContent='JORNADA INTERROMPIDA';saveRun(true);}
    else if(fall) {player.x=player.checkpoint;player.y=320;player.vy=0;}
    else player.vy=-180;
    hud();
  }
  function action(code) {
    if(code==='KeyP'||code==='Escape'){pause();return;}
    if(code==='KeyR'){if(state==='playing'||state==='paused')pauseForRestart();return;}
    if(state!=='playing')return;
    if(ending&&!['burning','approach'].includes(ending.phase))return;
    if(code==='ArrowDown'&&player.onGround) {
      const support=platforms.find(p=>!ground.includes(p)&&Math.abs(player.y+player.h-p.y)<2&&player.x<p.x+p.w&&player.x+player.w>p.x);
      if(support){player.dropPlatform=support;player.y+=2;player.vy=80;player.onGround=false;}
    }
    if(['KeyW','ArrowUp'].includes(code)&&player.onGround){player.vy=-540;player.onGround=false;tone(310,.12,'triangle');}
    if(code==='Space'&&!ending&&player.cooldown<=0){player.attack=config.playerAttack.duration;player.cooldown=config.playerAttack.cooldown;player.hit=new Set();sfx('attack');}
  }
  window.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable)return;
    if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyD','KeyP','KeyR','Escape'].includes(e.code)){
      e.preventDefault();if(!keys.has(e.code)&&!e.repeat)action(e.code);keys.add(e.code);
    }
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  touchControls=window.CastleTouch?.bind({buttons:document.querySelectorAll('[data-key]'),keys,action,active:()=>state==='playing'});
  window.addEventListener('orientationchange',()=>{clearInput();if(state==='playing')pause();});
  const fullscreenButton=$('#fullscreen');
  if(document.fullscreenEnabled&&document.documentElement?.requestFullscreen) {
    fullscreenButton.hidden=false;
    fullscreenButton.onclick=async()=>{
      try {
        if(document.fullscreenElement)await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      }catch{ $('#message').textContent='Tela cheia indisponível. Você pode continuar jogando nesta tela.'; }
    };
    document.addEventListener('fullscreenchange',()=>{
      fullscreenButton.textContent=document.fullscreenElement?'SAIR DA TELA CHEIA':'TELA CHEIA';
      clearInput();if(state==='playing')pause();
    });
  }
  function pauseForRestart() {
    const interrupted=state==='playing'||state==='paused';
    state='title';clearInput();$('#name-panel').hidden=false;$('#ranking-panel').hidden=true;
    show('Tentar um novo recorde?','Confirme seu nome para iniciar uma nova partida.','INICIAR AVENTURA →');
    if(interrupted){$('#view-ranking').hidden=true;saveRun(true);}
  }
  $('#start').onclick=()=>{
    if(state==='paused')resume();
    else if(state==='ranking')pauseForRestart();
    else if(state==='results')continueStage();
    else if(state==='won')pauseForRestart();
    else beginGame();
  };$('#pause').onclick=pause;
  $('#view-ranking').onclick=()=>{
    if(state!=='title'&&state!=='ranking')return;
    state='ranking';$('#name-panel').hidden=true;
    show('Ranking geral',window.CastleRuntime?.ranking==='firestore'?'Os 10 maiores resultados globais. Mortes e campanhas completas são sincronizadas automaticamente.':window.CastleRuntime?.ranking==='online'?'Uma posição por nome. Ranking compartilhado entre jogadores.':'Uma posição por nome. Seu melhor resultado fica salvo neste navegador.','VOLTAR →');
    $('#view-ranking').hidden=true;window.CastleRanking.view();
  };
  $('#player-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();beginGame();}});
  $('#ranking-abandon').onclick=()=>{$('#start').disabled=false;pauseForRestart();};
  $('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=`SOM: ${sound?'ON':'OFF'}`;$('#sound').setAttribute('aria-pressed',String(sound));window.CastleAudio?.enable(sound);syncAudio();canvas.focus();};

  function breakCandle(candle) {
    if(candle.broken)return;
    candle.broken=true;
    const roll=Math.random();
    const kind=window.CastleRanking.candleKind(stageIndex,candle.id)??(roll<config.coinDropChance?'coin':roll<1-config.superPotionDropChance?'potion':'super_potion');
    drops.push({candleId:candle.id,x:candle.x,y:candle.y+10,w:22,h:22,vy:-130,age:0,kind,taken:false});
    burst(candle.x+12,candle.y+20,'#ffc46d');tone(430,.09);
    if(candles.every(item=>item.broken)) {
      addScore(config.points.allCandles,candle.x,candle.y);
      $('#message').textContent=`TODAS AS VELAS · +${config.points.allCandles} PONTOS`;
    }
  }
  function updateDrops(dt) {
    for(const drop of drops) {
      if(drop.taken)continue;
      drop.age+=dt;const oldBottom=drop.y+drop.h;drop.vy+=900*dt;drop.y+=drop.vy*dt;
      for(const p of platforms)if(drop.vy>=0&&oldBottom<=p.y+1&&overlap(drop,p)){drop.y=p.y-drop.h;drop.vy=0;}
      if(drop.y>H+80){drop.taken=true;continue;}
      if(drop.age>=.2&&overlap(player,drop)) {
        // A full-health potion remains available on the floor for later.
        if(drop.kind==='potion'&&player.hp>=config.maxHealth)continue;
        drop.taken=true;
        collectedItems.push({candleId:drop.candleId,kind:drop.kind});
        if(drop.kind==='coin') {addScore(config.points.coin,drop.x,drop.y);$('#message').textContent='HIPERCOIN · +100 PONTOS';sfx('coin');}
        else if(drop.kind==='super_potion') {
          player.hp=config.maxHealth;player.superInv=config.superPotion.duration;
          label('VIDA CHEIA · IMUNE',drop.x,drop.y,'#ffe18a');hud();
          $('#message').textContent=`SUPER POÇÃO · VIDA CHEIA · IMUNIDADE POR ${config.superPotion.duration} SEGUNDOS`;sfx('super');
        }
        else {player.hp=Math.min(config.maxHealth,player.hp+1);label('+1 VIDA',drop.x,drop.y,'#9cfab7');hud();$('#message').textContent='POÇÃO · +1 VIDA';sfx('potion');}
        burst(drop.x+11,drop.y+11,drop.kind==='coin'?'#ffd171':'#9cfab7');
      }
    }
    drops=drops.filter(drop=>!drop.taken);
  }
  function projectile(kind,x,y,vx,vy,range=Infinity,visualScale=1) {
    enemies.push({kind,x:x-10,y:y-10,w:20,h:20,vx,vy,range,visualScale,traveled:0,hp:1,dir:vx<0?-1:1,t:0,flash:0});
  }
  function meleeBox(e) {
    const reach=e.kind==='boss_3'?config.boss3.meleeRange:config.skeleton2.range;
    return {x:e.dir>0?e.x+e.w:e.x-reach,y:e.y+(e.kind==='boss_3'?34:8),w:reach,h:30};
  }
  function updateMelee(e,dt) {
    e.cooldown=Math.max(0,e.cooldown-dt);e.melee=Math.max(0,e.melee-dt);
    if(e.windup>0) {
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup===0)e.melee=config.skeleton2.activeTime;
    } else if(e.cooldown===0&&Math.abs(player.x-e.x)<config.skeleton2.range+e.w&&Math.abs(player.y-e.y)<50) {
      e.dir=player.x<e.x?-1:1;e.windup=config.skeleton2.windup;e.cooldown=config.skeleton2.cooldown;
    }
    if(e.melee>0&&overlap(player,meleeBox(e)))hurt();
  }
  function updateRanged3(e,dt) {
    e.cooldown=Math.max(0,e.cooldown-dt);
    const settings=e.kind==='skeleton_3'?config.skeleton3:config.bat3;
    const dx=player.x+player.w/2-e.x-e.w/2,dy=player.y+player.h/2-e.y-e.h/2;
    if(e.cooldown>0||Math.hypot(dx,dy)>settings.range)return;
    if(e.kind==='skeleton_3'&&Math.abs(dy)>35)return;
    e.cooldown=settings.fireInterval;e.dir=dx<0?-1:1;
    if(e.kind==='skeleton_3')projectile('flame',e.x+e.w/2,e.y+e.h/2,e.dir*settings.projectileSpeed,0,settings.range);
    else {
      const component=settings.projectileSpeed/Math.SQRT2;
      projectile('knife',e.x+e.w/2,e.y+e.h/2,e.dir*component,(dy<0?-1:1)*component,settings.range);
    }
  }
  function updateBoss3(e,dt) {
    const settings=config.boss3;
    e.melee=Math.max(0,e.melee-dt);
    if(e.windup>0) {
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup===0) {
        const x=e.x+e.w/2,y=e.y+e.h/2;
        if(e.attackKind==='melee')e.melee=settings.meleeDuration;
        else if(e.attackKind==='saw') {
          const count=Math.random()<settings.doubleSawChance?2:1;
          for(let i=0;i<count;i++)projectile('saw',x-e.dir*i*settings.sawSpacing,y,e.dir*settings.sawSpeed,0,settings.sawRange,3);
        }
        else if(e.attackKind==='fire')for(const vx of [-1,1])for(const vy of [-1,1])projectile('flame',x,y,vx*settings.fireSpeed/Math.SQRT2,vy*settings.fireSpeed/Math.SQRT2,settings.fireRange,3);
        else for(let i=0;i<8;i++) {
          const angle=i*Math.PI/4;
          projectile('scythe',x,y,Math.cos(angle)*settings.scytheSpeed,Math.sin(angle)*settings.scytheSpeed,settings.scytheRange,3);
        }
        e.cooldown=settings.attackInterval;
      }
    } else if(e.melee===0) {
      e.cooldown=Math.max(0,e.cooldown-dt);
      if(e.cooldown===0) {
        const roll=Math.random();
        e.attackKind=roll<settings.burstChance?'burst':roll<settings.burstChance+settings.meleeChance?'melee':roll<settings.burstChance+settings.meleeChance+settings.sawChance?'saw':'fire';
        e.windup=settings.windup;
      }
    }
    if(e.melee>0&&overlap(player,meleeBox(e)))hurt();
  }
  function movePlayer(dt) {
    const move=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
    const arenaStart=window.CastleLevels[stageIndex].arenaStart;
    if(move)player.dir=move;
    player.vx=move*(player.attack>0?90:205);player.x=Math.max(arenaActive?arenaStart:0,Math.min(WORLD-player.w,player.x+player.vx*dt));
    for(const p of platforms)if(p!==player.dropPlatform&&!p.oneWay&&overlap(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w;}
    const oldY=player.y;player.vy+=1450*dt;player.y+=player.vy*dt;player.onGround=false;
    for(const p of platforms)if(p!==player.dropPlatform&&overlap(player,p)){
      if(player.vy>=0&&oldY+player.h<=p.y+1){player.y=p.y-player.h;player.vy=0;player.onGround=true;if(ground.includes(p))player.checkpoint=Math.max(p.x+35,Math.min(player.x,p.x+p.w-65));}
      else if(!p.oneWay&&player.vy<0&&oldY>=p.y+p.h-1){player.y=p.y+p.h;player.vy=0;}
    }
    if(player.dropPlatform&&player.y>=player.dropPlatform.y+player.dropPlatform.h)player.dropPlatform=null;
  }
  function updateEffects(dt) {
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;p.life-=dt;}
    particles=particles.filter(p=>p.life>0);
    for(const item of labels){item.y-=25*dt;item.life-=dt;}labels=labels.filter(item=>item.life>0);
  }
  function followPlayer() {
    camera=Math.max(arenaActive?window.CastleLevels[stageIndex].arenaStart:0,Math.min(WORLD-W,player.x-W*.34));
  }
  function updateEnding(dt) {
    time+=dt;ending.clock+=dt;
    const settings=endingSettings;
    if(['burning','approach'].includes(ending.phase)) {
      movePlayer(dt);
      if(player.y>H+80){player.y=360;player.x=player.checkpoint;player.vy=0;}
      followPlayer();
    }
    if(ending.phase==='burning') {
      const boss=ending.boss;
      burst(boss.x+Math.random()*boss.w,boss.y+boss.h-20,Math.random()<.5?'#ff7029':'#ffe18a',2);
      if(ending.clock>=settings.burnDuration) {
        if(!isFinalStage()) {ending=null;$('#message').textContent='SIGA PARA A PORTA →';updateEffects(dt);return;}
        ending.phase='approach';ending.clock=0;
        $('#message').textContent='SIGA ATÉ O TRONO →';
      }
    } else if(ending.phase==='approach') {
      if(overlap(player,{x:ending.throneX-32,y:350,w:64,h:58})) {
        ending.phase='sitting';ending.clock=0;clearInput();
        Object.assign(player,{x:ending.throneX-player.w/2,y:360,vx:0,vy:0,dir:1});
        $('#message').textContent='BOB ROLL CONQUISTOU O TRONO!';tone(600,.3,'triangle');
      }
    } else if(ending.phase==='sitting'&&ending.clock>=settings.sitDuration) {
      ending.phase='dancing';ending.clock=0;
      $('#message').textContent='O CASTELO FOI SALVO!';
    } else if(ending.phase==='dancing'&&ending.clock>=settings.danceDuration) {
      ending.phase='complete';
      addScore(config.points.campaign,player.x,player.y-20);finishStage();
      $('#message').textContent=`O CASTELO FOI SALVO! · +${config.points.campaign} PONTOS`;
    }
    updateEffects(dt);
  }
  function update(dt) {
    if(state!=='playing'){if(state==='title')time+=dt;return;}
    touchControls?.update();
    if(ending){updateEnding(dt);return;}
    time+=dt;elapsed+=dt;
    player.superInv=Math.max(0,player.superInv-dt);
    player.inv=Math.max(0,player.inv-dt);player.attack=Math.max(0,player.attack-dt);player.cooldown=Math.max(0,player.cooldown-dt);
    const arenaStart=window.CastleLevels[stageIndex].arenaStart;
    if(arenaStart!==undefined&&!arenaActive&&player.x>=arenaStart) {
      arenaActive=true;enemies=enemies.filter(e=>!isProjectile(e));
      $('#message').textContent=`ARENA DO CHEFE · ${window.CastleLevels[stageIndex].bossName} · USE AS PLATAFORMAS`;
    }
    movePlayer(dt);
    if(player.y>H+80)hurt(true);
    if(state!=='playing')return;
    if(!isFinalStage()&&stageCleared&&overlap(player,{x:WORLD-140,y:242,w:80,h:166})) {
      finishStage();return;
    }
    const whip={x:player.dir>0?player.x+player.w:player.x-config.playerAttack.reach,y:player.y+12,w:config.playerAttack.reach,h:25};
    if(player.attack>0)for(const candle of candles)if(!candle.broken&&overlap(whip,candle))breakCandle(candle);
    for(const e of enemies) {
      if(e.hp<=0)continue;
      e.t+=dt;e.flash=Math.max(0,e.flash-dt);
      if(isProjectile(e)) {
        const distance=Math.hypot(e.vx??e.dir*190,e.vy??0)*dt;
        e.traveled=(e.traveled||0)+distance;
        if(e.traveled>(e.range??Infinity)){e.hp=0;continue;}
        e.x+=(e.vx??e.dir*190)*dt;e.y+=(e.vy??0)*dt;
        if(e.x<0||e.x>WORLD||e.y<-100||e.y>H+80||(e.kind==='orb'&&e.x<4900)){e.hp=0;continue;}
        if(overlap(player,e)){hurt();if(state!=='playing')return;}
        continue;
      }
      if(arenaStart!==undefined&&((isBoss(e)&&!arenaActive)||(!isBoss(e)&&arenaActive)))continue;
      if(!(isBoss(e)&&arenaActive)&&Math.abs(e.x-player.x)>650)continue;
      if(e.kind==='boss'||e.kind==='boss_3') {
        e.turnCooldown=Math.max(0,(e.turnCooldown||0)-dt);
        if(e.turnCooldown===0&&!e.windup&&!e.melee){e.dir=Math.sign(player.x+player.w/2-e.x-e.w/2)||e.dir;e.turnCooldown=.8;}
      } else if(isBoss(e)&&!e.windup&&!e.melee)e.dir=Math.sign(player.x+player.w/2-e.x-e.w/2)||e.dir;
      const speed=e.kind==='boss_3'?config.boss3.speed:e.kind==='skeleton_3'?config.skeleton3.speed:e.kind==='bat_3'?config.bat3.speed:e.kind==='boss'?config.boss.speed:e.kind==='boss_2'?config.boss2.speed:e.kind==='bat_2'?config.bat2.speed:e.kind==='bat'?105:e.kind==='skeleton_2'?config.skeleton2.speed:46;
      if(!e.windup&&!e.melee)e.x+=e.dir*speed*dt;
      if(e.x<e.min){e.x=e.min;e.dir=1;if(e.kind==='boss'||e.kind==='boss_3')e.turnCooldown=.8;}
      if(e.x>e.max){e.x=e.max;e.dir=-1;if(e.kind==='boss'||e.kind==='boss_3')e.turnCooldown=.8;}
      if(e.kind.startsWith('bat'))e.y=e.baseY+Math.sin(e.t*3)*(e.kind==='bat_2'?24:58);
      if(e.kind==='skeleton_3'||e.kind==='bat_3')updateRanged3(e,dt);
      if(e.kind==='boss_3'){updateBoss3(e,dt);if(state!=='playing')return;}
      if(e.kind==='bat_2'||e.kind==='boss_2') {
        e.cooldown-=dt;
        if(e.cooldown<=0) {
          if(e.kind==='bat_2') {
            e.cooldown=config.bat2.fireInterval;
            projectile('ember',e.x+e.w/2,e.y+e.h,0,config.bat2.emberSpeed);
          } else {
            e.cooldown=config.boss2.fireInterval;
            const speed=config.boss2.projectileSpeed;
            const count=Math.random()<config.boss2.doubleFireChance?2:1;
            for(const [dx,dy] of [[e.dir,0],[e.dir*Math.SQRT1_2,-Math.SQRT1_2],[e.dir*Math.SQRT1_2,Math.SQRT1_2]])
              for(let i=0;i<count;i++)projectile('chemical',e.x+e.w/2-dx*i*40,e.y+e.h/2-dy*i*40,dx*speed,dy*speed);
          }
        }
      }
      if(e.kind==='skeleton_2'){updateMelee(e,dt);if(state!=='playing')return;}
      if(e.kind==='boss') {
        e.cooldown-=dt;
        if(e.cooldown<=0) {
          e.cooldown=config.boss.fireInterval;
          const dir=player.x+player.w/2<e.x+e.w/2?-1:1;
          const count=Math.random()<config.boss.doubleFireChance?2:1;
          for(let i=0;i<count;i++)enemies.push({x:e.x+e.w/2-10-dir*i*config.boss.fireSpacing,y:365,w:20,h:20,kind:'orb',hp:1,dir,t:0,flash:0});
          tone(100,.25,'triangle');
        }
      }
      if(player.attack>0&&overlap(whip,e)&&!player.hit.has(e)) {
        player.hit.add(e);e.hp--;e.flash=.16;burst(e.x+e.w/2,e.y+20,'#e7b77b',6);sfx('hit');
        if(e.hp<=0) {
          burst(e.x,e.y,'#afa2c3',18);
          if(config.points[e.kind])addScore(config.points[e.kind],e.x,e.y);
          if(enemies.every(enemy=>isProjectile(enemy)||enemy.hp<=0)) {
            addScore(config.points.allMonsters,e.x,e.y-24);
          }
          if(isBoss(e)){win();return;}
        }
      }
      if(e.hp>0&&overlap(player,e)){hurt();if(state!=='playing')return;}
    }
    updateDrops(dt);
    enemies=enemies.filter(e=>!isProjectile(e)||e.hp>0);
    updateEffects(dt);followPlayer();hud();
  }
  function background(){
    rect(0,0,W,H,'#0c1026');
    if(!art.ready)return;
    if(stageIndex===2) {
      art.crop(ctx,[260,0,1276,300],-camera/(WORLD-W)*290,0,1250,408,'environment3');return;
    }
    if(stageIndex===1) {
      // Verified panorama crop: no title, labels or sample gameplay objects.
      art.crop(ctx,[300,0,1236,280],-camera/(WORLD-W)*290,0,1250,408,'environment2');
      return;
    }
    // Clean panorama: excludes the title at left and the logo at right.
    art.crop(ctx,[425,0,915,311],-camera/(WORLD-W)*290,0,1250,425);
    const fog=ctx.createLinearGradient(0,250,0,450);
    fog.addColorStop(0,'#19234b00');fog.addColorStop(1,'#151329cc');
    ctx.fillStyle=fog;ctx.fillRect(0,250,W,200);
    // Near masonry scrolls faster than the distant castle, creating depth.
    for(let i=0;i<20;i++){
      const x=i*370-camera*.32-60;
      art.crop(ctx,[398,775,66,164],x,170,61,238);
    }
    for(let i=0;i<28;i++){
      const x=((i*139.7-camera*.22+Math.sin(time*.4+i)*12)%W+W)%W;
      ctx.globalAlpha=.18+Math.sin(time+i)*.12;
      rect(x,110+(i*41)%260,2,2,'#d3c2f6');
    }
    ctx.globalAlpha=1;
  }
  function terrain(p){
    if(p.stairs) {
      art.crop(ctx,[114,472,92,57],p.x,p.y,p.w,36,'environment3');return;
    }
    const source=stageIndex===2?'environment3':stageIndex===1?'environment2':'environment';
    ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.clip();
    for(let y=p.y;y<p.y+p.h;y+=48)
      for(let x=p.x;x<p.x+p.w;x+=48)
        art.crop(ctx,stageIndex===2?[22,408,58,51]:stageIndex===1?[20,427,62,54]:[22,506,60,60],x,y,48,48,source);
    for(let x=p.x;x<p.x+p.w;x+=128)
      art.crop(ctx,stageIndex===2?[500,346,102,20]:stageIndex===1?[523,427,120,20]:[1223,525,133,18],x,p.y,128,18,source);
    ctx.restore();
  }
  function hunter(){
    const p=player;if(p.superInv<=0&&p.inv>0&&Math.floor(time*12)%2)return;
    if(p.superInv>0) {
      ctx.save();ctx.strokeStyle='#ffe18a';ctx.lineWidth=3;ctx.shadowColor='#ffce55';ctx.shadowBlur=15;
      ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y+p.h/2,28,36,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    const pose=!p.onGround?2:p.vx?1+Math.floor(time*9)%2:0;
    if(p.attack<=0)art.sprite(ctx,'player',pose,p.x+p.w/2,p.y+p.h+2,59,p.dir<0);
    if(p.attack>0){
      const hand=art.playerAttack(ctx,p.x+p.w/2,p.y+p.h+2,59,p.dir);
      const progress=Math.max(0,Math.min(1,1-p.attack/config.playerAttack.duration));
      const tip=p.dir>0?p.x+p.w+config.playerAttack.reach:p.x-config.playerAttack.reach;
      art.whip(ctx,hand.x,hand.y,p.dir,progress,Math.abs(tip-hand.x));
    }
  }
  function monster(e){
    if(isProjectile(e)){
      if(['flame','saw','scythe','knife'].includes(e.kind)) {
        ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);
        ctx.rotate(e.kind==='saw'||e.kind==='scythe'?e.t*9:Math.atan2(e.vy,e.vx));
        const height=26*(e.visualScale||1);
        art.sprite(ctx,e.kind,0,0,height/2,height);ctx.restore();return;
      }
      art.sprite(ctx,e.kind==='orb'?'fire':e.kind,0,e.x+e.w/2,e.y+e.h+4,29,e.dir>0);return;
    }
    let pose=e.kind==='boss'?(e.cooldown<.45?1:0):e.kind==='skeleton_2'&&e.melee>0?2:Math.floor(e.t*(e.kind.startsWith('bat')?10:7))%4;
    if(e.kind==='boss_3')pose=e.melee>0?2:e.windup>0?(e.attackKind==='melee'?2:3):Math.floor(e.t*5)%2;
    if(e.kind==='skeleton_3')pose=e.cooldown>config.skeleton3.fireInterval-.2?2:Math.floor(e.t*7)%2;
    if(e.kind==='bat_3')pose=e.cooldown>config.bat3.fireInterval-.2?2:[0,1,3][Math.floor(e.t*8)%3];
    const height=e.kind==='boss_3'?112:e.kind==='boss_2'?104:isBoss(e)?98:e.kind.startsWith('bat')?43:58;
    art.sprite(ctx,e.kind,pose,e.x+e.w/2,e.y+e.h+2,height,e.kind==='boss'?e.dir>0:e.kind.startsWith('skeleton')||isBoss(e)||e.kind==='bat_3'?e.dir<0:false,e.flash>0);
    if(e.kind==='boss_3'&&e.windup>0) {
      ctx.fillStyle='#ffd488';ctx.font='bold 12px Arial';ctx.textAlign='center';
      ctx.fillText(({melee:'FOICE!',saw:'SERRA!',fire:'FOGO!',burst:'FOICES EM VOLTA!'})[e.attackKind],e.x+e.w/2,e.y-28);
    }
    if(e.kind==='boss_3'&&e.melee>0) {
      const box=meleeBox(e);art.sprite(ctx,'scythe',0,box.x+box.w/2,box.y+box.h,45,e.dir<0);
    }
    if(e.kind==='skeleton_2'&&e.windup>0) {
      ctx.fillStyle='#ffbd83';ctx.font='bold 18px Arial';ctx.fillText('!',e.x+e.w/2,e.y-12);
    }
  }
  function drawEnding() {
    if(!ending)return;
    if(ending.phase==='burning') {
      const boss=ending.boss;
      ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,(endingSettings.burnDuration-ending.clock)/.5));
      art.sprite(ctx,boss.kind,0,boss.x+boss.w/2,boss.y+boss.h+2,boss.kind==='boss'?98:boss.kind==='boss_2'?104:112,boss.kind==='boss'?boss.dir>0:boss.dir<0);ctx.restore();
      art.burningFire(ctx,boss.x+boss.w/2,boss.y+boss.h+2,100,125,ending.clock);
      return;
    }
    const seated=ending.phase==='sitting',dancing=['dancing','complete'].includes(ending.phase);
    art.sprite(ctx,'throne',seated?1:0,ending.throneX,408,124);
    if(dancing) {
      const beat=ending.clock*endingSettings.danceFps;
      ctx.save();ctx.translate(ending.throneX,408-Math.abs(Math.sin(beat*Math.PI))*5);
      ctx.rotate(Math.sin(beat*Math.PI)*.06);
      art.sprite(ctx,'victory',Math.floor(beat)%2,0,0,80);ctx.restore();
    }
    ctx.fillStyle='#ffe18a';ctx.font='bold 16px Arial';ctx.textAlign='center';
    ctx.fillText(dancing?'O CASTELO FOI SALVO!':seated?'O TRONO É SEU!':'SIGA ATÉ O TRONO',ending.throneX,260);
  }
  function draw(){
    background();if(!art.ready)return;ctx.save();ctx.translate(-Math.floor(camera),0);
    for(const p of platforms)if(p.x+p.w>camera&&p.x<camera+W)terrain(p);
    // Gate artwork from the supplied tileset, without surrounding labels.
    if(!isFinalStage())art.crop(ctx,[473,774,108,165],WORLD-160,242,108,166);
    if(!isFinalStage()) {
      ctx.fillStyle='#f9d4af';ctx.font='bold 12px Arial';ctx.textAlign='center';
      ctx.fillText(stageCleared?'SIGA PARA A PORTA':'DERROTE O CHEFE',WORLD-106,230);
    }
    for(const candle of candles)if(!candle.broken&&candle.x>camera-60&&candle.x<camera+W+60){
      art.sprite(ctx,'candle',Math.floor(time*9)%4,candle.x+candle.w/2,candle.y+candle.h,44);
    }
    for(const drop of drops){
      art.sprite(ctx,drop.kind,drop.kind==='coin'?Math.floor(time*9)%4:drop.kind==='super_potion'?Math.floor(time*4)%2:0,drop.x+drop.w/2,drop.y+drop.h,drop.kind==='coin'?25:drop.kind==='super_potion'?34:29);
    }
    for(const e of enemies)if(e.hp>0&&e.x+150>camera&&e.x<camera+W+150)monster(e);
    drawEnding();
    if(!ending||['burning','approach'].includes(ending.phase))hunter();
    for(const p of particles)rect(p.x,p.y,3,3,p.color);
    ctx.font='bold 12px Arial';ctx.textAlign='center';
    for(const item of labels){ctx.globalAlpha=Math.min(1,item.life*2);ctx.fillStyle=item.color;ctx.fillText(item.text,item.x,item.y);}
    ctx.globalAlpha=1;ctx.restore();
    if(player.superInv>0) {
      rect(20,20,188,36,'#111526e8');ctx.fillStyle='#ffe18a';ctx.font='bold 12px Arial';ctx.textAlign='left';
      ctx.fillText(`IMUNIDADE · ${player.superInv.toFixed(1)}s`,30,37);
      rect(30,44,168*player.superInv/config.superPotion.duration,4,'#ffe18a');
    }
    const boss=enemies.find(isBoss);
    if((arenaActive||player.x>WORLD-850)&&boss.hp>0){
      rect(270,22,420,36,'#111526e8');ctx.font='bold 11px Arial';ctx.fillStyle='#f9d4af';ctx.textAlign='center';
      ctx.fillText(`${window.CastleLevels[stageIndex].bossName} · ${boss.hp}/${config.health[boss.kind]}`,480,36);rect(290,44,380,5,'#46374b');rect(290,44,380*boss.hp/config.health[boss.kind],5,isBoss(boss)&&stageIndex===1?'#a6ed38':'#f27946');
    }
    const shade=ctx.createLinearGradient(0,420,0,480);shade.addColorStop(0,'#080d1c00');shade.addColorStop(1,'#080d1c88');ctx.fillStyle=shade;ctx.fillRect(0,420,W,60);
  }
  reset();let last=0;function frame(now){const dt=Math.min((now-last)/1000,1/30);last=now;update(dt);syncAudio(dt);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
