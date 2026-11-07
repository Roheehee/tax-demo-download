// Display defaults for the demo. A saved profile belongs to the current device.
(() => {
  'use strict';
  const key = 'tax-replica-profile-v1';
  const nameDefault = '潘舜希';
  const maskDefault = '4****************9';
  const lastFourPattern = /^[0-9]{4}$/;
  const validCard = card => card && typeof card.name === 'string' && !!card.name.trim() &&
    card.name.trim().length <= 80 && typeof card.lastFour === 'string' && lastFourPattern.test(card.lastFour);
  function stored() {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('无法读取已保存的个人资料。');
    return value;
  }
  function read() { try { return stored(); } catch { return {}; } }
  function bankCards() {
    const profile = read();
    if (Array.isArray(profile.bankCards)) return profile.bankCards.filter(validCard).map(({name,lastFour})=>({name:name.trim(),lastFour}));
    return [{name:'招商银行',lastFour:lastFourPattern.test(profile.bankLastFour || '')?profile.bankLastFour:'8815'}];
  }
  function setBankCards(cards) {
    if (!Array.isArray(cards) || !cards.every(validCard)) throw new Error('请填写银行名称和四位尾号。');
    const data = stored();
    data.bankCards = cards.map(({name,lastFour})=>({name:name.trim(),lastFour}));
    localStorage.setItem(key,JSON.stringify(data));
    return true;
  }
  function employers() {
    const values = read().employers;
    return Array.isArray(values) ? [...new Set(values.filter(s=>typeof s==='string').map(s=>s.trim()).filter(Boolean))] : [];
  }
  window.TaxProfileDisplay = Object.freeze({
    name() { const n=read().name; return typeof n==='string' && n.trim() ? n.trim() : nameDefault; },
    identityMask() { const m=read().identityMask; return typeof m==='string' && /^\d(?:\*{13}|\*{16})[0-9X]$/.test(m) ? m : maskDefault; },
    bankCards, setBankCards, employers
  });
})();
