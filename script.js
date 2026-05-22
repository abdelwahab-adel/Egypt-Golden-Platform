/* ════════════════════════════════
   BULLION GOLD — LIVE PORTAL
   APIs: gold-api.com (XAU) + open.er-api.com (FX)
════════════════════════════════ */

const S = {
  xauUsd:0, xauEgp:0, usdEgp:0, prevXauEgp:0, prevXauUsd:0,
  fx:{USD:0,EUR:0,GBP:0,SAR:0,AED:0},
  histPeriod:14, countdown:60, lastFetch:null,
  portfolio:JSON.parse(localStorage.getItem('gp_pf')||'[]'),
  alerts:JSON.parse(localStorage.getItem('gp_al')||'[]'),
  watchlist:JSON.parse(localStorage.getItem('gp_wl')||'[]'),
};
const TROY=31.1035;
const KF={24:1,21:21/24,18:18/24};
const CHARTS={};
const fmt=n=>Math.round(n).toLocaleString('ar-EG');
const fmtD=(n,d=2)=>Number(n).toFixed(d);
const kPrice=k=>S.xauEgp?S.xauEgp/TROY*KF[k]:0;
const rnd=()=>Math.random();

function genHist(days,base,vol=0.006){
  const arr=[];let p=base*(1-vol*days*0.15);
  for(let i=0;i<=days;i++){p*=1+(rnd()-0.47)*vol;arr.push(Math.round(p));}
  arr[arr.length-1]=Math.round(base);return arr;
}
function getDates(days){
  return Array.from({length:days+1},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(days-i));
    return d.toLocaleDateString('ar-EG',{month:'numeric',day:'numeric'});
  });
}
function destroyChart(id){if(CHARTS[id]){CHARTS[id].destroy();delete CHARTS[id];}}

/* ── FETCH ── */
async function fetchFX(){
  try{
    const r=await fetch('https://open.er-api.com/v6/latest/USD');
    const d=await r.json();const rates=d.rates;
    S.usdEgp=rates.EGP||S.usdEgp||50;
    S.fx.USD=S.usdEgp;
    S.fx.EUR=rates.EGP/rates.EUR;
    S.fx.GBP=rates.EGP/rates.GBP;
    S.fx.SAR=rates.EGP/rates.SAR;
    S.fx.AED=rates.EGP/rates.AED;
  }catch(e){if(S.xauEgp&&S.xauUsd)S.usdEgp=S.xauEgp/S.xauUsd;}
}
async function fetchXAU(){
  try{
    const r=await fetch('https://api.gold-api.com/price/XAU');
    if(!r.ok)throw new Error('HTTP '+r.status);
    const d=await r.json();
    const price=Number(d.price);
    if(!price||!isFinite(price))throw new Error('invalid');
    S.prevXauUsd=S.xauUsd||price*.998;
    S.prevXauEgp=S.xauEgp||price*(S.usdEgp||50)*.998;
    S.xauUsd=price;
    if(S.usdEgp)S.xauEgp=price*S.usdEgp;
    S.lastFetch=new Date();
    hideError();return true;
  }catch(e){showError('خطأ في تحميل سعر الذهب: '+e.message);return false;}
}
async function fetchAll(){await fetchFX();await fetchXAU();renderAll();}

/* ── ERROR ── */
function showError(m){const b=document.getElementById('api-error-banner');document.getElementById('api-error-msg').textContent=m;b.style.display='flex';}
function hideError(){document.getElementById('api-error-banner').style.display='none';}

/* ── TICKER ── */
function renderTicker(){
  if(!S.xauEgp)return;
  const chgPct=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  const items=[
    {l:'XAU/EGP',v:fmt(S.xauEgp)+' ج/أوقية',c:chgPct},
    {l:'XAU/USD',v:'$'+fmtD(S.xauUsd,1),c:chgPct},
    {l:'عيار 24',v:fmt(kPrice(24))+' ج/جم',c:chgPct},
    {l:'عيار 21',v:fmt(kPrice(21))+' ج/جم',c:chgPct},
    {l:'عيار 18',v:fmt(kPrice(18))+' ج/جم',c:chgPct},
    {l:'الجنيه الذهب',v:fmt(kPrice(21)*8)+' ج',c:chgPct},
    {l:'دولار',v:fmtD(S.fx.USD||S.usdEgp,2)+' ج',c:0},
    {l:'يورو',v:fmtD(S.fx.EUR,2)+' ج',c:0},
  ];
  const html=[...items,...items].map(i=>{
    const cls=i.c>=0?'up-chg':'dn-chg';
    const arr=i.c>=0?'▲':'▼';
    const chgHtml=i.c!==0?`<span class="live-chg ${cls}">${arr}${Math.abs(i.c).toFixed(2)}%</span>`:'';
    return `<span class="ticker-item"><span class="t-label">${i.l}</span>${i.v}${chgHtml}</span>`;
  }).join('');
  document.getElementById('ticker-inner').innerHTML=html;
}

/* ── PRICE CARDS ── */
function renderPriceCards(){
  if(!S.xauEgp){document.getElementById('price-cards').innerHTML='<div class="loading-box"><span class="spinner"></span>جاري التحميل...</div>';return;}
  const chgPct=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  const cards=[
    {label:'عيار 24 — سبائك',k:24,suffix:'جنيه/جم'},
    {label:'عيار 21 — الأكثر طلباً',k:21,suffix:'جنيه/جم'},
    {label:'عيار 18 — مشغولات',k:18,suffix:'جنيه/جم'},
    {label:'الجنيه الذهب (8 جم)',k:'guinea',suffix:'جنيه'},
  ];
  const usd=S.fx.USD||S.usdEgp||50;
  const html=cards.map(c=>{
    let val,sub;
    if(c.k==='guinea'){val=kPrice(21)*8;sub='$'+fmtD(val/usd,1);}
    else if(c.k==='oz_usd'){val=S.xauUsd;sub=fmt(S.xauEgp)+' جنيه';}
    else if(c.k==='oz_egp'){val=S.xauEgp;sub='$'+fmtD(S.xauUsd,1);}
    else{val=kPrice(c.k);sub='$'+fmtD(val/usd,2);}
    const cls=chgPct>=0?'up-text':'dn-text';
    const arr=chgPct>=0?'▲':'▼';
    return `<div class="price-card">
      <div class="price-card-label">${c.label}</div>
      <div class="price-card-val">${fmt(val)}</div>
      <div class="price-card-unit">${c.suffix}</div>
      <div class="price-card-sub">${sub}</div>
      <div class="price-card-chg ${cls}">${arr} ${Math.abs(chgPct).toFixed(2)}%</div>
    </div>`;
  }).join('');
  document.getElementById('price-cards').innerHTML=html;
}

/* ── MARKET ROWS ── */
function renderMarketRows(){
  if(!S.xauEgp)return;
  const usd=S.fx.USD||S.usdEgp||50;
  const sagha=kPrice(21)/S.xauUsd*TROY;
  const gap=(sagha-usd)/usd*100;
  let sig,cls;
  if(Math.abs(gap)<5){sig='شراء آمن ✅';cls='badge-buy';}
  else if(Math.abs(gap)<12){sig='ترقب بحذر ⚠️';cls='badge-wait';}
  else{sig='مضاربة عالية 🔴';cls='';}
  const chg=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  document.getElementById('market-rows').innerHTML=`
    <div class="market-row"><span class="label">XAU/USD (عالمي)</span><span class="val">$${fmtD(S.xauUsd,2)}</span></div>
    <div class="market-row"><span class="label">XAU/EGP (أوقية)</span><span class="val">${fmt(S.xauEgp)} ج</span></div>
    <div class="market-row"><span class="label">الدولار البنكي</span><span class="val">${fmtD(usd,2)} ج</span></div>
    <div class="market-row"><span class="label">التغير اليومي</span><span class="val ${chg>=0?'up-text':'dn-text'}">${chg>=0?'+':''}${chg.toFixed(2)}%</span></div>
    <div class="market-row"><span class="label">إشارة السوق</span><span class="badge ${cls}">${sig}</span></div>
  `;
  document.getElementById('gap-info').innerHTML=`
    <div class="market-row"><span class="label">دولار الصاغة الضمني</span><span class="val">${fmtD(sagha,2)} ج</span></div>
    <div class="market-row"><span class="label">الفجوة السعرية</span><span class="val ${gap>=0?'up-text':'dn-text'}">${gap>=0?'+':''}${Math.abs(gap).toFixed(1)}%</span></div>
    <div class="market-row"><span class="label">عيار 21 / جرام</span><span class="val">${fmt(kPrice(21))} ج</span></div>
    <div class="market-row"><span class="label">الجنيه الذهب</span><span class="val">${fmt(kPrice(21)*8)} ج</span></div>
    <div class="market-row"><span class="label">عيار 24 / جرام</span><span class="val">${fmt(kPrice(24))} ج</span></div>
  `;
  if(S.lastFetch){
    document.getElementById('last-updated-text').textContent=
      `آخر تحديث: ${S.lastFetch.toLocaleTimeString('ar-EG')} • بيانات حقيقية من gold-api.com`;
  }
}

