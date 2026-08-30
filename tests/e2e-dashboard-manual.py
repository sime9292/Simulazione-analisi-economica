import os, sys, time, json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

URL=os.environ.get('DABSTER_URL','http://127.0.0.1:8000/v89.html')
ART=os.environ.get('ARTIFACT_DIR','artifacts')
os.makedirs(ART,exist_ok=True)

opts=Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=1440,1200')
opts.add_argument('--disable-gpu')

driver=webdriver.Chrome(options=opts)
wait=WebDriverWait(driver,30)

def js(script,*args):
    return driver.execute_script(script,*args)

def diag(label):
    data=js("""
      const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{};
      return {
        hash:location.hash,
        status:[...document.querySelectorAll('#tab-dati label.field')].find(x=>(x.querySelector(':scope > span')?.textContent||'').trim().toLowerCase().startsWith('stato'))?.querySelector('select')?.value||'',
        total:document.getElementById('totaleOfferta')?.value||'',
        offer:snap.offer||null,
        snapshotLines:(snap.lines||[]).map(x=>({id:x.id,phase:x.phase,description:x.description,amount:x.amount})),
        globalLines:(window.DABSTER_OFFER_LINES?.lines||[]).map(x=>({id:x.id,phase:x.phase,description:x.description,amount:x.amount})),
        offerRows:document.querySelectorAll('#offerLineRows .offer-line-row').length,
        dashboardVisible:!!document.querySelector('#billingDashboardLiveV87:not([hidden])'),
        dashboardText:document.getElementById('billingDashboardLiveV87')?.innerText||''
      };
    """)
    print(label+': '+json.dumps(data,ensure_ascii=False))
    return data

try:
    driver.get(URL)
    wait.until(lambda d: js("return !!window.DABSTER_OFFER_FLOW && !!document.querySelector('#offers38New')"))
    js("document.querySelector('#offers38New').click()")
    wait.until(lambda d: js("return getComputedStyle(document.querySelector('.main-card')).display!=='none'"))

    js("""
      const norm=v=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim();
      const field=label=>[...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)));
      const set=(label,value,type='input')=>{const el=field(label)?.querySelector('input,select,textarea');if(!el)throw new Error('Campo mancante: '+label);el.value=value;el.dispatchEvent(new Event(type,{bubbles:true}));};
      const comm=field('Commessa')?.querySelector('select');if(!comm)throw new Error('Commessa mancante');comm.selectedIndex=1;comm.dispatchEvent(new Event('change',{bubbles:true}));
      set('Titolo','Offerta manuale E2E');
      set('Codice','E2E_MAN_001');
    """)

    wait.until(lambda d: js("return document.querySelectorAll('#tab-analisi .phase-row[data-economic-phase]').length>=2"))
    js("""
      const rows=[...document.querySelectorAll('#tab-analisi .phase-row[data-economic-phase]')].filter(r=>r.dataset.economicActive==='1'&&!r.hidden);
      if(rows.length<2)throw new Error('Fasi economiche attive insufficienti: '+rows.length);
      rows.forEach(r=>{const i=r.querySelector('.ae-proposal');if(i){i.value='0,00';i.dispatchEvent(new Event('input',{bubbles:true}));}});
      const vals=['10000,00','5000,00'];
      rows.slice(0,2).forEach((r,idx)=>{const i=r.querySelector('.ae-proposal');i.value=vals[idx];i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));});
      window.dabsterRecalcEconomic?.();
    """)
    wait.until(lambda d: abs(js("return Number(String(document.getElementById('totaleOfferta')?.value||'0').replace(/\\./g,'').replace(',','.'))")-15000)<0.01)

    wait.until(lambda d: js("""
      const s=[...document.querySelectorAll('#tab-dati label.field')].find(x=>(x.querySelector(':scope > span')?.textContent||'').trim().toLowerCase().startsWith('stato'))?.querySelector('select');
      return !!s && [...s.options].some(o=>(o.value||o.textContent).toLowerCase()==='confermata');
    """))
    js("""
      const s=[...document.querySelectorAll('#tab-dati label.field')].find(x=>(x.querySelector(':scope > span')?.textContent||'').trim().toLowerCase().startsWith('stato')).querySelector('select');
      const opt=[...s.options].find(o=>(o.value||o.textContent).toLowerCase()==='confermata');
      s.value=opt.value;s.dispatchEvent(new Event('change',{bubbles:true}));
    """)

    wait.until(lambda d: js("return (window.DABSTER_OFFER_LINES?.lines||[]).length>=2"))
    wait.until(lambda d: abs(js("return Number(window.DABSTER_OFFER_LINES?.total||0)")-15000)<0.01)
    pre=diag('AFTER_CONFIRM')

    js("document.querySelector('#appSidebar [data-page=\"billing-dashboard\"]')?.click()")
    wait.until(lambda d: js("return !!document.querySelector('#billingDashboardLiveV87:not([hidden])')"))
    wait.until(lambda d: 'E2E_MAN_001' in (js("return document.getElementById('billingDashboardLiveV87')?.innerText||''") or ''))
    post=diag('DASHBOARD')

    text=post['dashboardText']
    assert 'Nessuna offerta confermata' not in text, text
    assert '26_119' in text, text
    assert 'E2E_MAN_001' in text, text
    assert ('15.000,00' in text or '15.000' in text), text
    assert len(post['snapshotLines'])>=2, post
    print('E2E_MANUAL_DASHBOARD: PASS')
except Exception as e:
    print('E2E_MANUAL_DASHBOARD: FAIL',repr(e))
    try: diag('FAIL_DIAG')
    except Exception: pass
    driver.save_screenshot(os.path.join(ART,'failure.png'))
    with open(os.path.join(ART,'page.html'),'w',encoding='utf-8') as f:f.write(driver.page_source)
    raise
finally:
    driver.quit()
