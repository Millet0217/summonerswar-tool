// 匯入新 JSON 後由 importer.js 重新呼叫本函式即可整頁重繪
function renderAll(){
// ---------- 共用 ----------
const attrClass={'水':'water','火':'fire','風':'wind','光':'light','暗':'dark'};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const effCls=e=>e>=100?'eff-hi':e>=85?'eff-mid':'eff-lo';
const ownedNames=new Set(UNITS.map(u=>u.en||u.n));   // 地下城模板用英文名比對
const enToZh={}; UNITS.forEach(u=>{ if(u.en) enToZh[u.en]=u.n; });  // 英文→顯示名(中文優先)
const runeById={}; RUNES.forEach(r=>runeById[r.id]=r);
const unitById={}; UNITS.forEach(u=>unitById[u.id]=u);

// header
$('#hUnits').textContent=UNITS.length;
$('#hRunes').textContent=RUNES.length;
const r6=RUNES.filter(r=>r.st==6);
$('#hEff').textContent=(r6.reduce((a,b)=>a+b.ef,0)/r6.length).toFixed(1)+'%';
$('#hHi').textContent=RUNES.filter(r=>r.ef>=90).length;

// tabs
$$('nav button').forEach(b=>b.onclick=()=>{
  $$('nav button').forEach(x=>x.classList.remove('active'));
  $$('.tab').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); $('#'+b.dataset.tab).classList.add('active');
});

// ---------- 怪物庫 ----------
let uSort={k:'atk',dir:-1};
const uCols=[['n','中文名'],['en','英文名'],['at','屬'],['s','★'],['ns','天生'],['ar','職業'],['lv','Lv'],
 ['con','HP'],['atk','ATK'],['def','DEF'],['spd','SPD'],['cr','CR'],['cd','CD'],['re','RES'],['ac','ACC'],['rc','符文'],['rs','目前套裝']];
