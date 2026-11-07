// Shared record views for the installed web app and the bundled single-page app.
(() => {
  'use strict';
  const { amountText, matchesReference, recordDeductions, recordTaxData,
    deductionParts, deductionFields } = window.TaxIncomeModel;
  function flowRow(label, value) {
    return '<div class="flow-row"><label>' + label + '</label><span>' + escapeText(value) + '</span></div>';
  }
  function escapeText(value) {
    return String(value ?? '').replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
  }
  function detail(record) {
    const salary = record.type === '工资薪金' && record.company === '示例科技有限公司' && matchesReference(record);
    const september = record.id === 0 && matchesReference(record);
    const july = record.id === 3 && matchesReference(record);
    const referenceDate = september ? '2026-10-01' : july ? '2026-08-01' : '—';
    const fields = [
      ['所得项目小类：', record.category],
      ['扣缴义务人名称：', record.company],
      ['扣缴义务人纳税人识别号：', salary ? 'DEMO（演示）' : '—'],
      ['主管税务机关：', salary ? '示例税务机关' : '—'],
      ['申报渠道：', september || july ? '其他' : '—'],
      ['申报日期：', recordTaxData(record).declarationDate || referenceDate],
      ['税款所属期：', record.month]
    ];
    const deductions = recordDeductions(record);
    const breakdown = deductionParts.map(key => {
      const [, label] = deductionFields.find(([field]) => field === key);
      return flowRow(label + '：', amountText(deductions[key]));
    }).join('');
    return `<section>
      <h2 class="flow-heading">纳税明细信息</h2>
      ${flowRow('收入：', amountText(record.income))}
      ${flowRow('已申报税额：', amountText(record.tax))}
      <button class="flow-link tax-link">查看税款计算 <i class="link-chevron" aria-hidden="true"></i></button>
    </section>
    <section>
      <h2 class="flow-heading">纳税明细-基础情况</h2>
      ${fields.map(([label, value]) => flowRow(label, value)).join('')}
    </section>
    <div class="flow-note">温馨提示：专项附加扣除和个人养老金已体现在税款计算过程中，在本期数据中不予显示。您可在“税款计算-累计收入与扣除详情”中查看。<button class="flow-link tax-link">查看税款计算</button></div>
    <section>
      <h2 class="flow-heading">本期收入与扣除详情</h2>
      ${flowRow('本期收入：', amountText(record.income))}
      ${flowRow('本期免税收入：', amountText(deductions.exemptIncome))}
      ${flowRow('本期减除费用：', amountText(deductions.expense))}
      <details class="special-deductions">
        <summary><span>本期专项扣除：</span><span>${amountText(deductions.specialTotal)}<i class="triangle" aria-hidden="true"></i></span></summary>
        <div class="deduction-breakdown">${breakdown}</div>
      </details>
      ${flowRow('本期其他扣除：', amountText(deductions.other))}
      ${flowRow('本期准予扣除的捐赠项目：', amountText(deductions.donation))}
    </section>`;
  }

  function calculation(record) {
    const placeholders = labels => labels.map(label => [label + '：', '—']);
    const cumulative = placeholders(['累计专项扣除', '累计专项附加扣除', '累计其他扣除', '累计个人养老金', '累计准予扣除的捐赠额']);
    const calculation = placeholders(['累计应纳税所得额', '税率/预扣率', '速算扣除数', '累计应纳税额', '累计已缴税额', '累计减免税额']);
    return `<section>
      <h2 class="flow-heading">累计收入与扣除详情</h2>
      ${cumulative.map(row => flowRow(...row)).join('')}
      <div class="calculation-total">${flowRow('累计应纳税所得额：','—')}</div>
    </section>
    <section>
      <h2 class="flow-heading">税款计算</h2>
      ${calculation.map(row => flowRow(...row)).join('')}
      <div class="calculation-total">${flowRow('本期申报税额：',amountText(record.tax))}</div>
    </section>
    <button class="policy-explanation">查看政策说明</button><p class="calculation-note">比赛演示：仅展示本机填写的申报税额，不进行税款计算；累计计算字段以“—”显示。</p>`;
  }
  const policyMessage = '本页面仅演示操作流程，不提供自动计税或税务政策判断。';
  window.TaxIncomeDetail = Object.freeze({ detail, calculation, policyMessage });
})();
