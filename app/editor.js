// Competition demo: user edits stay in this browser/device.
const incomeModel = TaxIncomeModel;
const demoStorageKey = incomeModel.storageKey;
const demoTypes = incomeModel.types;
const validDemoRecord = incomeModel.validRecord;
const amountText = incomeModel.amountText;
const cents = incomeModel.cents;
const editorIncomeState = incomeModel.loadState();
let { records: demoRecords, usingBuiltInIncome, year: incomeQueryYear, types: incomeQueryTypes } = editorIncomeState;

function taxpayerProfileData() {
  return incomeModel.readProfile(usingBuiltInIncome, typeof profileIdentity === 'string' ? profileIdentity : '');
}
function currentIncomeResult() {
  return incomeModel.select({ ...editorIncomeState, records: demoRecords, profile: taxpayerProfileData() }, incomeQueryYear, incomeQueryTypes);
}
function filteredDemoRecords() { return currentIncomeResult().records; }
function demoYearTotal(key) { return currentIncomeResult().totals[key]; }
const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function refreshDemoIncome(){
 const result=currentIncomeResult();
 const list=incomePage.querySelector('.income-records');list.innerHTML='';
 result.records.forEach(r=>{const b=document.createElement('button');b.className='income-record';b.innerHTML=`<div class="record-heading"><span>${htmlEscape(r.type)}</span><span>${htmlEscape(r.month)}</span></div><div class="record-line">所得项目小类：${htmlEscape(r.category)}</div><div class="record-line">扣缴义务人：${htmlEscape(r.company)}</div><div class="record-line">收入：${amountText(r.income)}</div><div class="record-line">已申报税额：${amountText(r.tax)}</div><i class="record-arrow"></i>`;b.onclick=()=>showDemoDetail(r);list.append(b)});
 if(!list.children.length)list.innerHTML=`<p class="income-empty">${htmlEscape(incomeQueryYear)}年暂无符合条件的收入记录</p>`;
 const totals=incomePage.querySelectorAll('.total-line>span:last-child');
 ['income','tax'].forEach((k,i)=>totals[i].textContent=(result.totals[k]/100).toFixed(2)+'元');
}
const { deductionFields, deductionParts, recordDeductions, referenceDeductionsUnchanged, taxRecordFields, recordTaxData } = incomeModel;
function deductionEditor(r){
 const d=recordDeductions(r);
 return `<details class="editor-deductions"><summary>本期收入与扣除数据</summary><p>金额单位为元。四项明细全部填写后，专项扣除合计自动相加；没有金额填0，仅知道合计时可直接填写。留空表示未提供。</p>${deductionFields.map(([key,label])=>`<label>${label}（元）<input name="deduction-${key}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="未提供" value="${htmlEscape(d[key])}" ${key==='specialTotal'&&deductionParts.every(k=>d[k]!=='')?'readonly':''}></label>`).join('')}</details>`;
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
 showFlow('收入纳税明细详情', TaxIncomeDetail.detail(r));
 flowPage.classList.add('income-detail-flow');
 flowPage.querySelectorAll('.tax-link').forEach(button=>button.onclick=()=>showDemoTaxCalculation(r,captureFlowView()));
}
function showDemoTaxCalculation(r,returnView){
 showFlow('税款计算', TaxIncomeDetail.calculation(r, demoRecords));
 flowPage.classList.add('tax-calculation-flow');
 flowPage.querySelector('.flow-back').onclick=()=>restoreFlowView(returnView);
 flowPage.querySelector('.policy-explanation').onclick=()=>{open('政策说明');document.querySelector('.sheet p').textContent=TaxIncomeDetail.policyMessage;};
}
function showDemoEditor(){
 let draft=demoRecords.map(r=>({...structuredClone(r),deductions:recordDeductions(r),taxRecord:{...(r.taxRecord&&typeof r.taxRecord==='object'&&!Array.isArray(r.taxRecord)?r.taxRecord:{}),...recordTaxData(r)}})),year=incomeQueryYear;
 const profile=taxpayerProfileData();
 const summaryDraft=window.TaxIncomePreset?TaxIncomePreset.normalizeRemainders(profile):{};
 const recordYears=new Map(draft.map(r=>[r.id,r.month.slice(0,4)]));
 const years=[...new Set(['2026','2025',year,...Object.keys(summaryDraft),...draft.map(r=>r.month.slice(0,4))])].sort().reverse();
 showFlow('修改演示数据',`<p class="editor-note">比赛演示数据 · 默认载入已选收入数据 · 修改仅保存到当前设备<br>按年度编辑，可为同一月份添加多条记录。</p><form id="demo-editor"><section class="edit-card"><h2>我的 · 纳税人信息</h2><label>纳税人姓名<input name="profile-name" type="text" autocomplete="off" maxlength="80" placeholder="填写演示姓名" value="${htmlEscape(TaxProfileDisplay.name())}"></label><label>演示号码<input name="profile-identity" type="text" autocomplete="off" maxlength="18" placeholder="可只填首尾，中间用星号" value="${htmlEscape(profileIdentity || TaxProfileDisplay.identityMask())}"></label><label>任职单位（每行一家，留空显示“暂无”）<textarea name="profile-employers" rows="2" class="profile-employers" placeholder="填写单位名称">${htmlEscape(TaxProfileDisplay.employers().join('\n'))}</textarea></label></section><section class="edit-card"><h2>我的 · 银行卡</h2><div class="profile-bank-rows"></div><button class="profile-add-card" type="button">＋ 添加银行卡</button></section><section class="edit-card editor-toolbar"><label>编辑年度<select name="editor-year">${years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}</select></label><button type="button" class="add-income">＋ 新增收入记录</button><button type="button" class="load-income">载入收入数据</button><button type="button" class="delete-month">删除月份</button><p class="year-count" role="status"></p></section><section class="edit-card income-summary-editor" hidden></section><div class="editor-records"></div><p class="editor-note">切换年份会保留尚未保存的填写内容。点击“保存修改”同时保存所有年份；收入明细按查询年份显示。合计汇总当前查询条件下的记录；如有未展开明细合计，也会按其适用类型计入。</p><p class="editor-note">保存后，已有申请的预览、放大和再次下载也使用最新数据；已下载的旧图片需重新下载。</p></form><dialog class="delete-month-dialog" aria-labelledby="delete-month-title"><h2 id="delete-month-title">删除月份</h2><label>选择月份<select name="delete-month" aria-describedby="delete-month-info"></select></label><p id="delete-month-info" role="status"></p><div class="month-actions"><button type="button" class="cancel-month">取消</button><button type="button" class="confirm-month" disabled>确认删除</button></div></dialog>`,'<footer class="editor-footer"><span class="editor-result" role="status"></span><button class="flow-primary" type="submit" form="demo-editor">保存修改</button></footer>');
 const form=flowPage.querySelector('form'),records=form.querySelector('.editor-records'),result=flowPage.querySelector('.editor-result');
 const bankRows=form.querySelector('.profile-bank-rows');
 function addBankRow(card={name:'',lastFour:''}) {
  const row=document.createElement('fieldset');row.className='profile-bank-row';
  row.innerHTML='<legend>银行卡</legend><label>银行名称<input name="bank-name" required maxlength="80" autocomplete="off"></label><label>银行卡尾号<input name="bank-last-four" type="text" required inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" placeholder="仅填后四位"></label><button type="button" class="profile-remove-card">移除这张卡</button>';
  row.querySelector('[name="bank-name"]').value=card.name;
  row.querySelector('[name="bank-last-four"]').value=card.lastFour;
  row.querySelector('button').onclick=()=>{row.remove();result.textContent='尚未保存';};
  bankRows.append(row);return row;
 }
 TaxProfileDisplay.bankCards().forEach(addBankRow);
 form.querySelector('.profile-add-card').onclick=()=>{addBankRow().querySelector('input').focus();result.textContent='尚未保存';};
 const collect=()=>{if(summaryDraft[year]){summaryDraft[year].income=form.elements['summary-income'].value.trim();summaryDraft[year].tax=form.elements['summary-tax'].value.trim();}for(const card of records.querySelectorAll('[data-record-id]')){const r=draft.find(r=>String(r.id)===card.dataset.recordId);for(const k of ['month','type','category','company','income','tax'])r[k]=card.querySelector(`[name="${k}"]`).value.trim();r.deductions=Object.fromEntries(deductionFields.map(([key])=>[key,card.querySelector(`[name="deduction-${key}"]`).value.trim()]));r.deductions=recordDeductions(r);r.taxRecord={...r.taxRecord,...Object.fromEntries(taxRecordFields.map(([key])=>[key,card.querySelector(`[name="tax-record-${key}"]`).value.trim()]))};}};
 const deleteButton=form.querySelector('.delete-month');
 const monthDialog=flowPage.querySelector('.delete-month-dialog');
 const monthSelect=monthDialog.querySelector('select'), monthInfo=monthDialog.querySelector('[role="status"]');
 const confirmMonth=monthDialog.querySelector('.confirm-month');
 function matchesMonth(row, month){return recordYears.get(row.id)===year && row.month===month;}
 function showMonthInfo(){
  const month=monthSelect.value, count=month ? draft.filter(r=>matchesMonth(r,month)).length : 0;
  confirmMonth.disabled=!count;
  monthInfo.textContent=count ? `${month} 共有 ${count} 条收入记录，将一起移除。点击“保存修改”后生效。` : '请选择要删除的月份。';
 }
 deleteButton.onclick=()=>{
  collect();
  const months=[...new Set(draft.filter(r=>recordYears.get(r.id)===year && r.month.startsWith(year+'-') && /^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)).map(r=>r.month))].sort().reverse();
  monthSelect.replaceChildren(new Option('请选择月份',''));
  for(const month of months)monthSelect.add(new Option(month,month));
  showMonthInfo();
  if(!months.length)monthInfo.textContent='本年度没有可删除的月份。';
  monthDialog.showModal();
 };
 monthSelect.onchange=showMonthInfo;
 monthDialog.querySelector('.cancel-month').onclick=()=>monthDialog.close();
 confirmMonth.onclick=()=>{
  const month=monthSelect.value;
  if(!month || !month.startsWith(year+'-'))return;
  const removed=draft.filter(r=>matchesMonth(r,month));
  if(!removed.length)return;
  draft=draft.filter(r=>!matchesMonth(r,month));
  for(const row of removed)recordYears.delete(row.id);
  monthDialog.close();
  render();
  result.textContent=`已移除 ${month} 的 ${removed.length} 条记录，尚未保存`;
 };
 function render(){
 const summaryCard=form.querySelector('.income-summary-editor'),summary=summaryDraft[year];
 summaryCard.hidden=!summary;
 summaryCard.innerHTML=summary?`<h2>截图未展开明细合计 · ${htmlEscape(year)}</h2><p class="editor-note">这里只填写未列在逐月明细里的金额；已全部列出时填 0。如果下方补录了原先计入这里的明细，请扣减对应余额。</p><p class="editor-note">适用所得类型：${summary.types.map(htmlEscape).join('、')}。筛选不含全部这些类型时，仅汇总已录入明细。</p><label>未展开明细的收入合计（元）<input name="summary-income" type="number" required min="0" step="0.01" inputmode="decimal" value="${htmlEscape(summary.income)}"></label><label>未展开明细的税额合计（元）<input name="summary-tax" type="number" required min="0" step="0.01" inputmode="decimal" value="${htmlEscape(summary.tax)}"></label>`:'';
 const visible=draft.filter(r=>recordYears.get(r.id)===year);
 deleteButton.disabled=visible.length===0;
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
 const enteredId=form.elements['profile-identity'].value.trim().toUpperCase(),name=form.elements['profile-name'].value.trim();
 const identityMask=/^\d(?:\*{13}|\*{16})[0-9X]$/.test(enteredId)?enteredId:'';
 const identity=identityMask?'':enteredId;
 const bankCards=[...bankRows.children].map(row=>({name:row.querySelector('[name="bank-name"]').value.trim(),lastFour:row.querySelector('[name="bank-last-four"]').value.trim()}));
 if(bankCards.some(card=>!card.name || !/^\d{4}$/.test(card.lastFour))){result.textContent='请填写每张卡的银行名称与四位尾号。';return;}
 const employers=[...new Set(form.elements['profile-employers'].value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
 if(name.length>80){result.textContent='纳税人姓名请控制在80个字符以内。';return;}
 if(identity&&!/^(?:\d{15}|\d{17}[\dX])$/.test(identity)){result.textContent='演示号码应为 15 或 18 位；可只填首尾，其余位用星号。';return;}
 const invalid=draft.find(r=>!validDemoRecord(r)||!r.month.startsWith(recordYears.get(r.id)+'-')||!r.company||!r.category||['income','tax'].some(k=>!Number.isSafeInteger(cents(r[k])))||deductionFields.some(([key])=>{const v=r.deductions[key];return v!==''&&(!/^\d+(\.\d{1,2})?$/.test(v)||!Number.isSafeInteger(cents(v)));}));
 if(invalid){result.textContent=`请检查${invalid.month}的单位、小类、收入和扣除金额，金额最多两位小数。`;return;}
 const invalidTaxRecord=draft.find(r=>!validTaxRecordData(r));
 if(invalidTaxRecord){result.textContent=`请检查${invalidTaxRecord.month}的纳税记录数据：日期需有效，实缴退金额最多两位小数（可填负数），税务机关不超过100字、备注不超过160字。`;return;}
 if(Object.values(summaryDraft).some(value=>!TaxIncomePreset.validRemainder(value))){result.textContent='请检查未展开明细合计：金额不能为空，最多两位小数。';return;}
 let nextRecords;
 try{
  nextRecords=structuredClone(draft);
  persistDemoEditorData(nextRecords,{...taxpayerProfileData(),name,identity,identityMask,bankCards,employers,taxDocumentEdited:true,incomeSummaryRemainders:summaryDraft});
 }catch(error){result.textContent=error.storageRestored===false?'保存未完成，旧数据恢复也未完成。请保留当前页面并重试保存。':'保存未完成：原数据未改动，请重试。';return;}
 demoRecords=nextRecords;profileIdentity=identity;profileIdentityVisible=false;
 refreshDemoIncome();renderProfileIdentity();
 result.textContent=`已保存，共${draft.length}条收入记录，所有年份已更新`;render();
 };
 form.addEventListener('input',()=>result.textContent='尚未保存');render();
}
const beforeEditorOpen=open;open=function(title){if(title==='我要咨询'){showDemoEditor();return}beforeEditorOpen(title)};
refreshDemoIncome();
