// Shared read model for the income results page and the in-app data editor.
(function (root) {
  'use strict';
  const storageKey = 'tax-replica-income-v1';
  const profileKey = 'tax-replica-profile-v1';
  const preset = root.TaxIncomePreset;
  const types = Object.freeze(preset ? [...preset.TYPES] : [
    '工资薪金', '劳务报酬', '稿酬', '特许权使用费', '经营所得', '利息、股息、红利', '财产租赁', '财产转让', '偶然所得'
  ]);
  const ordinaryTypes = types.slice(0, 4);
  const salary = { type: '工资薪金', category: '正常工资薪金', company: '示例科技有限公司' };
  const labor = { type: '劳务报酬', category: '其他连续劳务报酬', company: '示例服务有限公司' };
  const legacyRecords = [
    { ...salary, id: 0, month: '2026-09', income: '10000.00', tax: '100.00' },
    { ...salary, id: 1, month: '2026-08', income: '9000.00', tax: '90.00' },
    { ...labor, id: 2, month: '2026-08', income: '200.00', tax: '0.00' },
    { ...salary, id: 3, month: '2026-07', income: '8000.00', tax: '80.00' },
    { ...labor, id: 4, month: '2026-07', income: '300.00', tax: '0.00' },
    { ...labor, id: 5, month: '2026-03', income: '', tax: '' }
  ];
  const defaults = root.TaxIncomeDefaults;
  const builtIn = preset && defaults
    ? (defaults.years || ['2026']).reduce((state, year) => preset.prepareImport(state.records, state.profile, defaults.create(year)),
      { records: [], profile: {} }) : null;

  const cents = value => Math.round(Number(value || 0) * 100);
  const amountText = value => value === '' ? '—' : Number(value).toFixed(2) + '元';
  const validYear = value => typeof value === 'string' && /^[1-9]\d{3}$/.test(value);

  function readStored(key) {
    try { return JSON.parse(root.localStorage.getItem(key)); }
    catch { return null; }
  }

  function validRecord(record) {
    return record && ['string', 'number'].includes(typeof record.id)
      && /^\d{4}-(0[1-9]|1[0-2])$/.test(record.month)
      && ['type', 'category', 'company'].every(key => typeof record[key] === 'string')
      && ['income', 'tax'].every(key => record[key] === '' || /^\d+(\.\d{1,2})?$/.test(record[key]));
  }

  function readProfile(usingBuiltInIncome, fallbackIdentity = '') {
    const saved = readStored(profileKey);
    let profile = { name: '演示用户', identity: fallbackIdentity };
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      profile = { ...saved, name: typeof saved.name === 'string' ? saved.name : '', identity: typeof saved.identity === 'string' ? saved.identity : '' };
    }
    if (usingBuiltInIncome) {
      profile.incomeSummaryRemainders = { ...preset.normalizeRemainders(profile), ...structuredClone(builtIn.profile.incomeSummaryRemainders) };
      profile.incomePreferredQuery = { year: defaults.defaultYear || builtIn.summary.year, types: [...ordinaryTypes] };
      profile.taxDocumentEdited = true;
    }
    return profile;
  }

  function loadState() {
    const saved = readStored(storageKey);
    const validSaved = Array.isArray(saved) && saved.every(validRecord)
      && new Set(saved.map(record => String(record.id))).size === saved.length;
    const usingBuiltInIncome = !validSaved && Boolean(builtIn);
    const records = validSaved ? saved : structuredClone(builtIn ? builtIn.records : legacyRecords);
    const profile = readProfile(usingBuiltInIncome);
    const preferred = profile.incomePreferredQuery;
    const validPreferred = preferred && validYear(preferred.year) && Array.isArray(preferred.types)
      && preferred.types.length > 0 && preferred.types.every(type => types.includes(type));
    return {
      records, profile, usingBuiltInIncome,
      year: validPreferred ? preferred.year : '2026',
      types: validPreferred ? [...new Set(preferred.types)] : [...ordinaryTypes]
    };
  }

  function select(state, year, types) {
    const records = state.records.filter(record => record.month.startsWith(year + '-') && types.includes(record.type))
      .sort((a, b) => b.month.localeCompare(a.month));
    const explicit = preset?.normalizeRemainders(state.profile)[year];
    const hasBalance = explicit && (cents(explicit.income) !== 0 || cents(explicit.tax) !== 0);
    const included = hasBalance ? explicit.types.every(type => types.includes(type)) : null;
    const remainder = {
      income: included ? preset.remainderForQuery(state.profile, year, types, 'income') : 0,
      tax: included ? preset.remainderForQuery(state.profile, year, types, 'tax') : 0
    };
    const totals = { ...remainder };
    for (const record of records) {
      totals.income += cents(record.income);
      totals.tax += cents(record.tax);
    }
    return { year, types: [...types], records, totals, remainder, remainderIncluded: included };
  }

  // Return a fresh, read-only view of storage. Totals and applied remainders are integer cents.
  // remainderIncluded is null when the selected year has no remainder.
  function read(options = {}, state = loadState()) {
    const year = validYear(options.year) ? options.year : state.year;
    const selected = Array.isArray(options.types)
      ? [...new Set(options.types.filter(type => types.includes(type)))] : state.types;
    return select(state, year, selected);
  }

  function matchesReference(r){const original=legacyRecords.find(d=>d.id===r.id);return original&&['month','type','company','income','tax'].every(k=>r[k]===original[k]);}
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
  const taxRecordFields=[['declarationDate','申报日期'],['paidTax','实缴（退）金额'],['treasuryDate','入（退）库日期'],['taxOffice','入库税务机关'],['notes','备注']];
  function recordTaxData(r){
   const stored=r?.taxRecord&&typeof r.taxRecord==='object'&&!Array.isArray(r.taxRecord)?r.taxRecord:{};
   return Object.fromEntries(taxRecordFields.map(([key])=>[key,String(stored[key]??'')]));
  }

  root.TaxIncomeModel = Object.freeze({
    read, amountText, types, storageKey, cents, validRecord, loadState, select, readProfile,
    matchesReference, deductionFields, deductionParts, recordDeductions, referenceDeductionsUnchanged, taxRecordFields, recordTaxData,
    legacyRecords: () => structuredClone(legacyRecords)
  });
})(globalThis);
