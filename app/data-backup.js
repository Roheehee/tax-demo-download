// Local-only migration. No backup content is sent over the network.
(function (root) {
 'use strict';
 const KEYS=['tax-replica-income-v1','tax-replica-profile-v1','tax-replica-issued-records-v1'];
 const RESTORE_KEY='tax-replica-before-import-v1';
 const MAX_BYTES=5*1024*1024;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
 const month=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
 function record(r){return object(r)&&['string','number'].includes(typeof r.id)&&month(r.month)&&['type','category','company'].every(k=>typeof r[k]==='string')&&['income','tax'].every(k=>r[k]===''||typeof r[k]==='string'&&/^\d+(\.\d{1,2})?$/.test(r[k]));}
 function snapshot(storage,origin){return {format:'tax-replica-backup',version:1,createdAt:new Date().toISOString(),origin:origin||'',storage:Object.fromEntries(KEYS.map(k=>[k,storage.getItem(k)]))};}
 function parse(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('备份文件过大，最多支持5MB。');
  let b;try{b=JSON.parse(text);}catch{throw new Error('文件不是有效的JSON备份。');}
  if(!object(b)||b.format!=='tax-replica-backup'||b.version!==1||!object(b.storage)||Object.keys(b.storage).length!==3||!KEYS.every(k=>own(b.storage,k)))throw new Error('这不是本应用支持的备份文件。');
  for(const key of KEYS){
   const raw=b.storage[key];if(raw===null)continue;
   if(typeof raw!=='string')throw new Error('备份中的数据格式不正确。');
   let value;try{value=JSON.parse(raw);}catch{throw new Error('备份包含无法读取的数据，未导入。');}
   if(key===KEYS[0]&&(!Array.isArray(value)||value.length>10000||!value.every(record)||new Set(value.map(r=>String(r.id))).size!==value.length))throw new Error('收入记录格式不正确，未导入。');
   if(key===KEYS[1]&&(!object(value)||['name','identity'].some(k=>own(value,k)&&typeof value[k]!=='string')))throw new Error('个人资料格式不正确，未导入。');
   if(key===KEYS[2]&&(!Array.isArray(value)||value.length>100||!value.every(r=>object(r)&&typeof r.id==='string'&&typeof r.time==='string'&&month(r.start)&&month(r.end)&&Array.isArray(r.rows))))throw new Error('纳税申请记录格式不正确，未导入。');
  }
  return b;
 }
 function summarize(b){
  const read=k=>{try{return JSON.parse(b.storage[k]);}catch{return null;}};
  const rows=read(KEYS[0]),profile=read(KEYS[1]),requests=read(KEYS[2]);
  const years={};if(Array.isArray(rows))for(const r of rows){const y=String(r.month||'').slice(0,4);if(/^\d{4}$/.test(y))years[y]=(years[y]||0)+1;}
  return {incomeCount:Array.isArray(rows)?rows.length:0,years,profileSaved:object(profile),requestCount:Array.isArray(requests)?requests.length:0,empty:KEYS.every(k=>b.storage[k]===null)};
 }
 function put(storage,values){for(const key of KEYS){if(values[key]===null)storage.removeItem(key);else storage.setItem(key,values[key]);}}
 function apply(storage,backup,origin){
  const checked=parse(JSON.stringify(backup)),before=snapshot(storage,origin);
  // Abort before changing any app key if there is no room for a recovery snapshot.
  storage.setItem(RESTORE_KEY,JSON.stringify(before));
  try{put(storage,checked.storage);for(const key of KEYS)if(storage.getItem(key)!==checked.storage[key])throw new Error('写入校验失败');}
  catch(error){
   let restored=true;
   for(const key of KEYS){try{if(storage.getItem(key)!==before.storage[key]){if(before.storage[key]===null)storage.removeItem(key);else storage.setItem(key,before.storage[key]);}}catch{restored=false;}}
   const failure=new Error(restored?'导入未完成，原数据已恢复。请保留备份文件。':'导入未完成。请勿关闭或清理应用，保留备份文件后重试恢复。');failure.restored=restored;throw failure;
  }
 }
 const api={KEYS,RESTORE_KEY,MAX_BYTES,snapshot,parse,summarize,apply};
 if(typeof module==='object'&&module.exports){module.exports=api;return;}
 root.TaxDataBackup=api;
 let dialog;
 function summaryText(b){const s=summarize(b);return s.empty?'此入口没有已保存的数据。请回到有原数据的桌面图标导出。':`${s.incomeCount}条收入记录${Object.entries(s.years).map(([y,n])=>` · ${y}年${n}条`).join('')}\n个人资料：${s.profileSaved?'已保存':'未填写'} · 纳税申请：${s.requestCount}条`;}
 function openDataBackup(){
  if(dialog){dialog.showModal();return;}
  dialog=document.createElement('dialog');dialog.className='data-backup-dialog';dialog.setAttribute('aria-labelledby','data-backup-title');
  dialog.innerHTML=`<header><h2 id="data-backup-title">更新与数据备份</h2><button type="button" class="backup-close" aria-label="关闭数据备份">×</button></header><div class="backup-body"><p class="backup-version">比赛演示 · v13</p><p>先在“我要咨询”保存修改，再导出备份。文件包含已保存的所有年份、个人资料及纳税申请。数据只在本机处理。</p><label>当前入口<input class="backup-origin" readonly aria-label="当前应用地址"></label><pre class="backup-current"></pre><button type="button" class="backup-export">导出数据备份</button><p class="backup-hint">手机弹出分享面板后，请选择“存储到文件”。文件可能包含个人资料，请自行保管。</p><hr><label class="backup-file-label">选择备份文件<input type="file" class="backup-file" accept=".json,application/json"></label><pre class="backup-preview" hidden></pre><button type="button" class="backup-import" hidden>确认替换并导入</button><p>导入会替换此入口的三类数据，不会改动旧图标里的数据。确认前会显示记录数量，并在本机保留导入前快照。</p><button type="button" class="backup-restore" hidden>恢复上次导入前的数据</button><div class="backup-restore-panel" hidden><pre></pre><button type="button" class="backup-restore-confirm">确认恢复</button></div><hr><button type="button" class="backup-update">刷新到最新版本</button><p class="backup-hint">只刷新当前网址，不清理已保存数据。请先保存未提交的修改；更换网址或设备需要导入备份。</p><p class="backup-result" role="status" aria-live="polite"></p></div>`;
  document.body.append(dialog);
  const q=s=>dialog.querySelector(s),message=text=>q('.backup-result').textContent=text;
  q('.backup-origin').value=location.origin+location.pathname;
  try{q('.backup-current').textContent=summaryText(snapshot(localStorage,location.origin));q('.backup-restore').hidden=!localStorage.getItem(RESTORE_KEY);}catch{q('.backup-current').textContent='此浏览器暂时无法访问本机数据。';}
  q('.backup-close').onclick=()=>{dialog.close();dialog.remove();dialog=null;};
  dialog.addEventListener('cancel',()=>{dialog.remove();dialog=null;});
  q('.backup-export').onclick=async()=>{
   try{
    const data=snapshot(localStorage,location.origin),json=JSON.stringify(data,null,2),filename='个税演示-数据备份-'+new Date().toISOString().slice(0,10)+'.json';
    const file=new File([json],filename,{type:'application/json'});
    if(navigator.maxTouchPoints>0&&navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'个税演示数据备份'});message('请确认已将备份存到“文件”。分享面板关闭不代表文件已保存。');}
    else{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);message('已发起备份下载，请确认文件已保存。原数据未改变。');}
   }catch(e){message(e.name==='AbortError'?'已取消导出，原数据未改变。':'导出未完成：'+e.message);}
  };
  let pending=null;
  q('.backup-file').onchange=async e=>{
   pending=null;q('.backup-import').hidden=true;q('.backup-preview').hidden=true;message('');
   const file=e.target.files[0];if(!file)return;
   try{if(file.size>MAX_BYTES)throw new Error('文件超过5MB。');pending=parse(await file.text());q('.backup-preview').textContent='将导入：\n'+summaryText(pending)+'\n确认后将替换此入口已有数据。';q('.backup-preview').hidden=false;q('.backup-import').hidden=false;}
   catch(error){message(error.message);}
  };
  const finish=b=>{try{apply(localStorage,b,location.origin);message('导入成功，正在重新加载。');location.reload();}catch(e){message(e.message);q('.backup-restore').hidden=!localStorage.getItem(RESTORE_KEY);}};
  q('.backup-import').onclick=()=>{if(pending)finish(pending);};
  let recovery=null;
  q('.backup-restore').onclick=()=>{try{recovery=parse(localStorage.getItem(RESTORE_KEY)||'');q('.backup-restore-panel pre').textContent='将恢复：\n'+summaryText(recovery);q('.backup-restore-panel').hidden=false;}catch(e){message(e.message);}};
  q('.backup-restore-confirm').onclick=()=>{if(recovery)finish(recovery);};
  q('.backup-update').onclick=()=>{const url=new URL(location.href);url.searchParams.set('update',Date.now().toString());location.replace(url.href);};
  dialog.showModal();
 }
 root.openDataBackup=openDataBackup;
 const previousOpen=root.open;
 root.open=function(title){if(title==='关于&更新'||title==='数据备份'){openDataBackup();return;}previousOpen(title);};
})(typeof window==='undefined'?globalThis:window);
