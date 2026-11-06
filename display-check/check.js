(() => {
 'use strict';
 const shell = document.getElementById('test-shell');
 const modeLabel = document.getElementById('launch-mode');
 const report = document.getElementById('report');
 const observations = { flow:{clarity:null,bottom:null}, 'fixed-header':{clarity:null,bottom:null} };
 const samples = {};
 const round = number => Math.round(number * 100) / 100;
 function rect(id) {
  const value = document.getElementById(id).getBoundingClientRect();
  return Object.fromEntries(['top','right','bottom','left','width','height'].map(key => [key, round(value[key])]));
 }
 function launchMode() {
  return window.matchMedia('(display-mode:standalone)').matches || navigator.standalone === true ? 'standalone' :
   window.matchMedia('(display-mode:fullscreen)').matches ? 'fullscreen' : 'browser';
 }
 function sample() {
  const safe = getComputedStyle(document.getElementById('safe-probe'));
  const viewport = window.visualViewport;
  const standalone = launchMode() !== 'browser';
  modeLabel.textContent = standalone ? '已从桌面图标打开' : '当前是普通网页，请添加测试图标后再打开';
  document.getElementById('install-hint').hidden = standalone;
  samples[shell.dataset.layout] = {
   screen:{width:screen.width,height:screen.height,availHeight:screen.availHeight,dpr:devicePixelRatio},
   inner:{width:innerWidth,height:innerHeight},
   client:{width:document.documentElement.clientWidth,height:document.documentElement.clientHeight,scrollHeight:document.documentElement.scrollHeight},
   visualViewport:viewport ? {height:round(viewport.height),width:round(viewport.width),offsetTop:round(viewport.offsetTop),scale:round(viewport.scale)} : null,
   safeArea:Object.fromEntries(['Top','Right','Bottom','Left'].map(edge=>[edge.toLowerCase(),parseFloat(safe['padding'+edge])])),
   vh:rect('vh-probe').height,dvh:CSS.supports('height','100dvh') ? rect('dvh-probe').height : null,
   shell:rect('test-shell'),header:rect('test-header'),title:rect('test-title'),content:rect('test-content'),contentScrollTop:round(document.getElementById('test-content').scrollTop),rootScrollHeight:shell.scrollHeight,endMarker:rect('end-marker'),documentScrollY:round(scrollY)
  };
  report.value = JSON.stringify({test:'ios27-display-check-1',launchMode:launchMode(),viewportFit:'cover',statusBarMeta:'omitted',userAgent:navigator.userAgent,observations,samples},null,2);
 }
 let frame;
 function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => { frame = requestAnimationFrame(sample); });
 }
 function changeLayout(layout) {
  sample();
  shell.dataset.layout = layout;
  document.querySelectorAll('[data-layout-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.layoutChoice===layout)));
  document.getElementById('current-layout').textContent = '当前：'+(layout==='flow'?'方式一':'方式二');
  for (const name of ['clarity','bottom']) document.querySelectorAll('input[name="'+name+'"]').forEach(input=>{input.checked=observations[layout][name]===input.value;});
  document.getElementById('copy-status').textContent = '';
  schedule();
 }
 document.querySelectorAll('[data-layout-choice]').forEach(button=>button.addEventListener('click',()=>changeLayout(button.dataset.layoutChoice)));
 document.querySelectorAll('input[type="radio"]').forEach(input=>input.addEventListener('change',()=>{observations[shell.dataset.layout][input.name]=input.value;sample();}));
 document.getElementById('switch').addEventListener('click',()=>changeLayout(shell.dataset.layout==='flow'?'fixed-header':'flow'));
 document.getElementById('help').addEventListener('click',()=>document.getElementById('test-content').scrollTo({top:0,behavior:'smooth'}));
 document.getElementById('copy').addEventListener('click',async()=>{
  sample();
  try {
   await navigator.clipboard.writeText(report.value);
   document.getElementById('copy-status').textContent = '已复制，请粘贴回对话。';
  } catch {
   report.closest('details').open = true;
   report.focus();report.select();
   document.getElementById('copy-status').textContent = '请长按下方已选文字，复制后粘贴回对话。';
  }
 });
 window.addEventListener('resize',schedule);
 window.addEventListener('pageshow',schedule);
 if (window.visualViewport) window.visualViewport.addEventListener('resize',schedule);
 schedule();
})();
