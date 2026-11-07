const flowPage=document.createElement('section');flowPage.className='flow-page';flowPage.inert=true;phone.append(flowPage);
let flowReturn=null;
function closeFlow(){if(flowPage.matches('.income-query-flow.visible'))window.TaxIncomeNavigation?.forgetQuery();flowPage.classList.remove('visible');flowPage.inert=true;incomePage.inert=!incomePage.classList.contains('visible');if(!incomePage.classList.contains('visible'))renderTab(currentTab);document.querySelector('.nav').inert=incomePage.classList.contains('visible');}
function showFlow(title,body,footer=''){
 hideProfileIdentity();
 flowPage.classList.remove('income-detail-flow','tax-calculation-flow','income-query-flow','phone-verification-flow','employment-flow','bank-flow','tax-issue-flow','tax-requests-flow','tax-document-flow');
 flowPage.innerHTML=`<div class="flow-status">${statusMarkup.replace('11:59','12:08').replace('>76<','>74<')}</div><header class="income-bar"><button class="flow-back" aria-label="返回上一页"><i class="back-chevron"></i>返回</button><h1>${title}</h1>${title==='收入纳税明细详情'?'<button class="batch" data-title="申诉">申诉</button>':'<span></span>'}</header><div class="flow-body">${body}</div>${footer}`;
 flowPage.classList.add('visible');flowPage.inert=false;document.querySelector('.header').inert=true;document.querySelector('.scroll').inert=true;incomePage.inert=true;Object.values(tabPages).forEach(p=>p.inert=true);document.querySelector('.nav').inert=true;
 flowPage.querySelector('.flow-back').onclick=closeFlow;
}
// Keep the actual DOM nodes so return preserves disclosure state and scroll position.
function captureFlowView(){return {nodes:[...flowPage.childNodes],className:flowPage.className,scroll:flowPage.querySelector('.flow-body').scrollTop};}
function restoreFlowView(view){
 flowPage.replaceChildren(...view.nodes);flowPage.className=view.className;flowPage.inert=false;
 incomePage.inert=true;Object.values(tabPages).forEach(p=>p.inert=true);document.querySelector('.nav').inert=true;
 document.querySelector('.header').inert=true;document.querySelector('.scroll').inert=true;
 flowPage.querySelector('.flow-body').scrollTop=view.scroll;
}
const flowRow=(label,value)=>`<div class="flow-row"><label>${label}</label><span>${value}</span></div>`;
function showVerification(){showFlow('手机验证','<div class="phone-intro">为了账号安全性，点击获取验证码，<br>发送短信验证至以下手机<strong>演示号码（未绑定）</strong></div><div class="code-row"><span>短信验证码</span><input inputmode="numeric" maxlength="6" placeholder="请输入短信验证码" aria-label="短信验证码"><button class="get-code">获取验证码</button></div><button class="flow-primary next" disabled>下一步</button>');flowPage.classList.add('phone-verification-flow');flowPage.querySelector('.get-code').onclick=()=>{originalOpen('验证码演示');document.querySelector('.sheet p').textContent='此版本仅做本地演示，不发送短信。可以输入任意六位数字查看按钮状态。'};flowPage.querySelector('input').oninput=e=>flowPage.querySelector('.next').disabled=!/^\d{6}$/.test(e.target.value);flowPage.querySelector('.next').onclick=()=>recordingPlaceholder('验证后页面');}
function showEmployer() {
  const employers = window.TaxProfileDisplay?.employers?.() ?? [];
  if (employers.length) {
    showFlow('任职受雇', '<ul class="employment-list" aria-label="任职单位"></ul>');
    flowPage.classList.add('employment-flow');
    const list = flowPage.querySelector('.employment-list');
    for (const employer of employers) {
      const row = document.createElement('li');
      row.textContent = employer;
      list.append(row);
    }
    return;
  }

  showFlow('任职受雇', `
    <section class="employment-empty" aria-labelledby="employment-empty-title">
      <svg class="employment-building" viewBox="0 0 82 82" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="employment-wings">
            <stop stop-color="#dee9ff"/><stop offset="1" stop-color="#adccfa"/>
          </linearGradient>
          <linearGradient id="employment-tower" x2="1" y2=".15">
            <stop stop-color="#659df4"/><stop offset="1" stop-color="#836bd8"/>
          </linearGradient>
          <linearGradient id="employment-base">
            <stop stop-color="#679df3"/><stop offset="1" stop-color="#8b64ce"/>
          </linearGradient>
          <pattern id="employment-windows" x="23.6" y="31.8" width="9.45" height="12.5" patternUnits="userSpaceOnUse">
            <rect width="6.3" height="6.3" fill="#f2f7f2"/>
          </pattern>
        </defs>
        <path d="M0 76V33q0-6 6-6h70q6 0 6 6v43z" fill="url(#employment-wings)"/>
        <path d="M11.4 38h59.2v5.7H11.4zm0 12h59.2v5.7H11.4zm0 12h59.2v5.7H11.4z" fill="#f2f7f2"/>
        <path d="M18.8 76V6q0-6 6-6h32.5q6 0 6 6v70z" fill="url(#employment-tower)"/>
        <path d="M23.6 13h16v10h-16z" fill="#f2f7f2"/>
        <rect x="23.6" y="31.8" width="35" height="43.8" fill="url(#employment-windows)"/>
        <path d="M0 75.5h82V82H0z" fill="url(#employment-base)"/>
      </svg>
      <h2 id="employment-empty-title">当前没有信息</h2>
      <p>此处若未显示您的任职单位，可能是因为您的任职单位尚未向主管税务机关报送您的任职信息或报送错误。请您与单位财务人员联系，及时为您准确报送任职信息。若仍有疑问，请您或单位财务人员与主管税务机关联系。</p>
    </section>`);
  flowPage.classList.add('employment-flow');
}
function showBanks(focusLastCard = false) {
  const profile = window.TaxProfileDisplay;
  const footer = '<footer class="bank-footer"><button type="button" class="flow-primary bank-add">添加</button></footer>';
  showFlow('银行卡', '', footer);
  flowPage.classList.add('bank-flow');
  const body = flowPage.querySelector('.flow-body');
  for (const {name, lastFour} of profile.bankCards()) {
    const card = document.createElement('article');
    card.className = 'bank-card';
    const logo = name === '招商银行'
      ? '<img class="bank-brand-mark" src="assets/profile-ui/cmb-mark.svg" alt="">'
      : '<span class="bank-brand-mark neutral-bank" aria-hidden="true"></span>';
    card.innerHTML = logo + '<div><p class="bank-card-title"></p><p class="bank-card-number"></p></div>';
    card.querySelector('.bank-card-title').textContent = name;
    card.querySelector('.bank-card-number').textContent = '**** **** **** ' + lastFour;
    body.append(card);
  }
  if (!body.childElementCount) body.innerHTML = '<p class="bank-empty">暂无银行卡</p>';
  flowPage.querySelector('.bank-add').onclick = showAddBank;
  if (focusLastCard) {
    const card = body.lastElementChild;
    card.tabIndex = -1;
    card.focus();
  }
}

