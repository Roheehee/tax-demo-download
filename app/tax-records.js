// Competition-demo tax records. Saved data stays on this device.
const taxRecordStorageKey='tax-replica-issued-records-v1';
const taxReferenceRequests=[];
const taxRecordIcons={
 eye:'<svg viewBox="0 0 24 18" aria-hidden="true"><path d="M1 9S5 2 12 2s11 7 11 7-4 7-11 7S1 9 1 9Z"/><circle cx="12" cy="9" r="3"/></svg>',
 save:'<svg viewBox="0 0 20 22" aria-hidden="true"><path d="M3 1h11l4 4v16H2V1Zm3 0v7h8V1M6 21v-9h8v9"/></svg>',
 arrows:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 7 7-7 7m7-14 7 7-7 7"/></svg>'
};
const taxMonthValid=value=>/^20\d\d-(0[1-9]|1[0-2])$/.test(value);
function loadTaxRequests(){
 try{const rows=JSON.parse(localStorage.getItem(taxRecordStorageKey)||'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&typeof r.time==='string'&&taxMonthValid(r.start)&&taxMonthValid(r.end)&&Array.isArray(r.rows)).slice(0,100):[];}catch{return [];}
}
let taxSavedRequests=loadTaxRequests();
function taxShanghaiTime(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now).replace('T',' ');}
function taxRecentRequests(rows,now=new Date()){
 const today=Date.parse(taxShanghaiTime(now).slice(0,10)+'T00:00:00+08:00');
 return rows.filter(r=>{const day=Date.parse(r.time.slice(0,10)+'T00:00:00+08:00');return day<=today&&day>=today-29*86400000;});
}
// Resolve on every preview/download. Saved application dates and snapshots remain intact.
function resolveTaxDocument(request){
 const profile=typeof taxpayerProfileData==='function'?taxpayerProfileData():{};
 const rows=demoRecords.filter(r=>r.month>=request.start&&r.month<=request.end).map(r=>{
  const metadata=typeof recordTaxData==='function'?recordTaxData(r):(r.taxRecord||{});
  const paid=metadata.paidTax!==undefined&&metadata.paidTax!==''?metadata.paidTax:r.tax;
  const amount=paid!==''&&Number.isFinite(Number(paid))?Number(paid).toFixed(2):'—';
  return {id:r.id,paidTax:amount,cells:[metadata.declarationDate||'—',amount,metadata.treasuryDate||'—',r.type||'—',r.month||'—',metadata.taxOffice||'—',metadata.notes||'—']};
 });
 return {...request,name:profile.name||'',identity:profileIdentity||'',rows,total:(rows.reduce((sum,r)=>sum+(r.paidTax==='—'?0:cents(r.paidTax)),0)/100).toFixed(2)};
}
function taxRecordMessage(text){
 let message=flowPage.querySelector('.tax-record-feedback');
 if(!message){message=document.createElement('p');message.className='tax-record-feedback';message.setAttribute('role','status');flowPage.querySelector('.flow-body').append(message);}
 message.textContent=text;message.scrollIntoView({block:'nearest'});
}
function taxFlow(title,body,className){
 showFlow(title,body);flowPage.classList.add(className);
 const status=flowPage.querySelector('.flow-status');
 status.innerHTML=statusMarkup.replace('11:59','18:21').replace('>76<','>32<').replace('<span>5G</span>','<svg class="tax-status-wifi" viewBox="0 0 22 18" aria-hidden="true"><path d="M2 5Q11-2 20 5M5 9q6-5 12 0M8 13q3-3 6 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="11" cy="16" r="1.2" fill="currentColor"/></svg>');
}
function taxHelp(text){originalOpen('温馨提示');document.querySelector('.sheet p').textContent=text;}
function showTaxIssue(){
 const dates={start:'2026-01',end:'2026-10'};
 let verified=false;
 const masked=profileIdentity?profileIdentity[0]+'*'.repeat(profileIdentity.length-2)+profileIdentity.at(-1):'******************';
 taxFlow('纳税记录开具',`<div class="tax-record-note">温馨提示：<br>1.根据《国家税务总局公告2018年第55号》的规定，您可申请开具2019年1月及以后的纳税记录；<br>2.每人每天最多可开具三次纳税记录；<br>3.您可以选择注册时所使用的证件或已添加的其他身份证件来开具纳税记录。<button class="tax-note-link tax-other-identity">去添加其他身份证件</button><br>4.若您对纳税记录的内容有疑问，请<button class="tax-note-link tax-record-help">点此帮助</button>。</div><div class="tax-identity-fields"><div class="tax-field"><label>证件类型</label><span>居民身份证</span></div><div class="tax-field tax-masked-identity"><label>证件号码</label><span>${htmlEscape(masked)}</span></div>${[['start','开具年月起'],['end','开具年月止']].map(([key,label])=>`<div class="tax-field tax-date-field"><label>${label}<button class="tax-hint" aria-label="${label}说明">?</button></label><button class="tax-month-trigger" data-bound="${key}" aria-label="${label}：${dates[key]}"><span>${dates[key]}</span><i class="query-chevron" aria-hidden="true"></i></button></div>`).join('')}</div><div class="tax-slide-section"><div class="tax-slide-track"><div class="tax-slide-fill"></div><span class="tax-slide-text">请按住滑块，拖动到最右边</span><button class="tax-slide-handle" role="slider" tabindex="0" aria-label="拖动滑块到最右边" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="未完成">${taxRecordIcons.arrows}</button></div></div><button class="flow-primary tax-generate">生成纳税记录</button><button class="tax-request-link">查看申请记录</button>`,'tax-issue-flow');
 const track=flowPage.querySelector('.tax-slide-track'),handle=track.querySelector('.tax-slide-handle'),fill=track.querySelector('.tax-slide-fill'),hint=track.querySelector('.tax-slide-text');
 let pointer=null,origin=0,offset=0;
 const applySlide=value=>{const max=Math.max(0,track.clientWidth-handle.offsetWidth);offset=Math.max(0,Math.min(max,value));handle.style.transform=`translateX(${offset}px)`;fill.style.width=`${offset+handle.offsetWidth}px`;handle.setAttribute('aria-valuenow',String(max?Math.round(offset/max*100):0));};
 const finish=()=>{const max=track.clientWidth-handle.offsetWidth;if(max>0&&offset>=max*.92){verified=true;flowPage.querySelector('.tax-record-feedback')?.remove();applySlide(max);track.classList.add('verified');hint.textContent='验证通过';handle.setAttribute('aria-valuetext','验证通过');handle.innerHTML='✓';}else applySlide(0);};
 handle.addEventListener('pointerdown',e=>{if(verified)return;pointer=e.pointerId;origin=e.clientX-offset;handle.setPointerCapture(e.pointerId);e.preventDefault();});
 handle.addEventListener('pointermove',e=>{if(e.pointerId===pointer)applySlide(e.clientX-origin);});
 handle.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;pointer=null;finish();});
 handle.addEventListener('pointercancel',()=>{pointer=null;if(!verified)applySlide(0);});
 handle.addEventListener('keydown',e=>{if(verified)return;const max=track.clientWidth-handle.offsetWidth;if(['ArrowRight','ArrowLeft','Home','End','Enter',' '].includes(e.key)){e.preventDefault();applySlide(e.key==='End'?max:e.key==='Home'?0:offset+(e.key==='ArrowRight'?max/10:e.key==='ArrowLeft'?-max/10:0));if(['End','Enter',' '].includes(e.key))finish();}});
 flowPage.querySelectorAll('.tax-month-trigger').forEach(button=>button.onclick=()=>showTaxMonthPicker(dates[button.dataset.bound],value=>{dates[button.dataset.bound]=value;flowPage.querySelector('.tax-record-feedback')?.remove();button.querySelector('span').textContent=value;button.setAttribute('aria-label',`${button.dataset.bound==='start'?'开具年月起':'开具年月止'}：${value}`);verified=false;track.classList.remove('verified');hint.textContent='请按住滑块，拖动到最右边';handle.innerHTML=taxRecordIcons.arrows;handle.setAttribute('aria-valuetext','未完成');applySlide(0);},button));
 flowPage.querySelectorAll('.tax-hint').forEach(button=>button.onclick=()=>taxHelp('选择开具纳税记录的起止月份，起始月份不能晚于结束月份。'));
 flowPage.querySelector('.tax-other-identity').onclick=()=>recordingPlaceholder('添加其他身份证件');
 flowPage.querySelector('.tax-record-help').onclick=()=>recordingPlaceholder('纳税记录帮助');
 flowPage.querySelector('.tax-request-link').onclick=()=>showTaxRequests(captureFlowView());
 flowPage.querySelector('.tax-generate').onclick=()=>{
  if(dates.start>dates.end){taxRecordMessage('开具年月起不能晚于开具年月止。');return;}
  if(!verified){taxRecordMessage('请先将滑块拖动到最右边。');handle.focus();return;}
  const parts=taxShanghaiTime();
  if(taxSavedRequests.filter(r=>r.time.slice(0,10)===parts.slice(0,10)).length>=3){taxRecordMessage('今日已生成3次，请明天再试。已有记录可在申请记录中查看和保存。');return;}
  const request={id:'local-'+Date.now().toString(36),time:parts.replace('T',' '),start:dates.start,end:dates.end,identity:masked,rows:structuredClone(demoRecords.filter(r=>r.month>=dates.start&&r.month<=dates.end))};
  const next=[request,...taxSavedRequests].slice(0,100);
  try{localStorage.setItem(taxRecordStorageKey,JSON.stringify(next));taxSavedRequests=next;}catch{taxRecordMessage('保存未完成，当前浏览器无法写入本地存储，请重试。');return;}
  verified=false;track.classList.remove('verified');hint.textContent='请按住滑块，拖动到最右边';handle.innerHTML=taxRecordIcons.arrows;handle.setAttribute('aria-valuetext','未完成');applySlide(0);
  showTaxRequests(captureFlowView());
 };
}
function showTaxMonthPicker(value,onConfirm,trigger){
 const [initialYear,initialMonth]=value.split('-');let selected={year:initialYear,month:initialMonth};
 const overlay=document.createElement('div');overlay.className='year-picker-overlay tax-month-overlay';
 overlay.innerHTML=`<section class="year-picker-panel" role="dialog" aria-modal="true" aria-label="选择开具年月"><header class="year-picker-toolbar"><button class="year-picker-cancel">取消</button><button class="year-picker-confirm">确定</button></header><div class="tax-month-wheels">${[['year','年份',Array.from({length:8},(_,i)=>String(2019+i))],['month','月份',Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))]].map(([key,label,values])=>`<div class="tax-date-wheel-wrap"><div class="tax-date-wheel" role="listbox" aria-label="${label}" data-part="${key}">${values.map(v=>`<button class="year-option" role="option" aria-selected="${v===selected[key]}" data-value="${v}" tabindex="${v===selected[key]?'0':'-1'}">${Number(v)}${key==='year'?'年':'月'}</button>`).join('')}</div><div class="year-selection-window"></div></div>`).join('')}</div></section>`;
 const body=flowPage.querySelector('.flow-body'),header=flowPage.querySelector('.income-bar');body.inert=true;header.inert=true;flowPage.append(overlay);
 const close=()=>{overlay.remove();body.inert=false;header.inert=false;trigger.focus({preventScroll:true});};
 const wheels=[...overlay.querySelectorAll('.tax-date-wheel')];
 const select=(wheel,value,scroll=true)=>{const options=[...wheel.children];selected[wheel.dataset.part]=value;options.forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.value===value));b.tabIndex=b.dataset.value===value?0:-1;});if(scroll)wheel.scrollTop=options.findIndex(b=>b.dataset.value===value)*options[0].offsetHeight;};
 wheels.forEach(wheel=>{const h=wheel.firstElementChild.offsetHeight,inset=(wheel.clientHeight-h)/2;wheel.style.paddingBlock=`${inset}px`;wheel.nextElementSibling.style.top=`${inset}px`;select(wheel,selected[wheel.dataset.part]);wheel.addEventListener('scroll',()=>{const index=Math.max(0,Math.min(wheel.children.length-1,Math.round(wheel.scrollTop/h)));select(wheel,wheel.children[index].dataset.value,false);},{passive:true});[...wheel.children].forEach(b=>b.onclick=()=>{select(wheel,b.dataset.value);b.focus({preventScroll:true});});wheel.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const options=[...wheel.children],i=options.findIndex(b=>b.dataset.value===selected[wheel.dataset.part]);const next=e.key==='Home'?0:e.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,i+(e.key==='ArrowDown'?1:-1)));select(wheel,options[next].dataset.value);options[next].focus({preventScroll:true});});});
 overlay.querySelector('.year-picker-cancel').onclick=close;overlay.querySelector('.year-picker-confirm').onclick=()=>{onConfirm(`${selected.year}-${selected.month}`);close();};
 overlay.onclick=e=>{if(e.target===overlay)close();};
 overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const stops=[overlay.querySelector('.year-picker-cancel'),...wheels.map(w=>w.querySelector('[aria-selected="true"]')),overlay.querySelector('.year-picker-confirm')];const i=stops.indexOf(document.activeElement);e.preventDefault();stops[(i+(e.shiftKey?-1:1)+stops.length)%stops.length].focus({preventScroll:true});}};
 wheels[0].querySelector('[aria-selected="true"]').focus({preventScroll:true});
}
function showTaxRequests(returnView){
 const requests=[...taxRecentRequests(taxSavedRequests),...taxReferenceRequests];
 taxFlow('纳税记录申请记录',`<div class="tax-record-note">温馨提示：<br>1.仅支持查询最近30天（含30天）内开具的纳税记录，如有需要，请重新开具；<br>2.若您对纳税记录的内容有疑问，请<button class="tax-note-link tax-record-help">点此帮助</button>。</div><div class="tax-request-list">${requests.map((r,i)=>`<article class="tax-request-card"><div class="tax-request-time">申请时间：${htmlEscape(r.time)}</div><div class="tax-request-period">税款所属期：${htmlEscape(r.start)}至${htmlEscape(r.end)}</div><div class="tax-request-scope">开具范围：本机演示数据</div><span class="tax-request-state">制作成功</span><div class="tax-request-actions"><button data-preview="${i}">${taxRecordIcons.eye}预览</button><button data-save="${i}">${taxRecordIcons.save}保存</button></div></article>`).join('')}</div>`,'tax-requests-flow');
 flowPage.querySelector('.flow-back').onclick=()=>restoreFlowView(returnView);
 flowPage.querySelector('.tax-record-help').onclick=()=>recordingPlaceholder('纳税记录帮助');
 flowPage.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>showTaxDocument(requests[Number(b.dataset.preview)],captureFlowView()));
 flowPage.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveTaxDocument(requests[Number(b.dataset.save)],b));
}
function taxDemoDocument(r){
 return `<div class="tax-print-document" style="--tax-print-pages:${taxPrintLayout(r).pages.length}">${taxDocumentSVG(r)}</div>`;
}
function showTaxDocument(request,returnView){
 const pageCount=taxPrintLayout(request).pages.length;
 taxFlow('纳税记录详情',`<div class="tax-document-paper">${taxDemoDocument(request)}</div><div class="tax-document-count">${pageCount===1?'<strong>1</strong>/1':`共<strong>${pageCount}</strong>页`}</div><button class="flow-primary tax-save-image">添加到相册</button>`,'tax-document-flow');
 const header=flowPage.querySelector('.income-bar');header.querySelector('.flow-back').hidden=true;header.insertAdjacentHTML('beforeend','<button class="tax-document-close">关闭</button>');
 const paper=flowPage.querySelector('.tax-document-paper');paper.tabIndex=0;paper.setAttribute('role','button');paper.setAttribute('aria-label','放大纳税记录');
 const body=flowPage.querySelector('.flow-body');
 const openZoom=()=>{
  if(flowPage.querySelector('.tax-document-zoom'))return;
  const overlay=document.createElement('div');overlay.className='tax-document-zoom';overlay.tabIndex=0;overlay.setAttribute('role','button');overlay.setAttribute('aria-label','收起放大的纳税记录');
  overlay.innerHTML=`<div class="tax-zoom-demo${pageCount===1?' tax-single-page':''}">${taxDemoDocument(request)}</div>`;
  const closeZoom=()=>{overlay.remove();body.inert=false;paper.focus({preventScroll:true});};
  overlay.onclick=closeZoom;overlay.onkeydown=e=>{if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();closeZoom();}};
  body.inert=true;flowPage.append(overlay);overlay.focus({preventScroll:true});
 };
 paper.onclick=openZoom;paper.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();openZoom();}};
 header.querySelector('.tax-document-close').onclick=()=>restoreFlowView(returnView);
 flowPage.querySelector('.tax-save-image').onclick=e=>saveTaxDocument(request,e.currentTarget);
}
async function taxDocumentBlob(request){
 const svg=taxDocumentSVG(request),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=new Image();image.src=url;await image.decode();
  // Bound very long two-year exports to a mobile-safe canvas, keeping every page.
  const scale=Math.min(1,16000/image.naturalHeight,Math.sqrt(12000000/(image.naturalWidth*image.naturalHeight)));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.floor(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas');ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('canvas')),'image/png'));
 }finally{URL.revokeObjectURL(url);}
}
async function saveTaxDocument(request,button){
 if(button.disabled)return;button.disabled=true;
 try{
  const blob=await taxDocumentBlob(request),filename=`纳税记录-${request.start}-${request.end}-比赛演示.png`,file=new File([blob],filename,{type:blob.type});
  let shared=false;
  if(navigator.maxTouchPoints>0&&navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:'纳税记录'});shared=true;}catch(error){if(error.name==='AbortError')return;if(!['NotAllowedError','NotSupportedError'].includes(error.name))throw error;}}
  if(!shared){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);taxRecordMessage('图片已下载。手机上可打开图片后保存到相册。');}
 }catch(error){if(error.name!=='AbortError')taxRecordMessage('保存暂未完成，请重试。');}finally{button.disabled=false;}
}
const beforeTaxRecordsOpen=open;
open=function(title){if(title==='纳税记录开具'){showTaxIssue();return;}beforeTaxRecordsOpen(title);};