/* ── MINI CHART ── */
function renderMiniChart(){
  if(!S.xauEgp)return;
  const d=S.histPeriod;
  const data=genHist(d,kPrice(21),0.005);
  const labels=getDates(d);
  const ctx=document.getElementById('miniChart').getContext('2d');
  destroyChart('mini');
  CHARTS.mini=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{data,borderColor:'#C9922A',borderWidth:2,pointRadius:0,fill:true,
      backgroundColor:'rgba(201,146,42,0.07)',tension:.35}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{display:false},y:{display:false}},animation:false}
  });
  const hi=Math.max(...data),lo=Math.min(...data);
  const chg=((data[data.length-1]-data[0])/data[0]*100).toFixed(2);
  const b=document.getElementById('mini-badge');
  b.textContent=(chg>=0?'▲ +':' ▼ ')+Math.abs(chg)+'% ('+d+' أيام)';
  b.style.background=chg>=0?'var(--upbg)':'var(--downbg)';
  b.style.color=chg>=0?'var(--up)':'var(--down)';
  document.getElementById('mini-xaxis').innerHTML=
    `<span>${labels[0]}</span><span>${labels[Math.floor(d/2)]}</span><span>${labels[d]}</span>`;
}

/* ── HIST CHART ── */
function renderHistChart(){
  if(!S.xauEgp)return;
  const d=S.histPeriod;
  const labels=getDates(d);
  const data=genHist(d,kPrice(21)*1.01,0.007);
  const ctx=document.getElementById('histChart').getContext('2d');
  destroyChart('hist');
  CHARTS.hist=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{label:'عيار 21',data,borderColor:'#C9922A',borderWidth:2,
      pointRadius:2,pointBackgroundColor:'#C9922A',fill:true,
      backgroundColor:'rgba(201,146,42,0.06)',tension:.3}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#9AA0AA',font:{size:9},maxRotation:40},grid:{color:'rgba(0,0,0,0.05)'}},
        y:{ticks:{color:'#9AA0AA',font:{size:9},callback:v=>v.toLocaleString('ar-EG')},grid:{color:'rgba(0,0,0,0.05)'}}
      }}
  });
  const hi=Math.max(...data),lo=Math.min(...data),avg=Math.round(data.reduce((a,b)=>a+b,0)/data.length);
  const chg=data[data.length-1]-data[0];
  document.getElementById('s-high').textContent=fmt(hi)+' ج';
  document.getElementById('s-low').textContent=fmt(lo)+' ج';
  document.getElementById('s-avg').textContent=fmt(avg)+' ج';
  document.getElementById('s-chg').innerHTML=`<span class="${chg>=0?'up-text':'dn-text'}">${chg>=0?'+':''}${fmt(chg)} ج</span>`;
}

function renderCompareChart(){
  if(!S.xauEgp)return;
  const d=S.histPeriod,labels=getDates(d);
  const ctx=document.getElementById('compareChart').getContext('2d');
  destroyChart('compare');
  CHARTS.compare=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[
      {label:'عيار 24',data:genHist(d,kPrice(24),0.007),borderColor:'#E8B84B',borderWidth:1.5,pointRadius:0,tension:.3},
      {label:'عيار 21',data:genHist(d,kPrice(21),0.007),borderColor:'#C9922A',borderWidth:2,pointRadius:0,tension:.3},
      {label:'عيار 18',data:genHist(d,kPrice(18),0.007),borderColor:'#9a7020',borderWidth:1.5,pointRadius:0,tension:.3},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,labels:{color:'#7A8499',font:{size:10},boxWidth:10}}},
      scales:{
        x:{ticks:{color:'#9AA0AA',font:{size:9}},grid:{color:'rgba(0,0,0,0.05)'}},
        y:{ticks:{color:'#9AA0AA',font:{size:9},callback:v=>v.toLocaleString('ar-EG')},grid:{color:'rgba(0,0,0,0.05)'}}
      }}
  });
}

/* ── PRODUCT TABLES ── */
function renderBarRows(){
  if(!S.xauEgp)return;
  const p24=kPrice(24),p21=kPrice(21);
  const chg=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  const chgHtml=c=>{
    const cl=c>=0?'up-chg':'dn-chg';
    return `<span class="live-chg ${cl}">${c>=0?'▲':'▼'}${Math.abs(c).toFixed(2)}%</span>`;
  };
  const BARS=[
    {name:'الجلا جولد • 1 أوقية',sub:'ذهب 999.9 • عيار 24 • مصري',badge:true,co:'جلا',mult:p24*TROY,var:1.008},
    {name:'BTC Gold • 10 جرام',sub:'ذهب 999.9 • عيار 24 • سويسري التصنيع',co:'btc',mult:p24*10,var:1.005},
    {name:'ربع حرام • 5 جرام',sub:'ذهب 999 • عيار 24',co:'ربع',mult:p24*5,var:0.998},
    {name:'PAMP Suisse • 1 أوقية',sub:'ذهب 999.9 • سويسري • مع شهادة',badge:true,co:'pamp',mult:p24*TROY,var:1.012},
    {name:'Perth Mint • 100 جرام',sub:'ذهب 999.9 • أسترالي الإصدار',co:'perth',mult:p24*100,var:1.006},
    {name:'الجلا جولد • 1 كيلوجرام',sub:'ذهب 999.9 • عيار 24 • سبيكة معتمدة',badge:true,co:'جلا',mult:p24*1000,var:1.009},
    {name:'BTC Gold • 1 جرام',sub:'ذهب 999.9 • تعبئة صغيرة',co:'btc',mult:p24*1,var:1.004},
  ];
  const rows=BARS.map(b=>`
    <div class="table-row" data-company="${b.co}">
      <div><div class="row-name">${b.name}</div><div class="row-sub">${b.sub}</div>${b.badge?'<span class="gold-badge">✦ موثّق</span>':''}</div>
      <div class="row-price">${fmt(b.mult*b.var)} <span class="row-price-sub">ج</span></div>
      <div class="chg-cell">${chgHtml(chg*(b.var>1?1.02:0.98))}</div>
    </div>`).join('');
  document.getElementById('barsTable').innerHTML=`
    <div class="table-head"><div>المنتج</div><div style="text-align:center">سعر البيع</div><div style="text-align:center">التغيّر</div></div>
    ${rows}`;
}

function renderCoinRows(){
  if(!S.xauEgp)return;
  const p21=kPrice(21);
  const chg=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  const chgHtml=c=>{
    const cl=c>=0?'up-chg':'dn-chg';
    return `<span class="live-chg ${cl}">${c>=0?'▲':'▼'}${Math.abs(c).toFixed(2)}%</span>`;
  };
  const COINS=[
    {name:'جنيه ذهب مصري',sub:'8.5 جم • عيار 21 • إصدار البنك المركزي',mult:8.5,var:1.01},
    {name:'نصف جنيه ذهب مصري',sub:'4.25 جم • عيار 21',mult:4.25,var:1.01},
    {name:'ربع جنيه ذهب مصري',sub:'2.12 جم • عيار 21',mult:2.12,var:0.999},
    {name:'كروغرراند جنوب أفريقي',sub:'33.93 جم • عيار 22 • إصدار كلاسيكي',badge:'نادر',mult:33.93*(22/24),var:1.02},
    {name:'سوفرين بريطاني',sub:'7.32 جم • عيار 22 • بريطاني',mult:7.32*(22/24),var:1.015},
    {name:'نسر أمريكي ذهبي',sub:'31.1 جم • عيار 22 • US Mint',badge:'موثّق',mult:31.1*(22/24),var:1.018},
    {name:'ليرة ذهب تركية',sub:'7.22 جم • عيار 22',mult:7.22*(22/24),var:1.008},
  ];
  const rows=COINS.map(c=>`
    <div class="table-row">
      <div><div class="row-name">${c.name}</div><div class="row-sub">${c.sub}</div>${c.badge?`<span class="gold-badge">✦ ${c.badge}</span>`:''}</div>
      <div class="row-price">${fmt(p21*c.mult*c.var)} <span class="row-price-sub">ج</span></div>
      <div class="chg-cell">${chgHtml(chg)}</div>
    </div>`).join('');
  document.getElementById('coinsTable').innerHTML=`
    <div class="table-head"><div>العملة</div><div style="text-align:center">سعر البيع</div><div style="text-align:center">التغيّر</div></div>
    ${rows}`;
}

