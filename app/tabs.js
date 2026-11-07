const phone=document.querySelector('.phone');
const statusMarkup=document.querySelector('.status').outerHTML.replace('11:39','11:59').replace('>79<','>76<');
const pageNames={todo:'待办',services:'办&查',messages:'消息',profile:'我的'};
const tabPages={};
for(const [key,name] of Object.entries(pageNames)){
 const p=document.createElement('section');p.className='tab-page '+key;p.setAttribute('aria-label',name);p.inert=true;
 p.innerHTML=`<div class="tab-top">${key==='profile'?'':statusMarkup}<div class="tab-heading"><h1>${name}</h1>${key==='todo'?'<small>请及时办理相关业务并确认办结情况</small>':key==='services'?'<small>请选择您需要办理或查询的事项</small>':''}</div></div><main class="tab-body"></main>`;
 phone.insertBefore(p,document.querySelector('.nav'));tabPages[key]=p;
}
function sprite(file,x,y){return `<span class="sprite-icon" style="background-image:url(assets/${file}.${file==='profile'?'svg':'jpg'});background-position:-${x}rem -${y}rem"></span>`}
function serviceCards(data,file){return `<div class="service-grid">${data.map(([title,desc,x,y,fresh])=>`<button class="service-card" data-title="${title}">${sprite(file,x,y)}${fresh?'<span class="new-badge">NEW</span>':''}<h3>${title}</h3><p>${desc}</p></button>`).join('')}</div>`}
const taxCards=[['个人养老金扣除管理','录入或查看个人养老金扣除信息',34,359],['经营所得申报','取得经营所得后办理申报',153,359,true],['纳税记录开具','生成或查看纳税记录',272,359],['公益慈善捐赠扣除填报','录入或查看准予扣除的捐赠记录',34,495],['委托代理关系管理','委托代理机构或个人代办年度汇算',153,495],['涉税服务人员信息管理','填报涉税服务人员信息与申领信用码',272,495,true]];
const queryCards=[['收入纳税明细','查看个人所得税纳税明细',37,217],['申报记录','查看历史申报记录',156,217],['异议申诉','查询最新申诉记录和结果',275,217],['税务文书','查看电子税务文书信息',37,360],['涉税专业服务机构','查询全国涉税专业服务机构信息',156,360],['备案信息','查询备案信息',275,360],['票证查验','查验纳税记录等税收票证信息真伪',37,504],['代办申报明细','查询月销售额达到10万元的代办申报明细数据',156,504,true],['欠税信息','查询个人欠税信息',275,504]];
const invoiceCards=[['扫码开票','扫描开票二维码提交开票信息',37,303],['发票抬头','维护常用发票抬头信息',156,303],['我的票夹','查询和管理数电票',275,303],['开票申请记录','查看历史代开发票申请记录',37,447]];
const publicCards=[['热点问题','获取当下热点问题与解答',37,663],['政策解读','了解最新税收政策与解读',156,663],['办税指南','为办税提供指南',275,663]];
tabPages.services.querySelector('.tab-body').innerHTML=`<h2>办税</h2><section class="service-group"><button class="service-banner" data-title="综合所得年度汇算" aria-label="综合所得年度汇算"></button><button class="service-banner deduct" data-title="专项附加扣除" aria-label="专项附加扣除"></button>${serviceCards(taxCards,'services')}<button class="warning-banner" data-title="警示案例" aria-label="警示案例"></button></section><h2>查询</h2><section class="service-group">${serviceCards(queryCards,'queries')}</section><h2>发票管理</h2><section class="service-group">${serviceCards(invoiceCards,'invoices')}</section><h2>公众服务</h2><section class="service-group">${serviceCards(publicCards,'invoices')}</section>`;
tabPages.todo.querySelector('.tab-top').insertAdjacentHTML('beforeend','<div class="todo-note">ⓘ温馨提示：目前待办功能仅提供部分待办事项的服务，我们将持续升级，为您提供更全面的待办提醒。</div>');
tabPages.todo.querySelector('.tab-body').innerHTML='<div class="todo-tabs" role="tablist"><button class="selected" role="tab" aria-selected="true">未办结</button><button role="tab" aria-selected="false">已办结</button></div><div class="empty-illustration" role="img" aria-label="空文件夹插画"></div><p class="empty-label">暂无未办结事项</p>';
tabPages.todo.querySelectorAll('.todo-tabs button').forEach(b=>b.onclick=()=>{tabPages.todo.querySelectorAll('.todo-tabs button').forEach(t=>{t.classList.toggle('selected',t===b);t.setAttribute('aria-selected',String(t===b))});tabPages.todo.querySelector('.empty-label').textContent=b.textContent==='未办结'?'暂无未办结事项':'暂无已办结事项'});
tabPages.profile.querySelector('.tab-heading').remove();

