(() => {
  'use strict';
  const model = window.TaxIncomeModel;
  const nav = window.TaxIncomeNavigation;
  const params = new URLSearchParams(location.search);
  const selection = {year: params.get('year'), types: params.has('type') ? params.getAll('type') : undefined};
  const list = document.querySelector('.income-records');
  const yuan = cents => (cents / 100).toFixed(2) + '元';
  let result;
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function render() {
    result = model.read(selection);
    document.getElementById('total-income').textContent = yuan(result.totals.income);
    document.getElementById('total-tax').textContent = yuan(result.totals.tax);
    const rows = result.records.map(record => {
      const row = element('button', 'income-record');
      row.type = 'button';
      const heading = element('div', 'record-heading');
      heading.append(element('span', null, record.type), element('span', null, record.month));
      row.append(heading);
      for (const [label, value] of [
        ['所得项目小类', record.category], ['扣缴义务人', record.company],
        ['收入', model.amountText(record.income)], ['已申报税额', model.amountText(record.tax)]
      ]) row.append(element('div', 'record-line', label + '：' + value));
      row.append(element('i', 'record-arrow'));
      row.onclick = () => nav.openDetail(record.id);
      return row;
    });
    list.replaceChildren(...(rows.length ? rows : [element('p', 'income-empty', result.year + '年暂无符合条件的收入记录')]));
  }
  const dialog = document.querySelector('dialog');
  function notice(title, message) {
    document.getElementById('notice-title').textContent = title;
    document.getElementById('notice-message').textContent = message;
    dialog.showModal();
  }
  document.getElementById('back').onclick = event => { event.preventDefault(); nav.backFromResults(); };
  document.getElementById('batch').onclick = () => notice('批量申诉', '此演示未提供申诉办理功能。');
  document.querySelector('.income-help').onclick = () => {
    let message = '合计为当前所选年度、所得类型的已录入明细之和。';
    if (result.remainderIncluded === true) message = '合计包含已录入明细，以及尚未展开的收入' + yuan(result.remainder.income) + '、税额' + yuan(result.remainder.tax) + '。两部分都可在“我的 → 我要咨询”修改。未展开部分没有逐月明细，不作为纳税记录导出的明细。';
    if (result.remainderIncluded === false) message = '本次筛选仅汇总已录入明细；未展开部分未提供各所得类型的拆分，因此没有计入此筛选合计。';
    notice('收入合计说明', message);
  };
  render();
  nav.restoreListScroll();
  window.addEventListener('pageshow', event => {
    if (event.persisted) { render(); nav.restoreListScroll(); }
  });
})();
