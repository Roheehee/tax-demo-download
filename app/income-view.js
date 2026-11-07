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
  function render(state) {
    const selected = model.read(selection, state);
    if (result && JSON.stringify(selected) === JSON.stringify(result)) return;
    result = selected;
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
      row.dataset.recordId = String(record.id);
      row.onclick = () => openSubview('income-detail', record.id);
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
  const heading = document.querySelector('.document-bar h1');
  const action = document.getElementById('batch');
  const listPage = document.querySelector('.document-list');
  const detail = document.getElementById('detail');
  const calculation = document.getElementById('calculation');
  const detailBody = detail.querySelector('.flow-body');
  const calculationBody = calculation.querySelector('.flow-body');
  let current = listPage;
  let currentRecord;
  let animation;
  let returning = false;

  function saveState(fields) {
    history.replaceState({ ...history.state, ...fields }, '');
  }

  function openSubview(name, id, source) {
    const fromList = name === 'income-detail';
    if (returning || current !== (fromList ? listPage : detail)) return;
    const state = model.loadState();
    if (!state.records.some(row => String(row.id) === String(id))) {
      displayRoute(false, state);
      return;
    }
    window.TaxIncomeLoading?.clear();
    if (fromList) {
      saveState({ taxIncomeScroll: window.scrollY, incomeRow: String(id) });
    } else {
      saveState({
        detailScroll: detailBody.scrollTop,
        deductionsOpen: detailBody.querySelector('.special-deductions').open,
        calculationLink: [...detailBody.querySelectorAll('.tax-link')].indexOf(source)
      });
    }
    const url = new URL(location.href);
    url.hash = name + '/' + encodeURIComponent(id);
    history.pushState({ incomePushed: true }, '', url);
    displayRoute(true, state);
  }

  function goBack() {
    if (returning) return;
    if (current === listPage) { nav.backFromResults(); return; }
    if (history.state?.incomePushed) {
      returning = true;
      history.back();
    } else {
      const url = new URL(location.href);
      url.hash = current === calculation ? 'income-detail/' + encodeURIComponent(currentRecord.id) : '';
      history.replaceState(null, '', url);
      displayRoute(true);
    }
  }

  function finishTransition() {
    for (const panel of [detail, calculation]) panel.hidden = panel !== current;
    document.documentElement.classList.toggle('income-subview-open', current !== listPage);
  }

  function displayRoute(animate, state = model.loadState()) {
    render(state);
    returning = false;
    const match = /^#income-(detail|calculation)\/(.+)$/.exec(location.hash);
    let id;
    if (match) {
      try { id = decodeURIComponent(match[2]); } catch { /* Invalid link opens the list. */ }
    }
    const record = id !== undefined && state.records.find(row => String(row.id) === id);
    if (location.hash && !record) {
      const url = new URL(location.href);
      url.hash = '';
      history.replaceState(null, '', url);
    }
    const next = record ? (match[1] === 'detail' ? detail : calculation) : listPage;
    const previous = current;
    current = next;
    if (animation) { animation.cancel(); animation = null; }
    if (dialog.open) dialog.close();
    const sameRecord = record && currentRecord && String(record.id) === String(currentRecord.id);
    if (record && (!sameRecord || JSON.stringify(record) !== JSON.stringify(currentRecord))) {
      detailBody.innerHTML = TaxIncomeDetail.detail(record);
      currentRecord = record;
    }
    if (next === calculation) {
      calculationBody.innerHTML = TaxIncomeDetail.calculation(record, state.records);
      calculationBody.scrollTop = 0;
    }
    // Keep the underlying view and its scroll/disclosure state alive during the slide.
    const returningToDetail = next === detail && previous === calculation && sameRecord;
    if (next === detail && !returningToDetail) {
      detailBody.querySelector('.special-deductions').open = history.state?.deductionsOpen === true;
    }
    const title = next.getAttribute('aria-label') || '收入纳税明细';
    heading.textContent = title;
    document.title = title;
    action.hidden = next === calculation;
    action.textContent = next === detail ? '申诉' : '批量申诉';
    listPage.inert = next !== listPage;
    detail.inert = next !== detail;
    calculation.inert = next !== calculation;

    finishTransition();
    if (next === listPage && Number.isFinite(history.state?.taxIncomeScroll)) {
      window.scrollTo(0, history.state.taxIncomeScroll);
    }
    if (next === detail) detailBody.scrollTop = history.state?.detailScroll || 0;
    if (next === calculation) calculationBody.scrollTop = history.state?.calculationScroll || 0;

    if (previous !== next && animate) {
      const row = next === listPage && [...list.children].find(el => el.dataset.recordId === history.state?.incomeRow);
      const link = returningToDetail && detailBody.querySelectorAll('.tax-link')[history.state?.calculationLink];
      (row || link || heading).focus({ preventScroll: true });
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const goingBack = previous === calculation || next === listPage;
        const moving = goingBack ? previous : next;
        // Only the content surface moves; iOS keeps the opaque 47px header sharp.
        previous.hidden = false;
        next.hidden = false;
        const frames = [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }];
        animation = moving.animate(goingBack ? frames.reverse() : frames,
          { duration: 200, easing: 'cubic-bezier(.22,.7,.25,1)' });
        animation.onfinish = () => { animation = null; finishTransition(); };
      }
    }
  }

  history.scrollRestoration = 'manual';
  document.getElementById('back').onclick = event => { event.preventDefault(); goBack(); };
  action.onclick = () => {
    const title = current === detail ? '申诉' : '批量申诉';
    notice(title, '此演示未提供申诉办理功能。');
  };
  detailBody.addEventListener('click', event => {
    const link = event.target.closest('.tax-link');
    if (link && currentRecord) openSubview('income-calculation', currentRecord.id, link);
  });
  calculationBody.addEventListener('click', event => {
    if (event.target.closest('.policy-explanation')) notice('政策说明', TaxIncomeDetail.policyMessage);
  });
  window.addEventListener('popstate', () => displayRoute(true));
  function savePosition() {
    if (current === listPage) saveState({ taxIncomeScroll: window.scrollY });
    if (current === detail) saveState({
      detailScroll: detailBody.scrollTop, deductionsOpen: detailBody.querySelector('.special-deductions').open
    });
    if (current === calculation) saveState({ calculationScroll: calculationBody.scrollTop });
  }
  window.addEventListener('pagehide', savePosition);
  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage) return;
    if (event.key && ![model.storageKey, 'tax-replica-profile-v1'].includes(event.key)) return;
    savePosition();
    displayRoute(false);
  });
  document.querySelector('.income-help').onclick = () => {
    let message = '合计为当前所选年度、所得类型的已录入明细之和。';
    if (result.remainderIncluded === true) message = '合计包含已录入明细，以及尚未展开的收入' + yuan(result.remainder.income) + '、税额' + yuan(result.remainder.tax) + '。两部分都可在“我的 → 我要咨询”修改。未展开部分没有逐月明细，不作为纳税记录导出的明细。';
    if (result.remainderIncluded === false) message = '本次筛选仅汇总已录入明细；未展开部分未提供各所得类型的拆分，因此没有计入此筛选合计。';
    notice('收入合计说明', message);
  };
  displayRoute(false);
  window.TaxIncomeLoading?.finish();
  window.addEventListener('pageshow', event => {
    if (event.persisted) displayRoute(false);
  });
})();
