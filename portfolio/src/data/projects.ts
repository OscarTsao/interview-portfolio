export type Project = {
  title: string; category: string; intro: string; stack: string; context: string;
  image?: string; status: string; problem: string; implementation: string[];
  contribution?: string;
  steps: string[]; decisions: { title: string; text: string }[];
  evidence: { title: string; text: string }[]; boundary: string;
  demoPath: string; external: boolean; demoLabel: string;
  comparison?: [string, string, string][];
};

export const featured = ['bitoguard', 'hied'];

export const projects: Record<string, Project> = {
  vision: {
    title:'Ophthalmic Imaging', category:'COMPUTER VISION / PCV SEGMENTATION',
    intro:'對照封存的分割結果、失敗案例與紅色病灶標註，理解 PCV 分割任務與模型誤差。',
    stack:'Python · PyTorch · 影像分割／後處理', context:'TVST 2025 研究脈絡；Handover 研究封存與資料集範例',
    contribution:'相關 TVST 論文中，我是第二作者，負責影像後處理並參與跨院資料整理、研究討論與撰寫。本機展示包含找回的研究比較圖，以及三組配對的原圖、標註、預測與後處理結果。',
    status:'預測與後處理比較 · 本機研究影像',
    problem:'PCV 分割的目標是找出 FA 影像中的病灶範圍。展示需要清楚區分輸入影像、參考標註與模型預測，才能解釋任務及評估誤差。',
    implementation:['找回研究簡報中的 AG-PCV／SM-MT 比較圖，以兩個相對改善案例與一個失敗案例呈現差異。','同一案例可切換原始標註、模型尺寸標註、封存預測及後處理結果；保留紅色疊圖、二值遮罩與透明度控制。','獨立遮罩的 Dice 重算值吻合封存紀錄；三案呈現後處理變差、不變與改善，說明最大連通區域的取捨。'],
    steps:['先在本機研究頁比較參考影像、AG-PCV 與 SM-MT 的封存疊圖，包含兩者都表現不佳的案例。','向下選擇同一影像的模型尺寸標註、封存預測與後處理圖層。','調整紅色疊圖不透明度或切換二值遮罩，觀察被移除的區域與 Dice 變化。','使用結果／影像連結保留選例與圖層；重設會回到第一張原始尺寸標註、疊圖模式與 45% 不透明度。'],
    decisions:[{title:'各種數值都有可核對的來源',text:'簡報疊圖的 Dice 保留來源記錄值；獨立預測的 Dice 則由二值遮罩重算，並核對封存文字紀錄。沒有從彩色疊圖反推遮罩。'},{title:'同尺寸、同座標比較',text:'原始尺寸標註維持原樣；模型輸入及其標註、預測、後處理皆為 224 × 224，先驗證配對與二值資料，再繪製紅色疊圖。兩種尺寸不混用。'},{title:'保留研究版本邊界',text:'Handover 簡報與逐像素輸出分開呈現，尚未逐案確認與最終 TVST 論文的對應。模型在三張輸入上的一致性不取代完整評估；改善與下降案例也不代表整體效果。'}],
    evidence:[{title:'固定來源與原始檔案',text:'封存比較取自 Handover_images.pptx 第 3、4、10 頁；三組互動案例另配對到 Handover Linux 封存的原始輸入、標註、預測及後處理檔案。來源與 SHA-256 保留於本機。'},{title:'可檢查的展示行為',text:'影像與圖層可切換並回到指定連結；遮罩關閉時還原輸入，二值模式與來源 mask 一致。每次載入核對檔案與 Dice，失敗時隱藏結果並可重試。'},{title:'已驗證與仍有限制的部分',text:'找回的 DeepLabV3+／ResNet101 權重可完整載入；三張封存輸入重新推論，預測逐像素一致。這是指定案例核對，與最終 TVST 論文的逐案對應及整體評估仍待確認。'}],
    boundary:'三張案例的預測與重新推論一致，但展示並非完整評估集，也尚未重現最終論文。私人影像僅供本機預覽，靜態建置不包含這些資料。',
    demoPath:'vision/',external:false,demoLabel:'查看分割研究展示',
  },
  bitoguard: {
    title: 'BitoGuard', category: 'ML APPLICATION / PRODUCT',
    intro: '從異常警示到案件處置，讓風險分析有可以追查的證據與操作流程。',
    stack: 'Next.js · FastAPI · DuckDB · ML', context: '金融異常活動分析平台',
    contribution: '2026 AWS Hackathon 的兩人團隊作品。我負責機器學習流程、特徵工程、風險解釋與系統架構，也參與 AWS 部署；網頁儀表板是團隊共同成果。',
    image: 'bitoguard.png', status: '原產品介面 · 合成展示資料',
    problem: '風險分數無法單獨說明一個帳戶為何需要審查。分析人員還需要看帳戶活動、交易與關聯證據，再留下可回看的處置。BitoGuard 把這些步驟放進同一個產品。',
    implementation: ['儀表板與警示中心提供案件入口和風險篩選。', '用戶全貌、關聯圖與診斷報告補上帳戶及事件脈絡。', '確認可疑、排除誤報、升級案件與持續監控，對應不同案件狀態。'],
    steps: ['在警示中心選擇「極高風險」，開啟 demo-user-001 的診斷報告。', '查看報告中的風險因素，再從用戶全貌與關聯圖觀察同一帳戶；可切換 1-hop／2-hop。', '回到報告選擇「升級案件」，重新整理確認決策保存。', '使用頂部「重設我的展示案件」，確認後回到初始警示；不影響其他訪客。'],
    decisions: [
      {title:'保留產品，再替換展示資料來源',text:'沿用原 Next.js 頁面、Sidebar 與圖譜操作，以相同 API 格式供應合成資料。這讓展示保留產品工作流程，同時避免依賴原 AWS 與模型服務；代價是不能用這版證明完整 ML 後端已移植。'},
      {title:'訪客隔離的可寫情境',text:'展示處置按訪客保存到 D1，重新整理仍可查看；重設只清除本人案件。這適合重複面試示範，但目前只保存最新處置，不是完整稽核歷程。'},
      {title:'模型成效獨立說明',text:'原 Model Card 記錄資料回填、重複樣本、非活動特徵捷徑及圖特徵限制。評估必須連同切分、基準與版本閱讀，不能把單一高分或展示介面數字當作泛化能力。'},
    ],
    evidence: [
      {title:'可操作的原版流程',text:'六個主要頁面保留警示篩選、診斷報告、案件處置、用戶切換、二跳關聯圖與模型指標。'},
      {title:'工程驗證',text:'2026-10-04 已在公開 HTTPS 網址驗證跨頁操作、決策保存、不同訪客隔離與失敗重試；原始前端來源另有檔案對照。這些驗證 UI 與展示行為，不驗證模型成效。'},
      {title:'兩種架構的範圍',text:'原系統為 Next.js、FastAPI 與 DuckDB，我負責的工作包含 AWS 部署。目前作品集已部署至 GitHub Pages，BitoGuard 展示由 Cloudflare Workers 與 D1 提供；原始 ML 後端尚未移植。'},
    ],
    boundary:'帳戶、交易、關聯與模型指標均為合成介面測試資料，未執行原模型推論、同步或訓練。原產品採桌面分析介面，建議用較寬螢幕操作。',
    demoPath:'/bitoguard/', external:true, demoLabel:'操作 BitoGuard',
  },
  hied: {
    title:'HiED', category:'MASTER’S THESIS / RESEARCH',
    intro:'分開檢視候選排序、準則相容集合與最終輸出，理解診斷推理中的分歧。',
    stack:'Python · Multi-Agent Systems · Evaluation', context:'碩士論文研究',
    contribution:'這是我在國立中正大學資訊工程碩士班的論文。我設計結合 LLM 多代理推理與診斷規則的研究系統，分離模型判讀與規則判定，並產出可追溯的結構化報告。',
    image:'hied.png', status:'凍結研究案例 · 無即時推論',
    problem:'最終主要診斷並不能代表整個推理過程。HiED 研究中文精神科訪談中的診斷推理，將候選排序、準則檢查與最終選擇分開觀察，檢視它們如何一致或分歧。',
    implementation:['診斷路徑產生候選排序，準則檢查路徑評估各診斷條件。', '準則相容集合、排序和主要輸出分別呈現；三個案例各保留 78 項準則狀態。', '1,000 案群體數值由凍結資料重新計數，對照現行論文主張；個案與整體結果分開閱讀。'],
    steps:['先查看 P001，對照參考父類別、前三候選 D3、準則相容 I 與主要選擇 S。', '切換 P015，在診斷代碼選單查看每個準則；用篩選器只顯示未滿足或資料不足。', '往下比較 1,000 案中 HiED、Single LLM 及詞彙基準的結果，閱讀 272 案分歧及已撤回指標的說明。', '複製案例網址或下載最小凍結資料，可核對來源版本、主張 ID 與檔案雜湊。'],
    decisions:[
      {title:'把三種結果分開討論',text:'候選包含某個診斷、準則允許某個診斷，以及系統最後選出某個診斷，是不同問題。研究的貢獻在於分開檢視這些結果，不自行推導成「多代理提高準確率」。'},
      {title:'展示凍結結果',text:'預先分析案例可以直接閱讀，不需要等待模型啟動。匯出相容集合、準則 ID 與三態結果，保留資料不足狀態；不公開訪談引文、模型推理或接受新訪談輸入。'},
      {title:'保留證據的版本邊界',text:'論文主張清單區分目前聲明、已移除主張與離線核驗程度。從凍結資料核驗數字、重建圖表、重新呼叫模型是不同工作；新執行不能替換原論文結果。'},
    ],
    evidence:[
      {title:'研究方法',text:'核心管線依序處理輸入、可選檢索、候選排序、準則評估、規則、最終選擇與結果輸出。查看器將候選、相容集合、逐項準則與最終輸出放在同一個案例中核對。'},
      {title:'研究評估與主要發現',text:'論文以 1,000 筆合成對話評估，發現參考診斷已進入候選且通過準則、卻未被選為主診斷的分歧，並在另一資料集觀察到相似現象。這項研究結果與下方三個凍結展示案例屬於不同範圍；三案不代表整體樣本。'},
      {title:'案例來源',text:'P001、P010、P015 來自 LingxiDiag-16K 的 20 案 D3-I-S 分歧標註子集。每案保留來源 ID、模型、凍結執行名稱與原始狀態。'},
      {title:'證據鏈',text:'研究儲存庫以 PAPER_CLAIMS.yaml 對應主張與來源。本機匯出重新核對三組相同 1,000 案群體的標籤計數與 272 案 D3=1/I=1/S=0 分歧，不重新執行模型；已撤回的 Single Top-3 不列值。'},
    ],
    boundary:'案例經過選取，不能代表整體效能；沒有即時分析或臨床判讀。HiED 是正式系統名稱，CultureDx 是研究歷程中的舊工作儲存庫名稱。',
    demoPath:'research/', external:false, demoLabel:'探索凍結案例',
  },
  maze: {
    title:'Procedural Maze',category:'WEB TECHNOLOGIES / INTERACTIVE',
    intro:'把 DFS 生成、迷霧視野與操作回放，做成可以直接玩的迷宮。',
    stack:'JavaScript · HTML / CSS · DFS',context:'Web Technologies HW2',image:'maze.png',status:'課程原作 · 瀏覽器運行',
    problem:'生成可通行的隨機迷宮只是第一步。玩家還需要清楚的移動、視野與遊戲狀態回饋，並能回顧自己的操作。',
    implementation:['以深度優先搜尋產生迷宮。','保留原作的迷霧、事件與回放等互動。','運算在瀏覽器完成，無需登入或後端資料庫。'],
    steps:['選擇迷宮難度後開始遊戲。','依原遊戲操作說明移動，觀察迷霧與事件回饋。','嘗試回放或重新開始，觀察遊戲狀態的差別。'],
    decisions:[{title:'原作直接作為展示',text:'遊戲本身已經是可操作成果，沿用原始靜態頁面及規則，不為作品集重新製作另一套遊戲。'},{title:'介紹與遊戲分開',text:'這一頁負責解釋演算法與互動重點，遊戲入口讓訪客直接操作。複雜的遊戲畫面不需要塞進首頁縮圖中。'}],
    evidence:[{title:'可以直接驗證的成果',text:'開始一局迷宮並觀察移動與視野；演算法說明與實際遊戲可互相對照。不以未測量的 FPS、使用者數或效能提升作成果。'}],
    boundary:'這是課程原作。請依遊戲的鍵盤操作說明使用；作品集的手機版適配不代表原遊戲所有操作已適配觸控。',demoPath:'coursework/hw2/index.html',external:false,demoLabel:'開始玩迷宮',
  },
  ecommerce:{
    title:'E-Commerce',category:'WEB TECHNOLOGIES / FULL STACK',intro:'從分類選購到賣家出貨，走完一筆商城訂單。',stack:'PHP / MySQL → Workers / D1',context:'Web Technologies HW3',image:'ecommerce.png',status:'原作版面與流程 · 隔離展示商城',
    problem:'商城需要在使用者、商品與訂單之間維持一致的資料，同時處理買家購物與賣家管理的不同任務。',
    implementation:['保留原分類、商品卡片、圖片輪播、商品頁、購物車與會員側欄；支援註冊、資料／頭像與密碼管理。','買家依賣家結帳；賣家可上架、編輯、下架商品及標示出貨，買家確認收貨後進入歷史訂單。','D1 按訪客隔離整個展示商城；價格、庫存、角色權限與重複訂單由伺服器檢查。'],
    steps:['登入頁選擇「試用買家」，從商品頁加入購物車，建立模擬訂單。','切換「試用賣家 A」，進入我的訂單／售出訂單並標示已出貨。','切回買家確認收貨，再查看歷史訂單。','也可註冊獨立展示帳號，上傳商品照片、修改庫存或個人資料；頂部可確認後重設本人的展示。'],
    decisions:[{title:'保留任務，改寫資料存取',text:'原 PHP 模板的頁面結構與樣式沿用至瀏覽器介面；Worker 處理資料存取與驗證。D1 用版本條件更新，讓扣庫存和建立訂單一起成功，並拒絕並行超賣。'},{title:'訪客各有一個練習商城',text:'同一訪客可以切換示範買賣角色；其他訪客的帳號、商品及訂單互不影響。這是可重設的課程展示，不是跨訪客營運的真實商城。'}],
    evidence:[{title:'本機操作與一致性驗證',text:'已驗證註冊、登入、密碼與資料更新、商品輪播／編輯、買家結帳、賣家出貨及完成訂單；伺服器檢查價格竄改、重試與兩筆並行搶最後庫存。'},{title:'介面檢查',text:'11 種頁面於 320、390、768、1440px 檢查排版與 axe 自動規則；另驗證取消刪除、失敗重試及跨訪客隔離。'}],
    comparison:[['商品與訂單','PHP／MySQL','Workers／D1，合成商品與模擬付款'],['會員及商品管理','原登入、買賣家與資料編輯','保留流程；每個訪客獨立展示帳號'],['庫存與重試','原資料表更新','版本條件更新與訂單識別碼'],['產品介面','原 PHP 模板與 CSS','沿用頁面結構、原 CSS 與響應式修正']],
    boundary:'展示不收款、不寄送訂單，也不提供正式會員服務；原上傳商品照片不在儲存庫內，初始商品用清楚標示的合成內容。',demoPath:'/hw3/',external:true,demoLabel:'操作商城',
  },
  nutrition:{
    title:'Nutrition Explorer',category:'WEB TECHNOLOGIES / API INTEGRATION',intro:'搜尋真實食物資料，切換份量並保存收藏。',stack:'FatSecret OAuth · Chart.js · Workers',context:'Web Technologies HW4',image:'nutrition.png',status:'原作流程 · FatSecret 即時查詢',
    problem:'外部營養資料需要經過查詢、授權與整理，才能在瀏覽器中提供容易閱讀的結果。',
    implementation:['保留原作搜尋頁、結果分頁、份量明細、Chart.js 圓餅圖及收藏。','Worker 以 OAuth 1.0 簽署 FatSecret 請求，憑證只在伺服器使用；瀏覽器收藏僅保存食物 ID。','缺漏數值顯示未提供，連線失敗可重試，不替換成合成營養值。'],
    steps:['搜尋英文食物名稱，例如 rice 或 apple，使用下一頁瀏覽結果。','開啟食物，切換份量，對照熱量、營養表及圖表。','加入收藏，再開啟收藏清單；重新整理後收藏仍保留。','若來源暫時無法取得資料，使用重新載入重試。'],
    decisions:[{title:'真實 API 與資料保存分開',text:'即時取得營養內容；依供應商回應欄位的保存規則，收藏只存食物 ID，開啟時重新抓取明細。圖表程式隨站點供應，避免第三方 CDN 影響基本互動。'},{title:'不讓缺漏偽裝成零',text:'未提供、實際零值與請求失敗是三種不同狀態。缺少營養素時停用比例圖，表格仍保留可用資料與明確狀態。'}],
    evidence:[{title:'本機完整流程',text:'現有帳號的即時搜尋與份量資料已實測；瀏覽器驗證分頁、份量、ID 收藏、文字安全、缺漏／零值、錯誤重試及四種螢幕寬度。'}],
    comparison:[['授權介接','PHP OAuth 1.0','Worker OAuth 1.0，沿用既有來源'],['搜尋與明細','搜尋、分頁、份量','全部保留'],['圖表與收藏','Chart.js、LocalStorage','圖表保留；收藏僅保存 ID'],['產品 UI','原頁面與 CSS','保留版面；缺失背景素材改用 CSS 背景']],
    boundary:'查詢由 FatSecret 即時提供，資料可用性與查詢額度依供應商；此頁不提供飲食或醫療建議。',demoPath:'/hw4/',external:true,demoLabel:'查詢營養資訊',
  },
  realtime:{
    title:'Chat & Game',category:'WEB TECHNOLOGIES / REAL TIME',intro:'同一個房間，從聊天、視訊到雙人格鬥。',stack:'Socket.io → WebSocket / Durable Objects · WebRTC',context:'Web Technologies HW5',image:'realtime.png',status:'原作聊天介面 · 視訊與 Canvas 遊戲',
    problem:'聊天、視訊與遊戲有不同的同步要求。原作把房間、訊息與雙人互動放在同一個應用中，讓使用者能共同參與。',
    implementation:['保留聊天室側欄、群組／私人對話、輸入提示、圖片及表情；房間代碼與邀請連結用於多人展示。','WebRTC 保留攝影機／麥克風選擇、開關與結束控制，收到邀請後須明確同意。','Canvas 保留原作移動、跳躍、近身攻擊、防禦、射擊與兩分鐘回合；狀態統一由伺服器計算。'],
    steps:['兩個瀏覽器輸入不同暱稱與相同房間代碼，或使用複製邀請連結。','先傳群組訊息，再選擇線上使用者開啟私聊，嘗試表情與圖片。','按遊戲圖示，對方接受後使用方向鍵與 1／2／3，或畫面按鈕對戰。','私人對話可邀請視訊，對方接受後才能開啟裝置；完成後按結束視訊。'],
    decisions:[{title:'房間狀態由單一實體管理',text:'每個房間使用 Durable Object；私訊只傳給成對使用者。遊戲沿用原物理與操作規則，改由伺服器統一裁決，避免兩個瀏覽器各算一次而產生不同結果。'},{title:'裝置使用需要清楚的操作',text:'進頁不存取攝影機，使用者發起或接受邀請後才開啟。離開、斷線及取消均釋放媒體軌道；視訊使用 STUN 直接連線，未加入 TURN 轉送。'}],
    evidence:[{title:'本機三瀏覽器驗證',text:'驗證群聊、私聊隔離、圖片、表情、輸入提示、雙人生命值一致、同步結束及重新連線。虛擬攝影機測試涵蓋邀請婉拒、接通後遠端影像、静音與軌道釋放。'},{title:'操作與版面',text:'桌面及 320／390／768／1440px 通過頁面寬度與 axe 自動檢查。虛擬裝置測試不代表所有實體網路及瀏覽器均可建立視訊。'}],
    comparison:[['聊天','群組、私訊、圖片、表情與輸入提示','原功能與布局保留，改用原生 WebSocket'],['視訊／音訊','Socket.io 信令、WebRTC','Durable Object 信令、WebRTC，新增同意流程'],['遊戲','Canvas 規則、瀏覽器計算','保留規則，伺服器統一狀態，新增觸控按鈕'],['連線身份','Socket.io 連線身份','訪客及分頁識別，重連可恢復暫存訊息']],
    boundary:'房間最多 8 人，訊息為暫存且無離線送達保證；視訊未配置 TURN，因此受限網路可能無法接通。',demoPath:'/hw5/',external:true,demoLabel:'進入 Chatroom',
  },
};
