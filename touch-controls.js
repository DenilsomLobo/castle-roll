/* Pointer ownership allows movement, jumping and attacks at the same time. */
(() => {
  window.CastleTouch={bind({buttons,keys,action,active}) {
    const pointers=new Map();
    function release(id) {
      const button=pointers.get(id);if(!button)return;
      pointers.delete(id);
      if(![...pointers.values()].some(other=>other.dataset.key===button.dataset.key))keys.delete(button.dataset.key);
      if(![...pointers.values()].includes(button)){button.classList.remove('pressed');button.setAttribute('aria-pressed','false');}
    }
    for(const button of buttons) {
      button.addEventListener('contextmenu',event=>event.preventDefault());
      button.addEventListener('pointerdown',event=>{
        event.preventDefault();if(!active())return;
        release(event.pointerId);pointers.set(event.pointerId,button);
        button.setPointerCapture(event.pointerId);
        button.classList.add('pressed');button.setAttribute('aria-pressed','true');
        keys.add(button.dataset.key);action(button.dataset.key);
      });
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>release(e.pointerId));
    }
    return {
      reset(){for(const id of [...pointers.keys()])release(id);},
      update(){if(active()&&[...pointers.values()].some(button=>button.dataset.key==='Space'))action('Space');}
    };
  }};
})();
