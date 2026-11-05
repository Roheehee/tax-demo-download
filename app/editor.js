// Competition demo: user edits stay in this browser/device.
const demoStorageKey='tax-replica-income-v1';
const demoDefaults=[...incomeRows,...moreRows,{type:'劳务报酬',month:'2026-03',category:'其他连续劳务报酬',company:'示例服务有限公司',income:'',tax:''}].map((r,i)=>({...r,id:i,company:r.type==='工资薪金'?'示例科技有限公司':'示例服务有限公司'}));
// Preserve legacy defaults only for matching previously saved reference details.
const builtInIncome=typeof TaxIncomeDefaults!=='undefined'&&typeof TaxIncomePreset!=='undefined'
 ? TaxIncomePreset.prepareImport([],{},TaxIncomeDefaults.create()):null;
let usingBuiltInIncome=Boolean(builtInIncome);
let demoRecords=structuredClone(builtInIncome?builtInIncome.records:demoDefaults);
// Keep the original storage key and IDs so previously saved edits remain available.
function validDemoRecord(r){return r&&['string','number'].includes(typeof r.id)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)&&['type','category','company'].every(k=>typeof r[k]==='string')&&['income','tax'].every(k=>r[k]===''||/^\d+(\.\d{1,2})?$/.test(r[k]));}
try{const saved=JSON.parse(localStorage.getItem(demoStorageKey));if(Array.isArray(saved)&&saved.every(validDemoRecord)&&new Set(saved.map(r=>String(r.id))).size===saved.length){demoRecords=saved;usingBuiltInIncome=false;}}catch{}
const demoTypes=['工资薪金','劳务报酬','稿酬','特许权使用费','经营所得','利息、股息、红利','财产租赁','财产转让','偶然所得'];
let incomeQueryYear='2026';
let incomeQueryTypes=demoTypes.slice(0,4);
try{
 const preferred=JSON.parse(localStorage.getItem(profileIdentityKey)||'null')?.incomePreferredQuery;
 if(!usingBuiltInIncome&&preferred&&/^[1-9]\d{3}$/.test(preferred.year)&&Array.isArray(preferred.types)&&preferred.types.length&&preferred.types.every(t=>demoTypes.includes(t))){incomeQueryYear=preferred.year;incomeQueryTypes=[...new Set(preferred.types)];}
}catch{}
function filteredDemoRecords(){return demoRecords.filter(r=>r.month.startsWith(incomeQueryYear+'-')&&incomeQueryTypes.includes(r.type)).sort((a,b)=>b.month.localeCompare(a.month));}
function demoYearTotal(key){
 if(typeof TaxIncomePreset!=='undefined'&&typeof taxpayerProfileData==='function'){
  const summaryProfile=taxpayerProfileData();
  if(Object.hasOwn(summaryProfile.incomeSummaryRemainders||{},incomeQueryYear))return filteredDemoRecords().reduce((sum,r)=>sum+cents(r[key]),TaxIncomePreset.remainderForQuery(summaryProfile,incomeQueryYear,incomeQueryTypes,key));
 }
 // Totals include only the records visible under the selected year and types.
 return filteredDemoRecords().reduce((sum,r)=>sum+cents(r[key]),0);
}
const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amountText=v=>v===''?'—':Number(v).toFixed(2)+'元';
const cents=v=>Math.round(Number(v||0)*100);
function refreshDemoIncome(){
 const list=incomePage.querySelector('.income-records');list.innerHTML='';
 filteredDemoRecords().forEach(r=>{const b=document.createElement('button');b.className='income-record';b.innerHTML=`<div class="record-heading"><span>${htmlEscape(r.type)}</span><span>${htmlEscape(r.month)}</span></div><div class="record-line">所得项目小类：${htmlEscape(r.category)}</div><div class="record-line">扣缴义务人：${htmlEscape(r.company)}</div><div class="record-line">收入：${amountText(r.income)}</div><div class="record-line">已申报税额：${amountText(r.tax)}</div><i class="record-arrow"></i>`;b.onclick=()=>showDemoDetail(r);list.append(b)});
 if(!list.children.length)list.innerHTML=`<p class="income-empty">${htmlEscape(incomeQueryYear)}年暂无符合条件的收入记录</p>`;
 const totals=incomePage.querySelectorAll('.total-line>span:last-child');
 ['income','tax'].forEach((k,i)=>totals[i].textContent=(demoYearTotal(k)/100).toFixed(2)+'元');
}
function matchesReference(r){const original=demoDefaults.find(d=>d.id===r.id);return original&&['month','type','company','income','tax'].every(k=>r[k]===original[k]);}
const deductionFields=[['exemptIncome','本期免税收入'],['expense','本期减除费用'],['specialTotal','本期专项扣除合计'],['pension','基本养老保险'],['medical','基本医疗保险'],['unemployment','失业保险'],['housing','住房公积金'],['other','本期其他扣除'],['donation','本期准予扣除的捐赠项目']];
const deductionParts=['pension','medical','unemployment','housing'];
function referenceDeductions(r){
 const d=Object.fromEntries(deductionFields.map(([key])=>[key,'']));
 if(matchesReference(r)&&[0,3].includes(r.id))Object.assign(d,{exemptIncome:'0.00',expense:'3000.00',specialTotal:r.id===0?'620.00':'500.00'});
 if(matchesReference(r)&&r.id===0)Object.assign(d,{pension:'300.00',medical:'100.00',unemployment:'20.00',housing:'200.00',other:'0.00',donation:'0.00'});
 return d;
}
function recordDeductions(r){
 const d={...referenceDeductions(r)};
 for(const [key] of deductionFields)if(r.deductions&&Object.hasOwn(r.deductions,key))d[key]=String(r.deductions[key]??'');
 if(deductionParts.every(key=>d[key]!==''))d.specialTotal=(deductionParts.reduce((sum,key)=>sum+cents(d[key]),0)/100).toFixed(2);
 return d;
}
function referenceDeductionsUnchanged(r){
 const actual=recordDeductions(r),original=referenceDeductions(r);
 return deductionFields.every(([key])=>actual[key]===''?original[key]==='':original[key]!==''&&cents(actual[key])===cents(original[key]));
}
function deductionEditor(r){
 const d=recordDeductions(r);
 return `<details class="editor-deductions"><summary>本期收入与扣除数据</summary><p>金额单位为元。四项明细全部填写后，专项扣除合计自动相加；没有金额填0，仅知道合计时可直接填写。留空表示未提供。</p>${deductionFields.map(([key,label])=>`<label>${label}（元）<input name="deduction-${key}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="未提供" value="${htmlEscape(d[key])}" ${key==='specialTotal'&&deductionParts.every(k=>d[k]!=='')?'readonly':''}></label>`).join('')}</details>`;
}
const taxRecordFields=[['declarationDate','申报日期'],['paidTax','实缴（退）金额'],['treasuryDate','入（退）库日期'],['taxOffice','入库税务机关'],['notes','备注']];
function recordTaxData(r){
 const stored=r?.taxRecord&&typeof r.taxRecord==='object'&&!Array.isArray(r.taxRecord)?r.taxRecord:{};
 return Object.fromEntries(taxRecordFields.map(([key])=>[key,String(stored[key]??'')]));
}
function taxpayerProfileData(){
 let profile={name:'演示用户',identity:typeof profileIdentity==='string'?profileIdentity:''};
 try{
  const saved=JSON.parse(localStorage.getItem(profileIdentityKey));
  if(saved&&typeof saved==='object'&&!Array.isArray(saved))profile={...saved,name:typeof saved.name==='string'?saved.name:'',identity:typeof saved.identity==='string'?saved.identity:''};
 }catch{}
 if(usingBuiltInIncome){
  profile.incomeSummaryRemainders={...TaxIncomePreset.normalizeRemainders(profile),...structuredClone(builtInIncome.profile.incomeSummaryRemainders)};
  profile.incomePreferredQuery={year:builtInIncome.summary.year,types:[...TaxIncomePreset.TYPES.slice(0,4)]};
  profile.taxDocumentEdited=true;
 }
 return profile;
}
function validTaxRecordDate(value){
 if(value==='')return true;
 if(!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function validTaxRecordData(r){
 const d=recordTaxData(r);
 return validTaxRecordDate(d.declarationDate)&&validTaxRecordDate(d.treasuryDate)&&(d.paidTax===''||(/^-?\d+(\.\d{1,2})?$/.test(d.paidTax)&&Number.isSafeInteger(cents(d.paidTax))))&&d.taxOffice.length<=100&&d.notes.length<=160;
}
function taxRecordEditor(r){
 const d=recordTaxData(r);
 return `<details class="editor-tax-record"><summary>纳税记录数据</summary><p>月份、所得类型和已申报税额沿用本条收入记录。实缴退金额留空时沿用已申报税额；退款填负数，如 -10.00。其他未知字段可留空。</p>${taxRecordFields.map(([key,label])=>`<label>${label}${key==='paidTax'?'（元）':''}${key==='notes'?`<textarea name="tax-record-${key}" maxlength="160" rows="2" placeholder="未提供">${htmlEscape(d[key])}</textarea>`:`<input name="tax-record-${key}" type="${key.endsWith('Date')?'date':'text'}" ${key==='taxOffice'?'maxlength="100"':key==='paidTax'?'inputmode="text"':''} placeholder="${key==='paidTax'?'留空沿用已申报税额':'未提供'}" value="${htmlEscape(d[key])}">`}</label>`).join('')}</details>`;
}
// localStorage has no multi-key transaction: retain both old values for rollback.
function persistDemoEditorData(records,profile){
 const payloads=[[demoStorageKey,JSON.stringify(records)],[profileIdentityKey,JSON.stringify(profile)]];
 const originals=payloads.map(([key])=>[key,localStorage.getItem(key)]);
 try{for(const [key,value] of payloads)localStorage.setItem(key,value);usingBuiltInIncome=false;}
 catch{
  let restored=true;
  for(const [key,value] of originals.slice().reverse()){
   try{if(localStorage.getItem(key)===value)continue;}catch{}
   try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch{restored=false;}
  }
  const failure=new Error('Editor data could not be saved');failure.storageRestored=restored;throw failure;
 }
}
function showDemoDetail(r){
 const salary=r.type==='工资薪金'&&r.company==='示例科技有限公司'&&matchesReference(r);
 const september=r.id===0&&matchesReference(r),july=r.id===3&&matchesReference(r);
 const known=september||july;
 const fields=[['所得项目小类：',r.category],['扣缴义务人名称：',r.company],['扣缴义务人纳税人识别号：',salary?'DEMO（演示）':'—'],['主管税务机关：',salary?'示例税务机关':'—'],['申报渠道：',known?'其他':'—'],['申报日期：',recordTaxData(r).declarationDate||(september?'2026-10-01':july?'2026-08-01':'—')],['税款所属期：',r.month]];
 const d=recordDeductions(r);
 const deduction='<details class="special-deductions"><summary><span>本期专项扣除：</span><span>'+amountText(d.specialTotal)+'<i class="triangle" aria-hidden="true"></i></span></summary><div class="deduction-breakdown">'+deductionParts.map(key=>flowRow(deductionFields.find(([k])=>k===key)[1]+'：',amountText(d[key]))).join('')+'</div></details>';
 showFlow('收入纳税明细详情',`<section><h2 class="flow-heading">纳税明细信息</h2>${flowRow('收入：',amountText(r.income))}${flowRow('已申报税额：',amountText(r.tax))}<button class="flow-link tax-link">查看税款计算 <i class="link-chevron" aria-hidden="true"></i></button></section><section><h2 class="flow-heading">纳税明细-基础情况</h2>${fields.map(([k,v])=>flowRow(k,htmlEscape(v))).join('')}</section><div class="flow-note">温馨提示：专项附加扣除和个人养老金已体现在税款计算过程中，在本期数据中不予显示。您可在“税款计算-累计收入与扣除详情”中查看。<button class="flow-link tax-link">查看税款计算</button></div><section><h2 class="flow-heading">本期收入与扣除详情</h2>${flowRow('本期收入：',amountText(r.income))}${flowRow('本期免税收入：',amountText(d.exemptIncome))}${flowRow('本期减除费用：',amountText(d.expense))}${deduction}${flowRow('本期其他扣除：',amountText(d.other))}${flowRow('本期准予扣除的捐赠项目：',amountText(d.donation))}</section>`);
 flowPage.classList.add('income-detail-flow');
 flowPage.querySelectorAll('.tax-link').forEach(button=>button.onclick=()=>showDemoTaxCalculation(r,captureFlowView()));
}
function showDemoTaxCalculation(r,returnView){
 // No inferred cumulative data or tax calculation; preserve only the entered tax amount.
 const cumulative=['累计专项扣除：','累计专项附加扣除：','累计其他扣除：','累计个人养老金：','累计准予扣除的捐赠额：'].map(label=>[label,'—']);
 const calculation=['累计应纳税所得额：','税率/预扣率：','速算扣除数：','累计应纳税额：','累计已缴税额：','累计减免税额：'].map(label=>[label,'—']);
 showFlow('税款计算',`<section><h2 class="flow-heading">累计收入与扣除详情</h2>${cumulative.map(row=>flowRow(...row)).join('')}<div class="calculation-total">${flowRow('累计应纳税所得额：','—')}</div></section><section><h2 class="flow-heading">税款计算</h2>${calculation.map(row=>flowRow(...row)).join('')}<div class="calculation-total">${flowRow('本期申报税额：',amountText(r.tax))}</div></section><button class="policy-explanation">查看政策说明</button><p class="calculation-note">比赛演示：仅展示本机填写的申报税额，不进行税款计算；累计计算字段以“—”显示。</p>`);
 flowPage.classList.add('tax-calculation-flow');
 flowPage.querySelector('.flow-back').onclick=()=>restoreFlowView(returnView);
 flowPage.querySelector('.policy-explanation').onclick=()=>{open('政策说明');document.querySelector('.sheet p').textContent='本页面仅演示操作流程，不提供自动计税或税务政策判断。';};
}
function showDemoEditor(){
 let draft=demoRecords.map(r=>({...structuredClone(r),deductions:recordDeductions(r),taxRecord:{...(r.taxRecord&&typeof r.taxRecord==='object'&&!Array.isArray(r.taxRecord)?r.taxRecord:{}),...recordTaxData(r)}})),year=incomeQueryYear;
 const profile=taxpayerProfileData();
 const summaryDraft=window.TaxIncomePreset?TaxIncomePreset.normalizeRemainders(profile):{};
 const recordYears=new Map(draft.map(r=>[r.id,r.month.slice(0,4)]));
 const years=[...new Set(['2026','2025',year,...Object.keys(summaryDraft),...draft.map(r=>r.month.slice(0,4))])].sort().reverse();
 showFlow('修改演示数据',`<p class="editor-note">比赛演示数据 · 默认载入已选收入数据 · 修改仅保存到当前设备<br>按年度编辑，可为同一月份添加多条记录。</p><form id="demo-editor"><section class="edit-card"><h2>我的 · 纳税人信息</h2><label>纳税人姓名<input name="profile-name" type="text" autocomplete="off" maxlength="80" placeholder="填写演示姓名" value="${htmlEscape(profile.name)}"></label><label>演示号码<input name="profile-identity" type="text" autocomplete="off" maxlength="18" placeholder="填写15位或18位演示号码" value="${htmlEscape(profileIdentity)}"></label></section><section class="edit-card editor-toolbar"><label>编辑年度<select name="editor-year">${years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}</select></label><button type="button" class="add-income">＋ 新增收入记录</button><button type="button" class="load-income">载入收入数据</button><p class="year-count" role="status"></p></section><section class="edit-card income-summary-editor" hidden></section><div class="editor-records"></div><p class="editor-note">切换年份会保留尚未保存的填写内容。点击“保存修改”同时保存所有年份；收入明细按查询年份显示。合计汇总当前查询条件下的记录；如有未展开明细合计，也会按其适用类型计入。</p><p class="editor-note">保存后，已有申请的预览、放大和再次下载也使用最新数据；已下载的旧图片需重新下载。</p></form>`,'<footer class="editor-footer"><span class="editor-result" role="status"></span><button class="flow-primary" type="submit" form="demo-editor">保存修改</button></footer>');
 const form=flowPage.querySelector('form'),records=form.querySelector('.editor-records'),result=flowPage.querySelector('.editor-result');
 const collect=()=>{if(summaryDraft[year]){summaryDraft[year].income=form.elements['summary-income'].value.trim();summaryDraft[year].tax=form.elements['summary-tax'].value.trim();}for(const card of records.querySelectorAll('[data-record-id]')){const r=draft.find(r=>String(r.id)===card.dataset.recordId);for(const k of ['month','type','category','company','income','tax'])r[k]=card.querySelector(`[name="${k}"]`).value.trim();r.deductions=Object.fromEntries(deductionFields.map(([key])=>[key,card.querySelector(`[name="deduction-${key}"]`).value.trim()]));r.deductions=recordDeductions(r);r.taxRecord={...r.taxRecord,...Object.fromEntries(taxRecordFields.map(([key])=>[key,card.querySelector(`[name="tax-record-${key}"]`).value.trim()]))};}};
 function render(){
 const summaryCard=form.querySelector('.income-summary-editor'),summary=summaryDraft[year];
 summaryCard.hidden=!summary;
 summaryCard.innerHTML=summary?`<h2>截图未展开明细合计 · ${htmlEscape(year)}</h2><p class="editor-note">这部分只有合计，尚未提供逐月明细。修改下方记录后，总额会同步变化；补录已包含在这里的明细时，请相应扣减这里的合计，避免重复。</p><p class="editor-note">适用所得类型：${summary.types.map(htmlEscape).join('、')}。筛选不含全部这些类型时，仅汇总已录入明细。</p><label>未展开明细的收入合计（元）<input name="summary-income" type="number" required min="0" step="0.01" inputmode="decimal" value="${htmlEscape(summary.income)}"></label><label>未展开明细的税额合计（元）<input name="summary-tax" type="number" required min="0" step="0.01" inputmode="decimal" value="${htmlEscape(summary.tax)}"></label>`:'';
 const visible=draft.filter(r=>recordYears.get(r.id)===year);
 form.querySelector('.year-count').textContent=`${year}年 · ${visible.length}条记录`;
 records.innerHTML=visible.map((r,i)=>`<section class="edit-card" data-record-id="${htmlEscape(r.id)}"><h2>${i+1}. ${htmlEscape(r.type)} · ${htmlEscape(r.month)}</h2><label>月份<input required name="month" type="month" min="${year}-01" max="${year}-12" value="${htmlEscape(r.month)}"></label><label>所得类型<select name="type">${[...new Set([...demoTypes,r.type])].map(t=>`<option ${r.type===t?'selected':''}>${htmlEscape(t)}</option>`).join('')}</select></label><label>所得项目小类<input required name="category" value="${htmlEscape(r.category)}"></label><label>扣缴义务人<input required name="company" value="${htmlEscape(r.company)}"></label><label>收入（元）<input name="income" type="number" min="0" step="0.01" inputmode="decimal" placeholder="未提供" value="${htmlEscape(r.income)}"></label><label>已申报税额（元）<input name="tax" type="number" min="0" step="0.01" inputmode="decimal" placeholder="未提供" value="${htmlEscape(r.tax)}"></label>${deductionEditor(r)}${taxRecordEditor(r)}${String(r.id).startsWith('new-')&&!demoRecords.some(saved=>saved.id===r.id)?'<button type="button" class="cancel-new">取消此条新增</button>':''}</section>`).join('')||'<p class="editor-note">本年度暂无记录，点击“新增收入记录”开始填写。</p>';
 records.querySelectorAll('.editor-deductions').forEach(section=>section.addEventListener('input',()=>{
  const parts=deductionParts.map(key=>section.querySelector(`[name="deduction-${key}"]`));
  const total=section.querySelector('[name="deduction-specialTotal"]');
  total.readOnly=parts.every(input=>input.value!==''&&input.validity.valid);
  if(total.readOnly)total.value=(parts.reduce((sum,input)=>sum+cents(input.value),0)/100).toFixed(2);
 }));
 records.querySelectorAll('.cancel-new').forEach(button=>button.onclick=()=>{collect();draft=draft.filter(r=>String(r.id)!==button.closest('[data-record-id]').dataset.recordId);render();result.textContent='尚未保存';});
 }
 form.querySelector('[name="editor-year"]').onchange=e=>{collect();year=e.target.value;render();};
 form.querySelector('.load-income').onclick=()=>{window.openIncomeImport?.();};
 form.querySelector('.add-income').onclick=()=>{collect();const id='new-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);recordYears.set(id,year);draft.push({id,month:year+'-01',type:'工资薪金',category:'正常工资薪金',company:'',income:'',tax:''});render();result.textContent='尚未保存';records.lastElementChild.scrollIntoView({block:'start',behavior:'smooth'});};
 form.onsubmit=e=>{
 e.preventDefault();collect();
 const identity=form.elements['profile-identity'].value.trim().toUpperCase(),name=form.elements['profile-name'].value.trim();
 if(name.length>80){result.textContent='纳税人姓名请控制在80个字符以内。';return;}
 if(identity&&!/^(?:\d{15}|\d{17}[\dX])$/.test(identity)){result.textContent='演示号码需为15位数字或18位号码，最后一位可为X。';return;}
 const invalid=draft.find(r=>!validDemoRecord(r)||!r.month.startsWith(recordYears.get(r.id)+'-')||!r.company||!r.category||['income','tax'].some(k=>!Number.isSafeInteger(cents(r[k])))||deductionFields.some(([key])=>{const v=r.deductions[key];return v!==''&&(!/^\d+(\.\d{1,2})?$/.test(v)||!Number.isSafeInteger(cents(v)));}));
 if(invalid){result.textContent=`请检查${invalid.month}的单位、小类、收入和扣除金额，金额最多两位小数。`;return;}
 const invalidTaxRecord=draft.find(r=>!validTaxRecordData(r));
 if(invalidTaxRecord){result.textContent=`请检查${invalidTaxRecord.month}的纳税记录数据：日期需有效，实缴退金额最多两位小数（可填负数），税务机关不超过100字、备注不超过160字。`;return;}
 if(Object.values(summaryDraft).some(value=>!TaxIncomePreset.validRemainder(value))){result.textContent='请检查未展开明细合计：金额不能为空，最多两位小数。';return;}
 let nextRecords;
 try{
  nextRecords=structuredClone(draft);
  persistDemoEditorData(nextRecords,{...taxpayerProfileData(),name,identity,taxDocumentEdited:true,incomeSummaryRemainders:summaryDraft});
 }catch(error){result.textContent=error.storageRestored===false?'保存未完成，旧数据恢复也未完成。请保留当前页面并重试保存。':'保存未完成：原数据未改动，请重试。';return;}
 demoRecords=nextRecords;profileIdentity=identity;profileIdentityVisible=false;
 refreshDemoIncome();renderProfileIdentity();
 result.textContent=`已保存，共${draft.length}条收入记录，所有年份已更新`;render();
 };
 form.addEventListener('input',()=>result.textContent='尚未保存');render();
}
const beforeEditorOpen=open;open=function(title){if(title==='我要咨询'){showDemoEditor();return}beforeEditorOpen(title)};
refreshDemoIncome();
