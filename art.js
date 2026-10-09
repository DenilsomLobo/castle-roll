/* Game-ready atlas + explicit crops from the supplied environment reference. */
(() => {
  'use strict';
  const sources = {
    characters: 'assets/game/characters.png',
    environment: 'assets/tileset_background.png',
    loot: 'assets/game/loot.png',
    phase2: 'assets/game/phase2.png',
    // The supplied bat_2 file actually contains the phase-two environment sheet.
    environment2: 'assets/bat_2.png',
    environment3: 'assets/tileset_background_3.png',
    phase3: 'assets/game/phase3.png',
    whip: 'assets/chicote.png',
    playerAttack: 'assets/game/player-attack.png',
    victory: 'assets/game/victory.png',
    throne: 'assets/game/throne.png'
  };
  // Rectangles are in source pixels. Individual bounds avoid adjacent poses and labels.
  const frames = {
    victory: [[90,20,820,850],[1020,20,710,850]],
    throne: [[140,0,670,880],[965,0,670,880]],
    player: [[24,55,251,260],[328,55,245,260],[636,55,223,260],[901,55,352,260]],
    skeleton: [[35,321,249,312],[347,321,240,312],[661,321,245,312],[969,321,243,312]],
    bat: [[12,648,291,248],[310,648,315,248],[628,648,310,248],[941,648,312,248]],
    boss: [[25,908,289,324],[330,908,289,324]],
    potion: [[638,924,291,314]],
    fire: [[935,970,319,258]],
    candle: [[20,145,295,505],[334,145,295,505],[648,145,295,505],[961,145,293,505]],
    coin: [[14,796,302,324],[370,796,242,324],[725,796,128,324],[962,796,250,324]],
    skeleton_2: [[20,85,280,240],[340,85,278,240],[644,85,340,240],[990,85,252,240]],
    boss_2: [[10,355,295,309],[326,355,294,309],[630,355,369,309],[1000,355,254,309]],
    bat_2: [[15,684,291,227],[318,684,301,227],[626,684,337,227],[964,684,280,227]],
    super_potion: [[25,939,275,309],[309,920,320,334]],
    chemical: [[650,969,290,256]],
    ember: [[959,969,281,256]],
    skeleton_3: [[18,115,285,250],[330,115,267,250],[620,115,313,250],[947,115,307,250]],
    boss_3: [[8,418,298,260],[311,418,299,260],[611,408,320,270],[934,418,310,260]],
    bat_3: [[10,732,290,235],[302,732,298,235],[621,732,316,235],[938,732,308,235]],
    flame: [[15,1020,305,172]],
    saw: [[359,1018,238,174]],
    scythe: [[671,1018,263,174]],
    knife: [[973,1018,268,174]]
  };
  const images = {};
  const art = window.CastleArt = { ready: false, frames, sources };
  art.load = Promise.all(Object.entries(sources).map(([key,url]) => new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => { images[key] = image; resolve(); };
    image.onerror = () => reject(new Error(`Não foi possível carregar ${url}`));
    image.src = url;
  }))).then(() => { art.ready = true; });

  art.crop = (ctx, box, x, y, w, h, source='environment') => {
    if (art.ready) ctx.drawImage(images[source], ...box, Math.round(x), Math.round(y), w, h);
  };
  art.playerAttack=(ctx,centerX,bottom,height,direction)=>{
    const box=[170,210,970,865],scale=height/box[3];
    const bodyX=580,feetY=1075,handX=1040,handY=635;
    if(art.ready) {
      ctx.save();ctx.translate(centerX,bottom);ctx.scale(direction,1);
      ctx.drawImage(images.playerAttack,...box,(box[0]-bodyX)*scale,(box[1]-feetY)*scale,box[2]*scale,height);ctx.restore();
    }
    return {x:centerX+direction*(handX-bodyX)*scale,y:bottom+(handY-feetY)*scale};
  };
  // Silhouette traced from the supplied concept sheet, excluding its title/background.
  const whipOutline=[[25,72],[48,69],[54,70],[108,55],[161,50],[210,54],[263,76],[320,78],[385,54],[424,34],[444,25],[454,33],[456,45],[465,53],[473,78],[478,100],[474,110],[463,113],[442,106],[422,94],[391,92],[348,111],[311,121],[268,118],[218,109],[173,95],[131,94],[54,96],[48,100],[48,147],[51,154],[46,164],[28,164],[25,157],[29,148],[30,96],[25,90]];
  const strapOpening=[[55,76],[146,65],[165,64],[169,68],[167,73],[156,75],[56,85]];
  function whipMask(ctx) {
    ctx.beginPath();
    for(const points of [whipOutline,strapOpening]) {
      ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.closePath();
    }
    ctx.clip('evenodd');
  }
  art.whip=(ctx,handX,handY,direction,progress,reach)=>{
    if(!art.ready)return;
    ctx.save();ctx.translate(handX,handY);ctx.scale(direction,1);
    const scale=reach/(478-38);
    ctx.scale(scale,scale);ctx.translate(-38,-110);
    // Keep the handle fixed at the hand; bend the ribbon progressively toward its tip.
    for(let left=25;left<479;left+=14) {
      const weight=Math.max(0,(left-55)/(479-55));
      const offset=Math.sin(progress*Math.PI*2-weight*4)*18*weight*Math.sin(progress*Math.PI);
      ctx.save();ctx.translate(0,offset);whipMask(ctx);
      ctx.beginPath();ctx.rect(left,20,Math.min(14,479-left),145);ctx.clip();
      ctx.drawImage(images.whip,0,0,503,172,0,0,503,172);ctx.restore();
    }
    ctx.restore();
  };
  // Layered flame tongues sway, grow and shrink independently around the boss.
  art.burningFire=(ctx,centerX,bottom,width,height,time)=>{
    ctx.save();ctx.translate(centerX,bottom);
    ctx.shadowColor='#ff7924';ctx.shadowBlur=18;
    for(const [layer,color] of ['#e838168c','#ff7c20cc','#ffe178e6'].entries()) {
      ctx.fillStyle=color;
      for(let i=0;i<7;i++) {
        const phase=time*9+i*2.3,base=(i-3)*width/8;
        const rise=height*(.65+.22*Math.sin(phase))*(1-layer*.23);
        const radius=width*(.15-layer*.025),sway=Math.sin(phase*.8)*width*.12;
        ctx.beginPath();ctx.moveTo(base-radius,0);
        ctx.bezierCurveTo(base-radius*1.3,-rise*.35,base+sway-radius*.4,-rise*.6,base+sway,-rise);
        ctx.bezierCurveTo(base+sway+radius*.2,-rise*.55,base+radius*1.4,-rise*.35,base+radius,0);
        ctx.closePath();ctx.fill();
      }
    }
    ctx.restore();
  };
  // Anchor sprites at their feet; preserve proportions when mirroring.
  art.sprite = (ctx, name, frame, centerX, bottom, height, flip = false, flash = false) => {
    if (!art.ready) return;
    const box = frames[name][frame % frames[name].length];
    const width = box[2] / box[3] * height;
    ctx.save();
    ctx.translate(Math.round(centerX), Math.round(bottom));
    ctx.scale(flip ? -1 : 1, 1);
    if (flash) ctx.filter = 'brightness(1.8)';
    const source = name==='victory'||name==='throne'?images[name]:['skeleton_3','boss_3','bat_3','flame','saw','scythe','knife'].includes(name)?images.phase3:['skeleton_2','boss_2','bat_2','super_potion','chemical','ember'].includes(name) ? images.phase2 : name==='candle'||name==='coin' ? images.loot : images.characters;
    ctx.drawImage(source, ...box, -width / 2, -height, width, height);
    ctx.restore();
  };
})();
