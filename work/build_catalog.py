# -*- coding: utf-8 -*-
import json, csv, os, re
ROOT = r"D:\AI用的\魔靈Json分析"
WORK = os.path.join(ROOT, "work")
TAB  = os.path.join(ROOT, "對照表")

def load(p):
    for enc in ("utf-8-sig","utf-8"):
        try:
            with open(p, encoding=enc) as f: return json.load(f)
        except Exception: pass
    raise RuntimeError("cannot load "+p)

sw = load(os.path.join(WORK,"swarfarm_all.json"))

ELEM = {"Water":"水","Fire":"火","Wind":"風","Light":"光","Dark":"暗"}
ARCH_ZH = {"Attack":"攻擊","Support":"支援","HP":"體力","Defense":"防禦","Material":"素材"}
ELEM_ORDER = {"水":0,"火":1,"風":2,"光":3,"暗":4}
AW_ZH = {0:"未覺醒",1:"覺醒",2:"二次覺醒"}

# 保留既有中文名 (代碼->中文)
zh_existing = {}
mon_csv = os.path.join(TAB,"怪物.csv")
if os.path.exists(mon_csv):
    with open(mon_csv, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            z=(row.get("中文") or "").strip()
            if z: zh_existing[str(row["代碼"])]=z

# icon_map: 全部 3070 (mid->img)，供已持有怪物 ICON 查找
icon_map = {str(m["mid"]): m["img"] for m in sw if m.get("img")}
with open(os.path.join(WORK,"icon_map.json"),"w",encoding="utf-8") as f:
    json.dump(icon_map, f, ensure_ascii=False, separators=(",",":"))

# ---- 持有等價關係圖：覺醒鏈(未覺醒⇄覺醒⇄二覺) + 變身(transform) ----
# awakens_to / awakens_from / transforms_to 皆為 SWARFARM 內部 id，需以 id->mid 解析
id2mid = {m["id"]: str(m["mid"]) for m in sw}
parent = {str(m["mid"]): str(m["mid"]) for m in sw}
def find(x):
    while parent[x]!=x:
        parent[x]=parent[parent[x]]; x=parent[x]
    return x
def union(a,b):
    if a in parent and b in parent:
        parent[find(a)]=find(b)
for m in sw:
    a = str(m["mid"])
    for fld in ("awto","awfrom","tfto"):
        tid = m.get(fld)
        if tid and tid in id2mid:
            union(a, id2mid[tid])
# 每個 mid 的代表(canon)；只輸出「所屬群組>1」的 mid，其餘用自身即可
from collections import defaultdict
comp = defaultdict(list)
for mid in parent: comp[find(mid)].append(mid)
canon = {}
for root, members in comp.items():
    if len(members) > 1:
        rep = min(members, key=int)   # 群組代表用最小 mid
        for mid in members:
            canon[mid] = rep
with open(os.path.join(WORK,"links.json"),"w",encoding="utf-8") as f:
    json.dump(canon, f, ensure_ascii=False, separators=(",",":"))
print("持有等價群組(>1)覆蓋 mid 數", len(canon), " 群組數", sum(1 for m in comp.values() if len(m)>1))

# catalog: 現在遊戲裡所有真魔靈 = arch != none(排除水晶/王/塔/雕像等) 且非測試 dummy
def is_dummy(m):
    n = m["name"]
    return ("더미" in n) or ("dummy" in n.lower()) or ("형상아이템" in n)
obt = [m for m in sw if m.get("arch") != "none" and not is_dummy(m)]
# 排除已知廢棄的平行家族：SWARFARM 保留的舊版 Ifrit(family 17100，10 筆全 obtainable:false)，
# 與正版 Ifrit(family 19200) 同名不同圖，會在圖鑑造成整組重複
OBSOLETE_FAMILIES = {17100}
obt = [m for m in obt if m.get("family") not in OBSOLETE_FAMILIES]
# 去除韓文名重複：部分聯動角色的未覺醒形態 SWARFARM 尚未英化，name 仍是韓文，
# 與英文的覺醒形態共用同一 icon → 只要有同 img 的英文條目，就刪掉韓文那筆(保留無英文對應的孤兒)
_HANGUL = re.compile("[가-힣]")
_is_kor = lambda m: bool(_HANGUL.search(m["name"]))
_eng_imgs = {m["img"] for m in obt if not _is_kor(m) and m.get("img")}
obt = [m for m in obt if not (_is_kor(m) and m.get("img") in _eng_imgs)]
def sk(m):
    return (ELEM_ORDER.get(ELEM.get(m["element"],""),9), -m["ns"], m["name"])
obt.sort(key=sk)

# ---- 強度 tier：客觀分數打底 + PvE meta 強怪覆蓋 + 使用者 強度.csv 覆蓋 ----
# 客觀分數：滿等五圍(max_lvl) + 天生星；只給 A/B/C/D，S 保留給 meta/使用者
def power(m): return m["hp"]*0.1 + m["atk"] + m["def"]*0.8 + m["spd"]*5
pw = {str(m["mid"]): power(m) for m in obt}
plo, phi = min(pw.values()), max(pw.values())
def base_tier(m):
    # 客觀基準以天生星為主(玩家直覺的投資強度)，數據特別高的低星微幅上修；S/A 留給 meta
    if m["arch"] == "Material": return "D"
    ns = m["ns"]; pn = (pw[str(m["mid"])]-plo)/(phi-plo) if phi>plo else .5
    t = "B" if ns>=5 else "C" if ns>=3 else "D"
    if t == "C" and pn >= 0.85: t = "B"
    return t
# PvE 刷本/地下城 meta 強怪(覺醒英文名) → 沿覺醒鏈整組套用
PVE_TIER = {
 "S": ["Lushen","Veromos","Bernard","Galleon","Sigmarus","Theomars","Verdehile","Belladeon",
       "Chasun","Loren","Tesarion","Baretta","Colleen","Konamiya","Ramagos","Kro","Fran","Sabrina"],
 "A": ["Bella","Shannon","Megan","Spectra","Darion","Katarina","Sath","Chandra","Tetra","Hemos",
       "Mikene","Verad","Rica","Charlotte","Zaiross","Perna","Jamire","Woonhak","Fermion","Woosa",
       "Elsharion","Akhamamir","Racuni","Feng Yan","Ariel","Praha","Homunculus(Attack)",
       "Homunculus(Support)","Tiana","Seara","Ganymede","Chilling"],
 "B": ["Ahman","Michelle","Fao","Mav","Hraesvelg","Raoq","Icaru","Fedora","Astar"],
}
name2mids = defaultdict(list)
for m in obt: name2mids[m["name"]].append(str(m["mid"]))
grp = defaultdict(list)
for mid in ({str(x["mid"]) for x in sw}): grp[canon.get(mid, mid)].append(mid)
meta_map, unmatched = {}, []
for tier, names in PVE_TIER.items():
    for nm in names:
        mids = name2mids.get(nm)
        if not mids: unmatched.append(nm); continue
        for mid in mids:
            for gm in grp[canon.get(mid, mid)]: meta_map[gm] = tier

# swranking 當前版本 RTA 統計(出場率/禁用率) → meta tier；出場率存入 rp 供圖鑑顯示
RANK = {"S":0,"A":1,"B":2,"C":3,"D":4}
sw_map, rp_map, sw_ver = {}, {}, ""
swpath = os.path.join(WORK, "swranking_meta.json")
if os.path.exists(swpath):
    swm = load(swpath); sw_ver = swm.get("version","")
    _is_cjk = lambda s: any('一' <= c <= '鿿' for c in (s or ""))
    _zh_filled = 0
    for row in swm["rows"]:
        mid = str(row[0]); pick, ban = row[2], row[3]
        first = row[5] if len(row) > 5 else 0
        # 圖鑑中文名採 swranking 繁中(monsterNameZho)，僅補「原本空白」且為真中文者
        zho = row[1]
        if mid not in zh_existing and _is_cjk(zho):
            zh_existing[mid] = zho; _zh_filled += 1
        # 出場率 / 禁用率 / 首選率(被當首選=版本頂級) 三signal 取最強
        p = "S" if pick>=0.12 else "A" if pick>=0.045 else "B" if pick>=0.02 else "C"
        b = "S" if ban>=0.35 else "A" if ban>=0.25 else "B" if ban>=0.15 else "C"
        fr = "S" if first>=0.06 else "A" if first>=0.03 else "B" if first>=0.01 else "C"
        t = min(p, b, fr, key=lambda x: RANK[x])
        for gm in grp[canon.get(mid, mid)]:
            if gm not in sw_map or RANK[t] < RANK[sw_map[gm]]: sw_map[gm] = t
        rp_map[mid] = round(pick*100, 1)   # RTA% 只標該精確形態
    print(f"swranking {sw_ver}: {len(swm['rows'])} 隻 RTA meta；補中文名 {_zh_filled}")

# 使用者覆蓋：只讀 對照表/強度.csv 的「覆蓋」欄(空→用自動計算，不回寫污染)
tier_override = {}
tpath = os.path.join(TAB, "強度.csv")
if os.path.exists(tpath):
    with open(tpath, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            t = (row.get("覆蓋") or "").strip().upper()
            if t in ("S","A","B","C","D"): tier_override[str(row["代碼"])] = t
def auto_tier(m):    # 客觀打底 + PvE meta + swranking RTA，取最強(不含使用者覆蓋)
    mid = str(m["mid"])
    cands = [base_tier(m)]
    if mid in meta_map: cands.append(meta_map[mid])
    if mid in sw_map: cands.append(sw_map[mid])
    return min(cands, key=lambda t: RANK[t])
def final_tier(m):
    return tier_override.get(str(m["mid"])) or auto_tier(m)
auto_map = {str(m["mid"]): auto_tier(m) for m in obt}
tier_map = {str(m["mid"]): final_tier(m) for m in obt}
print("meta 強怪未對到名字:", unmatched)
from collections import Counter as _C
print("tier 分佈:", dict(sorted(_C(tier_map.values()).items())))

# 圖鑑去重：同一張 icon 只留一張卡(未覺醒與覺醒共用同圖時，留 可召喚>已覺醒>較小mid 者)
def _rank(m): return (1 if m.get("obtainable") else 0, m["aw"], -int(m["mid"]))
_best = {}
for m in obt:
    if m["img"] not in _best or _rank(m) > _rank(_best[m["img"]]): _best[m["img"]] = m
catalog_src = [m for m in obt if _best[m["img"]] is m]

catalog = [{
    "mid": str(m["mid"]),
    "en": m["name"],
    "zh": zh_existing.get(str(m["mid"]),""),
    "at": ELEM.get(m["element"], m["element"]),
    "ar": m["arch"],
    "ns": m["ns"],
    "aw": m["aw"],
    "obt": 1 if m.get("obtainable") else 0,
    "tier": tier_map[str(m["mid"])],
    "rp": rp_map.get(str(m["mid"]), 0),
    "img": m["img"],
} for m in catalog_src]
with open(os.path.join(WORK,"catalog.json"),"w",encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, separators=(",",":"))

# 怪物圖鑑.csv (完整可召喚，設計用)
def wcsv(path, header, rows):
    with open(path,"w",encoding="utf-8-sig",newline="") as f:
        w=csv.writer(f); w.writerow(header); w.writerows(rows)

byname = sorted(obt, key=lambda m:(m["name"].lower(), m["ns"]))
rows=[]
for m in byname:
    mid=str(m["mid"])
    rows.append([mid, m["img"], m["name"], zh_existing.get(mid,""),
                 ELEM.get(m["element"],m["element"]), ARCH_ZH.get(m["arch"],m["arch"]),
                 m["ns"], AW_ZH.get(m["aw"],m["aw"]), ("可召喚" if m.get("obtainable") else "非常駐"),
                 tier_map[mid],
                 m["hp"], m["atk"], m["def"], m["spd"], m["cr"], m["cd"], m["res"], m["acc"],
                 m.get("src","")])
# HP/ATK/DEF = 6★ Lv40 滿等體質(max_lvl)；SPD/暴率/暴傷/抵抗/命中 為固定基礎值
wcsv(os.path.join(TAB,"怪物圖鑑.csv"),
     ["代碼","圖示","英文","中文","屬性","職業","天生星","覺醒","收錄","強度",
      "滿HP","滿ATK","滿DEF","SPD","暴率","暴傷","抵抗","命中","取得方式"],
     rows)

# 強度.csv：可編輯覆蓋源。「自動」=程式算的(參考用)，「覆蓋」=你要改就填 S/A/B/C/D(空=用自動)
srows = [[str(m["mid"]), m["name"], zh_existing.get(str(m["mid"]),""),
          ELEM.get(m["element"],m["element"]), ARCH_ZH.get(m["arch"],m["arch"]),
          m["ns"], auto_map[str(m["mid"])], tier_override.get(str(m["mid"]),"")] for m in byname]
wcsv(tpath, ["代碼","英文","中文","屬性","職業","天生星","自動","覆蓋"], srows)

# 補全 怪物.csv (清乾淨亂碼、覆蓋所有可召喚，保留既有中文)
mon_rows=[[str(m["mid"]), m["name"].replace(",","，"), zh_existing.get(str(m["mid"]),"")]
          for m in byname]
wcsv(mon_csv, ["代碼","英文","中文"], mon_rows)

# 下載清單 (obtainable 的 img)
dl = sorted({m["img"] for m in obt if m.get("img")})
with open(os.path.join(WORK,"icon_list.txt"),"w",encoding="utf-8") as f:
    f.write("\n".join(dl))

print("icon_map", len(icon_map))
print("catalog(obtainable)", len(catalog))
print("怪物圖鑑.csv rows", len(rows))
print("怪物.csv rows", len(mon_rows))
print("icons to download", len(dl))
print("preserved 中文", len(zh_existing))
