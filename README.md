# 魔靈召喚 帳號資料分析

分析《魔靈召喚（Summoners War）》帳號匯出檔（SWEX / com2us JSON 格式），產出一個**離線互動式分析工具**，涵蓋怪物盤點、符文評分、地下城隊伍建議與符文自動配裝。

- 帳號：`Lv✨九濤峰✨`（wizard_id 132789，TW 伺服器，Lv100）
- 資料日期：2026-07-10
- 環境：Windows 11 + PowerShell 5.1（本機無 Python / Node）

---

## 快速開始

1. 直接用瀏覽器開啟 **`魔靈分析工具.html`**（單一檔、離線、資料已內嵌）。
2. **要換一份新帳號資料**：點右上角 **「📥 匯入新JSON」**，直接選新的 `smw*.json`，五個分頁即時刷新，**免跑任何腳本**。
3. 想把怪物顯示成中文名 → 編輯 `對照表\怪物.csv` 的「中文」欄，再執行 `更新工具.ps1` 重建（重建後匯入的新檔也會套用中文名）。

---

## 帳號概況

| 項目 | 數量 | 備註 |
|---|---|---|
| 怪物 | 655 | 6★ 594、5★ 15、4★以下 46 |
| 天生 5★ 已 6★ 化 | 217 | 召喚池核心資源充足 |
| 符文（總） | 3287 | 已裝 1662 ＋ 倉庫 1625 |
| ─ 6★ 符文 | 3242 | 平均效率 **86.9%**、90%+ 高分 **1455** 個 |
| ─ 上古符文 | 251 | class≥11 |
| 神器 | 657 | 已裝 237 ＋ 倉庫 420 |
| 魔礦（rune_craft） | 587 | 磨刀石 / 附魔寶石等 |

6★ 職業分佈：攻擊 276 / 輔助 174 / HP 96 / 防禦 48。屬性齊全（水157/火160/風150/光100/暗88）。

---

## 目錄結構

```
魔靈Json分析/
├─ smw20260710.json        原始帳號匯出檔（資料來源，勿改）
├─ 魔靈分析工具.html         ★成品：單一離線分析工具
├─ 更新工具.ps1             編輯對照表後，一鍵重建工具
├─ README.md               本文件
│
├─ icons/                   怪物圖示 PNG（2032 檔，涵蓋 2339 隻真魔靈，來源 SWARFARM CDN）
│                          檔名＝image_filename，工具以 icons/<檔名> 相對路徑引用
│
├─ 對照表/                  ★可編輯的中英文名稱來源
│   ├─ 怪物.csv             代碼(master_id), 英文, 中文  （中文空→顯示英文；已含全部真魔靈 2339）
│   ├─ 怪物圖鑑.csv          ★完整魔靈圖鑑(2339 筆)：代碼/圖示/中英名/屬性/職業/天生星/覺醒/收錄/滿等體質(6★40)/取得方式
│   ├─ 符文.csv             套裝/屬性/品質（官方繁中已預填）
│   ├─ 魔礦.csv             craft_type 類型
│   └─ 說明.txt             對照表編輯規則
│
├─ work/                    解析管線與中間產物
│   ├─ extract.ps1          原始JSON → 抽出符文/怪物/神器(含效率計算)
│   ├─ analyze.ps1          命名 + 產出總覽 (units_named / runes_named)
│   ├─ make_maps.ps1        產生「對照表/」三個 csv
│   ├─ fetch_swarfarm.ps1   抓 SWARFARM 全 3070 隻怪(名稱/圖示檔名/屬性/職業/星數/基礎值) → swarfarm_all.json
│   ├─ build_catalog.py     由 swarfarm_all → 產出 catalog/icon_map/links/怪物圖鑑.csv、補全怪物.csv、icon_list.txt
│   ├─ download_icons.ps1   依 icon_list.txt 從 SWARFARM CDN 下載圖示到 icons/
│   ├─ gen_payload.ps1      套用對照表 → 產出精簡內嵌資料(p_units / p_runes；已含 mid)
│   ├─ build.ps1            把資料+app.js+catalog+icon_map 注入 tool_template.html → 成品
│   ├─ tool_template.html   工具的 HTML/CSS 骨架
│   ├─ app.js               工具的全部前端邏輯（含怪物圖鑑、地下城 meta DB）
│   ├─ importer.js          瀏覽器端 smw JSON 解析器（供「匯入新JSON」即時重算，含 mid）
│   ├─ serve.ps1            本機靜態伺服器(驗證用, port 8791)
│   ├─ monster_db.json      SWARFARM 抓的 3070 隻怪對照(com2us_id→英文名)
│   ├─ swarfarm_all.json    SWARFARM 全怪原始欄位(圖示/屬性/職業/基礎值/取得方式)
│   ├─ catalog.json         真魔靈圖鑑資料 2339(內嵌用；含 obt 常駐旗標)
│   ├─ icon_map.json        master_id → 圖示檔名(內嵌用，供已持有怪 ICON 查找)
│   ├─ links.json           master_id → 覺醒鏈群組代表(內嵌用，供圖鑑持有等價判定)
│   └─ *.json               各階段中間資料
└─ .claude/launch.json      Claude Preview 啟動設定
```

