# SWARFARM 魔靈資料集

來源：SWARFARM 公開 API（`https://swarfarm.com/api/v2/monsters/`）與其靜態圖庫。
抓取日期：2026-07-13。

## 檔案
- `monsters.json` — 3070 筆精簡資料（名稱、屬性、星級、圖檔名等），高/中信心的併有繁中名。
- `monsters_raw.json` — API 原始完整欄位（技能、數值、覺醒關係、來源…）。
- `monsters_zh.json` — 繁中比對稽核表（120 筆，含信心度與候選）。
- `images/` — 2166 張魔靈圖示 PNG（依 `image_filename` 命名）。

## monsters.json 欄位
| 欄位 | 說明 |
|------|------|
| id | SWARFARM 內部 id |
| com2us_id | 遊戲內 unit master id（可與遊戲 JSON 匯出對接） |
| name_en | 英文名（SWARFARM 原生，唯一權威名稱） |
| element | 屬性 Fire/Water/Wind/Light/Dark |
| archetype | 定位 Attack/Defense/HP/Support/Material |
| natural_stars / base_stars | 自然星 / 基礎星 |
| can_awaken / awaken_level | 覺醒相關 |
| obtainable | 是否可取得 |
| family_id | 同族（五屬性共用） |
| image_filename | 對應 images/ 下檔名 |
| image_url | SWARFARM 圖片原始網址 |

## 對應關係
`monsters.json[*].image_filename` == `images/` 內檔名，一一對應。
3070 筆中 3052 筆有本地圖；2 個圖檔在 SWARFARM 源頭即 404（`unit_icon_0196_2_4.png` 等）。

## 繁體中文名稱（best-effort）
SWARFARM 只有英文名。繁中取自 Fandom 中文 wiki（`summonerswar.fandom.com/zh`，內容本為繁體），
但該站無 com2us_id／英文名／langlinks 等機器對接鍵，故以 **infobox 數值模糊比對**：
用「屬性＋星等＋類型＋攻擊速度（等級無關）＋覺醒方向」對回 SWARFARM，並標註信心度。

Fandom zh 僅收錄 122 個怪物頁，故繁中僅覆蓋部分魔靈。

`monsters_zh.json` 各筆信心度：
- `high`(73) — 該組數值唯一對應，可信度高（一般戰鬥怪）。
- `medium`(6) — 放寬類型後唯一對應。
- `review`(1) — 素材類（速度0）數值退化易撞，須人工複核。
- `low`(25) — 同組數值多筆，`alt_en` 列出候選，須人工挑選。
- `none`(15) — 找不到對應（多為 Fandom 資料不全或新怪）。

`monsters.json` 內只併入 high+medium（71 筆）的 `name_zh`(去屬性前綴)／`name_zh_full`／`name_zh_conf`。
其餘請人工參考 `monsters_zh.json` 的 `alt_en` 校正。已知瑕疵：Fandom 少數頁 infobox 屬性填錯（如「光屬性哥魯達」infobox 誤填風），會連帶影響對應。
