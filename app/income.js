// Synthetic competition examples. No network requests or automatic tax calculation.
const incomePage = document.createElement('section');
incomePage.className = 'income-page';
incomePage.setAttribute('aria-label','收入纳税明细');
incomePage.setAttribute('aria-hidden','true');
incomePage.innerHTML = `
  <div class="income-status"><span>11:47 <svg width="12" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6a6 6 0 0 1 12 0v7l3 4H5M9 21h6M2 2l20 20"/></svg></span><div class="status-right"><svg width="19" height="15" viewBox="0 0 20 16" fill="currentColor"><rect x="0" y="10" width="3" height="6" rx="1"/><rect x="5" y="7" width="3" height="9" rx="1"/><rect x="10" y="3" width="3" height="13" rx="1"/><rect x="15" width="3" height="16" rx="1"/></svg><span>5G</span><span class="battery">77</span></div></div>
  <header class="income-bar"><button class="income-back" aria-label="返回上一页"><i class="back-chevron"></i>返回</button><h1>收入纳税明细</h1><button class="batch">批量申诉</button></header>
  <div class="income-scroll"><section class="income-summary" aria-label="收入汇总"><div class="total-line"><span>收入合计<button class="income-help" aria-label="收入合计说明">?</button>:</span><span>27500.00元</span></div><div class="total-line"><span>已申报税额合计:</span><span>270.00元</span></div></section><div class="income-records"></div></div>`;
document.querySelector('.phone').append(incomePage);
const incomeRows = [
  {type:'工资薪金',month:'2026-09',category:'正常工资薪金',company:'示例科技有限公司',income:'10000.00',tax:'100.00'},
  {type:'工资薪金',month:'2026-08',category:'正常工资薪金',company:'示例科技有限公司',income:'9000.00',tax:'90.00'},
  {type:'劳务报酬',month:'2026-08',category:'其他连续劳务报酬',company:'示例服务有限公司',income:'200.00',tax:'0.00'}
];
incomePage.querySelector('.income-records').innerHTML = incomeRows.map(r=>`<button class="income-record" aria-label="${r.month} ${r.type}"><div class="record-heading"><span>${r.type}</span><span>${r.month}</span></div><div class="record-line">所得项目小类：${r.category}</div><div class="record-line">扣缴义务人：${r.company}</div><div class="record-line">收入：${r.income}元</div><div class="record-line">已申报税额：${r.tax}元</div><i class="record-arrow"></i></button>`).join('') + '<div class="income-record partial"><div class="record-heading"><span>工资薪金</span><span>2026-07</span></div><div class="partial-note">录屏未展示本条完整内容</div></div>';
const homeLayers = ['.header','.scroll','.nav'];
function setIncomeVisible(visible){
  incomePage.classList.toggle('visible',visible);
  incomePage.setAttribute('aria-hidden',String(!visible));
  incomePage.inert=!visible;
  homeLayers.forEach(s=>document.querySelector(s).inert=visible);
  if(visible)incomePage.querySelector('.income-scroll').scrollTop=0;
}
incomePage.inert=true;
function showIncome(){if(location.hash!=='#income')history.pushState({page:'income'},'', '#income');setIncomeVisible(true)}
incomePage.querySelector('.income-back').onclick=()=>{if(location.hash==='#income')history.back();else setIncomeVisible(false)};
window.addEventListener('popstate',()=>setIncomeVisible(location.hash==='#income'));
const originalOpen = open;
open = function(title){if(title==='收入纳税明细'){showIncome();return}originalOpen(title)};
function recordingPlaceholder(title){originalOpen(title);document.querySelector('.sheet p').textContent='录屏未展示此入口内的页面。当前保留入口，待补充对应画面后继续复刻。'}
incomePage.querySelector('.batch').onclick=()=>recordingPlaceholder('批量申诉');
incomePage.querySelector('.income-help').onclick=()=>recordingPlaceholder('收入合计说明');
incomePage.querySelectorAll('button.income-record').forEach(b=>b.onclick=()=>recordingPlaceholder(b.getAttribute('aria-label')));
if(location.hash==='#income')setIncomeVisible(true);