function uFilter(){
  const q=$('#uSearch').value.toLowerCase(),at=$('#uAttr').value,st=$('#uStar').value,ar=$('#uArch').value,nt=$('#uNat').value;
  return UNITS.filter(u=>(!q||u.n.toLowerCase().includes(q)||(u.en&&u.en.toLowerCase().includes(q)))&&(!at||u.at==at)&&(!ar||u.ar==ar)
    &&(!nt||u.ns==+nt)&&(!st||(st=='3'?u.s<=3:u.s==+st)));
}
function renderUnits(){
  let rows=uFilter();
  rows.sort((a,b)=>{let x=a[uSort.k],y=b[uSort.k];if(typeof x=='string')return uSort.dir*x.localeCompare(y);return uSort.dir*(x-y);});
  $('#uCount').textContent=rows.length+' 隻';
  let h='<thead><tr>'+uCols.map(c=>`<th data-k="${c[0]}">${c[1]}</th>`).join('')+'</tr></thead><tbody>';
  h+=rows.map(u=>`<tr class="clk" data-id="${u.id}">
    <td><b>${u.n}</b></td>
    <td class="muted">${u.en||''}</td>
    <td><span class="pill ${attrClass[u.at]}">${u.at}</span></td>
    <td>${u.s}★</td><td>${u.ns}★</td><td>${u.ar}</td><td>${u.lv}</td>
    <td>${u.con}</td><td>${u.atk}</td><td>${u.def}</td><td><b>${u.spd}</b></td>
    <td>${u.cr}</td><td>${u.cd}</td><td>${u.re}</td><td>${u.ac}</td>
    <td>${u.rc}</td><td class="muted">${u.rs||''}</td></tr>`).join('');
  $('#uTable').innerHTML=h+'</tbody>';
  $$('#uTable th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;uSort.dir=uSort.k==k?-uSort.dir:-1;uSort.k=k;renderUnits();});
  $$('#uTable tbody tr').forEach(tr=>tr.onclick=()=>openUnitModal(unitById[tr.dataset.id]));
}
// ---------- 魔靈詳細彈窗（裝備符文＋魔礦） ----------
const qName={1:'普通',2:'魔法',3:'稀有',4:'英雄',5:'傳說',6:'傳說'};
// 副屬字串內的魔礦標記：+N磨=磨刀石、寶=附魔寶石
const markCraft=s=>s.replace(/\+(\d+)磨/g,'<span class="grind">磨刀石+$1</span>').replace(/寶/g,'<span class="gem">附魔</span>');
function openUnitModal(u){
  if(!u)return;
  const runes=(u.ri||'').split(',').filter(Boolean).map(id=>runeById[id]).filter(Boolean);
  const bySlot={}; runes.forEach(r=>bySlot[r.sl]=r);
  // 收集全部魔礦：磨刀石(grind) 與 附魔寶石(gem)
  const grinds=[],gems=[];
  runes.forEach(r=>{ (r.sub||'').split(' / ').forEach(s=>{
    const m=s.match(/^(.+?)\+\d+\+(\d+)磨/); if(m)grinds.push(`${r.sl}洞 ${m[1].trim()}+${m[2]}`);
    const g=s.match(/^(.+?)\+(\d+)[^\/]*寶/); if(g)gems.push(`${r.sl}洞 ${g[1].trim()}+${g[2]}`);
  }); });
  const efs=runes.map(r=>r.ef); const avg=efs.length?(efs.reduce((a,b)=>a+b,0)/efs.length).toFixed(1):'0';
  let cards='';
  for(let sl=1;sl<=6;sl++){
    const r=bySlot[sl];
    if(!r){cards+=`<div class="runebox empty">${sl}洞<br>（無符文）</div>`;continue;}
    const subs=(r.sub||'').split(' / ').map(s=>`<div class="subline">${markCraft(s)}</div>`).join('');
    cards+=`<div class="runebox">
      <div class="rhead"><span class="slot">${sl}洞 <span class="setbadge">${r.set||'?'}</span></span>
        <span class="qbadge q${r.q||1}">${qName[r.q]||''}</span></div>
      <div class="main">${r.m}</div>
      ${r.pf?`<div class="pf">前綴 ${r.pf}</div>`:''}
      ${subs}
      <div class="rhead" style="margin-top:6px;border-top:1px solid var(--line);padding-top:6px">
        <span>${r.anc?'<span class="anc">'+r.st+'★A</span>':r.st+'★'} <span class="muted">+${r.lv}</span></span>
        <span class="${effCls(r.ef)}">效率 ${r.ef}%</span></div></div>`;
  }
  const st=k=>`<div><span>${k[1]}</span><b>${u[k[0]]}</b></div>`;
  const statBoxes=[['con','HP'],['atk','ATK'],['def','DEF'],['spd','SPD'],['cr','CR%'],['cd','CD%'],['re','RES%'],['ac','ACC%']].map(st).join('');
  const goreParts=[];
  if(grinds.length)goreParts.push(`<div>🪨 <b>磨刀石</b>　${grinds.join('　')}</div>`);
  if(gems.length)goreParts.push(`<div>💎 <b class="gemtxt">附魔寶石</b>　${gems.join('　')}</div>`);
  const gore=goreParts.length?`<div class="mgore">${goreParts.join('')}</div>`:`<div class="mgore muted">此魔靈的符文未套用任何魔礦（磨刀石／附魔寶石）</div>`;
  $('#uModalBody').innerHTML=`
    <h2>${u.n} <span class="pill ${attrClass[u.at]}">${u.at}</span> ${u.s}★</h2>
    <div class="msub">${u.en||''}　·　${u.ar}　·　Lv${u.lv}　·　目前套裝：${u.rs||'—'}　·　符文平均效率 <b class="${effCls(avg)}">${avg}%</b></div>
    <div class="mstats">${statBoxes}</div>
    ${gore}
    <div class="runegrid">${cards}</div>`;
  $('#uModal').classList.add('open');
}
function closeUnitModal(){$('#uModal').classList.remove('open');}
$('#uModalX').onclick=closeUnitModal;
$('#uModal').onclick=e=>{if(e.target.id=='uModal')closeUnitModal();};
document.addEventListener('keydown',e=>{if(e.key=='Escape')closeUnitModal();});
['uSearch','uAttr','uStar','uArch','uNat'].forEach(id=>$('#'+id).oninput=renderUnits);
renderUnits();

// ---------- 符文庫 ----------
const sets=[...new Set(RUNES.map(r=>r.set).filter(Boolean))];
$('#rSet').innerHTML='<option value="">全部套裝</option>'+sets.map(s=>`<option>${s}</option>`).join('');
const mains=[...new Set(RUNES.map(r=>r.m.split('+')[0]))];
$('#rMain').innerHTML='<option value="">全部主屬</option>'+mains.map(s=>`<option>${s}</option>`).join('');
let rSort={k:'ef',dir:-1};
const rCols=[['ef','效率'],['sl','洞'],['st','★'],['set','套裝'],['m','主屬'],['pf','前綴'],['sub','副屬'],['lv','+'],['ow','裝備者']];
function rFilter(){
  const set=$('#rSet').value,sl=$('#rSlot').value,mn=$('#rMain').value,eq=$('#rEq').value,anc=$('#rAnc').value,
    ef=+$('#rEff').value,ow=$('#rOwner').value.toLowerCase();
  return RUNES.filter(r=>(!set||r.set==set)&&(!sl||r.sl==+sl)&&(!mn||r.m.startsWith(mn))
    &&(eq===''||r.eq==+eq)&&(!anc||r.anc==1)&&r.ef>=ef&&(!ow||(r.ow||'').toLowerCase().includes(ow)));
}
function renderRunes(){
  let rows=rFilter();
  rows.sort((a,b)=>{let x=a[rSort.k],y=b[rSort.k];if(typeof x=='string')return rSort.dir*(''+x).localeCompare(''+y);return rSort.dir*(x-y);});
  $('#rCount').textContent=rows.length+' 個';
  let h='<thead><tr>'+rCols.map(c=>`<th data-k="${c[0]}">${c[1]}</th>`).join('')+'</tr></thead><tbody>';
  h+=rows.slice(0,600).map(r=>`<tr>
    <td class="${effCls(r.ef)}">${r.ef}%</td><td>${r.sl}</td>
    <td>${r.anc?'<span class="anc">'+r.st+'★A</span>':r.st+'★'}</td>
    <td>${r.set||''}</td><td><b>${r.m}</b></td><td class="muted">${r.pf||''}</td>
    <td style="white-space:normal;min-width:280px">${r.sub}</td><td>+${r.lv}</td>
    <td>${r.ow?'<span class="own">'+r.ow+'</span>':'<span class="muted">倉庫</span>'}</td></tr>`).join('');
  $('#rTable').innerHTML=h+'</tbody>';
  if(rows.length>600)$('#rCount').textContent+='（顯示前600）';
  $$('#rTable th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;rSort.dir=rSort.k==k?-rSort.dir:-1;rSort.k=k;renderRunes();});
}
['rSet','rSlot','rMain','rEq','rAnc','rEff','rOwner'].forEach(id=>$('#'+id).oninput=renderRunes);
renderRunes();

// ---------- 地下城 meta DB ----------
// 角色以 SWARFARM 英文名比對；role=定位，runes=建議套裝
const DUNGEONS=[
 {n:'巨人窟 GB12',sub:'符文/魔力石主要來源。核心：破防+多段+回能，可做全自動循環。',teams:[
   {tl:'穩定自動隊',us:[
     ['Veromos','破防+持續傷害+淨化','絕望/意志'],
     ['Bernard','回能+攻速buff','迅速/命中'],
     ['Sabrina','範圍破防','刀刃/命中'],
     ['Sigmarus','冰凍+輸出','刀刃/暴擊'],
     ['Loren','多段輸出/減攻速','絕望/刀刃']]},
   {tl:'高速循環(需高速符)',us:[
     ['Bernard','回能','迅速/命中'],
     ['Galleon','破防+攻擊buff','迅速/命中'],
     ['Verdehile','爆擊回能','暴怒/刀刃'],
     ['Lushen','斬殺(副手)','刀刃/暴擊']]}]},
 {n:'巨龍巢穴 DB12',sub:'攻速/暴擊/精準符文來源。需破防、抗擊暈、穩定輸出。',teams:[
   {tl:'通用隊',us:[
     ['Veromos','淨化+持續','絕望/意志'],
     ['Galleon','破防+攻buff','迅速/意志'],
     ['Bernard','回能','迅速/命中'],
     ['Sigmarus','冰凍控場','刀刃/暴擊'],
     ['Lushen','範圍斬殺','刀刃/暴擊']]},
   {tl:'雙防破速刷',us:[
     ['Chasun','奶+回能','意志/迅速'],
     ['Sabrina','破防','刀刃/命中'],
     ['Katarina','高輸出','暴怒/刀刃'],
     ['Fran','免疫+奶','意志/迅速']]}]},
 {n:'死者之塔 NB12',sub:'暴擊傷害/暴怒/意志符文來源。怪物會反擊+回能,需破防與控場。',teams:[
   {tl:'通用隊',us:[
     ['Veromos','淨化+持續','絕望/意志'],
     ['Bernard','回能','迅速/命中'],
     ['Sabrina','破防+暈','刀刃/命中'],
     ['Sigmarus','冰凍','刀刃/暴擊'],
     ['Loren','多段輸出','絕望/刀刃']]}]},
 {n:'鋼鐵要塞 SF10',sub:'免疫/專注/引導符文。BOSS會上護盾,需高頻多段。',teams:[
   {tl:'多段隊',us:[
     ['Veromos','淨化+破防','絕望/意志'],
     ['Bernard','回能','迅速/命中'],
     ['Tesarion','多段+灼燒','暴怒/刀刃'],
     ['Sath','破防+持續','絕望/意志']]}]},
 {n:'懲罰者地穴 PC10',sub:'反擊/破壞符文。BOSS高防,建議固傷/百分比傷害。',teams:[
   {tl:'固傷隊',us:[
     ['Veromos','淨化','絕望/意志'],
     ['Theomars','無視抗性輸出','暴怒/刀刃'],
     ['Bernard','回能','迅速/命中'],
     ['Chasun','奶+回能','意志/迅速']]}]},
 {n:'元素地下城(火/風/水/光/暗 精髓)',sub:'進階素材(精髓)來源,難度低。任意屬性優勢隊即可穩過。',teams:[
   {tl:'通用清怪隊',us:[
     ['Lushen','範圍斬殺(光/暗皆有)','刀刃/暴擊'],
     ['Veromos','淨化+持續','絕望/意志'],
     ['Bernard','回能','迅速/命中'],
     ['Colleen','奶+吸血','意志/吸血']]}]},
 {n:'次元洞 · 異界巨龍 (火 B2/B5)',sub:'次元洞素材/附魔寶石/魔石。BOSS吃「水」屬性優勢,兩側水晶需優先擊破。',teams:[
   {tl:'水隊 (打火龍)',us:[
     ['Sigmarus','冰凍+輸出','刀刃/暴擊'],
     ['Tetra','破防','迅速/命中'],
     ['Colleen','奶+吸血','意志/吸血'],
     ['Mikene','回能+免疫','意志/迅速'],
     ['Govliet','水晶擊破/輸出','暴怒/刀刃']]}]},
 {n:'次元洞 · 異界巨龍 (水 B2/B5)',sub:'BOSS吃「風」屬性優勢。需破防+持續輸出+抗控。',teams:[
   {tl:'風隊 (打水龍)',us:[
     ['Baretta','破防+持續','絕望/意志'],
     ['Kona','破防','迅速/命中'],
     ['Wind Homunculus','固傷/水晶','暴怒/刀刃'],
     ['Hemos','奶+免疫','意志/迅速'],
     ['Lushen','斬殺','刀刃/暴擊']]}]},
 {n:'次元洞 · 異界巨龍 (風 B2/B5)',sub:'BOSS吃「火」屬性優勢。以火隊多段快速擊破水晶。',teams:[
   {tl:'火隊 (打風龍)',us:[
     ['Tesarion','多段+灼燒','暴怒/刀刃'],
     ['Sath','破防+持續','絕望/意志'],
     ['Fire Homunculus','固傷/水晶','暴怒/刀刃'],
     ['Chandra','控場','絕望/意志'],
     ['Bernard','回能','迅速/命中']]}]},
 {n:'異界縫隙 R5 (團隊副本)',sub:'需高DPS在時限內擊破。屬性優勢+破防+回能+奶,分工輸出。',teams:[
   {tl:'綜合輸出隊',us:[
     ['Galleon','破防+攻buff','迅速/意志'],
     ['Verdehile','爆擊回能','暴怒/刀刃'],
     ['Katarina','主力輸出','暴怒/刀刃'],
     ['Chasun','奶+回能','意志/迅速'],
     ['Theomars','無視抗性','暴怒/刀刃']]}]},
 {n:'世界王 Worldboss',sub:'看總戰力/屬性覆蓋,愈多高星覆蓋各屬愈高分。帶回能+多段。',teams:[
   {tl:'高分速刷',us:[
     ['Bernard','回能','迅速/命中'],
     ['Verdehile','爆擊回能','暴怒/刀刃'],
     ['Lushen','範圍斬殺','刀刃/暴擊'],
     ['Megan','攻buff+回能','迅速/命中'],
     ['Spectra','多段','暴怒/刀刃']]}]}
];
function renderDungeons(){
  const q=$('#dSearch').value.toLowerCase(),ownedOnly=$('#dOwnedOnly').checked;
  $('#dungeonGrid').innerHTML=DUNGEONS.filter(d=>!q||d.n.toLowerCase().includes(q)||d.teams.some(t=>t.us.some(u=>u[0].toLowerCase().includes(q)))).map(d=>{
    let teams=d.teams.map(t=>{
      let owned=t.us.filter(u=>ownedNames.has(u[0])).length;
      let rows=t.us.filter(u=>!ownedOnly||ownedNames.has(u[0])).map(u=>{
        let has=ownedNames.has(u[0]);
        let disp=has&&enToZh[u[0]]?enToZh[u[0]]:u[0];
        return `<div class="unitrow"><span class="${has?'own':'noown'}">${has?'✓':'✗'} ${disp}<span class="rl" style="margin-left:6px">${disp!==u[0]?u[0]:''}</span></span>
          <span class="rl">${u[1]} <span class="setbadge">${u[2]}</span></span></div>`;
      }).join('');
      return `<div class="team"><div class="tl">${t.tl} <span class="muted">(擁有 ${owned}/${t.us.length})</span></div>${rows}</div>`;
    }).join('');
    return `<div class="card dcard"><h3>${d.n}</h3><div class="sub">${d.sub}</div>${teams}</div>`;
  }).join('');
}
['dSearch','dOwnedOnly'].forEach(id=>$('#'+id).oninput=renderDungeons);
renderDungeons();

// ---------- 符文自動配裝 ----------
const set4=['暴怒','迅速','刀刃','致命','絕望','吸血','反擊','復仇','破壞','戰意','忍受','命中(4)無效'];
const set2all=['意志','刀刃','暴擊','命中','忍耐','活力','守護','護盾','精準','決心','強化'];
$('#fUnit').innerHTML=UNITS.filter(u=>u.s>=5).sort((a,b)=>a.n.localeCompare(b.n)).map(u=>`<option value="${u.id}">${u.n} (${u.at}${u.s}★)</option>`).join('');
$('#fSet4').innerHTML=['暴怒','迅速','刀刃','致命','絕望','吸血','反擊','復仇','破壞','戰意'].map(s=>`<option>${s}</option>`).join('');
$('#fSet2').innerHTML=['意志','暴擊','刀刃','命中','忍耐','活力','守護','護盾','精準'].map(s=>`<option>${s}</option>`).join('');
const mainOpts={2:['ATK%','DEF%','HP%','SPD'],4:['ATK%','DEF%','HP%','CRate%','CDmg%'],6:['ATK%','DEF%','HP%','RES%','ACC%']};
[2,4,6].forEach(s=>$('#fS'+s).innerHTML='<option value="">不限</option>'+mainOpts[s].map(m=>`<option>${m}</option>`).join(''));

function parseStats(r){ // 回傳 {STAT:val}
  const o={}; const add=(t,v)=>{o[t]=(o[t]||0)+(+v||0);};
  const mm=r.m.match(/^(.+?)\+(\d+)/); if(mm)add(mm[1],mm[2]);
  if(r.pf){const pm=r.pf.match(/^(.+?)\+(\d+)/);if(pm)add(pm[1],pm[2]);}
  (r.sub||'').split(' / ').forEach(s=>{const m=s.replace('(前)','').match(/^(.+?)\+(\d+)/);if(m)add(m[1].trim(),m[2]);});
  return o;
}
$('#fRun').onclick=()=>{
  const uid=$('#fUnit').value, s4=$('#fSet4').value, s2=$('#fSet2').value;
  const wantMain={2:$('#fS2').value,4:$('#fS4').value,6:$('#fS6').value};
  const includeAll=$('#fPool').checked;
  // 建立可用池
  let pool=RUNES.filter(r=>r.st==6 && (r.eq==0 || r.ow===UNITS.find(u=>u.id==uid).n || includeAll));
  // 主屬篩選 (偶數洞)
  const mainOk=(r)=>{const t=r.m.split('+')[0]; if([2,4,6].includes(r.sl)&&wantMain[r.sl])return t===wantMain[r.sl]; return true;};
  // 每洞的候選(依套裝分兩桶)
  const bySlotSet={}; // bySlotSet[slot][ '4'|'2' ] = best rune
  for(let sl=1;sl<=6;sl++){
    const cand=pool.filter(r=>r.sl==sl&&mainOk(r));
    const best4=cand.filter(r=>r.set==s4).sort((a,b)=>b.ef-a.ef)[0];
    const best2=cand.filter(r=>r.set==s2).sort((a,b)=>b.ef-a.ef)[0];
    const bestAny=cand.sort((a,b)=>b.ef-a.ef)[0];
    bySlotSet[sl]={s4:best4,s2:best2,any:bestAny};
  }
  // 列舉哪兩洞放 2件套 (C(6,2)=15)
  const slots=[1,2,3,4,5,6]; let bestPlan=null;
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
    const twoSlots=[slots[i],slots[j]]; let plan={},okc=0,eff=0,valid=true;
    for(const sl of slots){
      const useTwo=twoSlots.includes(sl);
      const pick=useTwo?bySlotSet[sl].s2:bySlotSet[sl].s4;
      if(pick){plan[sl]=pick;eff+=pick.ef;okc++;}
      else{plan[sl]=bySlotSet[sl].any||null;if(plan[sl])eff+=plan[sl].ef*0.5;valid=false;}
    }
    const score=okc*1000+eff;
    if(!bestPlan||score>bestPlan.score)bestPlan={plan,score,twoSlots,okc};
  }
  // 輸出
  const p=bestPlan.plan;
  let setCount={}; Object.values(p).forEach(r=>{if(r){setCount[r.set]=(setCount[r.set]||0)+1;}});
  let setTxt=Object.entries(setCount).map(([k,v])=>`${k}×${v}`).join('　');
  let totalEff=0,n=0;
  let html=`<div class="muted" style="margin-bottom:8px">目標：<b>${s4}(4) + ${s2}(2)</b>　達成套裝：<b style="color:var(--good)">${setTxt}</b></div>`;
  for(let sl=1;sl<=6;sl++){
    const r=p[sl];
    if(r){totalEff+=r.ef;n++;
      const loc=r.ow?`<span class="own">${r.ow}</span>`:'<span class="muted">倉庫</span>';
      html+=`<div class="slotline"><span><b>${sl}洞</b> <span class="setbadge">${r.set}</span> ${r.m}　<span class="muted">${r.sub}</span></span><span>${r.anc?'<span class="anc">A</span> ':''}<b class="${effCls(r.ef)}">${r.ef}%</b> ${loc}</span></div>`;
    } else html+=`<div class="slotline"><span><b>${sl}洞</b> <span class="noown">找不到符合條件的符文</span></span></div>`;
  }
  html+=`<div class="kv" style="margin-top:10px"><div><span>平均效率</span><b class="eff-hi">${(totalEff/Math.max(n,1)).toFixed(1)}%</b></div><div><span>湊齊洞數</span><b>${n}/6</b></div></div>`;
  $('#fResult').innerHTML=html;
  // 加成合計
  const tot={}; Object.values(p).forEach(r=>{if(!r)return;const st=parseStats(r);for(const k in st)tot[k]=(tot[k]||0)+st[k];});
  const order=['ATK%','ATK','HP%','HP','DEF%','DEF','SPD','CRate%','CDmg%','RES%','ACC%'];
  $('#fStats').innerHTML='<div class="statsum">'+order.filter(k=>tot[k]).map(k=>`<div>${k} <b>+${tot[k]}</b></div>`).join('')+'</div>'+
    '<small class="note">此為六件符文主屬+前綴+副屬的加總(不含怪物基礎值與套裝%效果),用來快速評估配裝走向。</small>';
};

// ---------- 總覽 ----------
// (以下 ov() 為本次重繪的最後步驟)
function ov(){
  const by=(arr,f)=>{const m={};arr.forEach(x=>{const k=f(x);m[k]=(m[k]||0)+1;});return m;};
  const bar=(obj,color)=>{const mx=Math.max(...Object.values(obj));return Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
    `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:70px;font-size:12px" class="muted">${k}</span>
     <div style="flex:1;background:#20263f;border-radius:4px;overflow:hidden"><div style="width:${v/mx*100}%;background:${color};height:14px"></div></div>
     <span style="width:40px;text-align:right">${v}</span></div>`).join('');};
  const cards=[];
  cards.push(`<div class="card"><h3>怪物屬性分佈</h3>${bar(by(UNITS,u=>u.at),'#6ea8ff')}</div>`);
  cards.push(`<div class="card"><h3>6★怪物職業</h3>${bar(by(UNITS.filter(u=>u.s==6),u=>u.ar),'#37d67a')}</div>`);
  cards.push(`<div class="card"><h3>符文套裝分佈(6★)</h3>${bar(by(r6,r=>r.set||'?'),'#ffb020')}</div>`);
  cards.push(`<div class="card"><h3>符文效率分級(6★)</h3>${bar({'110%+':r6.filter(r=>r.ef>=110).length,'100-110':r6.filter(r=>r.ef>=100&&r.ef<110).length,'90-100':r6.filter(r=>r.ef>=90&&r.ef<100).length,'80-90':r6.filter(r=>r.ef>=80&&r.ef<90).length,'<80':r6.filter(r=>r.ef<80).length},'#ff6b4a')}</div>`);
  const spd=RUNES.filter(r=>r.mt==8);
  cards.push(`<div class="card"><h3>關鍵指標</h3>
    <div class="kv"><div><span>速度主符(2洞SPD)</span><b>${spd.length}</b></div>
    <div><span>其中倉庫可用</span><b>${spd.filter(r=>r.eq==0).length}</b></div>
    <div><span>上古符文</span><b>${RUNES.filter(r=>r.anc==1).length}</b></div>
    <div><span>110%+神符</span><b>${RUNES.filter(r=>r.ef>=110).length}</b></div></div></div>`);
  $('#ovGrid').innerHTML=cards.join('');
}
ov();
} // end renderAll
renderAll();
