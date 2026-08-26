export function createStore(initial={}){
  let state={
    offer:{status:'',sentAmount:0,code:'',title:'',...initial.offer},
    analysis:{economic:null,phases:[],locked:false,...initial.analysis},
    confirmation:{consulting:0,projects:0,direction:0,total:0,...initial.confirmation},
    offerLines:[],
    billing:{invoices:[],ready:false,...initial.billing}
  };
  const listeners=new Set();

  const clone=value=>{
    if(typeof structuredClone==='function')return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  function getState(){return state;}
  function snapshot(){return clone(state);}
  function emit(reason='update'){
    const snap=snapshot();
    listeners.forEach(fn=>{try{fn(snap,reason);}catch(err){console.error('[Dabster store listener]',err);}});
    window.dispatchEvent(new CustomEvent('dabster-store-change',{detail:{state:snap,reason}}));
  }
  function patch(section,value,reason=section){
    state={...state,[section]:typeof value==='function'?value(state[section],state):{...state[section],...value}};
    emit(reason);
    return state[section];
  }
  function replace(section,value,reason=section){state={...state,[section]:value};emit(reason);return value;}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}

  return {getState,snapshot,patch,replace,subscribe,emit};
}
