// Presets are read locally. No payload is fetched from or sent to a server.
(function () {
 'use strict';
 const PREFIX='#income-data=';
 let dialog=null;
 function payloadText(value){
  const text=value.trim();
  if(text.startsWith('{'))return text;
  let hash;
  try{hash=text.startsWith(PREFIX)?text:new URL(text).hash;}catch{throw new Error('请粘贴收入数据链接或JSON数据。');}
  if(!hash.startsWith(PREFIX))throw new Error('这不是收入数据链接。');
  const encoded=hash.slice(PREFIX.length);
  if(encoded.length>360000||!/^[A-Za-z0-9_-]+$/.test(encoded))throw new Error('收入数据链接不完整或过大。');
  try{return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));}
  catch{throw new Error('收入数据链接无法读取，请重新复制完整链接。');}
 }
 function openIncomeImport(initial=''){
  if(dialog){dialog.showModal();return;}
  dialog=document.createElement('dialog');dialog.className='data-backup-dialog income-import-dialog';dialog.setAttribute('aria-labelledby','income-import-title');
  dialog.innerHTML='<header><h2 id="income-import-title">载入收入数据</h2><button type="button" class="backup-close" aria-label="关闭收入数据载入">×</button></header><div class="backup-body"><p>载入后可在“我的 → 我要咨询”修改。只替换选定年度的收入数据，保留其他年度、个人资料及已有申请；未保存的编辑不会带入。</p><div class="income-default-options"></div><label>选择收入数据文件<input type="file" class="income-preset-file" accept=".json,application/json"></label><label>或粘贴数据链接／JSON<textarea class="income-preset-text" rows="3" autocomplete="off" spellcheck="false"></textarea></label><button type="button" class="income-preset-preview">预览数据</button><div class="income-preset-review" hidden><pre></pre><p>“未展开明细合计”来自提供的总额减去已录入明细，不代表某个具体月份，也不会补造收入记录。该合计同样可以修改。</p><p class="income-preset-replace"></p><button type="button" class="income-preset-apply">确认载入</button></div><p class="backup-result" role="status" aria-live="polite"></p></div>';
  document.body.append(dialog);
  const currentDialog=dialog,q=s=>currentDialog.querySelector(s),message=t=>q('.backup-result').textContent=t;
  let pending=null,readSequence=0;
  const clear=()=>{readSequence++;pending=null;q('.income-preset-review').hidden=true;message('');};
  function preview(value){
   clear();
   try{
    pending=TaxIncomePreset.parse(payloadText(value));
    const s=TaxIncomePreset.summarize(pending),prepared=TaxIncomePreset.prepareImport(demoRecords,taxpayerProfileData(),pending),oldCount=demoRecords.filter(r=>r.month.startsWith(s.year+'-')).length;
    q('.income-preset-review pre').textContent=`${pending.label||'收入数据'}\n${s.year}年 · ${s.rowsCount}条可编辑明细\n收入合计：${s.totalIncome}元\n税额合计：${s.totalTax}元\n未展开明细收入：${s.remainderIncome}元\n未展开明细税额：${s.remainderTax}元\n\n`+pending.records.map(r=>`${r.month} ${r.type}\n${r.company}\n收入 ${r.income}元 · 税额 ${r.tax}元`).join('\n\n');
    q('.income-preset-replace').textContent=`确认后替换当前${s.year}年的${oldCount}条记录，保留其他年度${prepared.records.length-s.rowsCount}条。载入前会在本机保留一份恢复快照。`;
    q('.income-preset-review').hidden=false;
   }catch(error){pending=null;message(error.message);}
  }
  const options=q('.income-default-options');
  for(const year of window.TaxIncomeDefaults?.years || []){
   const button=document.createElement('button');
   button.type='button';
   button.textContent=year+' 年默认明细';
   button.onclick=()=>{
    q('.income-preset-file').value='';
    q('.income-preset-text').value='';
    preview(JSON.stringify(TaxIncomeDefaults.create(year)));
    q('.income-preset-review').scrollIntoView({block:'start'});
   };
   options.append(button);
  }
  const close=()=>{dialog.close();dialog.remove();dialog=null;};
  q('.backup-close').onclick=close;dialog.addEventListener('cancel',()=>{dialog.remove();dialog=null;});
  q('.income-preset-text').addEventListener('input',clear);
  q('.income-preset-preview').onclick=()=>preview(q('.income-preset-text').value);
  q('.income-preset-file').onchange=async e=>{
   clear();const file=e.target.files[0],sequence=readSequence;if(!file)return;
   try{if(file.size>256*1024)throw new Error('收入数据文件最多256KB。');const text=await file.text();if(dialog!==currentDialog||sequence!==readSequence)return;q('.income-preset-text').value=text;preview(text);}catch(error){if(dialog===currentDialog&&sequence===readSequence)message(error.message);}
  };
  q('.income-preset-apply').onclick=()=>{
   if(!pending)return;
   const button=q('.income-preset-apply');button.disabled=true;
   try{
    const next=TaxIncomePreset.prepareImport(demoRecords,taxpayerProfileData(),pending);
    localStorage.setItem(TaxDataBackup.RESTORE_KEY,JSON.stringify(TaxDataBackup.snapshot(localStorage,location.origin)));
    next.profile.incomePreferredQuery={year:pending.summary.year,types:[...pending.summary.types]};
    next.profile.taxDocumentEdited=true;
    persistDemoEditorData(next.records,next.profile);
    message('已载入，正在打开收入明细。');
    history.replaceState({tab:'home'},'',location.pathname+location.search);
    history.pushState({page:'income'},'',location.pathname+location.search+'#income');
    location.reload();
   }catch(error){button.disabled=false;message(error.storageRestored===false?'载入未完成，原数据恢复也未完成。请保留此页，使用“关于&更新”中的恢复快照。':'载入未完成，原有数据未改变：'+error.message);}
  };
  dialog.showModal();if(initial)preview(initial);
 }
 window.openIncomeImport=openIncomeImport;
 function takeLink(){
  if(!location.hash.startsWith(PREFIX))return;
  const raw=location.hash;
  history.replaceState(null,'',location.pathname+location.search);
  openIncomeImport(raw);
 }
 window.addEventListener('hashchange',takeLink);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',takeLink,{once:true});else takeLink();
 const help=incomePage.querySelector('.income-help');
 const priorHelp=help.onclick;
 help.onclick=()=>{
  const entry=TaxIncomePreset.normalizeRemainders(taxpayerProfileData())[incomeQueryYear];
  if(!entry){priorHelp?.();return;}
  originalOpen('收入合计说明');
  if(entry.income === '0.00' && entry.tax === '0.00'){
   document.querySelector('.sheet p').textContent='合计为所选年度、所得类型下已录入的逐笔金额。';
   return;
  }
  const included=entry.types.every(t=>incomeQueryTypes.includes(t));
  document.querySelector('.sheet p').textContent=included?`合计包含已录入明细，以及尚未展开的收入${entry.income}元、税额${entry.tax}元。两部分都可在“我的 → 我要咨询”修改。未展开部分没有逐月明细，不作为纳税记录导出的明细。`:'本次筛选仅汇总已录入明细；未展开部分未提供各所得类型的拆分，因此没有计入此筛选合计。';
 };
})();
