/* v42 - Visual pointer for automated Test Environment clicks. Pure overlay: no workflow/menu changes. */
(function(){
  const ENV_KEY='dabster.environment.v41';
  const isTest=()=>sessionStorage.getItem(ENV_KEY)==='test';
  let pointer=null,ring=null,lastTarget=null,ringTimer=null,hideTimer=null;

  function installStyles(){
    if(document.getElementById('dabsterTestClickVisualV42Styles'))return;
    const s=document.createElement('style');s.id='dabsterTestClickVisualV42Styles';s.textContent=`
      #dabsterTestPointerV42{position:fixed;left:0;top:0;width:25px;height:31px;z-index:1000000;pointer-events:none;opacity:0;transform:translate3d(12px,12px,0);transition:transform .18s cubic-bezier(.2,.75,.2,1),opacity .12s ease;filter:drop-shadow(0 2px 2px rgba(0,0,0,.22))}
      #dabsterTestPointerV42.visible{opacity:1}#dabsterTestPointerV42.clicking{transform-origin:4px 4px}
      #dabsterTestPointerV42 svg{display:block;width:25px;height:31px}
      #dabsterTestClickRingV42{position:fixed;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #e97026;border-radius:50%;z-index:999999;pointer-events:none;opacity:0;transform:translate3d(0,0,0) scale(.35)}
      #dabsterTestClickRingV42.pulse{animation:te42ClickPulse .5s ease-out}
      @keyframes te42ClickPulse{0%{opacity:.95;transform:translate3d(0,0,0) scale(.35)}65%{opacity:.45;transform:translate3d(0,0,0) scale(2.2)}100%{opacity:0;transform:translate3d(0,0,0) scale(2.8)}}
      .te42-auto-click-target{outline:2px solid rgba(233,112,38,.78)!important;outline-offset:2px!important;box-shadow:0 0 0 4px rgba(233,112,38,.10)!important}
      #dabsterAutoClickBadgeV42{position:fixed;z-index:999998;pointer-events:none;padding:3px 6px;border-radius:999px;background:#fff7ef;border:1px solid #e7b38d;color:#a15421;font:700 7px/1 Arial,sans-serif;opacity:0;transition:opacity .12s ease;white-space:nowrap}
      #dabsterAutoClickBadgeV42.visible{opacity:1}
    `;document.head.appendChild(s);
  }

  function installOverlay(){
    installStyles();
    if(!pointer){
      pointer=document.createElement('div');pointer.id='dabsterTestPointerV42';pointer.innerHTML='<svg viewBox="0 0 25 31" aria-hidden="true"><path d="M2 1.5v23.2l6.15-5.3 4.2 9.25 4.55-2.05-4.1-9.05h8.05L2 1.5Z" fill="white" stroke="#22313a" stroke-width="1.8" stroke-linejoin="round"/></svg>';document.body.appendChild(pointer);
    }
    if(!ring){ring=document.createElement('div');ring.id='dabsterTestClickRingV42';document.body.appendChild(ring);}
    if(!document.getElementById('dabsterAutoClickBadgeV42')){const b=document.createElement('div');b.id='dabsterAutoClickBadgeV42';b.textContent='click automatico';document.body.appendChild(b);}
  }

  function targetElement(raw){
    if(!(raw instanceof Element))return null;
    return raw.closest('button,input,select,a,[role="button"],.tab,.sidebar-item,[data-open-commessa],[data-open-offer],[data-src-commessa],[data-src-offer]')||raw;
  }

  function flashTarget(el){
    if(lastTarget&&lastTarget!==el)lastTarget.classList?.remove('te42-auto-click-target');
    lastTarget=el;el.classList?.add('te42-auto-click-target');
    setTimeout(()=>{el.classList?.remove('te42-auto-click-target');if(lastTarget===el)lastTarget=null;},520);
  }

  function showClick(el){
    if(!isTest()||!el)return;installOverlay();
    const r=el.getBoundingClientRect();if(!r.width&&!r.height)return;
    const x=Math.max(5,Math.min(window.innerWidth-8,r.left+Math.min(Math.max(r.width*.48,8),Math.max(8,r.width-5))));
    const y=Math.max(5,Math.min(window.innerHeight-8,r.top+Math.min(Math.max(r.height*.48,8),Math.max(8,r.height-5))));
    pointer.classList.add('visible');pointer.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
    flashTarget(el);
    const badge=document.getElementById('dabsterAutoClickBadgeV42');
    if(badge){badge.style.left=Math.min(window.innerWidth-90,x+16)+'px';badge.style.top=Math.min(window.innerHeight-24,y+15)+'px';badge.classList.add('visible');setTimeout(()=>badge.classList.remove('visible'),520);}
    clearTimeout(ringTimer);ringTimer=setTimeout(()=>{
      ring.style.left=x+'px';ring.style.top=y+'px';ring.classList.remove('pulse');void ring.offsetWidth;ring.classList.add('pulse');
      pointer.animate([{transform:`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(1)`},{transform:`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(.82)`},{transform:`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(1)`}],{duration:190,easing:'ease-out'});
    },150);
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>pointer?.classList.remove('visible'),1100);
  }

  document.addEventListener('click',e=>{
    if(!isTest()||e.isTrusted)return;
    const el=targetElement(e.target);if(!el||el.closest('#dabsterEnvironmentBar'))return;
    showClick(el);
  },true);

  window.addEventListener('pageshow',()=>{if(isTest())installOverlay();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(isTest())installOverlay();},{once:true});else if(isTest())installOverlay();
})();