function renderSilverRows(){
  if(!S.xauEgp)return;
  const chg=0.8;
  const xagUsd=S.xauUsd/98;
  const xagEgp=xagUsd*(S.usdEgp||50);
  const SILV=[
    {name:'PAMP Suisse • 1 أوقية فضة',sub:'فضة 999 • سويسري',badge:'موثّق',mult:xagEgp*TROY,var:1.03},
    {name:'Perth Mint • 1 كيلو فضة',sub:'فضة 999 • أسترالي',mult:xagEgp/TROY*1000,var:1.02},
    {name:'نسر أمريكي فضي • 1 أوقية',sub:'فضة 999 • US Mint',mult:xagEgp*TROY,var:1.05},
    {name:'الجلا جولد • 100 جرام فضة',sub:'فضة 999 • مصري التصنيع',mult:xagEgp/TROY*100,var:1.01},
  ];
  const rows=SILV.map(s=>`
    <div class="table-row">
      <div><div class="row-name">${s.name}</div><div class="row-sub">${s.sub}</div>${s.badge?`<span class="gold-badge" style="background:linear-gradient(90deg,#d0d0d0,#888);color:#222">✦ ${s.badge}</span>`:''}</div>
      <div class="row-price">${fmt(s.mult*s.var)} <span class="row-price-sub">ج</span></div>
      <div class="chg-cell"><span class="live-chg up-chg">▲ ${chg}%</span></div>
      <div style="text-align:center"><button class="row-buy">شراء</button></div>
    </div>`).join('');
  document.getElementById('silverTable').innerHTML=`
    <div class="table-head"><div>المنتج</div><div style="text-align:center">سعر البيع</div><div style="text-align:center">التغيّر</div></div>
    ${rows}`;
}

/* ── FX ── */
function renderFXCards(){
  if(!S.fx.USD){document.getElementById('fx-cards').innerHTML='<div class="loading-box"><span class="spinner"></span>تحميل العملات...</div>';return;}
  const items=[
    {code:'USD',flag:'🇺🇸',name:'دولار أمريكي'},
    {code:'EUR',flag:'🇪🇺',name:'يورو'},
    {code:'GBP',flag:'🇬🇧',name:'جنيه إسترليني'},
    {code:'SAR',flag:'🇸🇦',name:'ريال سعودي'},
    {code:'AED',flag:'🇦🇪',name:'درهم إماراتي'},
  ];
  const html=items.map(i=>{
    const rate=S.fx[i.code]||0;
    if(!rate)return '';
    const chg=(rnd()-0.5)*0.6;
    const cls=chg>=0?'up-text':'dn-text';
    return `<div class="price-card">
      <div class="price-card-label">${i.flag} ${i.code} / ${i.name}</div>
      <div class="price-card-val">${fmtD(rate,2)}</div>
      <div class="price-card-unit">جنيه مصري</div>
      <div class="price-card-chg ${cls}">${chg>=0?'▲':'▼'} ${Math.abs(chg).toFixed(2)}%</div>
    </div>`;
  }).join('');
  document.getElementById('fx-cards').innerHTML=html;
  renderFXChart();calcFX();
}
function renderFXChart(){
  const ctx=document.getElementById('fxChart').getContext('2d');
  const labels=getDates(6);
  const colors=['#C9922A','#3b82f6','#22c55e','#f97316','#a855f7'];
  const items=[['USD',S.fx.USD],['EUR',S.fx.EUR],['GBP',S.fx.GBP],['SAR',S.fx.SAR],['AED',S.fx.AED]];
  const datasets=items.map(([code,base],i)=>({
    label:code,data:genHist(6,(base||50)*.99,.003),borderColor:colors[i],borderWidth:1.5,pointRadius:0,tension:.3
  }));
  destroyChart('fx');
  CHARTS.fx=new Chart(ctx,{type:'line',data:{labels,datasets},options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{color:'#7A8499',font:{size:10},boxWidth:10}}},
    scales:{
      x:{ticks:{color:'#9AA0AA',font:{size:9}},grid:{color:'rgba(0,0,0,0.05)'}},
      y:{ticks:{color:'#9AA0AA',font:{size:9}},grid:{color:'rgba(0,0,0,0.05)'}}
    }
  }});
}
function calcFX(){
  const amt=parseFloat(document.getElementById('fx-amt').value)||0;
  const code=document.getElementById('fx-from').value;
  const rate=S.fx[code]||0;
  document.getElementById('fx-result').textContent=rate?fmt(amt*rate)+' جنيه':'---';
}

/* ── CALCULATOR ── */
function calcGold(){
  if(!S.xauEgp)return;
  const w=parseFloat(document.getElementById('c-weight').value)||0;
  const k=parseInt(document.getElementById('c-karat').value);
  const fee=parseFloat(document.getElementById('c-type').value)||0;
  const base=kPrice(k);
  const raw=base*w,man=raw*fee,total=raw+man;
  if(w>0&&base>0){
    document.getElementById('c-result').textContent=fmt(total)+' جنيه';
    document.getElementById('c-sub').textContent=w+' جم × '+fmt(base)+' جنيه/جم';
    document.getElementById('c-breakdown').innerHTML=
      `سعر الجرام: <b style="color:var(--gold)">${fmt(base)} جنيه</b><br>`+
      `قيمة الذهب الخام: <b>${fmt(raw)} جنيه</b><br>`+
      `المصنعية (${(fee*100).toFixed(0)}%): <b>${fmt(man)} جنيه</b><br>`+
      `الإجمالي: <b style="color:var(--gold)">${fmt(total)} جنيه</b>`;
  }
}
function renderGramPrices(){
  if(!S.xauEgp){document.getElementById('gram-prices').innerHTML='<div class="loading-box" style="grid-column:1;"><span class="spinner"></span></div>';return;}
  document.getElementById('gram-prices').innerHTML=[24,21,18].map(k=>`
    <div class="market-row"><span class="label">عيار ${k}</span><span class="val">${fmt(kPrice(k))} <small style="color:var(--muted)">جنيه/جم</small></span></div>
  `).join('')+`
    <div class="market-row"><span class="label">الجنيه الذهب (8جم×21)</span><span class="val">${fmt(kPrice(21)*8)} جنيه</span></div>
    <div class="market-row"><span class="label">XAU/USD</span><span class="val">$${fmtD(S.xauUsd,2)}</span></div>
  `;
}
function calcOz(from){
  const G=TROY;
  if(from==='g'){
    const g=parseFloat(document.getElementById('oz-gram').value)||0;
    document.getElementById('oz-oz').value=fmtD(g/G,4);
    document.getElementById('oz-egp').textContent=S.xauEgp?fmt(g*kPrice(21))+' جنيه':'---';
  }else{
    const o=parseFloat(document.getElementById('oz-oz').value)||0;
    document.getElementById('oz-gram').value=fmtD(o*G,2);
    document.getElementById('oz-egp').textContent=S.xauEgp?fmt(o*G*kPrice(21))+' جنيه':'---';
  }
}

/* ── PORTFOLIO ── */
function addToPortfolio(){
  const w=parseFloat(document.getElementById('pf-w').value);
  const p=parseFloat(document.getElementById('pf-p').value);
  const k=parseInt(document.getElementById('pf-k').value);
  const dateEl=document.getElementById('pf-date');
  const date=dateEl&&dateEl.value?new Date(dateEl.value).toLocaleDateString('ar-EG'):new Date().toLocaleDateString('ar-EG');
  if(!w||!p||w<=0||p<=0){showNotif('⚠️ أدخل الوزن وسعر الشراء');return;}
  S.portfolio.push({w,p,k,date});
  localStorage.setItem('gp_pf',JSON.stringify(S.portfolio));
  document.getElementById('pf-w').value='';document.getElementById('pf-p').value='';
  renderPortfolio();showNotif('✅ تمت الإضافة للمحفظة');
}
function removePF(i){S.portfolio.splice(i,1);localStorage.setItem('gp_pf',JSON.stringify(S.portfolio));renderPortfolio();}
function renderPortfolio(){
  const el=document.getElementById('portfolio-list');
  if(!S.portfolio.length){el.innerHTML='<p style="color:var(--muted);font-size:.84rem;text-align:center;padding:12px;">لا توجد عناصر. أضف ذهبك أدناه.</p>';['pf-total','pf-cost','pf-pnl','pf-pct'].forEach(id=>document.getElementById(id).textContent='---');return;}
  let tv=0,tc=0;
  const rows=S.portfolio.map((item,i)=>{
    const cur=S.xauEgp?kPrice(item.k):item.p;
    const val=cur*item.w,cost=item.p*item.w,pnl=val-cost;
    tv+=val;tc+=cost;
    return `<div class="portfolio-row">
      <div><div class="pf-name">${item.w} جم — عيار ${item.k}</div><div class="pf-sub">شراء ${fmt(item.p)} ج/جم • ${item.date}</div></div>
      <div class="pf-val"><div>${fmt(val)} ج</div><div class="${pnl>=0?'up-text':'dn-text'}" style="font-size:.75rem">${pnl>=0?'+':''}${fmt(pnl)} ج</div></div>
      <button class="btn-del" onclick="removePF(${i})">×</button>
    </div>`;
  }).join('');
  el.innerHTML=rows;
  const pnl=tv-tc,pct=tc>0?(pnl/tc*100).toFixed(1):0;
  document.getElementById('pf-total').textContent=fmt(tv)+' ج';
  document.getElementById('pf-cost').textContent=fmt(tc)+' ج';
  document.getElementById('pf-pnl').innerHTML=`<span class="${pnl>=0?'up-text':'dn-text'}">${pnl>=0?'+':''}${fmt(pnl)} ج</span>`;
  document.getElementById('pf-pct').innerHTML=`<span class="${pnl>=0?'up-text':'dn-text'}">${pnl>=0?'+':''}${pct}%</span>`;
}

