# 流行音樂dle

只聽 0.1 秒，猜是哪首歌。猜錯或跳過就多聽一點（0.1 → 0.5 → 2 → 8 → 15 秒）。

玩法受 [Songspot](https://songspot.net/) 與 Heardle 啟發，本專案與它們沒有任何關聯。

- 題庫：華語、經典、台語、日文、韓文、西洋（共 264 首）
- 作答：華語歌只接受繁體中文歌名（不接受簡體、拼音）；日韓西洋歌用原文歌名，部分日文歌也接受 `aliases` 裡的中文譯名。可以輸入歌手名從清單挑歌
- 介面：台灣夜市霓虹招牌風格，背景是老屋的海棠花窗花玻璃紋，曲風配色取自客家花布。桌機三欄式，手機版收進漢堡選單
- 連勝和戰績存在瀏覽器（localStorage），不需要帳號
- 「挑戰朋友」會產生一個帶歌曲代碼的連結

## 開發

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 單元測試
npm run coverage   # 覆蓋率（src/core）
npm run build      # 產出 dist/，任何靜態主機都能放
```

## 架構

純靜態網站，沒有後端。

```
data/songs.json ──(npm run data:fetch)──> data/previews.json ──(npm run data:build)──> public/bank.json
 人工維護的題庫        iTunes Search API          試聽網址、封面、配對信心度            遊戲載入的題庫
                      （台灣區）                                                 
```

| 路徑 | 內容 |
| --- | --- |
| `src/core/` | 純邏輯，都有測試：正規化、搜尋與答案比對、回合狀態機、抽歌、戰績、挑戰連結 |
| `src/audio.ts` | Web Audio 播放器：整段試聽解碼成 `AudioBuffer`，再精準切出 0.1 秒片段 |
| `src/ui/` | DOM 渲染與自動完成（等注音輸入法組字完成才送出） |
| `src/app.ts` | 控制器：狀態、事件、存檔 |
| `tools/` | 題庫工具（Node） |

### 音訊

不存任何音檔。`previews.json` 只記 Apple 官方 30 秒試聽的網址，瀏覽器在遊戲時直接向 Apple 串流。Apple 的 CDN 有回 `Access-Control-Allow-Origin: *`，所以可以用 `fetch` 加 `decodeAudioData`，不需要代理。

試聽網址偶爾會失效，可以定期重跑 `npm run data:fetch -- --force`。遊戲遇到載入失敗會讓玩家直接換下一首，不計入戰績。

## 新增歌曲

1. 在 `data/songs.json` 加一筆 `{ "title", "artist", "genre" }`，genre 是 `mando`、`classic`、`tw`、`jp`、`kpop` 或 `west`。可選欄位：`aliases`（也算對的歌名）、`artistAliases`（商店裡的其他歌手寫法，例如 少女時代）、`country`（指定商店）。歌名要寫乾淨，不要加「(電影主題曲)」這類副標題。需要別名時加 `"aliases": [...]`。
2. `npm run data:fetch`：只會抓還沒有的歌。信心度不是 high 的會列出來，**請實際試聽**，因為翻唱、Live、綜藝節目版本的歌名和歌手常常完全一樣。
3. `npm run data:build`：重新產生 `public/bank.json`。

商店地區：日文歌預設查 JP 商店（台灣區會把日文歌名轉成羅馬拼音），韓文、西洋歌預設查 US 商店（台灣區會把 BTS 寫成 防彈少年團），其他查 TW。試聽網址是全球 CDN，在台灣播放沒問題。

`data:fetch` 的其他參數：`--force` 全部重抓、`--only id1,id2` 指定歌曲、`--country HK` 強制所有歌都查同一個商店、`--delay 3000` 調整間隔（API 大約每分鐘 20 次）。

## 上線與更新題庫

GitHub Pages 由 `.github/workflows/deploy.yml` 自動部署：

- **加歌**：在 GitHub 網頁上編輯 `data/songs.json` 並 commit 到 `main`。Actions 會自動抓新歌的試聽網址、跑測試、build 並部署，大約 2～3 分鐘就會上線。
- **檢查結果**：打開 Actions 裡那次執行的頁面，摘要會列出信心度不足和找不到的歌，可以直接點連結試聽。
- **每週一凌晨**會自動重抓所有試聽網址（`--force`），修正失效的連結。批次重抓時如果找不到某首歌，會保留舊網址，不會讓題庫莫名變少。
- 抓到的資料（`data/previews.json`、`public/bank.json`）會自動 commit 回 `main`。
- **手動執行**：Actions → Deploy → Run workflow，勾選 force 就會全部重抓。

第一次設定：repo 的 Settings → Pages → Source 選 **GitHub Actions**。

## 授權與版權

- `tools/lib.mjs` 的配對邏輯移植自 [ntupm18th/ntupm-songguesser](https://github.com/ntupm18th/ntupm-songguesser)（MIT），授權全文見 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。
- 試聽音訊與專輯封面在遊戲時直接從 Apple 串流，本專案不儲存、不散布任何音檔。錄音、封面、歌名與歌手名稱的權利屬原權利人所有。