function showAddBank() {
  const previous = captureFlowView();
  const formMarkup = `<form class="bank-entry-form" id="bank-entry" autocomplete="off">
    <label>银行名称<input name="bank-name" type="text" maxlength="80" required></label>
    <label>卡号后四位<input name="bank-last-four" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required></label>
    <p class="bank-entry-error" role="alert"></p>
  </form>`;
  const footer = '<footer class="bank-footer"><button form="bank-entry" type="submit" class="flow-primary">保存</button></footer>';
  showFlow('添加演示银行卡', formMarkup, footer);
  flowPage.classList.add('bank-flow');
  const form = flowPage.querySelector('.bank-entry-form');
  const bankName = form.elements.namedItem('bank-name');
  const lastFour = form.elements.namedItem('bank-last-four');
  flowPage.querySelector('.flow-back').onclick = () => {
    restoreFlowView(previous);
    flowPage.querySelector('.bank-add').focus({preventScroll: true});
  };
  form.onsubmit = event => {
    event.preventDefault();
    const name = bankName.value.trim();
    if (!name) {
      bankName.value = '';
      bankName.reportValidity();
      return;
    }
    const profile = window.TaxProfileDisplay;
    try {
      profile.setBankCards([...profile.bankCards(), {name, lastFour: lastFour.value}]);
    } catch {
      form.querySelector('.bank-entry-error').textContent = '未能保存到此设备，请重试。';
      return;
    }
    showBanks(true);
  };
}
function showIncomeYearPicker(select,trigger){
 const years=[...select.options].map(option=>option.value);
 let pending=select.value;
 const overlay=document.createElement('div');overlay.className='year-picker-overlay';
 overlay.innerHTML=`<section class="year-picker-panel" id="income-year-dialog" role="dialog" aria-modal="true" aria-label="选择纳税年度"><header class="year-picker-toolbar"><button type="button" class="year-picker-cancel">取消</button><button type="button" class="year-picker-confirm">确定</button></header><div class="year-wheel-container"><div class="year-wheel" role="listbox" aria-label="纳税年度">${years.slice().sort().map(year=>`<button class="year-option" type="button" role="option" aria-selected="${year===pending}" tabindex="${year===pending?'0':'-1'}" data-year="${year}">${year}</button>`).join('')}</div><div class="year-selection-window" aria-hidden="true"></div></div></section>`;
 const body=flowPage.querySelector('.flow-body'),header=flowPage.querySelector('.income-bar');
 const bodyWasInert=body.inert,headerWasInert=header.inert;
 body.inert=true;header.inert=true;trigger.setAttribute('aria-expanded','true');flowPage.append(overlay);
 const wheel=overlay.querySelector('.year-wheel'),options=[...overlay.querySelectorAll('.year-option')];
 const wheelInset=Math.max(0,(wheel.clientHeight-options[0].offsetHeight)/2);
 wheel.style.paddingBlock=`${wheelInset}px`;overlay.querySelector('.year-selection-window').style.top=`${wheelInset}px`;
 const updateSelection=year=>{pending=year;options.forEach(option=>{const chosen=option.dataset.year===year;option.setAttribute('aria-selected',String(chosen));option.tabIndex=chosen?0:-1;});};
 const choose=year=>{updateSelection(year);wheel.scrollTop=options.findIndex(option=>option.dataset.year===year)*options[0].offsetHeight;};
 const close=()=>{overlay.remove();body.inert=bodyWasInert;header.inert=headerWasInert;trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});};
 overlay.querySelector('.year-picker-cancel').onclick=close;
 overlay.querySelector('.year-picker-confirm').onclick=()=>{select.value=pending;trigger.querySelector('.query-year-value').textContent=pending;trigger.setAttribute('aria-label',`纳税年度：${pending}年`);select.dispatchEvent(new Event('change',{bubbles:true}));close();};
 options.forEach(option=>option.onclick=()=>{choose(option.dataset.year);option.focus({preventScroll:true});});
 wheel.addEventListener('scroll',()=>{const rowHeight=options[0].offsetHeight;if(rowHeight)updateSelection(options[Math.max(0,Math.min(options.length-1,Math.round(wheel.scrollTop/rowHeight)))].dataset.year);},{passive:true});
 overlay.onclick=event=>{if(event.target===overlay)close();};
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
  if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
   event.preventDefault();const index=options.findIndex(option=>option.dataset.year===pending);
   const next=event.key==='Home'?0:event.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,index+(event.key==='ArrowDown'?1:-1)));
   choose(options[next].dataset.year);options[next].focus({preventScroll:true});return;
  }
  if(event.key==='Tab'){
   const stops=[overlay.querySelector('.year-picker-cancel'),options.find(option=>option.dataset.year===pending),overlay.querySelector('.year-picker-confirm')];
   const index=stops.indexOf(document.activeElement);event.preventDefault();stops[(index+(event.shiftKey?-1:1)+stops.length)%stops.length].focus({preventScroll:true});
  }
 });
 choose(pending);options.find(option=>option.dataset.year===pending).focus({preventScroll:true});
}
function showIncomeQuery(){
 const extraSelected=demoTypes.slice(4).some(t=>incomeQueryTypes.includes(t));
 showFlow('收入纳税明细',`<section><h2 class="flow-heading">请选择纳税年度</h2><div class="query-year"><span>年度</span><select aria-label="纳税年度" hidden tabindex="-1" aria-hidden="true">${[...new Set(['2026','2025',incomeQueryYear,...Object.keys(TaxIncomePreset.normalizeRemainders(taxpayerProfileData())),...demoRecords.map(r=>r.month.slice(0,4))])].sort().reverse().map(y=>`<option ${y===incomeQueryYear?'selected':''}>${y}</option>`).join('')}</select><button class="query-year-picker" type="button" aria-label="纳税年度：${incomeQueryYear}年" aria-haspopup="dialog" aria-expanded="false" aria-controls="income-year-dialog"><span class="query-year-value">${incomeQueryYear}</span></button><i class="query-chevron" aria-hidden="true"></i></div></section><section><h2 class="flow-heading">请选择所得类型</h2><div class="query-types">${demoTypes.map((t,i)=>`<label class="${i>=4?'extra-type':''}" ${i>=4&&!extraSelected?'hidden':''}><input type="checkbox" value="${t}" ${incomeQueryTypes.includes(t)?'checked':''}><span>${t}</span></label>`).join('')}</div><button class="query-more" aria-expanded="${extraSelected}">${extraSelected?'收起':'其他类型'}<i class="double-chevron" aria-hidden="true"></i></button></section><button class="flow-primary query-submit">查询</button>`);
 flowPage.classList.add('income-query-flow');
 flowPage.querySelector('.query-year-picker').onclick=event=>showIncomeYearPicker(flowPage.querySelector('select'),event.currentTarget);
 const more=flowPage.querySelector('.query-more');more.onclick=()=>{const expanded=more.getAttribute('aria-expanded')!=='true';more.setAttribute('aria-expanded',String(expanded));more.firstChild.textContent=expanded?'收起':'其他类型';flowPage.querySelectorAll('.extra-type').forEach(row=>row.hidden=!expanded);};
 const submit=flowPage.querySelector('.query-submit');
 flowPage.querySelectorAll('input').forEach(c=>c.onchange=()=>submit.disabled=!flowPage.querySelector('input:checked'));
 submit.disabled=!flowPage.querySelector('input:checked');
 submit.onclick=()=>{
 const startedAt=Date.now();
 if(window.TaxIncomeLoading && !window.TaxIncomeLoading.show(startedAt)) return;
 incomeQueryYear=flowPage.querySelector('select').value;incomeQueryTypes=[...flowPage.querySelectorAll('input:checked')].map(c=>c.value);
 if(window.TaxIncomeNavigation){
  TaxIncomeNavigation.fromQuery({year:incomeQueryYear,types:incomeQueryTypes,tab:currentTab,expanded:more.getAttribute('aria-expanded')==='true',scroll:flowPage.querySelector('.flow-body').scrollTop},startedAt);
  return;
 }
 refreshDemoIncome();
 const view=captureFlowView(),returnUrl=location.pathname+location.hash;closeFlow();showIncome();
 incomePage.querySelector('.income-back').onclick=()=>{history.replaceState({tab:currentTab},'',returnUrl);setIncomeVisible(false);restoreFlowView(view);};
 window.TaxIncomeLoading?.finish();
 };
}
function showJulyDetail(){showFlow('收入纳税明细详情',`<section><h2 class="flow-heading">纳税明细信息</h2>${flowRow('收入：','8000.00元')}${flowRow('已申报税额：','80.00元')}<button class="flow-link" data-title="查看税款计算">查看税款计算 ❯</button></section><section><h2 class="flow-heading">纳税明细-基础情况</h2>${[['所得项目小类：','正常工资薪金'],['扣缴义务人名称：','示例科技有限公司'],['扣缴义务人纳税人识别号：','DEMO（演示）'],['主管税务机关：','示例税务机关'],['申报渠道：','其他'],['申报日期：','2026-08-01'],['税款所属期：','2026-07']].map(r=>flowRow(...r)).join('')}</section><div class="flow-note">温馨提示：专项附加扣除和个人养老金已体现在税款计算过程中，在本期数据中不予显示，您可在“税款计算-累计收入与扣除详情”中查看。<button class="flow-link" data-title="查看税款计算">查看税款计算</button></div><section><h2 class="flow-heading">本期收入与扣除详情</h2>${[['本期收入：','8000.00元'],['本期免税收入：','0.00元'],['本期减除费用：','3000.00元'],['本期专项扣除：','500.00元']].map(r=>flowRow(...r)).join('')}</section>`)}
const oldFlowOpen=open;open=function(title){if(title==='个人信息'||title==='家庭成员'){showVerification();return}if(title==='任职受雇'){showEmployer();return}if(title==='银行卡'){showBanks();return}if(title==='收入纳税明细'){showIncomeQuery();return}oldFlowOpen(title)};
const moreRows=[{type:'工资薪金',month:'2026-07',category:'正常工资薪金',company:'示例科技有限公司',income:'8000.00',tax:'80.00'},{type:'劳务报酬',month:'2026-07',category:'其他连续劳务报酬',company:'示例服务有限公司',income:'300.00',tax:'0.00'}];
incomePage.querySelector('.partial').remove();
for(const r of moreRows){const b=document.createElement('button');b.className='income-record';b.innerHTML=`<div class="record-heading"><span>${r.type}</span><span>${r.month}</span></div><div class="record-line">所得项目小类：${r.category}</div><div class="record-line">扣缴义务人：${r.company}</div><div class="record-line">收入：${r.income}元</div><div class="record-line">已申报税额：${r.tax}元</div><i class="record-arrow"></i>`;b.onclick=r.type==='工资薪金'?showJulyDetail:()=>recordingPlaceholder('劳务报酬详情');incomePage.querySelector('.income-records').append(b)}
incomePage.querySelector('.income-records').insertAdjacentHTML('beforeend','<div class="income-record"><div class="record-heading"><span>劳务报酬</span><span>2026-03</span></div><div class="record-line">所得项目小类：其他连续劳务报酬</div><div class="record-line">扣缴义务人：示例服务有限公司</div></div>');