---

## 解析管線

```
smw20260710.json
   │  extract.ps1     ← 對照表(套裝/屬性代碼)、效率公式
   ▼
runes.json / units.json / artifacts.json / master_ids.json
   │  analyze.ps1     ← monster_db.json(SWARFARM)
   ▼
units_named.json / runes_named.json          （英文命名 + 總覽統計）
   │  gen_payload.ps1 ← 對照表/怪物.csv、符文.csv （套用中文名，空則退回英文）
   ▼
p_units.json / p_runes.json                  （精簡、內嵌用）
   │  build.ps1       ← tool_template.html + app.js
   ▼
魔靈分析工具.html                              ★成品
```

> 換一份新的帳號匯出檔時，**兩種方式擇一**：
> - **最快**：直接在工具內按「📥 匯入新JSON」選新檔——`importer.js` 在瀏覽器端重跑 extract＋命名（用 build 時烤進去的 `monster_db` 與怪物中文對照），即時重繪，不需任何腳本。
> - **走管線**（要重新產出中間檔或更新對照表時）：改各腳本開頭的來源路徑，依序跑 `extract → analyze → make_maps(如需) → 更新工具.ps1`。
> 只改了對照表中文名：直接跑 `更新工具.ps1`（= gen_payload + build）。
>
> 注意：瀏覽器匯入用的是**上次 build 時內嵌的**怪物中文對照與 `monster_db`；填新中文名或更新魔靈庫後需重跑 `build.ps1` 才會反映到「匯入」功能。

---

## 工具功能（六分頁）

1. **魔靈庫** — 655 隻，可依屬性 / 星數 / 職業 / 天生星數 / 五圍排序篩選；名稱前顯示怪物 ICON，名稱分「中文名 / 英文名」兩欄，搜尋框中英文皆可命中。點任一列可彈出詳細視窗，顯示該魔靈 6 洞符文與魔礦（磨刀石 / 附魔寶石）加成明細。
2. **怪物圖鑑** — **全部 2339 隻真魔靈**的 ICON 網格（現在遊戲裡的所有魔靈，含聯名各屬各形態、韓文名新怪；已排除水晶/王/塔/雕像/測試 dummy 等非魔靈）。可依屬性 / 職業 / 天生星數 / 覺醒狀態 / 持有狀態 篩選＋中英文搜尋。**已持有＝原色 ICON、未持有＝灰階**；標頭即時顯示「符合 N 隻／已持有 M 隻」。圖示來源 SWARFARM CDN，已下載到本機 `icons/`，離線可用。
   - 收錄範圍＝SWARFARM 有正式職業(arch≠none)的怪；其中 1977 隻常駐可召喚、362 隻為非常駐（聯名未覺醒形態、尚未在地區上架者等）。`怪物圖鑑.csv` 有「收錄」欄標示可召喚/非常駐。
   - **持有判定採「覺醒鏈等價」**：同一隻的未覺醒⇄覺醒⇄二次覺醒（及變身 transform）視為同一格，**持有其中任一形態，整條鏈都算持有並亮起原色**。（聯名怪轉原創怪為同一 `master_id`，持有即亮。）本帳號實測：精確比對 524 → 覺醒鏈等價 **1059** 隻亮起。
   - 每隻的**滿等體質(6★ Lv40)**與固定基礎值(SPD/暴率/暴傷/抵抗/命中)已放進 `對照表/怪物圖鑑.csv`（滿HP/滿ATK/滿DEF 欄）供後續設計試算用。
3. **符文庫** — 3287 個，可依套裝 / 洞位 / 主屬 / 效率 / 已裝或倉庫 / 裝備者篩選；效率已算好。
4. **地下城隊伍** — 內建各大地下城 meta 隊伍模板，自動標出 ✓擁有 / ✗缺少，可切「只顯示我有的」。涵蓋巨人/巨龍/死神 B12、鋼鐵要塞、懲罰者地穴、元素地下城、**次元異界龍(火/水/風)**、異界縫隙 R5、世界王。
5. **符文自動配裝** — 選怪＋選 4件套 / 2件套＋各洞主屬，引擎從符文池挑最佳解、湊套裝、算效率與符文加成合計；可勾選是否納入全帳號符文。
6. **總覽** — 屬性/職業/套裝/效率分佈長條圖與關鍵指標。

