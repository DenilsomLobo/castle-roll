/* Map data: coordinates, patrol bounds and collectible placements. */
(() => {
  const ground = [
    {x:0,y:408,w:750,h:72}, {x:845,y:408,w:695,h:72},
    {x:1650,y:408,w:790,h:72}, {x:2550,y:408,w:850,h:72},
    {x:3500,y:408,w:830,h:72}, {x:4430,y:408,w:2770,h:72}
  ];
  const platforms = [...ground,
    {x:400,y:325,w:145,h:20}, {x:650,y:275,w:135,h:20},
    {x:960,y:325,w:150,h:20}, {x:1240,y:290,w:140,h:20},
    {x:1480,y:335,w:200,h:20}, {x:1830,y:320,w:140,h:20},
    {x:2090,y:265,w:160,h:20}, {x:2390,y:330,w:205,h:20},
    {x:2770,y:320,w:145,h:20}, {x:3020,y:270,w:160,h:20},
    {x:3320,y:335,w:230,h:20}, {x:3670,y:320,w:145,h:20},
    {x:3910,y:265,w:160,h:20}, {x:4260,y:335,w:220,h:20},
    {x:4590,y:325,w:145,h:20}, {x:4800,y:275,w:150,h:20}
  ];
  const upper = [
    [330,330,180],[520,250,200],[730,170,220],
    [1150,330,180],[1340,250,200],[1550,170,220],
    [1980,330,180],[2170,250,200],[2380,170,220],
    [2800,330,180],[2990,250,200],[3200,170,220],
    [3630,330,180],[3820,250,200],[4030,170,220],
    [4410,330,180],[4600,250,200],
    [4860,330,150],[5020,250,170],[5220,190,170],[5410,280,160]
  ].map(([x,y,w])=>({x,y,w,h:20,oneWay:true}));
  const ground2 = [[0,780],[880,1720],[1830,2680],[2780,3540],[3650,4320],[4430,7200]].map(([x,end])=>({x,y:408,w:end-x,h:72}));
  const ground3=[[0,700],[800,1700],[1810,2700],[2810,3700],[3810,4700],[4810,7200]].map(([x,end])=>({x,y:408,w:end-x,h:72}));
  const galleries=[
    [570,100,430],[1570,115,480],[2570,90,380],[3570,125,440],[4570,100,430]
  ].map(([x,y,w])=>({x,y,w,h:24,oneWay:true}));
  const stairs=galleries.flatMap(p=>[
    {x:p.x-320,y:330,w:100,h:20,oneWay:true,stairs:true},
    {x:p.x-215,y:255,w:100,h:20,oneWay:true,stairs:true},
    {x:p.x-110,y:180,w:100,h:20,oneWay:true,stairs:true},
    {x:p.x+p.w+25,y:210,w:110,h:20,oneWay:true,stairs:true},
    {x:p.x+p.w+145,y:300,w:110,h:20,oneWay:true,stairs:true}
  ]);
  const arenaPlatforms=[
    [5530,330,200],[5760,250,250],[6040,330,220],[6200,250,200],
    [6430,190,230],[6620,280,220],[6870,330,220]
  ].map(([x,y,w])=>({x,y,w,h:24,oneWay:true}));
  function randomGroundEnemies() {
    const candidates=upper.slice(0,17).slice();
    for(let i=candidates.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];
    }
    const surfaces=[...candidates.slice(0,6),...ground2.slice(0,5).map(p=>({x:p.x+100+Math.random()*(p.w-400),y:p.y,w:260}))];
    return surfaces.map(p=>({kind:'skeleton_2',x:p.x+40+Math.random()*(p.w-100),y:p.y-42,min:p.x+12,max:p.x+p.w-38}));
  }
  window.CastleLevels = [
    {name:'01 / PORTÕES DA NOITE',worldWidth:7200,arenaStart:5400,boss:'boss',bossName:'EXTRUSORA CUSPIDORA DE FOGO',ground,platforms:[...platforms,...arenaPlatforms],
      enemies:[
      {x:560,y:366,kind:'skeleton',min:460,max:710},
      {x:1130,y:366,kind:'skeleton',min:900,max:1450},
      {x:1840,y:366,kind:'skeleton',min:1710,max:2020},
      {x:2810,y:366,kind:'skeleton',min:2660,max:3050},
      {x:3730,y:366,kind:'skeleton',min:3580,max:4020},
      {x:4680,y:366,kind:'skeleton',min:4500,max:4870},
      {x:1000,y:265,kind:'bat',min:860,max:1250},
      {x:2160,y:260,kind:'bat',min:1830,max:2350},
      {x:3150,y:270,kind:'bat',min:2860,max:3300},
      {x:4070,y:275,kind:'bat',min:3710,max:4230},
      {x:4780,y:260,kind:'bat',min:4500,max:4890},
      {x:6540,y:336,kind:'boss',min:5450,max:7100}
    ],candles:[[230,408],[620,408],[1020,325],[1295,290],[1390,408],
      [1740,408],[1890,320],[2180,265],[2320,408],[2680,408],[2840,320],
      [3100,270],[3260,408],[3610,408],[3740,320],[3980,265],
      [4160,408],[4510,408],[4660,325],[4860,275],[4960,408]],superPotions:[]},
    {name:'02 / INTERIOR DO CASTELO',worldWidth:7200,arenaStart:5400,boss:'boss_2',bossName:'MONSTRO SOLVENTE',
      ground:ground2,platforms:[...ground2,...upper.filter(p=>p.x+p.w<5400),...arenaPlatforms],
      enemies:()=>[
        ...randomGroundEnemies(),
        ...[900,1730,2550,3350,4180,4720].map(x=>({kind:'bat_2',x,y:100,min:x-170,max:x+100})),
        {kind:'boss_2',x:6540,y:326,min:5450,max:7100}
      ],
      candles:[[210,408],...upper.slice(0,17).map(p=>[p.x+30,p.y]),[4810,408]],
      superPotions:[]},
    {name:'03 / GRANDE SALÃO',worldWidth:7200,arenaStart:5400,boss:'boss_3',bossName:'PICOTADEIRA DO MAL',
      ground:ground3,platforms:[...ground3,...stairs,...galleries,...arenaPlatforms],
      enemies:[
        ...galleries.map(p=>({kind:'skeleton_3',x:p.x+160,y:p.y-42,min:p.x+25,max:p.x+p.w-55})),
        ...ground3.slice(0,5).map(p=>({kind:'skeleton_3',x:p.x+350,y:366,min:p.x+120,max:p.x+p.w-50})),
        ...galleries.map(p=>({kind:'bat_3',x:p.x+p.w+60,y:135,min:p.x+p.w-100,max:Math.min(5260,p.x+p.w+130)})),
        {kind:'boss_3',x:6540,y:326,min:5450,max:7100}
      ],
      candles:[[220,408],...galleries.map(p=>[p.x+55,p.y]),...[1000,2100,3200,4300,5250].map(x=>[x,408])],superPotions:[]}
  ];
})();
