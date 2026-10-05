const app = document.querySelector('#app');
function hero(label,title,text) { return `<div class="eyebrow">${label}</div><h1>${title}</h1><p>${text}</p>`; }
app.innerHTML=hero('Interactive Lab','把設計，變成可操作的體驗。','選擇一個展示，探索完整的互動流程。')+`<div class="grid">${[['hw3','E-Commerce','買賣帳號、商品管理、庫存與模擬訂單'],['hw4','Nutrition','即時搜尋、份量換算與我的收藏'],['hw5','Chat & Arena','私人對話、圖片、視訊與雙人格鬥'],['bitoguard','BitoGuard','探索異常警示的分析介面']].map(([path,name,text])=>`<a class="card" href="/${path}/"><h2>${name} ↗</h2><p>${text}</p></a>`).join('')}</div>`;