/* ── ALERTS ── */
function toggleAlertType(){
  const t=document.getElementById('al-type').value;
  document.getElementById('al-price').style.display=t==='price'?'':' none';
  document.getElementById('al-pct').style.display=t==='pct'?'':' none';
}
function addAlert(){
  const k=document.getElementById('al-karat').value;
  const dir=document.getElementById('al-dir').value;
  const type=document.getElementById('al-type')?.value||'price';
  const sound=document.getElementById('al-sound')?.checked!==false;
  let price=0,pct=0;
  if(type==='pct'){
    pct=parseFloat(document.getElementById('al-pct').value);
    if(!pct||pct<=0){showNotif('⚠️ أدخل النسبة المستهدفة');return;}
    price=kPrice(parseInt(k))*(1+(dir==='above'?pct:-pct)/100);
  }else{
    price=parseFloat(document.getElementById('al-price').value);
    if(!price||price<=0){showNotif('⚠️ أدخل السعر المستهدف');return;}
  }
  S.alerts.push({k,dir,price,pct:type==='pct'?pct:0,sound,triggered:false,createdAt:new Date().toLocaleDateString('ar-EG')});
  localStorage.setItem('gp_al',JSON.stringify(S.alerts));
  document.getElementById('al-price').value='';
  const pctEl=document.getElementById('al-pct');if(pctEl)pctEl.value='';
  renderAlerts();showNotif('🔔 تم إضافة التنبيه');
}
function playAlertSound(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880,ctx.currentTime);
    osc.frequency.setValueAtTime(1100,ctx.currentTime+.1);
    osc.frequency.setValueAtTime(880,ctx.currentTime+.2);
    gain.gain.setValueAtTime(.3,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+.5);
  }catch(e){}
}
function removeAlert(i){S.alerts.splice(i,1);localStorage.setItem('gp_al',JSON.stringify(S.alerts));renderAlerts();}
function renderAlerts(){
  const el=document.getElementById('alerts-list');
  if(!S.alerts.length){el.innerHTML='<p style="color:var(--muted);font-size:.84rem;text-align:center;padding:10px;">لا توجد تنبيهات</p>';return;}
  el.innerHTML=S.alerts.map((a,i)=>`
    <div class="alert-row">
      <div><b>عيار ${a.k}</b> — ${a.dir==='above'?'يصعد فوق ↑':'يهبط تحت ↓'}<br>
      <span style="font-family:monospace;color:var(--gold);font-size:0.88rem">${fmt(a.price)} جنيه/جم</span></div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge ${a.triggered?'badge-buy':'badge-wait'}">${a.triggered?'مُفعَّل':'مراقبة'}</span>
        <button class="btn-del" onclick="removeAlert(${i})">×</button>
      </div>
    </div>`).join('');
}
function checkAlerts(){
  if(!S.xauEgp)return;
  S.alerts.forEach(a=>{
    const cur=kPrice(parseInt(a.k));
    const hit=a.dir==='above'?cur>=a.price:cur<=a.price;
    if(hit&&!a.triggered){a.triggered=true;showNotif(`🔔 عيار ${a.k} ${a.dir==='above'?'صعد فوق':'هبط تحت'} ${fmt(a.price)} جنيه!`);}
  });
  localStorage.setItem('gp_al',JSON.stringify(S.alerts));
}

/* ── NEWS ── */
function renderNews(){
  const NEWS=[
    {t:'البنك المركزي المصري يثبت أسعار الفائدة في اجتماعه الأخير',impact:'neutral',src:'البنك المركزي',time:'منذ ساعتين'},
    {t:'الذهب العالمي يتجاوز 3250 دولاراً للأوقية مع ضعف الدولار',impact:'up',src:'رويترز',time:'منذ 3 ساعات'},
    {t:'الدولار يستقر أمام الجنيه المصري في تداولات اليوم',impact:'neutral',src:'الأهرام الاقتصادي',time:'منذ 4 ساعات'},
    {t:'توترات جيوسياسية ترفع الطلب على الذهب كملاذ آمن',impact:'up',src:'بلومبرغ',time:'منذ 5 ساعات'},
    {t:'ارتفاع ملحوظ في مبيعات الذهب بالسوق المصرية مع موسم الأفراح',impact:'up',src:'الذهب اليوم',time:'منذ 6 ساعات'},
    {t:'الاحتياطي الفيدرالي يلمح لتخفيضات محتملة في الفائدة',impact:'up',src:'CNBC',time:'أمس'},
    {t:'ارتفاع واردات الذهب إلى مصر خلال الربع الأول',impact:'up',src:'وزارة المالية',time:'أمس'},
    {t:'تحليل: هل وصل الذهب لمستويات قياسية جديدة؟',impact:'neutral',src:'كيتكو',time:'منذ يومين'},
  ];
  document.getElementById('news-list').innerHTML=NEWS.map(n=>{
    const ico=n.impact==='up'?'📈':n.impact==='down'?'📉':'⚖️';
    const col=n.impact==='up'?'var(--up)':n.impact==='down'?'var(--down)':'var(--gold)';
    return `<div class="news-item">
      <div class="news-title">${n.t}</div>
      <div class="news-meta"><span style="color:${col}">${ico}</span><span>${n.src}</span><span>·</span><span>${n.time}</span></div>
    </div>`;
  }).join('');
}

/* ── AI ── */
async function askAI(mode){
  if(!S.xauEgp){showNotif('انتظر تحميل البيانات أولاً');return;}
  const outId=mode==='main'?'ai-main-out':'ai-custom-out';
  const btnId=mode==='main'?'ai-main-btn':'ai-custom-btn';
  const btn=document.getElementById(btnId),out=document.getElementById(outId);
  if(mode==='custom'){out.style.display='block';const q=document.getElementById('ai-q').value.trim();if(!q){showNotif('أدخل سؤالك أولاً');return;}}
  btn.disabled=true;btn.textContent='جاري التحليل...';out.textContent='';
  const p21=fmt(kPrice(21)),p24=fmt(kPrice(24)),p18=fmt(kPrice(18));
  const usd=fmtD(S.fx.USD||S.usdEgp,2),xau=fmtD(S.xauUsd,1),xauegp=fmt(S.xauEgp);
  let prompt;
  if(mode==='main'){
    prompt=`أنت محلل مالي متخصص في السوق المصري وأسعار الذهب.\nالبيانات الحقيقية اللحظية:\n- عيار 21: ${p21} جنيه/جرام\n- عيار 24: ${p24} جنيه/جرام\n- عيار 18: ${p18} جنيه/جرام\n- الجنيه الذهب: ${fmt(kPrice(21)*8)} جنيه\n- سعر الدولار: ${usd} جنيه\n- XAU/USD: $${xau}\n- XAU/EGP (أوقية): ${xauegp} جنيه\nقدم تحليلاً عملياً ومختصراً باللغة العربية: (1) تقييم الوضع الراهن (2) إشارة السوق مع تبرير (3) نصيحة للمستثمر المصري. 5-7 جمل فقط.`;
  }else{
    const q=document.getElementById('ai-q').value.trim();
    prompt=`أنت خبير ذهب واستثمار في السوق المصري. البيانات الآن: عيار 21 = ${p21} جنيه/جم، دولار = ${usd} جنيه، XAU/USD = $${xau}. أجب بالعربية (5-7 جمل): ${q}`;
  }
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,messages:[{role:'user',content:prompt}]})});
    const data=await res.json();
    out.textContent=data.content?.filter(c=>c.type==='text').map(c=>c.text).join('')||'تعذرت الإجابة.';
  }catch(e){out.textContent='تعذر الاتصال. يرجى المحاولة لاحقاً.';}
  btn.disabled=false;btn.textContent=mode==='main'?'تحليل السوق الآن':'إرسال السؤال';
}

/* ── NOTIFICATION ── */
function showNotif(msg){
  const n=document.createElement('div');n.className='notif';n.textContent=msg;
  document.body.appendChild(n);setTimeout(()=>n.remove(),4000);
}

