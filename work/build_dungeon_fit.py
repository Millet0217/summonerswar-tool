# -*- coding: utf-8 -*-
# 地下城 meta 隊伍 → 對照 JSON 持有魔靈 → 從全帳號 6★符文自動配裝 → 輸出 CSV
import json, csv, os, itertools
ROOT = r"D:\AI用的\魔靈Json分析"
WORK = os.path.join(ROOT, "work")
OUT  = os.path.join(ROOT, "地下城")
os.makedirs(OUT, exist_ok=True)

def load(p):
    for e in ("utf-8-sig","utf-8"):
        try:
            with open(p,encoding=e) as f: return json.load(f)
        except Exception: pass
    raise RuntimeError("load "+p)

RUNES = load(os.path.join(WORK,"p_runes.json"))
UNITS = load(os.path.join(WORK,"p_units.json"))

# 4件套(其餘皆2件套)；名稱用 符文.csv 官方繁中
# Swift迅速 / Rage激怒 / Fatal猛攻 / Despair絕望 / Vampire吸血 / Violent暴走
FOUR = {"迅速","激怒","猛攻","絕望","吸血","暴走"}
MAIN2MT = {"SPD":8,"HP%":2,"ATK%":4,"DEF%":6,"CRate%":9,"CDmg%":10,"RES%":11,"ACC%":12}

# ---- 隊伍 meta DB：角色以 SWARFARM 英文名比對；set 提示自動判 4/2 件套；主屬依定位推 ----
# 每隊成員 = (英文名, 定位, 套裝提示 '甲/乙')
DUNGEONS = [
 ("巨人窟 GB12","破防自動隊",[
   ("Veromos","破防+持續+淨化","絕望/意志"),("Bernard","回能+攻速","迅速/意志"),
   ("Sabrina","範圍破防","迅速/集中"),("Sigmarus","冰凍+輸出","激怒/刀刃"),
   ("Loren","多段輸出/減攻速","絕望/刀刃")]),
 ("巨人窟 GB12","高速循環隊",[
   ("Bernard","回能","迅速/意志"),("Galleon","破防+攻buff","迅速/意志"),
   ("Verdehile","爆擊回能","暴走/刀刃"),("Lushen","斬殺輸出","激怒/刀刃"),
   ("Veromos","淨化+持續","絕望/意志")]),
 ("巨龍巢穴 DB12","通用隊",[
   ("Veromos","淨化+持續","絕望/意志"),("Galleon","破防+攻buff","迅速/意志"),
   ("Bernard","回能","迅速/意志"),("Sigmarus","冰凍控場","激怒/刀刃"),
   ("Lushen","範圍斬殺","激怒/刀刃")]),
 ("巨龍巢穴 DB12","雙防破速隊",[
   ("Chasun","奶+回能","意志/迅速"),("Sabrina","破防","迅速/集中"),
   ("Katarina","高輸出","暴走/刀刃"),("Fran","免疫+奶","意志/迅速"),
   ("Verad","免疫+控","意志/迅速")]),
 ("死者之塔 NB12","通用隊",[
   ("Veromos","淨化+持續","絕望/意志"),("Bernard","回能","迅速/意志"),
   ("Sabrina","破防+暈","迅速/集中"),("Sigmarus","冰凍","激怒/刀刃"),
   ("Loren","多段輸出","絕望/刀刃")]),
 ("鋼鐵要塞 SF10","多段隊",[
   ("Veromos","淨化+破防","絕望/意志"),("Bernard","回能","迅速/意志"),
   ("Tesarion","多段+灼燒","暴走/刀刃"),("Sath","破防+持續","絕望/意志"),
   ("Colleen","奶+吸血","意志/吸血")]),
 ("懲罰者地穴 PC10","固傷隊",[
   ("Veromos","淨化","絕望/意志"),("Theomars","無視抗性輸出","暴走/刀刃"),
   ("Bernard","回能","迅速/意志"),("Chasun","奶+回能","意志/迅速"),
   ("Fran","免疫+奶","意志/迅速")]),
 ("元素地下城","通用清怪隊",[
   ("Lushen","範圍斬殺","激怒/刀刃"),("Veromos","淨化+持續","絕望/意志"),
   ("Bernard","回能","迅速/意志"),("Colleen","奶+吸血","意志/吸血")]),
 ("次元異界龍 火(水隊)","打火龍",[
   ("Sigmarus","冰凍+輸出","激怒/刀刃"),("Tetra","破防","迅速/集中"),
   ("Colleen","奶+吸血","意志/吸血"),("Mikene","回能+免疫","意志/迅速"),
   ("Govliet","水晶擊破/輸出","暴走/刀刃")]),
 ("次元異界龍 水(風隊)","打水龍",[
   ("Baretta","破防+持續","絕望/意志"),("Kona","破防","迅速/集中"),
   ("Wind Homunculus","固傷/水晶","暴走/刀刃"),("Hemos","奶+免疫","意志/迅速"),
   ("Lushen","斬殺","激怒/刀刃")]),
 ("次元異界龍 風(火隊)","打風龍",[
   ("Tesarion","多段+灼燒","暴走/刀刃"),("Sath","破防+持續","絕望/意志"),
   ("Fire Homunculus","固傷/水晶","暴走/刀刃"),("Chandra","控場","絕望/意志"),
   ("Bernard","回能","迅速/意志")]),
 ("異界縫隙 R5","綜合輸出隊",[
   ("Galleon","破防+攻buff","迅速/意志"),("Verdehile","爆擊回能","暴走/刀刃"),
   ("Katarina","主力輸出","暴走/刀刃"),("Chasun","奶+回能","意志/迅速"),
   ("Theomars","無視抗性","暴走/刀刃")]),
 ("世界王 Worldboss","高分速刷",[
   ("Bernard","回能","迅速/集中"),("Verdehile","爆擊回能","暴走/刀刃"),
   ("Lushen","範圍斬殺","激怒/刀刃"),("Megan","攻buff+回能","迅速/意志"),
   ("Spectra","多段","暴走/刀刃")]),
]

