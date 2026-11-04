// Shared print layout for the editable competition document, based on the video.
// All text is drawn once as SVG; preview, zoom and PNG export use that same layout.
const taxPrintColumns=[['申报日期',156],['实缴（退）金额',156],['入（退）库日期',156],['所得项目',154],['税款所属期',180],['入库税务机关',252],['备注',146]];
const taxPrintWidth=1400,taxPrintHeight=1980;
function taxPrintLines(value,width,fontSize=18){
 const lines=[];let line='',used=0;
 for(const ch of String(value)){
  if(ch==='\n'){lines.push(line);line='';used=0;continue;}
  const advance=/[\u0000-\u007f]/.test(ch)?fontSize*.6:fontSize;
  if(used+advance>width&&line){lines.push(line);line='';used=0;}
  line+=ch;used+=advance;
 }
 lines.push(line);return lines;
}
function taxPrintMoney(value){
 const digits='零壹贰叁肆伍陆柒捌玖',small=['','拾','佰','仟'],large=['','万','亿','万亿'];
 const amount=Math.round(Math.abs(Number(value))*100);
 if(!Number.isSafeInteger(amount))return String(value)+'元';
 const integer=Math.floor(amount/100),groups=[];let rest=integer;
 do{groups.push(rest%10000);rest=Math.floor(rest/10000);}while(rest);
 const groupText=n=>{let out='',zero=false;for(let p=3;p>=0;p--){const d=Math.floor(n/10**p)%10;if(d){if(zero&&out)out+='零';out+=digits[d]+small[p];zero=false;}else if(out)zero=true;}return out;};
 let result='',zero=false;
 for(let i=groups.length-1;i>=0;i--){const n=groups[i];if(!n){if(result)zero=true;continue;}if(result&&(zero||n<1000))result+='零';result+=groupText(n)+large[i];zero=false;}
 result=(Number(value)<0?'负':'')+(result||'零')+'元';
 const jiao=Math.floor(amount%100/10),fen=amount%10;
 return result+(!jiao&&!fen?'整':(jiao?digits[jiao]+'角':fen?'零':'')+(fen?digits[fen]+'分':''));
}
function taxPrintLayout(request){
 const doc=resolveTaxDocument(request);
 const rows=[...doc.rows].sort((a,b)=>a.cells[4].localeCompare(b.cells[4])||a.cells[0].localeCompare(b.cells[0])).flatMap(row=>{
  const cells=row.cells.map((v,i)=>[0,2,4].includes(i)?v.replace(/-/g,'.'):v);
  const lines=cells.map((v,i)=>taxPrintLines(v,taxPrintColumns[i][1]-20));
  const fragments=Math.ceil(Math.max(...lines.map(l=>l.length))/31);
  return Array.from({length:fragments},(_,part)=>{
   const fragmentLines=lines.map(l=>l.slice(part*31,(part+1)*31));
   return {...row,id:part?`${row.id}-continued-${part}`:row.id,sourceId:row.id,continued:part>0,lines:fragmentLines,height:Math.max(74,...fragmentLines.map(l=>l.length*24+24))};
  });
 });
 const pages=[];let page=[],height=0;
 for(const row of rows){if(page.length&&height+row.height>784){pages.push(page);page=[];height=0;}page.push(row);height+=row.height;}
 if(page.length||!pages.length)pages.push(page);
 return {doc,pages};
}
function taxPrintText(value,x,y,size=24,attributes=''){
 return `<text x="${x}" y="${y}" font-size="${size}" ${attributes}>${htmlEscape(value)}</text>`;
}
function taxDemoSeal(x,y){
 const ring=[...'个税复刻比赛演示专用'];
 const letters=ring.map((letter,i)=>{const angle=-140+i*280/(ring.length-1),radians=angle*Math.PI/180;return taxPrintText(letter,Math.sin(radians)*78,-Math.cos(radians)*78+8,24,`text-anchor="middle" transform="rotate(${angle} ${Math.sin(radians)*78} ${-Math.cos(radians)*78})"`);}).join('');
 return `<g class="tax-demo-seal" aria-label="比赛演示专用章" transform="translate(${x} ${y})" fill="#aa3441" stroke="#aa3441"><circle r="100" fill="none" stroke-width="4"/><circle r="93" fill="none" stroke-width="1"/><g stroke="none" font-family="Songti SC, STSong, SimSun, serif">${letters}${taxPrintText('比赛演示',0,12,32,'text-anchor="middle" font-weight="600"')}${taxPrintText('非有效凭证',0,60,17,'text-anchor="middle"')}</g></g>`;
}
function taxDemoCode(x,y,size){
 const unit=size/taxDemoQR.matrix.length;
 const path=taxDemoQR.matrix.flatMap((row,r)=>[...row].flatMap((cell,c)=>cell==='1'?[`M${x+c*unit},${y+r*unit}h${unit}v${unit}h-${unit}Z`]:[])).join('');
 return `<g aria-label="扫描显示比赛演示说明"><title>${htmlEscape(taxDemoQR.payload)}</title><rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#222" shape-rendering="crispEdges"/></g>`;
}
function taxPrintPage(doc,rows,index,totalPages){
 const left=100,right=1300,tableY=648,headerHeight=52;
 const text=taxPrintText;
 const yearMonth=v=>v.replace(/^(\d{4})-(\d{2})$/,'$1年$2月');
 const number=String(doc.id||'').replace(/[^a-zA-Z0-9]/g,'').slice(-12).toUpperCase()||'LOCAL';
 let svg=`<rect width="1400" height="1980" fill="#fff"/><g fill="#343434" font-family="Songti SC, STSong, SimSun, serif">`;
 svg+=text(`比赛演示记录：${number}`,left,117,21);
 // Keep the recording's header positions; the emblem and verification block are demo labels.
 svg+=`<g fill="#9d3c45"><ellipse cx="700" cy="120" rx="37" ry="24" fill="none" stroke="#9d3c45" stroke-width="3"/>${text('演示',700,129,23,'text-anchor="middle"')}</g>`;
 svg+=text('中华人民共和国',700,213,40,'text-anchor="middle" letter-spacing="10"');
 svg+=text('个人所得税纳税记录',700,264,40,'text-anchor="middle" letter-spacing="11"');
 svg+=text('（比赛演示样张）',700,329,22,'text-anchor="middle"');
 svg+=taxDemoCode(1100,96,164);
 svg+=text('比赛演示码',1182,299,18,'text-anchor="middle"');
 svg+=text('DEMO · LOCAL DATA',1182,331,18,'text-anchor="middle"');
 svg+=text('仅供比赛展示',1182,359,18,'text-anchor="middle"');
 svg+=text('记录期间',left,434,24,'letter-spacing="12"')+text('：',244,434,24)+text(`${yearMonth(doc.start)}—${yearMonth(doc.end)}`,280,434,24);
 // Scale very long profile values into their own fixed fields without overlapping adjacent labels.
 const profile=(label,value,x,y,width)=>text(label,x,y,24)+text(value,x+180,y,24,`textLength="${Math.min(width,[...value].reduce((n,c)=>n+(/[\x00-\x7f]/.test(c)?14:24),0))}" lengthAdjust="spacingAndGlyphs"`);
 svg+=profile('纳税人名称：',doc.name||'未填写',left,490,390);
 svg+=profile('纳税人识别号：',doc.identity||'未填写',700,490,424);
 svg+=profile('身份证件类型：','居民身份证',left,547,390);
 svg+=profile('身份证件号码：',doc.identity||'未填写',700,547,424);
 svg+=text('金额单位：元',right,620,18,'text-anchor="end"');
 let y=tableY,x=left;
 svg+=`<g stroke="#b7b7b7" stroke-width="1.3" fill="none"><rect x="${left}" y="${y}" width="1200" height="${headerHeight}"/></g>`;
 taxPrintColumns.forEach(([label,width],i)=>{if(i)svg+=`<path d="M${x} ${y}v${headerHeight}" stroke="#b7b7b7" stroke-width="1.3"/>`;svg+=text(label,x+width/2,y+33,18,'text-anchor="middle"');x+=width;});
 y+=headerHeight;
 if(!rows.length){svg+=text('此期间暂无已保存收入记录',700,y+46,21,'text-anchor="middle"');y+=76;}
 for(const row of rows){x=left;row.lines.forEach((lines,i)=>{const centered=i<5;lines.forEach((line,j)=>{svg+=text(line,centered?x+taxPrintColumns[i][1]/2:x+10,y+(row.height-lines.length*24)/2+18+j*24,18,centered?'text-anchor="middle"':'');});x+=taxPrintColumns[i][1];});y+=row.height;}
 svg+=`<path d="M${left} ${tableY+headerHeight}V${y}H${right}V${tableY+headerHeight}" fill="none" stroke="#b7b7b7" stroke-width="1.3"/>`;
 svg+=`<rect x="${left}" y="${y}" width="1200" height="52" fill="none" stroke="#b7b7b7" stroke-width="1.3"/><path d="M256 ${y}v52" stroke="#b7b7b7" stroke-width="1.3"/>`;
 svg+=text(index===totalPages-1?'金额合计':'接下页',178,y+33,18,'text-anchor="middle"');
 svg+=text(index===totalPages-1?`${taxPrintMoney(doc.total)} （¥ ${doc.total}）`:'本记录未完，续见下一页。',274,y+33,19);
 svg+=`<path d="M100 1652H1300" stroke="#777" stroke-width="2"/>`;
 svg+=text('说明：',100,1698,23);
 ['1. 本记录涉及个人填写信息，请妥善保管。','2. 本记录为比赛演示样张，不提供官方验真。','  （1）记录数据来自“我要咨询”保存的内容；','  （2）重新下载将使用最近保存的数据。','3. 本页红章为比赛演示专用章。'].forEach((line,i)=>svg+=text(line,100,1737+i*32,18,'fill="#777"'));
 svg+=text('本页不作为纳税证明、收入证明或贷款材料。',100,1922,18);
 svg+=text('开具标识（演示）：',850,1818,20);
 svg+=text(`开具时间：${doc.time.slice(0,10).replace(/-/g,'.')}`,850,1882,21);
 svg+=taxDemoSeal(1060,1780);
 svg+=text(`当前第${index+1}页，共${totalPages}页`,right,1922,18,'text-anchor="end"');
 return svg+'</g>';
}
function taxDocumentSVG(request){
 const {doc,pages}=taxPrintLayout(request);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${taxPrintWidth}" height="${taxPrintHeight*pages.length}" viewBox="0 0 ${taxPrintWidth} ${taxPrintHeight*pages.length}" preserveAspectRatio="none" role="img" aria-label="个人所得税纳税记录，比赛演示样张"><title>个人所得税纳税记录 · 比赛演示</title><g class="tax-print-content">${pages.map((rows,i)=>`<g transform="translate(0 ${i*taxPrintHeight})">${taxPrintPage(doc,rows,i,pages.length)}</g>`).join('')}</g></svg>`;
}