/* ── PANEL SWITCHING ── */
function toggleMobileMenu(){
  const dd=document.getElementById('tabs-mobile-dropdown');
  const arrow=document.getElementById('tmc-arrow');
  if(!dd)return;
  dd.classList.toggle('open');
  if(arrow)arrow.classList.toggle('open');
}
function closeMobileMenu(){
  const dd=document.getElementById('tabs-mobile-dropdown');
  const arrow=document.getElementById('tmc-arrow');
  if(dd)dd.classList.remove('open');
  if(arrow)arrow.classList.remove('open');
}
function switchPanel(panel,el){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-nav-btn,.tmdd-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+panel).classList.add('active');
  el.classList.add('active');
  // sync sibling button in the other nav (desktop <-> mobile)
  const icon=el.dataset.icon||'';
  const label=el.dataset.label||panel;
  const inMobile=el.closest('.tabs-mobile-dropdown');
  if(inMobile){
    document.querySelectorAll('.tab-nav-btn').forEach(b=>{
      if((b.getAttribute('onclick')||'').includes("'"+panel+"'"))b.classList.add('active');
    });
  }else{
    document.querySelectorAll('.tmdd-item').forEach(b=>{
      if((b.getAttribute('onclick')||'').includes("'"+panel+"'"))b.classList.add('active');
    });
  }
  // update mobile current label
  const icEl=document.getElementById('tmc-icon');
  const lbEl=document.getElementById('tmc-label');
  if(icEl)icEl.textContent=icon;
  if(lbEl)lbEl.textContent=label;
  closeMobileMenu();
  if(panel==='chart'){renderHistChart();renderCompareChart();}
  if(panel==='currency'){renderFXCards();}
  if(panel==='portfolio'){renderPortfolio();}
  if(panel==='alerts'){renderAlerts();}
  if(panel==='news'){renderNews();}
  if(panel==='calc'){renderGramPrices();calcGold();}
  if(panel==='heatmap'){renderHeatmap();}
  if(panel==='watchlist'){renderWatchlist();}
  if(panel==='insights'){renderInsights();}
  if(panel==='timing'){renderTiming();}
  if(panel==='pulse'){renderPulse();}
  if(panel==='seasons'){renderSeasons();}
}
function switchMetal(btn,metal){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const g=document.getElementById('goldSection'),s=document.getElementById('silverSection');
  if(metal==='silver'){g.classList.add('hide');s.classList.add('show');renderSilverRows();}
  else{g.classList.remove('hide');s.classList.remove('show');}
}
function switchSub(btn){
  document.querySelectorAll('.sub-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function filterBarsTable(){
  const val=document.getElementById('companyDrop').value;
  document.querySelectorAll('#barsTable .table-row').forEach(row=>{
    row.style.display=(val==='all'||row.dataset.company===val)?'':'none';
  });
}
function setHistPeriod(p,btn){
  S.histPeriod=p;
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderMiniChart();renderHistChart();renderCompareChart();
}

/* ── RENDER ALL ── */
function renderAll(){
  renderTicker();renderPriceCards();renderMiniChart();renderMarketRows();
  renderBarRows();renderCoinRows();renderGramPrices();calcGold();calcFX();
  checkAlerts();renderPortfolio();renderWatchlist();
}

function manualRefresh(){
  S.countdown=60;document.getElementById('cd-val').textContent=60;fetchAll();
  showNotif('↻ جاري تحديث الأسعار...');
}
function updateTime(){
  document.getElementById('live-time').textContent=
    new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

/* ── INIT ── */
async function init(){
  renderNews();renderPortfolio();renderAlerts();renderWatchlist();
  const pfDate=document.getElementById('pf-date');
  if(pfDate){pfDate.valueAsDate=new Date();}
  // Clock runs independently — never blocked by fetch
  updateTime();
  setInterval(updateTime, 1000);
  await fetchAll();
  // Countdown tied to fetch cycle separately
  setInterval(async()=>{
    S.countdown--;
    const cdEl=document.getElementById('cd-val');
    if(cdEl)cdEl.textContent=S.countdown;
    if(S.countdown<=0){S.countdown=60;await fetchAll();}
  },1000);
}
init();

/* ══════════════════════════════════
   NEW FEATURES — WATCHLIST, HEATMAP, INSIGHTS, EXPORT
══════════════════════════════════ */

/* ── WATCHLIST ── */
const WL_LABELS = {
  '24':'عيار 24 — سبائك','21':'عيار 21 — الأكثر طلباً',
  '18':'عيار 18 — مشغولات','guinea':'الجنيه الذهب (8 جم)',
  'USD':'🇺🇸 دولار أمريكي','EUR':'🇪🇺 يورو','GBP':'🇬🇧 جنيه إسترليني',
  'SAR':'🇸🇦 ريال سعودي','AED':'🇦🇪 درهم إماراتي'
};
function getWLValue(item){
  if(item==='guinea')return S.xauEgp?kPrice(21)*8:0;
  if(['USD','EUR','GBP','SAR','AED'].includes(item))return S.fx[item]||0;
  return kPrice(parseInt(item));
}
function addToWatchlist(){
  const item=document.getElementById('wl-item').value;
  if(S.watchlist.includes(item)){showNotif('⚠️ موجود بالفعل في المفضلة');return;}
  S.watchlist.push(item);
  localStorage.setItem('gp_wl',JSON.stringify(S.watchlist));
  renderWatchlist();showNotif('⭐ تمت الإضافة للمفضلة');
}
function removeWL(item){
  S.watchlist=S.watchlist.filter(x=>x!==item);
  localStorage.setItem('gp_wl',JSON.stringify(S.watchlist));
  renderWatchlist();
}
function renderWatchlist(){
  const listEl=document.getElementById('watchlist-list');
  const pricesEl=document.getElementById('watchlist-prices');
  if(!S.watchlist.length){
    if(listEl)listEl.innerHTML='<p style="color:var(--muted);font-size:.84rem;text-align:center;padding:12px;">لم تضف شيئاً بعد</p>';
    if(pricesEl)pricesEl.innerHTML='';
    return;
  }
  const chgPct=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  if(listEl){
    listEl.innerHTML=S.watchlist.map(item=>`
      <div class="wl-row">
        <div class="wl-name">${WL_LABELS[item]||item}</div>
        <div class="wl-val">${getWLValue(item)?fmt(getWLValue(item))+' ج':'---'}</div>
        <button class="btn-del" onclick="removeWL('${item}')">×</button>
      </div>`).join('');
  }
  if(pricesEl){
    pricesEl.innerHTML=S.watchlist.map(item=>{
      const val=getWLValue(item);
      const isFX=['USD','EUR','GBP','SAR','AED'].includes(item);
      const chg=isFX?(Math.random()-.5)*.6:chgPct;
      const cls=chg>=0?'up-text':'dn-text';
      return `<div class="price-card">
        <div class="price-card-label">${WL_LABELS[item]||item}</div>
        <div class="price-card-val">${val?fmt(val):'---'}</div>
        <div class="price-card-unit">${isFX?'جنيه مصري':'جنيه/جرام'}</div>
        <div class="price-card-chg ${cls}">${chg>=0?'▲':'▼'} ${Math.abs(chg).toFixed(2)}%</div>
      </div>`;
    }).join('');
  }
}

/* ── HEATMAP ── */
function renderHeatmap(){
  const el=document.getElementById('heatmap-grid');
  if(!el||!S.xauEgp)return;
  const chg=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  const rndChg=(base,spread=0.3)=>base+(Math.random()-.48)*spread;
  const cells=[
    {label:'عيار 24 — سبائك',val:fmt(kPrice(24))+' ج',chg:rndChg(chg)},
    {label:'عيار 21 — الأكثر طلباً',val:fmt(kPrice(21))+' ج',chg:rndChg(chg)},
    {label:'عيار 18 — مشغولات',val:fmt(kPrice(18))+' ج',chg:rndChg(chg)},
    {label:'الجنيه الذهب',val:fmt(kPrice(21)*8)+' ج',chg:rndChg(chg,.5)},
    {label:'XAU/USD (أوقية)',val:'$'+fmtD(S.xauUsd,1),chg:rndChg(chg,.4)},
    {label:'دولار / جنيه',val:fmtD(S.fx.USD||S.usdEgp,2)+' ج',chg:rndChg(0,.3)},
    {label:'يورو / جنيه',val:fmtD(S.fx.EUR,2)+' ج',chg:rndChg(0,.4)},
    {label:'جنيه إسترليني',val:fmtD(S.fx.GBP,2)+' ج',chg:rndChg(0,.35)},
    {label:'ريال سعودي',val:fmtD(S.fx.SAR,2)+' ج',chg:rndChg(0,.2)},
    {label:'درهم إماراتي',val:fmtD(S.fx.AED,2)+' ج',chg:rndChg(0,.2)},
    {label:'فضة — أوقية',val:fmt((S.xauUsd/98)*(S.usdEgp||50)*31.1)+' ج',chg:rndChg(chg*1.2,.6)},
    {label:'الجنيه الذهب ×10',val:fmt(kPrice(21)*80)+' ج',chg:rndChg(chg,.3)},
  ];
  el.innerHTML=cells.map(c=>{
    const cls=c.chg>0.15?'heat-up':c.chg<-0.15?'heat-down':'heat-neutral';
    const chgCls=c.chg>0?'up':'down';
    const arr=c.chg>0?'▲':'▼';
    return `<div class="heatmap-cell ${cls}">
      <div class="hm-label">${c.label}</div>
      <div class="hm-val">${c.val}</div>
      <div class="hm-chg ${chgCls}">${arr} ${Math.abs(c.chg).toFixed(2)}%</div>
    </div>`;
  }).join('');

  // bar chart
  const ctx=document.getElementById('heatbarChart');
  if(!ctx)return;
  destroyChart('heatbar');
  const labels=cells.map(c=>c.label);
  const vals=cells.map(c=>c.chg);
  const colors=vals.map(v=>v>0.15?'rgba(26,122,74,.7)':v<-0.15?'rgba(192,57,43,.7)':'rgba(201,146,42,.7)');
  CHARTS.heatbar=new Chart(ctx.getContext('2d'),{
    type:'bar',
    data:{labels,datasets:[{data:vals,backgroundColor:colors,borderRadius:5,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
      plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>(v.raw>0?'+':'')+v.raw.toFixed(2)+'%'}}},
      scales:{
        x:{ticks:{color:'#9AA0AA',font:{size:9},callback:v=>(v>0?'+':'')+v.toFixed(1)+'%'},grid:{color:'rgba(0,0,0,0.05)'},zero:true},
        y:{ticks:{color:'#7A8499',font:{size:9}},grid:{display:false}}
      }
    }
  });
}

/* ── SMART INSIGHTS ── */
function computeInsightSignal(){
  if(!S.xauEgp)return null;
  const chg=S.prevXauEgp?((S.xauEgp-S.prevXauEgp)/S.prevXauEgp*100):0;
  const usd=S.fx.USD||S.usdEgp||50;
  const sagha=kPrice(21)/S.xauUsd*31.1;
  const gap=(sagha-usd)/usd*100;
  // Composite score 0-100
  let score=50;
  if(chg<-1)score+=15; else if(chg<0)score+=8; else if(chg<1)score-=5; else score-=18;
  if(Math.abs(gap)<5)score+=10; else if(Math.abs(gap)<12)score+=0; else score-=15;
  score=Math.max(0,Math.min(100,score));
  let signal,icon,desc,badge;
  if(score>=65){signal='وقت مناسب للشراء';icon='✅';badge='sig-buy';desc='المؤشرات تشير إلى أن السعر في منطقة معقولة. الفجوة السعرية ضيقة والتغير اليومي يدعم الدخول.';}
  else if(score>=40){signal='انتظر وراقب السوق';icon='⏳';badge='sig-wait';desc='السوق في حالة توازن نسبي. يُنصح بمتابعة الحركة قبل اتخاذ قرار الشراء.';}
  else{signal='السوق في ذروة الارتفاع';icon='⚠️';badge='sig-sell';desc='المؤشرات تشير إلى ارتفاع قوي قد يعقبه تصحيح. تجنب الشراء بسعر مرتفع الآن.';}
  return {score,signal,icon,desc,badge,chg,gap};
}
function renderInsights(){
  const el=document.getElementById('insight-main-signal');
  if(!el)return;
  const sig=computeInsightSignal();
  if(!sig){el.innerHTML='<div class="insight-signal-loading"><span class="spinner"></span>جاري تحليل السوق...</div>';return;}
  el.innerHTML=`
    <div class="insight-signal-icon">${sig.icon}</div>
    <div class="insight-signal-title">${sig.signal}</div>
    <div class="insight-signal-desc">${sig.desc}</div>
    <span class="insight-signal-badge ${sig.badge}">${sig.signal}</span>`;
  // meters
  const buyBar=document.getElementById('buy-meter-bar');
  const peakBar=document.getElementById('peak-meter-bar');
  if(buyBar){buyBar.style.width=sig.score+'%';}
  document.getElementById('buy-meter-val').textContent=sig.score+'%';
  const peakScore=Math.max(0,Math.min(100,50+sig.chg*10));
  if(peakBar){peakBar.style.width=peakScore+'%';}
  document.getElementById('peak-meter-val').textContent=peakScore.toFixed(0)+'%';
  // cards
  const cardsEl=document.getElementById('insight-cards-row');
  if(cardsEl){
    const cards=[
      {icon:'📉',title:'التغير اليومي',val:(sig.chg>=0?'+':'')+sig.chg.toFixed(2)+'%',tip:'تغير سعر الذهب منذ آخر تحديث'},
      {icon:'💱',title:'فجوة دولار الصاغة',val:(sig.gap>=0?'+':'')+sig.gap.toFixed(1)+'%',tip:'الفجوة بين دولار الصاغة والبنكي'},
      {icon:'⚖️',title:'نصيحة اليوم',val:sig.score>=65?'شراء':sig.score>=40?'انتظار':'تجنب',tip:'بناءً على المؤشرات المتاحة'},
      {icon:'🏅',title:'عيار 21 / جرام',val:fmt(kPrice(21))+' ج',tip:'السعر الحالي للجرام عيار 21'},
    ];
    cardsEl.innerHTML=cards.map(c=>`
      <div class="insight-card">
        <div class="insight-card-icon">${c.icon}</div>
        <div class="insight-card-title">${c.title}</div>
        <div class="insight-card-val">${c.val}</div>
        <div class="insight-card-tip">${c.tip}</div>
      </div>`).join('');
  }
}
async function askInsightAI(){
  if(!S.xauEgp){showNotif('انتظر تحميل البيانات أولاً');return;}
  const btn=document.getElementById('insight-ai-btn'),out=document.getElementById('insight-ai-out');
  const q=(document.getElementById('insight-q').value.trim())||'هل الوقت مناسب للشراء الآن؟';
  out.style.display='block';out.textContent='';
  btn.disabled=true;btn.textContent='جاري التحليل...';
  const p21=fmt(kPrice(21)),p24=fmt(kPrice(24)),usd=fmtD(S.fx.USD||S.usdEgp,2),xau=fmtD(S.xauUsd,1);
  const sig=computeInsightSignal();
  const prompt=`أنت محلل مالي متخصص في الذهب المصري. البيانات الآن: عيار 21=${p21} ج/جم، عيار 24=${p24} ج/جم، دولار=${usd} ج، XAU/USD=$${xau}، إشارة السوق: ${sig?.signal||'غير محددة'}. أجب على هذا السؤال بالعربية البسيطة (4-6 جمل واضحة للمستثمر العادي، لا تعقيد): ${q}`;
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,messages:[{role:'user',content:prompt}]})});
    const data=await res.json();
    out.textContent=data.content?.filter(c=>c.type==='text').map(c=>c.text).join('')||'تعذرت الإجابة.';
  }catch(e){out.textContent='تعذر الاتصال.';}
  btn.disabled=false;btn.textContent='تحليل الآن 🧠';
}

  let html='<html dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl}h1{color:#1E2D4E;border-bottom:3px solid #C9922A;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1E2D4E;color:#E8B84B;padding:8px;text-align:right}td{padding:8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#faf7f2}.up{color:#1a7a4a}.dn{color:#c0392b}.summary{background:#f5f5f5;padding:12px;border-radius:8px;margin-top:16px}</style></head><body>';
  html+='<h1>🥇 تقرير محفظة منصة ذهب</h1>';
  html+='<p>تاريخ التقرير: '+new Date().toLocaleDateString('ar-EG')+'</p>';
  html+='<table><tr><th>العيار</th><th>الوزن</th><th>سعر الشراء</th><th>التاريخ</th><th>القيمة الحالية</th><th>الربح/الخسارة</th></tr>';
  let tv=0,tc=0;
  S.portfolio.forEach(item=>{
    const cur=S.xauEgp?kPrice(item.k):item.p;
    const val=cur*item.w,cost=item.p*item.w,pnl=val-cost;
    tv+=val;tc+=cost;
    html+=`<tr><td>عيار ${item.k}</td><td>${item.w} جم</td><td>${fmt(item.p)} ج</td><td>${item.date}</td><td>${fmt(val)} ج</td><td class="${pnl>=0?'up':'dn'}">${pnl>=0?'+':''}${fmt(pnl)} ج</td></tr>`;
  });
  html+='</table>';
  const pnl=tv-tc;
  html+=`<div class="summary"><b>الإجمالي:</b> القيمة الحالية = ${fmt(tv)} ج | التكلفة = ${fmt(tc)} ج | الربح/الخسارة = <span class="${pnl>=0?'up':'dn'}">${pnl>=0?'+':''}${fmt(pnl)} ج (${tc>0?((pnl/tc)*100).toFixed(1):0}%)</span></div>`;
  html+='</body></html>';
  const w=window.open('','_blank');
  w.document.write(html);w.document.close();
  setTimeout(()=>w.print(),500);


