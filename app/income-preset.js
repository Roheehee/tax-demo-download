// Generic income import helpers. No personal data, storage, DOM or network access.
(function (root) {
 'use strict';
 const FORMAT='tax-income-preset',VERSION=1,MAX_BYTES=256*1024,MAX_RECORDS=1000;
 const TYPES=Object.freeze(['工资薪金','劳务报酬','稿酬','特许权使用费','经营所得','利息、股息、红利','财产租赁','财产转让','偶然所得']);
 const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const yearValid=value=>typeof value==='string'&&/^[1-9]\d{3}$/.test(value);
 const monthValid=value=>typeof value==='string'&&/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value);
 function fail(message){throw new Error(message);}
 function amountCents(value){
  if(typeof value!=='string'||value.length>20||!/^\d+(?:\.\d{1,2})?$/.test(value))fail('金额需为非负数字，最多两位小数，不能留空。');
  const [whole,fraction='']=value.split('.');
  const result=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
  if(result>BigInt(Number.MAX_SAFE_INTEGER))fail('金额超过可精确保存的范围。');
  return Number(result);
 }
 function money(cents){
  if(!Number.isSafeInteger(cents)||cents<0)fail('金额合计超过可精确保存的范围。');
  const value=BigInt(cents);
  return String(value/100n)+'.'+String(value%100n).padStart(2,'0');
 }
 function bounded(value,limit,label,allowEmpty=false){
  if(typeof value!=='string')fail(label+'格式不正确。');
  const result=value.trim();
  if((!allowEmpty&&!result)||result.length>limit)fail(label+'不能为空且不能超过'+limit+'个字符。');
  return result;
 }
 function scope(types){
  if(!Array.isArray(types)||!types.length||types.length>100||!types.every(t=>typeof t==='string'&&TYPES.includes(t)))fail('所得类型范围不正确。');
  return [...new Set(types)];
 }
 function remainder(value){
  if(!object(value))fail('未展开明细合计格式不正确。');
  return {types:scope(value.types),income:money(amountCents(value.income)),tax:money(amountCents(value.tax))};
 }
 function validRemainder(value){try{remainder(value);return true;}catch{return false;}}
 function normalizeRemainders(profile){
  const values=object(profile)&&object(profile.incomeSummaryRemainders)?profile.incomeSummaryRemainders:{};
  const result={};
  for(const [year,value] of Object.entries(values))if(yearValid(year)&&validRemainder(value))result[year]=remainder(value);
  return result;
 }
 function validate(value){
  if(!object(value)||value.format!==FORMAT||value.version!==VERSION||!object(value.summary)||!Array.isArray(value.records)||value.records.length>MAX_RECORDS)fail('这不是支持的收入数据文件。');
  const year=value.summary.year;if(!yearValid(year))fail('收入年度格式不正确。');
  const summary={year,...remainder(value.summary)};
  const ids=new Set();
  const records=value.records.map(row=>{
   if(!object(row)||!monthValid(row.month)||!row.month.startsWith(year+'-'))fail('所有记录须属于所选年度，月份需有效。');
   const id=bounded(row.id,100,'记录编号');
   if(ids.has(id))fail('记录编号不能重复。');ids.add(id);
   if(!TYPES.includes(row.type)||!summary.types.includes(row.type))fail('记录类型不在汇总范围内。');
   return {id,month:row.month,type:row.type,category:bounded(row.category,100,'所得项目小类'),company:bounded(row.company,200,'扣缴义务人'),income:money(amountCents(row.income)),tax:money(amountCents(row.tax))};
  });
  const result={format:FORMAT,version:VERSION,summary,records};
  if(own(value,'label'))result.label=bounded(value.label,80,'数据名称',true);
  for(const key of ['income','tax']){
   const known=records.reduce((sum,row)=>{const next=sum+amountCents(row[key]);if(!Number.isSafeInteger(next))fail('明细金额合计超过可精确保存的范围。');return next;},0);
   if(amountCents(summary[key])<known)fail('汇总金额不能小于已录入明细合计。');
  }
  return result;
 }
 function parse(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)fail('收入文件最多支持256KB。');
  let value;try{value=JSON.parse(text);}catch{fail('收入文件不是有效的JSON。');}
  return validate(value);
 }
 function checkedPayload(payload){
  let text;try{text=JSON.stringify(payload);}catch{fail('收入数据无法读取。');}
  return parse(text);
 }
 function summarize(payload){
  const value=checkedPayload(payload);
  const known=key=>value.records.reduce((sum,row)=>sum+amountCents(row[key]),0);
  const knownIncome=known('income'),knownTax=known('tax');
  return {rowsCount:value.records.length,year:value.summary.year,knownIncome:money(knownIncome),knownTax:money(knownTax),remainderIncome:money(amountCents(value.summary.income)-knownIncome),remainderTax:money(amountCents(value.summary.tax)-knownTax),totalIncome:value.summary.income,totalTax:value.summary.tax};
 }
 function prepareImport(currentRecords,currentProfile,payload){
  if(!Array.isArray(currentRecords))fail('当前收入数据无法读取，未作替换。');
  const value=checkedPayload(payload),year=value.summary.year,summary=summarize(value);
  const retained=structuredClone(currentRecords.filter(row=>!(object(row)&&typeof row.month==='string'&&row.month.startsWith(year+'-'))));
  const ids=new Set(retained.map(row=>String(row?.id)));
  const imported=value.records.map(row=>{
   let id=row.id;
   if(ids.has(id)){
    const prefix='preset-'+year+'-';let suffix='',counter=1;
    do{id=prefix+row.id.slice(0,100-prefix.length-suffix.length)+suffix;suffix='-'+(++counter);}while(ids.has(id));
   }
   ids.add(id);return {...row,id};
  });
  const profile=object(currentProfile)?structuredClone(currentProfile):{};
  profile.incomeSummaryRemainders={...normalizeRemainders(profile),[year]:{types:[...value.summary.types],income:summary.remainderIncome,tax:summary.remainderTax}};
  return {records:[...retained,...imported],profile,summary};
 }
 function remainderForQuery(profile,year,types,key){
  if(!yearValid(year)||!['income','tax'].includes(key)||!Array.isArray(types)||!types.every(t=>TYPES.includes(t)))return 0;
  const value=normalizeRemainders(profile)[year];
  return value&&value.types.every(type=>types.includes(type))?amountCents(value[key]):0;
 }
 const api=Object.freeze({FORMAT,VERSION,MAX_BYTES,MAX_RECORDS,TYPES,parse,prepareImport,summarize,validRemainder,normalizeRemainders,remainderForQuery});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TaxIncomePreset=api;
})(typeof window==='undefined'?globalThis:window);
