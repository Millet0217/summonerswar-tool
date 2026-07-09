// ========== 瀏覽器端 smw*.json 解析器 ==========
// 對應 work/extract.ps1(Parse-Rune/單位解析) + gen_payload.ps1(套用名稱、產生 U/R payload)
// 讓工具可直接在瀏覽器匯入新的帳號匯出檔，無需再跑 PowerShell 流程。
// 依賴內嵌的兩個全域：MONSTER_DB(master_id→{name,arch,stars}) 與 ZH_NAMES(master_id→中文)

const IMP_effName={1:'HP',2:'HP%',3:'ATK',4:'ATK%',5:'DEF',6:'DEF%',8:'SPD',9:'CRate%',10:'CDmg%',11:'RES%',12:'ACC%'};
const IMP_setName={1:'活力',2:'守護',3:'迅速',4:'刀刃',5:'暴擊',6:'命中',7:'忍耐',8:'致命',10:'絕望',11:'吸血',13:'暴怒',14:'復仇',15:'意志',16:'護盾',17:'反擊',18:'破壞',19:'戰意',20:'決心',21:'強化',22:'精準',23:'忍受',24:'封印',25:'',99:'無形'};
const IMP_attrName={1:'水',2:'火',3:'風',4:'光',5:'暗'};
const IMP_subMax={2:40,4:40,6:40,8:30,9:30,10:35,11:40,12:40,1:1875,3:100,5:100};
const IMP_mainMax={1:2448,2:63,3:160,4:63,5:160,6:63,8:42,9:58,10:80,11:64,12:64};

function IMP_parseRune(r, ownerId){
  let stars=r.class, ancient=false;
  if(stars>=11){ ancient=true; stars-=10; }
  const priT=+r.pri_eff[0], priV=r.pri_eff[1];
  const preT=+r.prefix_eff[0], preV=r.prefix_eff[1];
  const mmax=IMP_mainMax[priT]||1;
  const mainRatio = r.upgrade_curr>=15 ? 1.0 : Math.min(1.0, priV/mmax);
  let subSum=0; const subs=[], stypes=[];
  if(preT!==0){ const mx=IMP_subMax[preT]; if(mx)subSum+=preV/mx; subs.push(IMP_effName[preT]+'+'+preV+'(前)'); stypes.push(preT); }
  for(const s of (r.sec_eff||[])){
    const st=+s[0], sv=s[1], grind=s.length>=4?s[3]:0;
    const mx=IMP_subMax[st]; if(mx)subSum+=(sv+grind)/mx;
    const g=grind>0?('+'+grind+'磨'):'';
    subs.push(IMP_effName[st]+'+'+sv+g); stypes.push(st);
  }
  const eff=Math.round((mainRatio+subSum)/2.8*1000)/10;
  return {
    rune_id:r.rune_id, slot:r.slot_no, stars, ancient,
    set_id:+r.set_id, set:IMP_setName[+r.set_id]||'', quality:r.rank, level:r.upgrade_curr,
    main:IMP_effName[priT]+'+'+priV, main_type:priT, main_val:priV,
    prefix: preT!==0 ? (IMP_effName[preT]+'+'+preV) : '',
    subs:subs.join(' / '), sub_types:stypes.join(','),
    eff, equipped: ownerId!=null, owner: ownerId
  };
}

// 回傳 { units:[U...], runes:[R...] }，格式與 build 時烤進去的 UNITS/RUNES 完全一致
function parseSmw(d){
  const allRunes=[];
  for(const r of (d.runes||[])) allRunes.push(IMP_parseRune(r,null));

  const raw=[];                 // {u, runeCount, rids}
  const idDisp={};              // unit_id -> 顯示名
  for(const u of (d.unit_list||[])){
    const ru=(u.runes||[]).filter(x=>x&&x.rune_id);
    const rids=[];
    for(const r of ru){ allRunes.push(IMP_parseRune(r,u.unit_id)); rids.push(r.rune_id); }
    const mid=''+u.unit_master_id;
    const meta=(typeof MONSTER_DB!=='undefined'&&MONSTER_DB[mid])||{};
    const en=meta.name||('?'+mid);
    const zh=(typeof ZH_NAMES!=='undefined'&&ZH_NAMES[mid]&&(''+ZH_NAMES[mid]).trim())?(''+ZH_NAMES[mid]).trim():'';
    const disp=zh||en;
    idDisp[''+u.unit_id]=disp;
    raw.push({u, runeCount:ru.length, rids, en, disp, arch:meta.arch||'?', ns:meta.stars||0});
  }

  const setDispById={};
  allRunes.forEach(r=>setDispById[''+r.rune_id]=r.set);

  const runes=allRunes.map(r=>({
    id:''+r.rune_id, sl:r.slot, st:r.stars, anc:r.ancient?1:0, set:r.set, sid:r.set_id,
    q:r.quality, lv:r.level, m:r.main, mt:r.main_type, mv:r.main_val, pf:r.prefix,
    sub:r.subs, sty:r.sub_types, ef:r.eff, eq:r.equipped?1:0,
    ow: r.owner!=null ? (idDisp[''+r.owner]||'') : ''
  }));

  const units=raw.map(o=>{
    const cnt={};
    for(const rid of o.rids){ const s=setDispById[''+rid]; if(s)cnt[s]=(cnt[s]||0)+1; }
    const rs=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+'x'+v).join(' ');
    const u=o.u;
    return {
      id:''+u.unit_id, n:o.disp, en:o.en, at:IMP_attrName[+u.attribute]||'', s:u.class, ns:o.ns, ar:o.arch,
      lv:u.unit_level, con:u.con, atk:u.atk, def:u.def, spd:u.spd, cr:u.critical_rate, cd:u.critical_damage,
      re:u.resist, ac:u.accuracy, rc:o.runeCount, rs, ri:o.rids.join(',')
    };
  });

  return {units, runes};
}

// ========== 匯入 UI 綁定 ==========
function impSetStatus(msg, bad){
  const el=document.getElementById('impStatus');
  if(el){ el.textContent=msg; el.style.color=bad?'var(--bad)':'var(--good)'; }
}
function impLoadFile(file){
  if(!file) return;
  impSetStatus('讀取中…');
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(!d || !Array.isArray(d.unit_list) || !Array.isArray(d.runes))
        throw new Error('這不是魔靈召喚帳號匯出檔（缺 unit_list / runes）');
      const {units, runes}=parseSmw(d);
      UNITS=units; RUNES=runes;
      renderAll();
      impSetStatus(`已匯入 ${file.name}：怪物 ${units.length}、符文 ${runes.length}`);
    }catch(err){ impSetStatus('匯入失敗：'+err.message, true); }
  };
  reader.onerror=()=>impSetStatus('讀檔失敗', true);
  reader.readAsText(file, 'utf-8');
}
document.addEventListener('DOMContentLoaded', ()=>{
  const btn=document.getElementById('impBtn'), inp=document.getElementById('impFile');
  if(btn&&inp){
    btn.onclick=()=>inp.click();
    inp.onchange=()=>{ impLoadFile(inp.files[0]); inp.value=''; };
  }
});
