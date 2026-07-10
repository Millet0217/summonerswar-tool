# -*- coding: utf-8 -*-
import json, csv, os
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
def sk(m):
    return (ELEM_ORDER.get(ELEM.get(m["element"],""),9), -m["ns"], m["name"])
obt.sort(key=sk)
catalog = [{
    "mid": str(m["mid"]),
    "en": m["name"],
    "zh": zh_existing.get(str(m["mid"]),""),
    "at": ELEM.get(m["element"], m["element"]),
    "ar": m["arch"],
    "ns": m["ns"],
    "aw": m["aw"],
    "obt": 1 if m.get("obtainable") else 0,
    "img": m["img"],
} for m in obt]
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
                 m["hp"], m["atk"], m["def"], m["spd"], m["cr"], m["cd"], m["res"], m["acc"],
                 m.get("src","")])
# HP/ATK/DEF = 6★ Lv40 滿等體質(max_lvl)；SPD/暴率/暴傷/抵抗/命中 為固定基礎值
wcsv(os.path.join(TAB,"怪物圖鑑.csv"),
     ["代碼","圖示","英文","中文","屬性","職業","天生星","覺醒","收錄",
      "滿HP","滿ATK","滿DEF","SPD","暴率","暴傷","抵抗","命中","取得方式"],
     rows)

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