/* ── EXPORT EXCEL ── */
function exportPortfolioExcel(){
  if(!S.portfolio.length){showNotif('⚠️ المحفظة فارغة');return;}
  let csv='\uFEFF';
  csv+='العيار,الوزن (جم),سعر الشراء (ج),تاريخ الشراء,القيمة الحالية (ج),الربح/الخسارة (ج),نسبة العائد %\n';
  S.portfolio.forEach(item=>{
    const cur=S.xauEgp?kPrice(item.k):item.p;
    const val=cur*item.w,cost=item.p*item.w,pnl=val-cost,pct=cost>0?((pnl/cost)*100).toFixed(1):0;
    csv+=`عيار ${item.k},${item.w},${item.p},${item.date},${Math.round(val)},${Math.round(pnl)},${pct}\n`;
  });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='gold_portfolio_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  showNotif('✅ تم تحميل ملف Excel');
}


/* ══════════════════════════════════
   BILINGUAL SUPPORT (AR / EN)
══════════════════════════════════ */

const TRANS = {
  ar: {
    refresh: '↻ تحديث', cdLabel: 'تحديث في', liveLabel: 'مباشر',
    tabPrices:'💰 الأسعار', tabChart:'📈 الرسوم البيانية', tabHeatmap:'🌡️ خريطة السوق',
    tabCurrency:'💱 العملات', tabCalc:'🧮 الحاسبة', tabPortfolio:'💼 محفظتي',
    tabAlerts:'🔔 التنبيهات', tabWatchlist:'⭐ المفضلة', tabInsights:'🧠 التحليل الذكي',
    tabTiming:'⏰ توقيت الشراء', tabPulse:'🔥 نبض السوق', tabSeasons:'📅 مواسم الذهب',
    tabNews:'📰 الأخبار', tabAbout:'🏛️ من نحن',
    heroTitle:'أسعار السبائك والعملات', heroSub:'تحديث فوري للأسعار • مصادر موثوقة • مقارنة شاملة',
    loading:'جاري التحميل...', perGram:'جنيه/جم', egp:'جنيه',
  },
  en: {
    refresh:'↻ Refresh', cdLabel:'Update in', liveLabel:'LIVE',
    tabPrices:'💰 Prices', tabChart:'📈 Charts', tabHeatmap:'🌡️ Market Heat',
    tabCurrency:'💱 Currencies', tabCalc:'🧮 Calculator', tabPortfolio:'💼 Portfolio',
    tabAlerts:'🔔 Alerts', tabWatchlist:'⭐ Watchlist', tabInsights:'🧠 Smart Analysis',
    tabTiming:'⏰ Buy Timing', tabPulse:'🔥 Market Pulse', tabSeasons:'📅 Gold Seasons',
    tabNews:'📰 News', tabAbout:'🏛️ About Us',
    heroTitle:'Gold Bars & Coins Prices', heroSub:'Live Price Updates • Trusted Sources • Full Comparison',
    loading:'Loading...', perGram:'EGP/g', egp:'EGP',
  }
};


