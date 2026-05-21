
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
  if(!w||!p||w<=0||p<=0){showNotif('⚠️ أدخل الوزن وسعر الشراء');return;}
  S.portfolio.push({w,p,k,date:new Date().toLocaleDateString('ar-EG')});
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
function addAlert(){
  const k=document.getElementById('al-karat').value;
  const dir=document.getElementById('al-dir').value;
  const price=parseFloat(document.getElementById('al-price').value);
  if(!price||price<=0){showNotif('⚠️ أدخل السعر المستهدف');return;}
  S.alerts.push({k,dir,price,triggered:false});
  localStorage.setItem('gp_al',JSON.stringify(S.alerts));
  document.getElementById('al-price').value='';
  renderAlerts();showNotif('🔔 تم إضافة التنبيه');
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
function switchPanel(panel,el){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+panel).classList.add('active');
  el.classList.add('active');
  if(panel==='chart'){renderHistChart();renderCompareChart();}
  if(panel==='currency'){renderFXCards();}
  if(panel==='portfolio'){renderPortfolio();}
  if(panel==='alerts'){renderAlerts();}
  if(panel==='news'){renderNews();}
  if(panel==='calc'){renderGramPrices();calcGold();}
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
  checkAlerts();renderPortfolio();
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
