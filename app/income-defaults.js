// Editable starting data. Only months visible in the supplied statements are listed.
// The import model keeps the difference from each annual total separately.
(function (root) {
  'use strict';
  const statements = {
    '2025': {
      income: '291431.05', tax: '14759.26',
      rows: [
        ['12', '21844.83', '1612.18'],
        ['11', '22086.21', '1636.31'],
        ['10', '21724.14', '1600.11'],
        ['09', '22206.90', '1376.98'],
        ['08', '21603.45', '476.41'],
        ['07', '21965.52', '487.27']
      ]
    },
    '2026': {
      income: '219051.75', tax: '15383.43',
      rows: [
        ['10', '22086.21', '3252.37'],
        ['09', '21724.14', '1715.51'],
        ['08', '22206.90', '1638.26'],
        ['07', '21603.45', '1588.03'],
        ['06', '21844.83', '1612.18'],
        ['05', '22086.21', '1636.31'],
        ['04', '21724.14', '1600.11'],
        ['03', '22206.90', '1376.98'],
        ['02', '21603.45', '476.41'],
        ['01', '21965.52', '487.27']
      ]
    }
  };
  const defaultYear = '2026';
  function create(year = defaultYear) {
    const statement = statements[year];
    return {
      format: 'tax-income-preset', version: 1, label: year + '年收入数据',
      summary: { year, types: ['工资薪金', '劳务报酬', '稿酬', '特许权使用费'], income: statement.income, tax: statement.tax },
      records: statement.rows.map(([mm, income, tax]) => {
        const month = year + '-' + mm;
        return { id: 'screenshot-' + month, month, type: '工资薪金', category: '正常工资薪金',
          company: '深圳市深度对齐科技有限公司', income, tax };
      })
    };
  }
  const api = Object.freeze({ defaultYear, years: Object.freeze(Object.keys(statements)), create });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TaxIncomeDefaults = api;
})(typeof window === 'undefined' ? globalThis : window);
