/* v40 - Keep billing KPIs only at commessa level; add table totals for offers and offer lines. */
(function(){
  const parseMoney=v=>{
    const s=String(v||'').replace(/\s|€/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
    return Number(s)||0;
  };
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=(amount,billed)=>amount?Math.min(100,billed/amount*100):0;

  function installStyles(){
    if(document.getElementById('billingDashboardTotalsV40Styles'))return;
    const s=document.createElement('style');s.id='billingDashboardTotalsV40Styles';s.textContent=`
      #billingDashboardPageV39 .bw39-row.bw39-total>div{background:#f1f4f5!important;border-top:2px solid #cbd5da;font-weight:800;color:#314b57}
      #billingDashboardPageV39 .bw39-row.bw39-total{cursor:default!important}
      #billingDashboardPageV39 .bw39-row.bw39-total:hover>div{background:#f1f4f5!important}
      #billingDashboardPageV39 .bw39-row.bw39-total .bw39-total-label{justify-content:flex-end;text-transform:uppercase;font-size:7.7px;letter-spacing:.02em;color:#5e7079}
    `;document.head.appendChild(s);
  }

  function removeKpis(root){root.querySelector('.bw39-kpis')?.remove();}

  function offerTotals(root){
    const table=root.querySelector('.bw39-table');
    if(!table||!table.querySelector('.bw39-row.head.bw39-offer'))return false;
    removeKpis(root);
    table.querySelectorAll('.bw39-total').forEach(x=>x.remove());
    const rows=[...table.querySelectorAll('.bw39-row.data.bw39-offer')];
    let amount=0,billed=0,residual=0;
    rows.forEach(r=>{amount+=parseMoney(r.children[2]?.textContent);billed+=parseMoney(r.children[3]?.textContent);residual+=parseMoney(r.children[4]?.textContent);});
    const total=document.createElement('div');total.className='bw39-row bw39-offer bw39-total';
    total.innerHTML=`<div></div><div class="bw39-total-label">Totale tabella</div><div class="bw39-money">${money(amount)} €</div><div class="bw39-money">${money(billed)} €</div><div class="bw39-money">${money(residual)} €</div><div class="bw39-money">${pct(amount,billed).toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div></div>`;
    table.appendChild(total);return true;
  }

  function lineTotals(root){
    const topPane=root.querySelector('#bw39Top');
    if(!topPane||!topPane.querySelector('.bw39-row.head.bw39-lines'))return false;
    removeKpis(root);
    const scroll=topPane.querySelector('.bw39-scroll');if(!scroll)return true;
    scroll.querySelectorAll('.bw39-total').forEach(x=>x.remove());
    const rows=[...scroll.querySelectorAll('.bw39-row.bw39-lines:not(.head):not(.bw39-total)')];
    let amount=0,billed=0,residual=0;
    rows.forEach(r=>{amount+=parseMoney(r.children[1]?.textContent);billed+=parseMoney(r.children[2]?.textContent);residual+=parseMoney(r.children[3]?.textContent);});
    const total=document.createElement('div');total.className='bw39-row bw39-lines bw39-total';
    total.innerHTML=`<div class="bw39-total-label">Totale tabella</div><div class="bw39-money">${money(amount)} €</div><div class="bw39-money">${money(billed)} €</div><div class="bw39-money">${money(residual)} €</div><div class="bw39-money">${pct(amount,billed).toLocaleString('it-IT',{maximumFractionDigits:1})}%</div>`;
    scroll.appendChild(total);return true;
  }

  function apply(){
    const page=document.getElementById('billingDashboardPageV39');if(!page||page.hidden)return;
    const root=page.querySelector('.bw39');if(!root)return;
    installStyles();
    if(offerTotals(root))return;
    if(lineTotals(root))return;
    // Commessa level: KPIs remain untouched and no total row is injected.
    root.querySelectorAll('.bw39-total').forEach(x=>x.remove());
  }

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}
  const obs=new MutationObserver(queue);obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',queue);
  document.addEventListener('click',e=>{if(e.target.closest?.('#billingDashboardPageV39,[data-page="billing"]'))setTimeout(queue,0);},true);
  [0,100,300,800,1600,3000].forEach(ms=>setTimeout(queue,ms));
})();