> **📥 匯入新JSON**（header 右上）：隨時載入新的 `smw*.json`，全在瀏覽器端解析、即時刷新六分頁（含圖鑑持有狀態），無需重跑 PowerShell。

---

## 名稱對照機制

- 工具顯示名稱一律取自 `對照表\`；**中文欄有填 → 顯示中文；留空 → 自動退回英文**。
- 怪物中文目前幾乎全空（顯示 SWARFARM 英文名），由使用者依遊戲逐步填入；`怪物.csv` 與 `怪物圖鑑.csv` 都有「中文」欄可填，`怪物.csv` 的中文會被工具與圖鑑優先採用。
- 符文套裝/屬性/品質已預填**官方繁中**，可自行修改。
- 每隻怪同時保留 `en`（SWARFARM 英文名）供**地下城模板比對**用；顯示可換中文但比對邏輯不受影響。

### 怪物圖鑑 / ICON 資料管線（獨立於上面主管線）

```
SWARFARM API (/api/v2/monsters/, 3070 隻)
   │  fetch_swarfarm.ps1
   ▼
work/swarfarm_all.json
   │  build_catalog.py
   ▼
work/catalog.json(真魔靈2339) + icon_map.json(mid→圖示) + links.json(覺醒鏈等價) + icon_list.txt
對照表/怪物圖鑑.csv + 對照表/怪物.csv(補全)
   │  download_icons.ps1 (依 icon_list.txt 抓 CDN)     build.ps1 (內嵌 catalog/icon_map)
   ▼                                                    ▼
icons/*.png(本機圖示)                                 魔靈分析工具.html(圖鑑分頁)
```

> 要更新圖鑑資料集（新怪上線）：依序跑 `fetch_swarfarm.ps1` → `build_catalog.py` → `download_icons.ps1`，再跑 `更新工具.ps1` 重建。
> ICON 以 `master_id` 對應：工具用 `icon_map` 查已持有怪的圖示、用 `catalog` 畫圖鑑；持有判定＝帳號 `unit_master_id`（payload 的 `mid`），再經 `links` 展開成「覺醒鏈群組」——持有群組內任一形態即整組亮起。等價圖由 SWARFARM 的 `awakens_from/awakens_to/transforms_to`（內部 id，需以 id→mid 解析）建無向圖取連通分量而得。

---

## 技術備註（踩過的坑）

- **PowerShell 5.1 讀 .ps1 需 UTF-8 BOM**，否則中文變亂碼；本專案腳本皆存成 BOM。
- **PS 5.1 不支援 `(if(){}else{})` 內嵌運算式**（PS7 才有），只能 `$x = if(){}else{}`。
- **已裝備符文藏在各 `unit_list[].runes` 裡**，頂層 `runes` 只有倉庫未裝的；神器同理。要合併兩邊才是完整資產。
- **符文效率公式** = (主屬ratio + Σ副屬ratio) / 2.8 × 100；`class≥11` 為上古(減10=星數)。
- **魔礦 `craft_type_id` 解碼** = set×10000 + effect×100 + grade(品質)；`craft_type` 分 1~6 種。
- 特殊套裝：`set_id 25 = Intangible`、`99 = Immemorial(無形，僅魔礦)`，繁中名待遊戲內確認。

---

## 已知限制 / 後續可做

- 怪物繁中名需人工填入（官方無以 ID 索引的繁中資料集；SWARFARM、swranking、lucksack 皆非可程式化直取的繁中來源——前者僅英文，後兩者需登入 / 有 Cloudflare 防護）。
- 地下城模板為通用 meta 角色定位參考，實戰以「✓擁有」的角色搭配為主。
- `icons/` 約 2032 個 PNG（數十 MB）。若要推上遠端，考慮是否納入版控或改用 `.gitignore` 排除、由腳本重抓。
- 部分最新／未在地區上架的魔靈，SWARFARM 尚無英文名，圖鑑顯示 SWARFARM 的**韓文原名**（待填中文）。抓取已強制 UTF-8（`WebClient`），修掉 PS5.1 `Invoke-RestMethod` 的 Latin-1 亂碼（Altaïr、Übel 等重音字亦已正確）。
- 尚未做：魔礦/神器獨立分頁、配裝引擎加入含基礎值的最終五圍試算、怪物繁中名補完。

---

## ⚠️ 安全提醒

`smw20260710.json` 內含帳號個資與 `session_key` 等憑證欄位。目前僅本機 git 版本控管；**若日後要推上遠端（GitHub 等），請先把原始 JSON 加入 `.gitignore` 或移除敏感欄位**，避免外洩。