// All income records share the same detail layout; values follow the selected row.
function showRecordDetail(record){
 if(record.type==='工资薪金'&&record.month==='2026-07'){showJulyDetail();return;}
 const company=record.type==='劳务报酬'?'示例服务有限公司':'示例科技有限公司';
 const knownEmployer=record.type==='工资薪金';
 showFlow('收入纳税明细详情',`<section><h2 class="flow-heading">纳税明细信息</h2>${flowRow('收入：',(record.income==='—'?'—':record.income+'元'))}${flowRow('已申报税额：',(record.tax==='—'?'—':record.tax+'元'))}<button class="flow-link" data-title="查看税款计算">查看税款计算 ❯</button></section><section><h2 class="flow-heading">纳税明细-基础情况</h2>${[['所得项目小类：',record.category],['扣缴义务人名称：',company],['扣缴义务人纳税人识别号：',knownEmployer?'DEMO（演示）':'—'],['主管税务机关：',knownEmployer?'示例税务机关':'—'],['申报渠道：','—'],['申报日期：','—'],['税款所属期：',record.month]].map(r=>flowRow(...r)).join('')}</section><div class="flow-note">本页为合成示例，未填写的字段以“—”表示。</div><section><h2 class="flow-heading">本期收入与扣除详情</h2>${[['本期收入：',(record.income==='—'?'—':record.income+'元')],['本期免税收入：','—'],['本期减除费用：','—'],['本期专项扣除：','—']].map(r=>flowRow(...r)).join('')}</section>`);
}
const completeIncomeRows=[...incomeRows,...moreRows];
incomePage.querySelectorAll('button.income-record').forEach((button,index)=>{
 const record=completeIncomeRows[index];
 if(record)button.onclick=()=>showRecordDetail(record);
});
const marchPlaceholder=incomePage.querySelector('.income-records > div.income-record');
if(marchPlaceholder){
 const marchButton=document.createElement('button');marchButton.className='income-record';marchButton.innerHTML=marchPlaceholder.innerHTML+'<i class="record-arrow"></i>';
 marchButton.onclick=()=>showRecordDetail({type:'劳务报酬',month:'2026-03',category:'其他连续劳务报酬',income:'—',tax:'—'});
 marchPlaceholder.replaceWith(marchButton);
}
