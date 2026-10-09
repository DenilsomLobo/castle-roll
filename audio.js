/* Original chiptune music and synthesized effects. No external audio files. */
(() => {
  let context,enabled=false,track='',step=0,beat=0,powerBeat=0,fireBeat=0;
  const voices=new Set();
  const songs={
    stage:{interval:.22,notes:[64,67,71,76,74,71,67,62,64,69,72,76,79,76,72,69],bass:[40,40,43,38]},
    boss:{interval:.14,notes:[40,52,43,55,46,58,43,55,41,53,44,56,47,59,44,56],bass:[28,31,29,32]},
    victory:{interval:.16,notes:[72,76,79,84,79,76,74,77,81,86,84,81,79,76,79,84],bass:[48,53,55,48]}
  };
  const effects={attack:[[800,.07,'sawtooth',.04,100]],hit:[[180,.09,'square',.045,45]],hurt:[[260,.28,'sawtooth',.04,40]],coin:[[1100,.08,'triangle',.05,1600],[1600,.14,'triangle',.04,2000,.08]],potion:[[330,.16,'sine',.06,660],[660,.24,'sine',.05,990,.12]],super:[[523,.2,'triangle',.04,1046],[784,.3,'triangle',.04,1568,.15]]};
  function silence(){for(const voice of voices){try{voice.stop();}catch{} }voices.clear();}
  function tone(freq,duration=.1,type='square',volume=.035,end=freq*.55,delay=0) {
    if(!enabled||!context)return;
    const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime+delay;
    oscillator.type=type;oscillator.frequency.setValueAtTime(freq,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,end),now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(gain);gain.connect(context.destination);voices.add(oscillator);
    oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    oscillator.start(now);oscillator.stop(now+duration);
  }
  function noise() {
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.18),context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.075;
    source.connect(gain);gain.connect(context.destination);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};source.start();
  }
  window.CastleAudio={
    enable(value){
      enabled=value;silence();track='';beat=powerBeat=fireBeat=0;
      if(value){try{context ||= new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{enabled=false;}}
    },
    tone,
    effect(name){for(const note of effects[name]||[])tone(...note);},
    update(dt,{active,music,superPower,burning}) {
      if(!enabled||!context)return;
      if(!active){silence();track='';beat=powerBeat=fireBeat=0;return;}
      if(track!==music){silence();track=music;step=0;beat=0;}
      const song=songs[track];
      if(song){
        beat-=dt;
        if(beat<=0){
          beat=song.interval;
          const note=song.notes[step%song.notes.length],hz=440*2**((note-69)/12);
          tone(hz,song.interval*.85,'square',.012,hz);
          if(step%4===0){const bass=440*2**((song.bass[Math.floor(step/4)%song.bass.length]-69)/12);tone(bass,song.interval*3.5,'triangle',.025,bass);}
          step++;
        }
      }
      if(superPower){powerBeat-=dt;if(powerBeat<=0){powerBeat=.12;tone(880,.11,'sine',.025,1320);}}else powerBeat=0;
      if(burning){fireBeat-=dt;if(fireBeat<=0){fireBeat=.09;noise();tone(75,.09,'sawtooth',.025,25);}}else fireBeat=0;
    }
  };
})();