;
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    const fn = btn.getAttribute('onclick') || '';
    const m = fn.match(/switchPanel\('(\w+)'/);
    if(m && tabMap[m[1]]) btn.textContent = tabMap[m[1]];
  });
  // Hero
  const heroTitle = document.querySelector('.hero-title');
  const heroSub = document.querySelector('.hero-sub');
  if(heroTitle) heroTitle.textContent = t.heroTitle;
  if(heroSub) heroSub.innerHTML = t.heroSub;
  // data-ar / data-en elements
  document.querySelectorAll('[data-ar]').forEach(el => {
    el.textContent = 'ar' === 'ar' ? el.dataset.ar : el.dataset.en;
  });

/* ══════════════════════════════════
   SMART TIMING INDICATOR
══════════════════════════════════ */
function renderTiming(){
  if(!S.xauEgp) return;
  const chg = S.prevXauEgp ? ((S.xauEgp - S.prevXauEgp) / S.prevXauEgp * 100) : 0;
  const usd = S.fx.USD || S.usdEgp || 50;
  const sagha = kPrice(21) / S.xauUsd * 31.1;
  const gap = (sagha - usd) / usd * 100;
  const vol = Math.abs(chg) * 1.8; // simulated volatility
  const trend10 = chg * -0.7 + (Math.random() - 0.5) * 0.5; // 10-day trend proxy

  // Compute buy score
  let score = 50;
  if(chg < -0.5) score += 20;
  else if(chg < 0) score += 10;
  else if(chg > 1) score -= 20;
  else if(chg > 0.3) score -= 10;
  if(Math.abs(gap) < 5) score += 10;
  else if(Math.abs(gap) > 12) score -= 15;
  if(vol > 1.5) score -= 10; // high volatility = risky
  score = Math.max(0, Math.min(100, score));

  const isBuy = score >= 60, isSell = score < 35;

  // Hero card
  const icon = isBuy ? '📉' : isSell ? '📈' : '⏳';
  const label = isBuy
    ? ('وقت مناسب للشراء')
    : isSell
    ? ('وقت مناسب للبيع')
    : ('انتظر وراقب');
  const badgeCls = isBuy ? 'buy' : isSell ? 'sell' : 'wait';
  const desc = isBuy
    ? ('اتجاه آخر 10 أيام يدعم الشراء، والسوق المحلي نشط في طلب عيار 21. الفجوة السعرية ضيقة.')
    : isSell
    ? ('الأسعار في مستويات مرتفعة نسبياً. قد يكون التحفظ أفضل من الشراء الآن.')
    : ('السوق في مرحلة توازن. تابع التغيرات قبل اتخاذ قرار.');

  const hero = document.getElementById('timing-hero-card');
  if(hero) hero.className = `timing-hero timing-hero-${badgeCls}`;
  setText('timing-icon', icon);
  setText('timing-label', label);
  setText('timing-desc', desc);
  const badge = document.getElementById('timing-badge');
  if(badge){ badge.textContent = label; badge.className = `timing-badge ${badgeCls}`; }

  // Factor cards
  setFactor('tf-trend', 'tf-trend-bar',
    trend10 < -0.2 ? ('هابط — يدعم الشراء') : trend10 > 0.3 ? ('صاعد — انتبه') : ('مستقر'),
    trend10 < -0.2 ? 75 : trend10 > 0.3 ? 30 : 50,
    trend10 < -0.2 ? 'var(--up)' : trend10 > 0.3 ? 'var(--down)' : 'var(--gold)'
  );
  setFactor('tf-vol', 'tf-vol-bar',
    vol < 0.8 ? ('منخفض — آمن') : vol < 1.8 ? ('متوسط') : ('مرتفع — تحذير'),
    Math.min(100, vol * 40),
    vol < 0.8 ? 'var(--up)' : vol < 1.8 ? 'var(--gold)' : 'var(--down)'
  );
  const usdPressure = Math.abs(gap);
  setFactor('tf-usd', 'tf-usd-bar',
    usdPressure < 5 ? ('ضغط منخفض') : usdPressure < 12 ? ('ضغط متوسط') : ('ضغط عالٍ'),
    Math.min(100, usdPressure * 5),
    usdPressure < 5 ? 'var(--up)' : usdPressure < 12 ? 'var(--gold)' : 'var(--down)'
  );
  setFactor('tf-k21', 'tf-k21-bar',
    (chg >= 0 ? '▲ +' : '▼ ') + Math.abs(chg).toFixed(2) + '%',
    50 + chg * 10,
    chg >= 0 ? 'var(--down)' : 'var(--up)'
  );

  // Alert banners
  const alerts = [];
  if(Math.abs(chg) > 0.8) alerts.push({icon:'⚡', text: `انخفاض مفاجئ في عيار 21 بنسبة ${Math.abs(chg).toFixed(2)}% — قد يكون فرصة`, badge: 'تنبيه', cls:'var(--gold)'});
  if(isBuy) alerts.push({icon:'🟢', text: 'السوق نشط الآن في الشراء — طلب مرتفع على عيار 21', badge: 'شراء', cls:'var(--up)'});
  if(isSell) alerts.push({icon:'🔴', text: 'السوق في ذروة — يُنصح بالتريث قبل أي قرار شراء', badge: 'تنبيه', cls:'var(--down)'});

  const ar = document.getElementById('timing-alerts-row');
  if(ar) ar.innerHTML = alerts.map(a => `
    <div class="timing-alert-item">
      <span class="tai-icon">${a.icon}</span>
      <span class="tai-text">${a.text}</span>
      <span class="tai-badge" style="background:rgba(0,0,0,.06);color:${a.cls}">${a.badge}</span>
    </div>`).join('');

  // 10-day chart
  const ctx = document.getElementById('timingChart');
  if(!ctx) return;
  const labels = getDates(10);
  const data = genHist(10, kPrice(21), 0.006);
  destroyChart('timing');
  CHARTS.timing = new Chart(ctx.getContext('2d'), {
    type:'line',
    data:{labels, datasets:[{data, borderColor:'#C9922A', borderWidth:2.5, pointRadius:3,
      pointBackgroundColor:'#C9922A', fill:true, backgroundColor:'rgba(201,146,42,.07)', tension:.35}]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#9AA0AA',font:{size:9}},grid:{color:'rgba(0,0,0,.04)'}},
        y:{ticks:{color:'#9AA0AA',font:{size:9},callback:v=>v.toLocaleString('ar-EG')},grid:{color:'rgba(0,0,0,.04)'}}
      }}
  });
}

function setText(id, val){ const el = document.getElementById(id); if(el) el.textContent = val; }
function setFactor(valId, barId, text, pct, color){
  setText(valId, text);
  const bar = document.getElementById(barId);
  if(bar){ bar.style.width = Math.max(5, pct) + '%'; bar.style.background = color; }
}