def parse_sets(hint):
    a,b = hint.split("/")
    four = a if a in FOUR else (b if b in FOUR else a)
    two  = b if four==a else a
    return four, two

def mains_for(role, s4, s2):
    dps = any(k in role for k in ["輸出","斬殺","多段","爆","固傷","水晶","高輸出"])
    if dps:
        m2 = "SPD" if s4=="暴走" else "ATK%"
        return {2:m2, 4:"CDmg%", 6:"ATK%"}
    m6 = "ACC%" if ("破防" in role or s2=="集中" or s4=="集中") else "HP%"
    return {2:"SPD", 4:"HP%", 6:m6}

# 已持有：英文名 -> 顯示名(中文優先)
owned = {}
for u in UNITS:
    owned.setdefault(u["en"], u["n"])

pool6 = [r for r in RUNES if r.get("st")==6]

def fit(s4, s2, wantMain, used):
    cand_by_slot = {}
    for sl in range(1,7):
        want = wantMain.get(sl)
        c = [r for r in pool6 if r["sl"]==sl and r["id"] not in used
             and (want is None or r.get("mt")==MAIN2MT[want])]
        best4 = max((r for r in c if r["set"]==s4), key=lambda r:r["ef"], default=None)
        best2 = max((r for r in c if r["set"]==s2), key=lambda r:r["ef"], default=None)
        anyb  = max(c, key=lambda r:r["ef"], default=None)
        cand_by_slot[sl] = (best4, best2, anyb)
    best = None
    for two in itertools.combinations(range(1,7), 2):
        plan={}; okc=0; eff=0.0
        for sl in range(1,7):
            b4,b2,ab = cand_by_slot[sl]
            pick = b2 if sl in two else b4
            if pick and pick["id"] not in {v["id"] for v in plan.values() if v}:
                plan[sl]=pick; eff+=pick["ef"]; okc+=1
            else:
                plan[sl]=ab if (ab and ab["id"] not in {v["id"] for v in plan.values() if v}) else None
                if plan[sl]: eff+=plan[sl]["ef"]*0.5
        # 避免同一plan內重複顆
        ids=[v["id"] for v in plan.values() if v]
        if len(ids)!=len(set(ids)):  # 保險：有重複則此組合作廢
            continue
        score = okc*1000+eff
        if best is None or score>best[0]:
            best=(score, plan, okc, two)
    return best

rows_detail=[["地下城","隊伍","角色(中)","角色(英)","定位","持有","洞","建議套裝","建議主屬",
              "符文★","符文套裝","符文主屬","副屬","效率","現位置"]]
rows_sum=[["地下城","隊伍","角色(中)","角色(英)","定位","持有","目標套裝","湊齊套裝","平均效率","缺洞"]]

SLOT_FIXED_MAIN={1:"HP",3:"ATK",5:"DEF"}
for dg, team, members in DUNGEONS:
    used=set()  # 同隊不重複用同一顆
    for en, role, hint in members:
        s4,s2 = parse_sets(hint)
        wantMain = mains_for(role, s4, s2)
        disp = owned.get(en,"")
        have = en in owned
        target = f"{s4}(4)+{s2}(2)"
        if not have:
            rows_detail.append([dg,team,"",en,role,"✗未持有","","","","","","","","",""])
            rows_sum.append([dg,team,"",en,role,"✗未持有",target,"","",""])
            continue
        res = fit(s4,s2,wantMain,used)
        plan = res[1] if res else {}
        setcnt={}; effs=[]; miss=0
        for sl in range(1,7):
            r = plan.get(sl)
            want = wantMain.get(sl) or SLOT_FIXED_MAIN.get(sl,"")
            sug_set = s2 if (res and sl in res[3]) else s4
            if r:
                used.add(r["id"]); effs.append(r["ef"])
                setcnt[r["set"]] = setcnt.get(r["set"],0)+1
                loc = r["ow"] if r.get("ow") else "倉庫"
                rows_detail.append([dg,team,disp,en,role,"✓",sl,sug_set,want,
                    ("上古" if r.get("anc") else "6★"), r["set"], r["m"], r.get("sub",""),
                    r["ef"], loc])
            else:
                miss+=1
                rows_detail.append([dg,team,disp,en,role,"✓",sl,sug_set,want,
                    "—","(缺符文)","","","",""])
        avg = round(sum(effs)/len(effs),1) if effs else 0
        setstr = " ".join(f"{k}x{v}" for k,v in sorted(setcnt.items(), key=lambda x:-x[1]))
        rows_sum.append([dg,team,disp,en,role,"✓",target,setstr,avg,miss])

def wcsv(path, rows):
    with open(path,"w",encoding="utf-8-sig",newline="") as f:
        csv.writer(f).writerows(rows)

wcsv(os.path.join(OUT,"地下城配裝_明細.csv"), rows_detail)
wcsv(os.path.join(OUT,"地下城配裝_總表.csv"), rows_sum)

# 統計
teams = sum(len(m) for _,_,m in DUNGEONS)
have_cnt = sum(1 for r in rows_sum[1:] if r[5]=="✓")
print("隊伍角色格數", teams, " 持有", have_cnt, " 缺", teams-have_cnt)
print("明細列", len(rows_detail)-1, " 總表列", len(rows_sum)-1)
