/* v43 - Ordered visual pointer for Test Environment. Animation completes before the automated action runs. */
(function(){
  const ENV_KEY='dabster.environment.v41';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const isTest=()=>sessionStorage.getItem(ENV_KEY)==='test';
  let pointer=null,ring=null,badge=null,lastTarget=null,hideTimer=null;

  function installStyles(){
    if(document.getElementById('dabsterTestClickVisualV43Styles'))return;
    const s=document.createElement('style');s.id='dabsterTestClickVisualV43Styles';s.textContent=`
      #dabsterTestPointerV43{position:fixed;left:0;top:0;width:26px;height:32px;z-index:1000000;pointer-events:none;opacity:0;transform:translate3d(14px,14px,0);transition:transform .34s cubic-bezier(.2,.75,.2,1),opacity .12s ease;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
      #dabsterTestPointerV43.visible{opacity:1}#dabsterTestPointerV43 svg{display:block;width:26px;height:32px}
      #dabsterTestClickRingV43{position:fixed;left:0;top:0;width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border:2px solid #e97026;border-radius:50%;z-index:999999;pointer-events:none;opacity:0;transform:translate3d(0,0,0) scale(.3)}
      #dabsterTestClickRingV43.pulse{animation:te43ClickPulse .58s ease-out}
      @keyframes te43ClickPulse{0%{opacity:1;transform:translate3d(0,0,0) scale(.3)}60%{opacity:.5;transform:translate3d(0,0,0) scale(2.1)}100%{opacity:0;transform:translate3d(0,0,0) scale(2.8)}}
      .te43-auto-target{outline:2px solid rgba(233,112,38,.82)!important;outline-offset:2px!important;box-shadow:0 0 0 5px rgba(233,112,38,.11)!important}
      #dabsterAutoClickBadgeV43{position:fixed;z-index:999998;pointer-events:none;padding:4px 7px;border-radius:999px;background:#fff7ef;border:1px solid #e7b38d;color:#9d4e1d;font:700 7.5px/1 Arial,sans-serif;opacity:0;transition:opacity .12s ease;white-space:nowrap}
      #dabsterAutoClickBadgeV43.visible{opacity:1}
    `;document.head.appendChild(s);
  }
  function installOverlay(){
    installStyles();
    if(!pointer){pointer=document.createElement('div');pointer.id='dabsterTestPointerV43';pointer.innerHTML='<svg viewBox="0 0 26 32" aria-hidden="true"><path d="M2 1.5v24l6.3-5.45 4.3 9.5 4.65-2.1-4.2-9.3h8.25L2 1.5Z" fill="white" stroke="#22313a" stroke-width="1.8" stroke-linejoin="round"/></svg>';document.body.appendChild(pointer);}
    if(!ring){ring=document.createElement('div');ring.id='dabsterTestClickRingV43';document.body.appendChild(ring);}
    if(!badge){badge=document.createElement('div');badge.id='dabsterAutoClickBadgeV43';badge.textContent='click automatico';document.body.appendChild(badge);}
  }
  function targetElement(raw){
    if(!(raw instanceof Element))return null;
    return raw.closest('button,input,select,a,[role="button"],.tab,.sidebar-item,[data-open-commessa],[data-open-offer],[data-src-commessa],[data-src-offer]')||raw;
  }
  function targetPoint(el){
    const r=el.getBoundingClientRect();
    const x=Math.max(7,Math.min(window.innerWidth-12,r.left+Math.min(Math.max(r.width*.52,10),Math.max(10,r.width-8))));
    const y=Math.max(7,Math.min(window.innerHeight-12,r.top+Math.min(Math.max(r.height*.50,10),Math.max(10,r.height-8))));
    return {x,y,r};
  }
  async function ensureVisible(el,fast=false){
    if(!el)return;
    const r=el.getBoundingClientRect();
    if(r.top<90||r.bottom>window.innerHeight-45){
      try{el.scrollIntoView({behavior:fast?'auto':'smooth',block:'center'});}catch{el.scrollIntoView();}
      await sleep(fast?10:320);
    }
  }
  async function point(raw,{label='click automatico',fast=false}={}){
    if(!isTest())return;
    const el=targetElement(raw);if(!el)return;
    installOverlay();await ensureVisible(el,fast);
    const {x,y,r}=targetPoint(el);if(!r.width&&!r.height)return;
    pointer.classList.add('visible');pointer.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
    badge.textContent=label;badge.style.left=Math.min(window.innerWidth-120,x+17)+'px';badge.style.top=Math.min(window.innerHeight-28,y+16)+'px';badge.classList.add('visible');
    await sleep(fast?10:380);
    if(lastTarget&&lastTarget!==el)lastTarget.classList.remove('te43-auto-target');lastTarget=el;el.classList.add('te43-auto-target');
    ring.style.left=x+'px';ring.style.top=y+'px';ring.classList.remove('pulse');void ring.offsetWidth;ring.classList.add('pulse');
    pointer.animate([{transform:`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(1)`},{transform:`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(.80)`},{transform:`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(1)`}],{duration:210,easing:'ease-out'});
    await sleep(fast?10:300);
  }
  async function click(raw,{label='click automatico',fast=false,settle=260}={}){
    const el=targetElement(raw);if(!el)return false;
    if(isTest()&&!fast)await point(el,{label,fast:false});
    el.click();
    await sleep(fast?10:settle);
    if(lastTarget===el){el.classList.remove('te43-auto-target');lastTarget=null;}
    badge?.classList.remove('visible');
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>pointer?.classList.remove('visible'),fast?50:650);
    return true;
  }
  async function focus(raw,{label='inserimento',fast=false}={}){
    const el=targetElement(raw);if(!el)return false;
    if(isTest()&&!fast)await point(el,{label,fast:false});
    try{el.focus({preventScroll:true});}catch{el.focus?.();}
    await sleep(fast?5:180);return true;
  }
  async function type(raw,value,{label='compilazione',event='input',blur=false,fast=false,pause=250}={}){
    const el=targetElement(raw);if(!el)return false;
    await focus(el,{label,fast});
    el.value=String(value);el.dispatchEvent(new Event(event,{bubbles:true}));
    if(blur){el.dispatchEvent(new Event('blur',{bubbles:true}));try{el.blur();}catch{}}
    await sleep(fast?5:pause);
    if(lastTarget===el){el.classList.remove('te43-auto-target');lastTarget=null;}
    badge?.classList.remove('visible');return true;
  }
  window.DABSTER_TEST_VISUAL_V43={point,click,focus,type,targetElement};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(isTest())installOverlay();},{once:true});else if(isTest())installOverlay();
})();