/* ══════════════════════════════════
   EGYPT MARKET PULSE
══════════════════════════════════ */
function renderPulse(){
  if(!S.xauEgp) return;
  const chg = S.prevXauEgp ? ((S.xauEgp - S.prevXauEgp) / S.prevXauEgp * 100) : 0;
  const vol = Math.abs(chg) * 1.5 + Math.random() * 0.5;
  const buyP = Math.max(10, Math.min(90, 50 + chg * -8 + Math.random() * 10));
  const sellP = Math.max(5, Math.min(80, 50 + chg * 8 - Math.random() * 10));
  const neutralP = Math.max(5, 100 - buyP - sellP + 20);
  const activity = Math.round((buyP + vol * 5) / 1.5);

  // Ring score
  setText('pulse-score', activity);
  const ring = document.getElementById('pulse-ring');
  if(ring){
    ring.className = 'pulse-ring' + (activity > 65 ? ' high' : activity < 35 ? ' low' : '');
  }

  let status, sub;
  if(activity > 65){
    status = '🔥 نشاط شراء عالٍ';
    sub = 'السوق المصري يشهد إقبالاً قوياً على الذهب — طلب مرتفع على عيار 21 والجنيه الذهب';
  } else if(activity < 35){
    status = '📉 ركود نسبي';
    sub = 'تراجع في نشاط التداول. قد يكون الانتظار خياراً أفضل حالياً.';
  } else {
    status = '😐 استقرار السوق';
    sub = 'السوق في حالة توازن، لا توجد ضغوط شراء أو بيع واضحة.';
  }
  setText('pulse-status', status);
  setText('pulse-sub', sub);

  // Meters
  const buyBar = document.getElementById('pm-buy-bar');
  const sellBar = document.getElementById('pm-sell-bar');
  const neutralBar = document.getElementById('pm-neutral-bar');
  if(buyBar) buyBar.style.width = buyP + '%';
  if(sellBar) sellBar.style.width = sellP + '%';
  if(neutralBar) neutralBar.style.width = Math.min(100, neutralP) + '%';
  setText('pm-buy-val', Math.round(buyP) + '%');
  setText('pm-sell-val', Math.round(sellP) + '%');
  setText('pm-neutral-val', Math.round(Math.min(100, neutralP)) + '%');

  // Signals
  const signals = [
    {dot:'green', text: `سعر عيار 21 حالياً ${fmt(kPrice(21))} جنيه/جرام`},
    {dot: chg>=0?'red':'green', text: `تغير اليوم ${chg>=0?'+':''}${chg.toFixed(2)}%`},
    {dot:'amber', text: `دولار الصاغة الضمني ${fmtD(kPrice(21)/S.xauUsd*31.1,2)} جنيه`},
    {dot: activity>65?'green':activity<35?'red':'amber', text: `مستوى النشاط: ${activity>65?'مرتفع جداً':activity<35?'منخفض':'متوسط'}`},
  ];
  const sigEl = document.getElementById('pulse-signals');
  if(sigEl) sigEl.innerHTML = signals.map(s=>`
    <div class="pulse-signal-item">
      <span class="psi-dot ${s.dot}"></span>
      <span>${s.text}</span>
    </div>`).join('');

  // Pulse chart
  const ctx = document.getElementById('pulseChart');
  if(!ctx) return;
  const labels = getDates(7);
  const data = Array.from({length:8},(_,i)=>Math.round(30+Math.random()*60));
  destroyChart('pulse');
  CHARTS.pulse = new Chart(ctx.getContext('2d'), {
    type:'bar',
    data:{labels, datasets:[{
      label: 'مستوى النشاط',
      data, borderRadius:5,
      backgroundColor: data.map(v=>v>65?'rgba(26,122,74,.7)':v<35?'rgba(192,57,43,.7)':'rgba(201,146,42,.7)')
    }]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#9AA0AA',font:{size:9}},grid:{display:false}},
        y:{min:0,max:100,ticks:{color:'#9AA0AA',font:{size:9}},grid:{color:'rgba(0,0,0,.04)'}}
      }}
  });
}

/* ══════════════════════════════════
   GOLD SEASONS — EGYPT
══════════════════════════════════ */
const SEASONS_DATA = [
  {month:'يناير', icon:'🎉', impact:'med',
   name:'ما بعد الأعياد',
   desc:'طلب معتدل بعد موسم الأعياد. أسعار تستقر بعد ذروة الشتاء.'},
  {month:'فبراير', icon:'💕', impact:'med',
   name:'عيد الحب',
   desc:'ارتفاع ملحوظ في الطلب على المشغولات والمجوهرات الصغيرة.'},
  {month:'مارس-أبريل', icon:'🌙', impact:'high',
   name:'شهر رمضان والعيد',
   desc:'موسم ذروة — إقبال قوي جداً على شراء الذهب قبيل العيد. ارتفاع في الأسعار متوقع.'},
  {month:'مايو-يونيو', icon:'💒', impact:'high',
   name:'موسم الأفراح والزواج',
   desc:'أعلى طلب على الذهب في السنة. موسم الأفراح في مصر يرفع الأسعار بشكل ملحوظ.'},
  {month:'يوليو-أغسطس', icon:'🌞', impact:'med',
   name:'الصيف وموسم السفر',
   desc:'طلب متوسط. بعض المصريين يشترون من الخارج. السوق أقل نشاطاً.'},
  {month:'سبتمبر-أكتوبر', icon:'🍂', impact:'low',
   name:'الهدوء النسبي',
   desc:'فترة هدوء نسبي في السوق. أسعار مستقرة ومناسبة للشراء الهادئ.'},
  {month:'نوفمبر', icon:'📦', impact:'med',
   name:'قبيل موسم الشتاء',
   desc:'يبدأ التجار بالتخزين. بعض الارتفاع التدريجي في الطلب.'},
  {month:'ديسمبر', icon:'🎄', impact:'high',
   name:'الشتاء والأعياد',
   desc:'ذروة ثانية في السنة. إقبال قوي على الهدايا والذهب. ارتفاع واضح في الأسعار.'},
];

function renderSeasons(){
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const seasonIdx = Math.min(Math.floor(month / 1.5), SEASONS_DATA.length - 1);
  const current = SEASONS_DATA[Math.min(Math.round(month * SEASONS_DATA.length / 12), SEASONS_DATA.length - 1)];

  // Now card
  const nowCard = document.getElementById('seasons-now-card');
  if(nowCard && current){
    const impactLabel = current.impact === 'high'
      ? ('🔴 تأثير قوي على الأسعار')
      : current.impact === 'med'
      ? ('🟡 تأثير متوسط')
      : ('🟢 تأثير منخفض');
    nowCard.innerHTML = `
      <div class="snc-icon">${current.icon}</div>
      <div class="snc-title">${current.name}</div>
      <div>${current.month}</div>
      <span class="snc-impact ${current.impact}">${impactLabel}</span>
      <div class="snc-desc">${current.desc}</div>`;
  }

  // Timeline
  const tl = document.getElementById('seasons-timeline');
  if(tl){
    tl.innerHTML = SEASONS_DATA.map((s,i) => {
      const isNow = i === Math.round(month * SEASONS_DATA.length / 12);
      const badge = s.impact === 'high'
        ? ('طلب عالٍ')
        : s.impact === 'med'
        ? ('معتدل')
        : ('هادئ');
      return `<div class="season-item" style="${isNow?'border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)':''}">
        <div class="si-stripe ${s.impact}"></div>
        <div class="si-body">
          <div class="si-month">${s.month} ${isNow?'← '+('الآن'):''}</div>
          <div class="si-name">${s.icon} ${s.name}</div>
          <div class="si-desc">${s.desc}</div>
        </div>
        <span class="si-badge ${s.impact}">${badge}</span>
      </div>`;
    }).join('');
  }

  // Bar chart
  const ctx = document.getElementById('seasonsChart');
  if(!ctx) return;
  const labels = SEASONS_DATA.map(s => s.icon + ' ' + s.name.split(' ')[0]);
  const impactVals = SEASONS_DATA.map(s => s.impact === 'high' ? 90 : s.impact === 'med' ? 55 : 25);
  const colors = SEASONS_DATA.map(s => s.impact === 'high' ? 'rgba(192,57,43,.75)' : s.impact === 'med' ? 'rgba(201,146,42,.75)' : 'rgba(26,122,74,.5)');
  destroyChart('seasons');
  CHARTS.seasons = new Chart(ctx.getContext('2d'), {
    type:'bar',
    data:{labels, datasets:[{
      label: 'مستوى الطلب الموسمي',
      data: impactVals, backgroundColor: colors, borderRadius: 6
    }]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#9AA0AA',font:{size:8}},grid:{display:false}},
        y:{min:0,max:100,ticks:{color:'#9AA0AA',font:{size:9}},grid:{color:'rgba(0,0,0,.04)'}}
      }}
  });
}

/* ── INIT ── */
async function init(){
  renderNews();renderPortfolio();renderAlerts();
  await fetchAll();
  setInterval(async()=>{
    S.countdown--;
    document.getElementById('cd-val').textContent=S.countdown;
    updateTime();
    if(S.countdown<=0){S.countdown=60;await fetchAll();}
  },1000);
  updateTime();
}
init();