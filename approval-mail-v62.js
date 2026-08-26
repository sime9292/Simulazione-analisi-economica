/* v62 - Approval email builder for Analisi Economica. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function field(label){
    const key=norm(label);
    return [...document.querySelectorAll('#tab-dati label.field')].find(item=>{
      const text=norm(item.querySelector(':scope > span')?.textContent);
      return text.startsWith(key);
    })||null;
  }

  function controlValue(label){
    const holder=field(label);if(!holder)return '';
    const control=holder.querySelector('input,select,textarea');if(!control)return '';
    let value='';
    if(control.tagName==='SELECT')value=control.selectedOptions?.[0]?.textContent||control.value||'';
    else value=control.value||'';
    value=String(value).trim();
    if(norm(value).startsWith('seleziona un elemento'))return '';
    return value;
  }

  function ensureOfferFields(){
    const grid=document.querySelector('#tab-dati .accordion.general .general-grid');if(!grid)return;
    if(!field('Cliente')){
      const el=document.createElement('label');el.className='field col-4 approval-generated-field';
      el.innerHTML='<span>Cliente</span><input id="approvalClientField" placeholder="Cliente" value="">';
      const first=grid.querySelector(':scope > .field');grid.insertBefore(el,first||null);
    }
    if(!field('Oggetto')){
      const el=document.createElement('label');el.className='field col-8 approval-generated-field';
      el.innerHTML='<span>Oggetto</span><input id="approvalObjectField" placeholder="Oggetto dell’offerta" value="">';
      grid.appendChild(el);
    }
  }

  function seedGeneratedFields(){
    const client=document.getElementById('approvalClientField');
    const object=document.getElementById('approvalObjectField');
    if(client&&!client.value)client.value='Cliente Demo S.r.l.';
    if(object&&!object.value)object.value='Progettazione impianti sede produttiva';
    const ref=field('Referente tecnico')?.querySelector('select');
    if(ref && !controlValue('Referente tecnico')){
      let opt=[...ref.options].find(o=>norm(o.textContent)==='referente tecnico demo');
      if(!opt){opt=document.createElement('option');opt.textContent='Referente tecnico demo';opt.value='Referente tecnico demo';ref.appendChild(opt);}
      ref.value=opt.value;
    }
  }

  function commessaCode(raw){
    const text=String(raw||'').trim();
    if(!text)return '';
    return text.split(/\s+-\s+/)[0]||text;
  }

  function offerData(){
    window.dabsterRecalcEconomic?.();
    const cliente=controlValue('Cliente')||'—';
    const commessa=commessaCode(controlValue('Commessa'))||'—';
    const referente=controlValue('Referente tecnico')||'—';
    const titolo=controlValue('Titolo')||'—';
    const offerta=controlValue('Codice')||'—';
    const oggetto=controlValue('Oggetto')||'—';
    const proposta=(document.getElementById('aeGross')?.textContent||'0,00').trim();
    const trattativa=(document.getElementById('aeDiscountTotal')?.textContent||proposta).trim();
    return {cliente,commessa,referente,titolo,offerta,oggetto,proposta,trattativa};
  }

  function subjectFor(data){return `Nuova offerta da Approvare ${data.offerta} - ${data.cliente}`;}

  function mailHtml(data,kind){
    const amount=kind==='trade'?data.trattativa:data.proposta;
    const row=(label,value,accent=false)=>`<tr><td style="width:31%;padding:10px 12px;border:1px solid #d9d9d9;background:#f4f4f4;color:#555;font-family:Arial,sans-serif;font-size:13px;font-weight:700;">${esc(label)}</td><td style="padding:10px 12px;border:1px solid #d9d9d9;background:#fff;color:${accent?'#e66b1f':'#333'};font-family:Arial,sans-serif;font-size:13px;font-weight:${accent?'700':'400'};">${esc(value)}</td></tr>`;
    return `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.45;max-width:720px;">
      <p style="margin:0 0 14px;">Ciao,</p>
      <p style="margin:0 0 18px;">la seguente offerta è pronta per essere inviata, attendo ok per l’invio:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #d9d9d9;">
        <tr><td colspan="2" style="padding:12px 14px;background:#e97026;color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Richiesta approvazione offerta</td></tr>
        ${row('Cliente',data.cliente)}
        ${row('Commessa',data.commessa)}
        ${row('Referente tecnico',data.referente)}
        ${row('Titolo',data.titolo)}
        ${row('Offerta',data.offerta)}
        ${row('Oggetto',data.oggetto)}
        ${row('Importo',amount+' €',true)}
      </table>
    </div>`;
  }

  function plainText(data,kind){
    const amount=kind==='trade'?data.trattativa:data.proposta;
    return `Ciao,\n\nla seguente offerta è pronta per essere inviata, attendo ok per l’invio:\n\nRichiesta approvazione offerta\nCliente: ${data.cliente}\nCommessa: ${data.commessa}\nReferente tecnico: ${data.referente}\nTitolo: ${data.titolo}\nOfferta: ${data.offerta}\nOggetto: ${data.oggetto}\nImporto: ${amount} €`;
  }

  function installStyles(){
    if(document.getElementById('approvalMailV62Styles'))return;
    const s=document.createElement('style');s.id='approvalMailV62Styles';s.textContent=`
      .analysis-demo-btn.approval-mail{background:#fff8f1!important;border-color:#e7b990!important;color:#9b5420!important;font-weight:750!important}
      .analysis-demo-btn.approval-mail:hover{background:#fff1e5!important;border-color:#d99c68!important}
      .approval-mail-backdrop{position:fixed;inset:0;z-index:99990;background:rgba(22,31,38,.48);display:flex;align-items:flex-start;justify-content:center;padding:6vh 18px;overflow:auto}
      .approval-mail-backdrop[hidden]{display:none!important}
      .approval-mail-dialog{width:min(880px,96vw);background:#fff;border:1px solid #d8e0e4;border-radius:10px;box-shadow:0 22px 55px rgba(26,40,49,.28);overflow:hidden}
      .approval-mail-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 17px;border-bottom:1px solid #e3e8eb;background:#f8fafb}
      .approval-mail-head strong{display:block;font-size:15px;color:#2d414c}.approval-mail-head span{display:block;margin-top:2px;font-size:10px;color:#75828a}
      .approval-mail-close{width:30px;height:30px;border:1px solid #d3dce1;border-radius:6px;background:#fff;color:#596973;font-size:18px;cursor:pointer}
      .approval-mail-controls{padding:14px 17px 12px;border-bottom:1px solid #e7ecee;background:#fff}
      .approval-mail-controls-label{font-size:10px;font-weight:750;color:#53646e;margin-bottom:7px}
      .approval-mail-amounts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .approval-mail-choice{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border:1px solid #d9e1e5;border-radius:7px;background:#fafbfc;cursor:pointer}
      .approval-mail-choice:has(input:checked){border-color:#dd9b64;background:#fff7f0;box-shadow:0 0 0 2px rgba(224,116,36,.08)}
      .approval-mail-choice>span{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:#3d505b}.approval-mail-choice strong{font-size:12px;color:#2c414b}
      .approval-mail-meta{display:grid;grid-template-columns:110px 1fr;gap:5px 10px;margin-top:12px;font-size:10px}.approval-mail-meta span{color:#71808a}.approval-mail-meta strong{color:#364b56;font-weight:650;word-break:break-word}
      .approval-mail-preview-shell{padding:18px;background:#eef2f4}.approval-mail-preview{max-width:760px;margin:0 auto;padding:26px 30px;background:#fff;border:1px solid #d8e0e4;box-shadow:0 4px 14px rgba(35,50,60,.08)}
      .approval-mail-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 17px;border-top:1px solid #e2e8eb;background:#fafbfc}
      .approval-mail-action{height:31px;padding:0 12px;border-radius:6px;border:1px solid #cfd9de;background:#fff;color:#4a5d67;font-size:10.5px;font-weight:700;cursor:pointer}
      .approval-mail-action.primary{background:#e97026;border-color:#d86218;color:#fff}.approval-mail-action.primary:hover{background:#d9641b}
      .approval-mail-result{margin-right:auto;font-size:10px;color:#47715b;font-weight:650}
      .approval-generated-field input{background:#fff!important}
      @media(max-width:700px){.approval-mail-amounts{grid-template-columns:1fr}.approval-mail-preview{padding:18px}.approval-mail-dialog{width:98vw}.approval-mail-meta{grid-template-columns:90px 1fr}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    let modal=document.getElementById('approvalMailModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='approvalMailModal';modal.className='approval-mail-backdrop';modal.hidden=true;
    modal.innerHTML=`<div class="approval-mail-dialog" role="dialog" aria-modal="true" aria-labelledby="approvalMailTitle">
      <div class="approval-mail-head"><div><strong id="approvalMailTitle">Prepara mail approvazione</strong><span>I dati vengono letti da Dati Offerta e Analisi Economica.</span></div><button type="button" class="approval-mail-close" aria-label="Chiudi">×</button></div>
      <div class="approval-mail-controls"><div class="approval-mail-controls-label">Importo da inserire nella mail</div><div class="approval-mail-amounts">
        <label class="approval-mail-choice"><span><input type="radio" name="approvalAmount" value="proposal" checked> Proposta</span><strong data-approval-proposal>0,00 €</strong></label>
        <label class="approval-mail-choice"><span><input type="radio" name="approvalAmount" value="trade"> Trattativa</span><strong data-approval-trade>0,00 €</strong></label>
      </div><div class="approval-mail-meta"><span>Mittente</span><strong>Utente loggato</strong><span>Oggetto email</span><strong data-approval-subject></strong></div></div>
      <div class="approval-mail-preview-shell"><div class="approval-mail-preview"></div></div>
      <div class="approval-mail-foot"><span class="approval-mail-result"></span><button type="button" class="approval-mail-action" data-approval-cancel>Annulla</button><button type="button" class="approval-mail-action primary" data-approval-confirm>Prepara mail e completa</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.approval-mail-close')?.addEventListener('click',()=>modal.hidden=true);
    modal.querySelector('[data-approval-cancel]')?.addEventListener('click',()=>modal.hidden=true);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
    modal.querySelectorAll('input[name="approvalAmount"]').forEach(r=>r.addEventListener('change',renderModal));
    modal.querySelector('[data-approval-confirm]')?.addEventListener('click',prepareMail);
    return modal;
  }

  function selectedKind(){return document.querySelector('#approvalMailModal input[name="approvalAmount"]:checked')?.value==='trade'?'trade':'proposal';}

  function renderModal(){
    const modal=ensureModal();const data=offerData(),kind=selectedKind();
    modal.querySelector('[data-approval-proposal]').textContent=data.proposta+' €';
    modal.querySelector('[data-approval-trade]').textContent=data.trattativa+' €';
    modal.querySelector('[data-approval-subject]').textContent=subjectFor(data);
    modal.querySelector('.approval-mail-preview').innerHTML=mailHtml(data,kind);
    modal.querySelector('.approval-mail-result').textContent='';
    window.DABSTER_APPROVAL_MAIL={subject:subjectFor(data),html:mailHtml(data,kind),text:plainText(data,kind),data,amountSource:kind};
  }

  function setCompleted(){
    const st=field('Stato')?.querySelector('select');if(!st)return;
    let opt=[...st.options].find(o=>norm(o.value||o.textContent)==='completata');
    if(!opt){opt=document.createElement('option');opt.value='Completata';opt.textContent='Completata';st.appendChild(opt);}
    st.value=opt.value;st.dispatchEvent(new Event('change',{bubbles:true}));
  }

  async function copyRich(html,text){
    if(navigator.clipboard?.write && window.ClipboardItem){
      const item=new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})});
      await navigator.clipboard.write([item]);return true;
    }
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}
    return false;
  }

  async function prepareMail(){
    const modal=ensureModal(),data=offerData(),kind=selectedKind();
    const html=mailHtml(data,kind),text=plainText(data,kind),subject=subjectFor(data);
    let copied=false;try{copied=await copyRich(html,text);}catch(_e){}
    setCompleted();
    document.body.dataset.approvalPrepared='1';
    window.DABSTER_APPROVAL_MAIL={subject,html,text,data,amountSource:kind,copied};
    const result=modal.querySelector('.approval-mail-result');if(result)result.textContent=copied?'Mail copiata · stato Completata':'Mail pronta · stato Completata';
    const status=document.querySelector('.analysis-demo-status');if(status)status.textContent='Mail approvazione preparata · offerta Completata';
  }

  function openMail(){
    ensureOfferFields();window.dabsterRecalcEconomic?.();
    const modal=ensureModal();renderModal();modal.hidden=false;
  }

  async function install(){
    for(let i=0;i<180;i++){
      const toolbar=document.getElementById('analysisDemoToolbar');
      if(toolbar){
        installStyles();ensureOfferFields();ensureModal();
        if(!document.getElementById('prepareApprovalMail')){
          const btn=document.createElement('button');btn.type='button';btn.id='prepareApprovalMail';btn.className='analysis-demo-btn approval-mail';btn.textContent='Prepara mail approvazione';
          const save=document.getElementById('saveAnalysisData');toolbar.insertBefore(btn,save||null);btn.addEventListener('click',openMail);
        }
        document.getElementById('prefillDemoData')?.addEventListener('click',()=>setTimeout(seedGeneratedFields,1200));
        return;
      }
      await sleep(60);
    }
  }

  window.addEventListener('load',()=>setTimeout(install,650),{once:true});
})();
