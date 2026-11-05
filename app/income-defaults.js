// Initial income data selected by the owner for this public demo.
// Unshown months remain a separate editable summary, never invented rows.
(function (root) {
 'use strict';
 const payload={
  "format": "tax-income-preset",
  "version": 1,
  "label": "2026年最新收入数据",
  "summary": {
    "year": "2026",
    "types": [
      "工资薪金",
      "劳务报酬",
      "稿酬",
      "特许权使用费"
    ],
    "income": "219051.75",
    "tax": "15383.43"
  },
  "records": [
    {
      "id": "screenshot-2026-10",
      "month": "2026-10",
      "type": "工资薪金",
      "category": "正常工资薪金",
      "company": "深圳市深度对齐科技有限公司",
      "income": "22086.21",
      "tax": "3252.37"
    },
    {
      "id": "screenshot-2026-09",
      "month": "2026-09",
      "type": "工资薪金",
      "category": "正常工资薪金",
      "company": "深圳市深度对齐科技有限公司",
      "income": "21724.14",
      "tax": "1715.51"
    },
    {
      "id": "screenshot-2026-08",
      "month": "2026-08",
      "type": "工资薪金",
      "category": "正常工资薪金",
      "company": "深圳市深度对齐科技有限公司",
      "income": "22206.90",
      "tax": "1638.26"
    },
    {
      "id": "screenshot-2026-07",
      "month": "2026-07",
      "type": "工资薪金",
      "category": "正常工资薪金",
      "company": "深圳市深度对齐科技有限公司",
      "income": "21603.45",
      "tax": "1588.03"
    },
    {
      "id": "screenshot-2026-06",
      "month": "2026-06",
      "type": "工资薪金",
      "category": "正常工资薪金",
      "company": "深圳市深度对齐科技有限公司",
      "income": "21844.83",
      "tax": "1612.18"
    }
  ]
};
 const api=Object.freeze({create:()=>structuredClone(payload)});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TaxIncomeDefaults=api;
})(typeof window==='undefined'?globalThis:window);