// A Home Screen Web Clip can exclude the status bar from its drawable viewport.
// Measure the exclusion only for a full-width portrait window on iPhone.
if (navigator.standalone && location.protocol !== 'file:') {
  const profilePage = tabPages.profile;
  function measureProfileInset() {
    if (innerWidth > 600 || innerWidth !== screen.width || innerWidth >= innerHeight) {
      delete profilePage.dataset.screenInset;
      return;
    }
    const inset = screen.height - innerHeight;
    if (inset < 0 || inset > 100) return;
    profilePage.style.setProperty('--profile-screen-inset', inset + 'px');
    profilePage.dataset.screenInset = inset > 0 ? 'clipped' : 'full';
  }
  measureProfileInset();
  window.addEventListener('resize', measureProfileInset);
  window.addEventListener('pageshow', measureProfileInset);
}

// Keep the profile header background and its editable identity separate.
tabPages.profile.querySelector('.tab-top').insertAdjacentHTML('beforeend','<div class="profile-info-surface" aria-hidden="true"></div><span class="profile-name"></span>');
tabPages.profile.querySelector('.tab-top').insertAdjacentHTML('beforeend','<button class="personal-hit" data-title="个人信息" aria-label="个人信息">个人信息<i aria-hidden="true"></i></button>');
// Profile identity is configured locally; never infer the hidden digits in a screenshot.
const profileIdentityKey='tax-replica-profile-v1';
let profileIdentity = window.TaxProfileDisplay.fullIdentity();
const profileNameLabel = tabPages.profile.querySelector('.profile-name');
let profileIdentityVisible=false;
tabPages.profile.querySelector('.tab-top').insertAdjacentHTML('beforeend',`<div class="profile-identity"><span>纳税人识别号</span><span class="identity-number" id="profile-identity-number"></span><button class="identity-eye" type="button" aria-label="显示纳税人识别号" aria-controls="profile-identity-number" aria-pressed="false"></button></div>`);
function renderProfileIdentity(){
 const bankChip=tabPages.profile.querySelector('[data-title="银行卡"] .profile-chip');
 bankChip.textContent = window.TaxProfileDisplay.bankCards().length + '张';
 const employmentChip = tabPages.profile.querySelector('[data-title="任职受雇"] .profile-chip');
 const employerCount = window.TaxProfileDisplay?.employers?.().length ?? 0;
 employmentChip.textContent = employerCount ? employerCount + '家' : '暂无';
 employmentChip.classList.toggle('has-employers', employerCount > 0);
 profileNameLabel.textContent = window.TaxProfileDisplay.name();
 const number=tabPages.profile.querySelector('.identity-number');
 number.textContent=profileIdentityVisible?profileIdentity:profileIdentity?profileIdentity[0]+'*'.repeat(profileIdentity.length-2)+profileIdentity.slice(-1):globalThis.TaxProfileDisplay?.identityMask() || '******************';
 const eye=tabPages.profile.querySelector('.identity-eye');
 eye.setAttribute('aria-pressed',String(profileIdentityVisible));eye.setAttribute('aria-label',profileIdentityVisible?'隐藏纳税人识别号':'显示纳税人识别号');
 eye.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${profileIdentityVisible?'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>':'<path d="M3 9q9 8 18 0M5 11l-2 3m6-1-1 3m7-3 1 3m3-5 2 3"/>'}</svg>`;
}
function hideProfileIdentity() {
  if (profileIdentityVisible) {
    profileIdentityVisible = false;
    renderProfileIdentity();
  }
}
function openIdentitySetup() {
  const dialog = document.createElement('dialog');
  dialog.className = 'identity-setup';
  dialog.setAttribute('aria-labelledby', 'identity-setup-title');
  dialog.innerHTML = `<form>
    <h2 id="identity-setup-title">填写身份证号</h2>
    <p id="identity-setup-note">保存在当前设备，下次点小眼睛即可查看。</p>
    <label for="reveal-identity">身份证号</label>
    <input id="reveal-identity" name="reveal-identity" type="text" maxlength="18"
      autocomplete="off" autocapitalize="characters" spellcheck="false" required
      placeholder="15 或 18 位，末位可为 X" aria-describedby="identity-setup-note identity-setup-error">
    <p id="identity-setup-error" role="alert"></p>
    <div class="identity-actions"><button type="button" class="identity-cancel">取消</button>
      <button type="submit">保存并显示</button></div>
  </form>`;
  const input = dialog.querySelector('input');
  const error = dialog.querySelector('[role="alert"]');
  dialog.querySelector('.identity-cancel').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove(), {once:true});
  input.oninput = () => { error.textContent = ''; input.removeAttribute('aria-invalid'); };
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    try {
      profileIdentity = window.TaxProfileDisplay.setIdentity(input.value);
    } catch (failure) {
      if (failure instanceof RangeError) {
        error.textContent = failure.message;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      } else {
        error.textContent = '未能保存到此设备，请重试。';
      }
      return;
    }
    dialog.close();
    profileIdentityVisible = true;
    renderProfileIdentity();
  };
  document.body.append(dialog);
  dialog.showModal();
  input.focus();
}
tabPages.profile.querySelector('.identity-eye').onclick = () => {
  if (!profileIdentity) {
    openIdentitySetup();
    return;
  }
  profileIdentityVisible = !profileIdentityVisible;
  renderProfileIdentity();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hideProfileIdentity();
});
window.addEventListener('pagehide', hideProfileIdentity);
window.addEventListener('storage', event => {
  if (event.key !== profileIdentityKey && event.key !== null) return;
  profileIdentity = window.TaxProfileDisplay.fullIdentity();
  profileIdentityVisible = false;
  renderProfileIdentity();
});
tabPages.profile.querySelector('.tab-body').innerHTML=`<div class="profile-cards">${[['家庭成员','添加',47],['任职受雇','暂无',177],['银行卡','',306]].map(([title,n,x])=>`<button class="profile-card" data-title="${title}">${sprite('profile',x,293)}<h3>${title}</h3><span class="profile-chip">${n}</span></button>`).join('')}</div><div class="profile-menu">${[['♡','切换关怀版'],['♧','安全中心'],['♧','帮助中心'],['♧','我要咨询'],['ⓘ','关于&更新']].map(([icon,title],i)=>`<button data-title="${title}"><span class="menu-icon" style="display:block;height:25rem;background:url(assets/profile.svg) -32rem -${[433,479,525,571,617][i]}rem/402rem 874rem"></span>${title}<span class="chevron">›</span></button>`).join('')}</div><button class="logout" data-title="退出登录">退出登录</button>`;
renderProfileIdentity();
let unreadCount=6;let messageFilter='全部';
const dates=['2026-10-01','2026-09-01','2026-08-01','2026-07-01','2026-06-01','2026-05-01','2026-04-01'];
const messageData=dates.map((date,i)=>({date,unread:i>1,title:'扣缴申报温馨提示',text:i%2===0?'示例科技有限公司的演示消息':'示例服务有限公司的演示消息'}));
messageData.push({date:'2026-01-01',unread:true,title:'专项附加扣除年度确认消息',text:''});
tabPages.messages.querySelector('.tab-top').insertAdjacentHTML('beforeend','<div class="message-actions"><button class="filter" aria-label="筛选">筛选 ♧</button><button class="clear-unread" aria-label="清除未读">♢ 清除未读</button></div><div class="notification-note">开启消息通知，时刻掌握办税进程与业务动态<button data-title="开启消息通知">去开启</button><button class="dismiss" aria-label="关闭通知提示">×</button></div>');
function updateBadge(){let badge=document.querySelector('.nav-badge');if(!badge){badge=document.createElement('span');badge.className='nav-badge';document.querySelector('[data-nav="消息"]').append(badge)}badge.textContent=unreadCount;badge.hidden=!unreadCount}
function renderMessages(){tabPages.messages.querySelector('.tab-body').innerHTML=messageData.map((m,i)=>{if(messageFilter==='未读'&&!m.unread)return '';return `<button class="message-row" data-message="${i}"><span class="message-icon"></span><span class="message-copy"><span class="message-title"><strong>${m.title}</strong><time>${m.date}</time></span><p>${m.text}</p></span>${m.unread?'<i class="unread-dot"></i>':''}</button>`}).join('') || '<p style="text-align:center;padding:65rem 0;color:#999;font-size:16rem">暂无未读消息</p>';tabPages.messages.querySelectorAll('.message-row').forEach(b=>b.onclick=()=>{const m=messageData[Number(b.dataset.message)];if(m.unread){m.unread=false;unreadCount--;updateBadge();renderMessages()}open(m.title);document.querySelector('.sheet p').textContent=m.text+'（仅供比赛演示，不对应真实申报）'})}
renderMessages();updateBadge();
tabPages.messages.querySelector('.dismiss').onclick=()=>tabPages.messages.querySelector('.notification-note').style.visibility='hidden';
tabPages.messages.querySelector('.clear-unread').onclick=()=>{messageData.forEach(m=>m.unread=false);unreadCount=0;updateBadge();renderMessages()};
tabPages.messages.querySelector('.filter').onclick=()=>{open('筛选消息');document.querySelector('.sheet p').textContent='选择要查看的消息';const options=document.createElement('div');options.className='sheet-options';options.innerHTML='<button>全部</button><button>未读</button>';document.querySelector('.sheet p').after(options);options.querySelectorAll('button').forEach(b=>b.onclick=()=>{messageFilter=b.textContent;renderMessages();document.querySelector('.sheet-wrap').classList.remove('open');options.remove()})};
const beforeTabsOpen=open;open=function(title){hideProfileIdentity();document.querySelector('.sheet-options')?.remove();document.querySelector('.sheet p').textContent='此入口的后续页面尚未提供截图，可继续补充后制作。';beforeTabsOpen(title)};
let currentTab='home';
function renderTab(key){
 if(key!==currentTab)hideProfileIdentity();
 if(key==='profile')renderProfileIdentity();
 currentTab=key;phone.dataset.activeTab=key;for(const [id,p]of Object.entries(tabPages)){p.classList.toggle('current',id===key);p.inert=id!==key;p.setAttribute('aria-hidden',String(id!==key))}document.querySelector('.header').style.visibility=key==='home'?'':'hidden';document.querySelector('.scroll').style.visibility=key==='home'?'':'hidden';document.querySelector('.header').inert=key!=='home';document.querySelector('.scroll').inert=key!=='home';document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(pageNames[key]||'首页')))}
for(const b of document.querySelectorAll('[data-nav]'))b.onclick=()=>{const key=Object.keys(pageNames).find(k=>pageNames[k]===b.dataset.nav)||'home';history.replaceState({tab:key},'',key==='home'?location.pathname:'#'+key);setIncomeVisible(false);renderTab(key)};
const previousIncomeVisible=setIncomeVisible;setIncomeVisible=function(visible){previousIncomeVisible(visible);if(visible){Object.values(tabPages).forEach(p=>p.inert=true)}else{renderTab(currentTab)}};
window.addEventListener('popstate',()=>{const hash=location.hash.slice(1);if(hash!=='income'){renderTab(tabPages[hash]?hash:'home');setIncomeVisible(false)}});
const initialTab=location.hash.slice(1);if(tabPages[initialTab])renderTab(initialTab);
