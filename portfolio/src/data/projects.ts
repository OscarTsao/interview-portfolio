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
    intro:'對照 FA 原圖與病灶參考標註，理解 PCV 分割任務與模型需要找出的區域。',
    stack:'Python · PyTorch · 影像分割／後處理', context:'TVST 2025 研究脈絡；Handover_Self-supervised 資料範例',
    contribution:'相關 TVST 論文中，我是第二作者，負責影像後處理並參與跨院資料整理、研究討論與撰寫。本機展示使用 repo 的原圖與參考標註，尚未補齊可追溯的模型分割預測。',
    status:'FA 原圖與病灶標註 · 模型預測待補',
    problem:'PCV 分割的目標是找出 FA 影像中的病灶範圍。展示需要清楚區分輸入影像、參考標註與模型預測，才能解釋任務及評估誤差。',
    implementation:['依相同檔名配對三組原圖與二值標註，保留原始尺寸。','以紅色疊圖呈現標註區域，可切換純遮罩、調整透明度或隱藏標註。','模型預測、評估與後處理成效尚缺對應輸出，分開標示；重建實驗移至附錄。'],
    steps:['開啟病灶標註展示，對照原圖與紅色標註區域。','切換影像，調整不透明度，或取消顯示標註以查看原圖。','切換二值遮罩，查看白色標註範圍與黑色背景。','使用影像連結保留選例；重設會回到第一張、疊圖模式與 45% 不透明度。'],
    decisions:[{title:'標註與模型輸出分開',text:'資料集 mask 是參考標註，不能當作模型預測。現階段可說明分割任務，但無法展示模型分割品質或計算有意義的預測指標。'},{title:'按原尺寸配對',text:'每組原圖與遮罩尺寸一致，先驗證遮罩為 0／255 二值資料，再繪製疊圖。顯示縮放不改變配對關係；透明度只改變標註的視覺強度。'},{title:'保留研究版本邊界',text:'示例取自自監督 repo 的 test 資料夾，尚未確認與 TVST 發表案例逐一對應。重建輸出另放實驗附錄，不作為病灶分割成效。'}],
    evidence:[{title:'固定來源與原始檔案',text:'來源版本為 344cd81，三組原圖與遮罩取自 All/FA/test 的 img、mask 目錄。來源 blob 與 SHA-256 對應保留於本機。'},{title:'可檢查的疊圖行為',text:'關閉標註時應還原原圖；純遮罩模式應與原始二值 mask 一致。案例切換、深連結、重設與失敗重試均可操作。'},{title:'目前缺少的成果證據',text:'快照有分割程式，但未找到可確認的已訓練分割權重與配對預測。尚不呈現模型遮罩、Dice、Hausdorff distance 或後處理提升。'}],
    boundary:'目前展示原圖與資料集參考標註，沒有模型預測、即時推論或論文重現結果。私人影像僅供本機預覽，靜態建置不包含這些資料。',
    demoPath:'vision/',external:false,demoLabel:'查看病灶標註',
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
      {title:'工程驗證',text:'本機瀏覽器檢查涵蓋跨頁操作、決策保存與不同訪客隔離；原始前端來源另有檔案對照。這些驗證 UI 與展示行為，不驗證模型成效。'},
      {title:'兩種架構的範圍',text:'原系統為 Next.js、FastAPI 與 DuckDB，我負責的工作包含 AWS 部署。此展示使用靜態前端、Worker API 與 D1；新展示的公開部署及外網驗收尚未完成。'},
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
    implementation:['診斷路徑產生候選排序，準則檢查路徑評估各診斷條件。', '準則相容集合、排序和主要輸出可分別評估，不把它們混成單一成功指標。', '研究結果對應凍結證據與論文主張清單；網站只讀取其中最小的案例欄位。'],
    steps:['先查看 P001，辨認資料集標準父類別、候選排序與主要輸出。', '切換到論文附錄案例 P015，對照來源編號與原始驗證狀態。', '閱讀選例方式與粒度說明：這些案例來自分歧子集，不用來估算整體效果。', '複製案例網址即可回到同一案例；重回 P001 不會修改任何研究結果。'],
    decisions:[
      {title:'把三種結果分開討論',text:'候選包含某個診斷、準則允許某個診斷，以及系統最後選出某個診斷，是不同問題。研究的貢獻在於分開檢視這些結果，不自行推導成「多代理提高準確率」。'},
      {title:'展示凍結結果',text:'預先分析案例可以直接閱讀，不需要等待模型啟動。代價是無法讓訪客輸入新訪談；目前也沒有匯出準則相容集合的完整細節。'},
      {title:'保留證據的版本邊界',text:'論文主張清單區分目前聲明、已移除主張與離線核驗程度。從凍結資料核驗數字、重建圖表、重新呼叫模型是不同工作；新執行不能替換原論文結果。'},
    ],
    evidence:[
      {title:'研究方法',text:'核心管線依序處理輸入、可選檢索、候選排序、準則評估、規則、最終選擇與結果輸出。案例查看器聚焦於可公開的標籤與排序。'},
      {title:'研究評估與主要發現',text:'論文以 1,000 筆合成對話評估，發現參考診斷已進入候選且通過準則、卻未被選為主診斷的分歧，並在另一資料集觀察到相似現象。這項研究結果與下方三個凍結展示案例屬於不同範圍；三案不代表整體樣本。'},
      {title:'案例來源',text:'P001、P010、P015 來自 LingxiDiag-16K 的 20 案 D3-I-S 分歧標註子集。每案保留來源 ID、模型、凍結執行名稱與原始狀態。'},
      {title:'證據鏈',text:'研究儲存庫以 PAPER_CLAIMS.yaml 對應論文主張、版本、凍結來源與核驗狀態。此網站不重新計算整體效能，亦未將私有論文或完整資料公開。'},
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
    title:'E-Commerce',category:'WEB TECHNOLOGIES / FULL STACK',intro:'以買家與賣家的任務，串起商品、購物車和訂單。',stack:'PHP · MySQL',context:'Web Technologies HW3',image:'ecommerce.png',status:'原版功能對照 · 移植原型',
    problem:'商城需要在使用者、商品與訂單之間維持一致的資料，同時處理買家購物與賣家管理的不同任務。',
    implementation:['原作包含登入、商品查詢與購物車。','多商家結帳、賣家商品管理及買家訂單紀錄屬於原作範圍。'],
    steps:['先讀取下方原版與移植版差異。','原型中選擇示例商品、加入購物車並模擬結帳。','查看訂單後可重設；沒有真實付款。'],
    decisions:[{title:'伺服器決定訂單金額',text:'目前 D1 原型從商品資料取得價格，並依訪客與請求識別碼處理重試。這展示一項資料一致性設計，但不是原 PHP／MySQL 產品的完整移植。'}],
    evidence:[{title:'原型已有的驗證',text:'本機 API 檢查涵蓋價格竄改、重複提交、數量驗證及訪客隔離。原版身份、庫存與賣家流程仍需另行對齊。'}],
    comparison:[['商品與訂單','PHP／MySQL 原版流程','合成商品、購物車與模擬訂單'],['帳號與角色','登入、買家與賣家','未移植'],['商品管理與庫存','原版管理流程','未移植'],['產品 UI','原 PHP 頁面','目前為簡化替代 UI，尚未對齊']],
    boundary:'下方連結會開啟簡化移植原型，與原產品不同；目前不能作為完整原作展示。',demoPath:'/hw3/',external:true,demoLabel:'查看簡化原型',
  },
  nutrition:{
    title:'Nutrition Explorer',category:'WEB TECHNOLOGIES / API INTEGRATION',intro:'把食物搜尋、營養資訊與圖表連成可探索的查詢流程。',stack:'PHP · FatSecret API · Chart.js',context:'Web Technologies HW4',image:'nutrition.png',status:'原版功能對照 · 合成資料原型',
    problem:'外部營養資料需要經過查詢、授權與整理，才能在瀏覽器中提供容易閱讀的結果。',
    implementation:['原作透過 PHP 介接 FatSecret OAuth API。','支援查詢分頁、營養明細、Chart.js 圖表及收藏。'],
    steps:['原型可搜尋「主食」等示例分類。','加入不同示例品項進行比較，再移除比較項目。','所有數值均為合成資料，不是即時 FatSecret 查詢。'],
    decisions:[{title:'先明示資料模式',text:'合成資料降低外部 API 依賴，適合介面測試；要展示原作的 API 整合能力，仍需保留原查詢流程、授權介接及錯誤處理。'}],
    evidence:[{title:'目前能驗證的範圍',text:'本機原型可搜尋並增減比較品項；沒有驗證正式 FatSecret 請求或原作所有功能。'}],
    comparison:[['資料來源','FatSecret OAuth API','合成示例'],['搜尋','原版查詢及分頁','簡化字詞篩選'],['明細、圖表與收藏','營養明細、Chart.js、LocalStorage 收藏','尚未完整移植'],['產品 UI','原 PHP 頁面','目前為替代 UI，尚未對齊']],
    boundary:'此原型只展示合成資料搜尋與比較，尚未保留原作完整 UI 與 API 流程。',demoPath:'/hw4/',external:true,demoLabel:'查看合成資料原型',
  },
  realtime:{
    title:'Chat & Game',category:'WEB TECHNOLOGIES / REAL TIME',intro:'結合聊天室、視訊與雙人遊戲，處理多個使用者之間的即時狀態。',stack:'Node.js · Socket.io · WebRTC',context:'Web Technologies HW5',image:'realtime.png',status:'原版功能對照 · 即時通訊原型',
    problem:'聊天、視訊與遊戲有不同的同步要求。原作把房間、訊息與雙人互動放在同一個應用中，讓使用者能共同參與。',
    implementation:['原作含多房間聊天、私訊、輸入提示、圖片與表情。','Socket.io 傳遞 WebRTC 信令，提供視訊及音訊互動。','雙人遊戲使用原版 Canvas 與鍵盤操作。'],
    steps:['使用兩個不同瀏覽器，或一般與無痕視窗。','輸入不同暱稱與相同房間名稱後加入。','嘗試聊天與簡化遊戲；重新加入可查看近期訊息。'],
    decisions:[{title:'以房間管理共享狀態',text:'目前原型每個房間使用 Durable Object，遊戲傷害由伺服器裁決。這能展示部分即時狀態設計，但不等於已移植原 Socket.io／WebRTC 產品。'}],
    evidence:[{title:'原型已有的驗證',text:'雙瀏覽器檢查涵蓋房間隔離、訊息文字顯示、伺服器傷害裁決、觀戰及重新加入後的歷史。'}],
    comparison:[['聊天','群組、私訊、圖片、表情與輸入提示','文字房間與近期歷史'],['視訊／音訊','WebRTC 信令及媒體','未移植'],['遊戲','原 Canvas 雙人遊戲','簡化移動／攻擊／防禦'],['產品 UI','原聊天與遊戲介面','目前為替代 UI，尚未對齊']],
    boundary:'同一瀏覽器的分頁共用訪客身份；後加入的分頁會取代前一個。原版視訊、私訊及完整遊戲仍未移植。',demoPath:'/hw5/',external:true,demoLabel:'查看即時通訊原型',
  },
};
