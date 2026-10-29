import {assets} from './assets.js';
import {PinyinEngine} from './pinyin.js';
import {springIn,easeIn,leave,photoFrame,movePhoto,capturePreview,enterPreview} from './motion.js';
import {MAX_ZOOM,removeOwnComment,W,H,IMAGE_H,clamp,project,unproject,rank,clusters,createSeed,transform,zoomAt,constrain} from './model.js';
const A=assets['142-22512'],V=assets['142-22390'],L=assets['142-22122'],D=assets['142-22291'],G=assets['142-22469'],OFF=assets['142-22158'];
const app=document.querySelector('#app'),device=document.querySelector('#device');
const STORE='cowatch-prototype-v1';
const imeEngine=new PinyinEngine();let imeRaw='',imeStart=0,imeMode='zh',imeCandidates=[],nativeComposing=false;
fetch('./pinyin-dict.json').then(r=>r.json()).then(d=>{imeEngine.setDictionary(d);refreshCandidates();}).catch(()=>{});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=(src,cls='',alt='')=>`<img src="${src}" class="${cls}" alt="${escape(alt)}" draggable="false">`;
function read(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
const saved=read();
let own=(Array.isArray(saved.own)?saved.own:[]).filter(c=>c&&typeof c.text==='string'&&c.text.trim()&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=0&&c.x<=1&&c.y>=0&&c.y<=1).map(c=>({...c,text:c.text.slice(0,120),mine:true,likes:0}));
let liked=saved.liked&&typeof saved.liked==='object'?saved.liked:{};
let comments=[...createSeed(),...own].map(c=>({...c,likes:c.likes+(liked[c.id]?1:0)}));
let state={screen:'note',on:false,t:transform(),groups:[],sheet:null,selected:null,draft:null,guide:false,emoji:false,follow:false,noteLike:false,collect:false,editing:null,deleteConfirm:null};
let viewScale=1,guideTimer,toastTimer,toastText='',restoreTransform=null,nativeTop=428;
const native=matchMedia('(pointer:coarse)').matches;
function persist(){try{localStorage.setItem(STORE,JSON.stringify({own:comments.filter(c=>c.mine).map(c=>({...c,likes:0})),liked,seenGuide:saved.seenGuide||false}));return true;}catch{return false}}
function avatar(c){if(c.mine)return A.imgAvatar;return [L.imgAvatar,L.imgAvatar1,L.imgAvatar2,L.imgAvatar3,L.imgAvatar4][c.avatar%5]}
function status(dark=false){return `<div class="status">${img(dark?V.imgTime1:A.imgTime,'time')}${img(dark?V.imgRightSide1:A.imgRightSide,'signals')}</div>`}
const home=dark=>`<div class="home${dark?' dark':''}" aria-hidden="true"></div>`;
function fit(){
 if(native&&state.draft&&window.visualViewport&&window.visualViewport.height<window.innerHeight-100){updateNative();return;}
 const w=window.innerWidth,h=window.innerHeight;
 viewScale=Math.min(w/W,(h-(w>440?32:0))/H,w>440?1:Infinity);
 device.style.width=`${W*viewScale}px`;device.style.height=`${H*viewScale}px`;app.style.transform=`scale(${viewScale})`;
 if(state.draft&&native)updateNative();
}
function note(){return `${status()}<header class="note-nav"><button class="nav-back" data-action="note-back" aria-label="返回">${img(A.imgBack)}</button><div class="author">${img(A.imgAvatar4,'avatar','狸狸仔的头像')}<span>狸狸仔</span></div><button class="follow" data-action="follow">${state.follow?'已关注':'关注'}</button><button data-action="share" aria-label="分享笔记">${img(A.imgShareNew)}</button></header>
<div class="note-scroll"><section class="note-photo"><button class="note-image-button" data-action="preview" aria-label="打开普通大图预览">${img(A.img,'','盖着黄色被子的小猫')}</button><button class="entry" data-action="cowatch" aria-label="从共看入口进入">${img(A.img1)}<span>${131+comments.filter(c=>c.mine).length}条共看</span></button></section><div class="pagination">${img(A.img2,'','第1张，共4张')}</div><article class="note-copy"><h1>小猫也会做梦吗</h1><p>本来只是想晒晒被子，结果一转身，它已经把最暖和的位置占好了。小爪子搭在被子上的样子也太乖了。</p><div class="note-date">编辑于 昨天 美国</div>${img(A.imgDivider,'divider')}</article><section class="note-comments"><div class="comment-title">评论 7 ${img(A.imgSearchFilterB)}</div><div class="note-input">${img(A.imgAvatar,'avatar')}<button class="entry-input" data-action="note-comment"><span>喜欢就给个评论支持一下</span><span class="input-icons">${img(A.imgMention)}${img(A.imgMessageExpression)}${img(A.imgPictureB)}</span></button></div>
<div class="note-comment">${img(A.imgAvatar1,'avatar')}<div class="comment-main"><p class="username">cherry不吃樱桃🍒</p><p>谁能拒绝一只会做梦的小猫</p><div class="comment-meta"><span>2天前 广东</span><span class="text-action">回复</span><button class="likes" data-action="note-comment-like" aria-label="赞这条笔记评论">${img(A.imgIcon)}<span>435</span></button>${img(A.imgDislike)}</div><div class="note-reply">${img(A.imgAvatar4,'avatar')}<div><p class="username">狸狸仔<span class="author-badge">作者</span></p><p>怀疑是在梦里抢被窝</p><div class="comment-meta">2天前 广东 <span>回复</span></div></div></div></div></div><div class="end">- 到底了 -</div></section></div>
<footer class="note-bottom"><button class="bottom-input" data-action="note-comment">${img(A.imgEdit)}说点什么...</button><button class="bottom-action ${state.noteLike?'active':''}" data-action="note-like" aria-label="${state.noteLike?'取消笔记点赞':'点赞笔记'}">${img(A.imgLike)}${65+Number(state.noteLike)}</button><button class="bottom-action ${state.collect?'active':''}" data-action="collect" aria-label="${state.collect?'取消收藏':'收藏笔记'}">${img(A.imgCollect)}${46+Number(state.collect)}</button><button class="bottom-action" data-action="scroll-comments" aria-label="查看笔记评论">${img(A.imgChat)}19</button></footer>${home(false)}`;}
function view(){return `<section class="viewer">${status(true)}<div class="canvas" id="canvas" aria-label="小猫图片；双击或滚轮缩放，长按留下共看"><img id="main-photo" class="main-photo" src="${V.imgImage2}" alt="盖着黄色被子的小猫" draggable="false"><div class="markers" id="markers"></div></div>
${!state.sheet&&!state.draft?`<nav class="viewer-nav"><button class="close" data-action="back" aria-label="关闭大图">${img(V.imgCloseB)}</button><div class="image-counter">1/4</div><button class="toggle ${state.on?'':'off'}" data-action="toggle" aria-label="${state.on?'关闭共看':'开启共看'}" aria-pressed="${state.on}">${img(state.on?V.img:OFF.img)}共看</button></nav>${state.on?'<p class="viewer-hint">长按图片任意位置留下共看</p>':''}${home(true)}`:''}
${state.sheet?sheet():''}${state.draft?composer():''}${state.deleteConfirm?deleteDialog():''}${state.guide?`<div class="guide">${img(G.imgEllipse2,'guide-circle')}${img(G.img2,'guide-hand')}<p class="guide-text">试试长按留下共看</p></div>`:''}</section>`;}
function sheet(){const list=comments.filter(c=>state.sheet.includes(c.id)).sort(rank);return `<section class="sheet" role="dialog" aria-label="附近的共看"><header class="sheet-header"><span>附近的共看 ${list.length}</span>${img(L.imgSearchFilterB)}<button class="sheet-close" data-action="close-sheet" aria-label="关闭共看列表">${img(L.imgCloseB)}</button></header><div class="comment-scroll" id="comment-scroll">${list.map(c=>`<article class="region-comment ${state.selected===c.id?'selected':''}" data-comment="${c.id}" data-action="locate" data-id="${c.id}" tabindex="0" aria-label="查看留言位置：${escape(c.text)}" aria-current="${state.selected===c.id}">${img(avatar(c),'avatar')}<div class="comment-main"><p class="username">${escape(c.mine?'我':c.name)}</p><p class="comment-text">${escape(c.text)}</p><div class="comment-meta"><span>${c.mine?'刚刚':'2天前 广东'}</span><button class="location-button" data-action="locate" data-id="${c.id}">查看位置</button><button class="likes ${liked[c.id]?'liked':''}" data-action="like" data-id="${c.id}" aria-label="${liked[c.id]?'取消点赞':'点赞'}：${escape(c.text)}" aria-pressed="${!!liked[c.id]}">${img(L.imgIcon)}<span>${c.likes}</span></button>${img(L.imgDislike,'decorative')}</div></div></article>`).join('')}<div class="end">- 到底了 -</div></div>${home(false)}</section>`;}
const emojis=['😂','🤭','🥶','😘','🥺','☺️','😍','🫣','❤️','👍','😆','🤗','🥰','😎'];
function emojiButtons(){return emojis.map((e,i)=>`<button data-action="emoji" data-index="${i}" aria-label="输入${e}">${img(D['imgBitmap'+(i||'')])}</button>`).join('')}
function candidateBar(){
 const choices=imeRaw?imeCandidates.map((c,i)=>`<button data-action="candidate" data-index="${i}" aria-label="候选词：${escape(c.text)}">${escape(c.text)}</button>`).join(''):['啊','的','小','💗','又','到','你','好'].map(k=>`<button data-action="insert" data-key="${k}">${k}</button>`).join('');
 return `<div class="candidate-area ${imeRaw?'composing':''}">${imeRaw?`<div class="pinyin-composition">${escape(imeRaw)}</div>`:''}<div class="suggestions">${choices||`<button data-action="literal">${escape(imeRaw)}</button>`}</div></div>`;
}
function keyboard(){
 const rows=imeMode==='number'?['1234567890','-/:;()¥&@','。，？！、·…']:['qwertyuiop','asdfghjkl','zxcvbnm'];
 return `<div class="keyboard">${candidateBar()}${rows.map((r,i)=>`<div class="key-row ${i===1?'second':i===2?'third':''}">${i===2?'<button class="special shift" data-action="shift" aria-label="切换大写">⇧</button>':''}${[...r].map(k=>`<button class="keycap" data-action="key" data-key="${k}" data-pop="${k}">${shift?k.toUpperCase():k}</button>`).join('')}${i===2?'<button class="special delete" data-action="delete" aria-label="退格">⌫</button>':''}</div>`).join('')}<div class="key-row bottom"><button data-action="language" aria-label="切换输入方式">${imeMode==='zh'?'ABC':imeMode==='en'?'123':'拼音'}</button><button class="space" data-action="space" aria-label="空格或选择第一个候选词"> </button><button class="return" data-action="keyboard-return" aria-label="${imeRaw?'选定候选词':'确认发布'}">↵</button></div><div class="keyboard-bottom"><button class="emoji-key" data-action="expression" aria-label="表情键盘">${img(D.imgEmoji)}</button><button class="mic-key" data-action="mic" aria-label="语音输入">${img(D.imgMic)}</button></div></div>`;
}
function refreshCandidates(){
 imeCandidates=imeEngine.candidates(imeRaw);const area=document.querySelector('.candidate-area');if(area)area.outerHTML=candidateBar();
}
function refreshKeyboard(){const key=document.querySelector('.keyboard');if(key)key.outerHTML=keyboard();}
function typePinyin(k){
 if(!state.draft)return;
 if(imeMode!=='zh'||!/^([a-z])$/.test(k)){if(imeRaw)commitCandidate(0);insertText(k);return;}
 const input=document.querySelector('#draft-input');
 if(!imeRaw){imeStart=input.selectionStart??state.draft.text.length;const end=input.selectionEnd??imeStart;state.draft.text=state.draft.text.slice(0,imeStart)+state.draft.text.slice(end);}
 const before=state.draft.text.slice(0,imeStart),after=state.draft.text.slice(imeStart+imeRaw.length);
 imeRaw+=k;updateText(before+imeRaw+after);input.setSelectionRange(imeStart+imeRaw.length,imeStart+imeRaw.length);refreshCandidates();focusInput();
}
function commitCandidate(index){
 if(!state.draft||!imeRaw)return;
 const c=imeCandidates[index]||{text:imeRaw,consume:imeRaw.length},before=state.draft.text.slice(0,imeStart),after=state.draft.text.slice(imeStart+imeRaw.length);
 imeRaw=imeRaw.slice(c.consume);imeStart+=c.text.length;updateText(before+c.text+imeRaw+after);
 const input=document.querySelector('#draft-input');input.setSelectionRange(imeStart+imeRaw.length,imeStart+imeRaw.length);refreshCandidates();focusInput();
}
function backspace(){
 const input=document.querySelector('#draft-input');if(!input||!state.draft)return;
 if(imeRaw){const before=state.draft.text.slice(0,imeStart),after=state.draft.text.slice(imeStart+imeRaw.length);imeRaw=imeRaw.slice(0,-1);updateText(before+imeRaw+after);input.setSelectionRange(imeStart+imeRaw.length,imeStart+imeRaw.length);refreshCandidates();}
 else{const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;const cut=start===end?([...input.value.slice(0,start)].at(-1)?.length||0):0;updateText(input.value.slice(0,start-cut)+input.value.slice(end));input.setSelectionRange(start-cut,start-cut);}
 focusInput();
}
function composer(){return `<section class="composer" role="dialog" aria-label="留下自己的共看"><div class="compose-row"><div class="compose-input"><textarea id="draft-input" maxlength="120" rows="1" placeholder="在这里说点什么" aria-label="在这里说点什么" enterkeyhint="send">${escape(state.draft.text)}</textarea><button class="send" data-action="send" ${state.draft.text.trim()?'':'disabled'}>确认</button></div><button class="expression" data-action="expression" aria-label="打开表情">${img(D.imgMessageExpressionLight)}</button></div><div class="emoji-strip">${emojiButtons()}</div>${state.emoji?`<div class="emoji-expanded">${emojiButtons()}</div>`:keyboard()}${home(false)}</section>`;}
function render(){
 const preview=state.screen==='viewer'?capturePreview(app):null;
 const before=photoFrame(document.querySelector('#main-photo'));
 const oldPanel=document.querySelector('.sheet,.composer'),oldKind=oldPanel?.className;
 const oldAlert=document.querySelector('.delete-overlay');
 const nextKind=state.sheet?'sheet':state.draft?'composer':null;
 const departing=oldPanel&&oldKind!==nextKind?oldPanel.cloneNode(true):null;
 if(state.screen==='note')app.classList.remove('zoomed');
 app.classList.toggle('native-keyboard',native&&!!state.draft);
 app.innerHTML=state.screen==='note'?note():view();
 if(state.screen==='viewer'){
  paint();bindCanvas();if(state.draft)refreshCandidates();
  if(preview)enterPreview(app,preview);else movePhoto(document.querySelector('#main-photo'),before,{duration:nextKind?320:260});
  const panel=document.querySelector('.sheet,.composer');
  if(nextKind!==oldKind)easeIn(panel,{y:panel?.offsetHeight||460,duration:320});
  if(departing){departing.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));app.append(departing);leave(departing,{y:departing.offsetHeight,duration:260,opacity:1,easing:'cubic-bezier(.4,0,.6,1)'});}
  if(state.deleteConfirm){document.querySelectorAll('.viewer > :not(.delete-overlay)').forEach(el=>el.inert=true);if(!oldAlert)springIn(document.querySelector('.delete-dialog'),{sx:1.06,opacity:0,duration:340});}
 }
 if(toastText)drawToast();updateTools();
}
function deleteDialog(){return `<div class="delete-overlay"><section class="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">确认删除这条共看？</h2><div class="delete-actions"><button data-action="cancel-delete">取消</button><button class="destructive" data-action="confirm-delete">删除</button></div></section></div>`;}
function editOwn(id){if(!comments.some(c=>c.id===id&&c.mine)||state.draft||state.deleteConfirm)return;stopZoom();dismissGuide();state.editing=id;paint();springIn(document.querySelector('.delete-bubble'),{sx:.45,opacity:0,duration:360});}
function askDelete(id){if(state.editing!==id||!comments.some(c=>c.id===id&&c.mine))return;state.deleteConfirm=id;render();document.querySelector('[data-action="cancel-delete"]')?.focus({preventScroll:true});}
function cancelDelete(){state.deleteConfirm=null;render();document.querySelector('.delete-bubble')?.focus({preventScroll:true});}
function confirmDelete(){
 const id=state.deleteConfirm;if(!comments.some(c=>c.id===id&&c.mine))return;
 comments=removeOwnComment(comments,id);delete liked[id];state.deleteConfirm=null;state.editing=null;persist();
 if(state.sheet){state.sheet=state.sheet.filter(x=>x!==id);if(!state.sheet.length){state.sheet=null;state.selected=null;state.t=restoreTransform||transform();}else if(state.selected===id)state.selected=comments.filter(c=>state.sheet.includes(c.id)).sort(rank)[0].id;}
 render();toast('已删除共看');
}
function photoTransform(){if(state.sheet)return{x:67,y:44,w:268,h:357};if(state.draft){const w=native?Math.min(304,Math.max(100,(nativeTop-44)*.75)):304;return{x:(402-w)/2,y:44,w,h:w*4/3};}return state.t;}
function stack(g){let src;if(g.members[0].area==='face')src=[V.imgUserA3,V.imgUserA4,V.imgUserA5];else if(g.members[0].area==='blanket')src=[V.imgUserA,V.imgUserA1,V.imgUserA2];else src=g.members.slice(0,3).map(avatar);return `<span class="avatar-stack">${src.map(s=>img(s)).join('')}</span>`;}
function single(c,x,y,extra='',action='group',groupId=''){
 const editing=state.editing===c.id,button=`<button class="bubble single-bubble ${c.mine?'own':''} ${editing?'editing':''} ${extra}" ${c.mine?'':`data-marker-key="comment:${c.id}" style="left:${x}px;top:${y}px"`} data-action="${action}" data-comment-id="${c.id}" data-mine="${!!c.mine}" data-group="${escape(groupId)}" aria-label="查看${c.mine?'我的':'这条'}共看：${escape(c.text)}">${img(avatar(c),'avatar')}<span class="bubble-title">${escape(c.text)}</span></button>`;
 return c.mine?`<div class="comment-marker" data-marker-key="comment:${c.id}" style="left:${x}px;top:${y}px">${button}${editing?`<button class="delete-bubble" data-action="ask-delete" data-id="${c.id}" aria-label="删除我的共看">${img(D.imgGenuineCloseC)}</button>`:''}</div>`:button;
}
function setMarkers(html){
 const host=document.querySelector('#markers');if(!host)return;
 const old=new Map([...host.children].filter(el=>!el.classList.contains('marker-exit')).map(el=>[el.dataset.markerKey,el]));
 const exits=[...host.querySelectorAll(':scope > .marker-exit')];
 const template=document.createElement('template');template.innerHTML=html;const children=[],entering=[];
 for(const next of [...template.content.children]){
  const existing=old.get(next.dataset.markerKey);
  if(existing){old.delete(next.dataset.markerKey);for(const a of [...existing.attributes])if(!next.hasAttribute(a.name))existing.removeAttribute(a.name);for(const a of next.attributes)existing.setAttribute(a.name,a.value);if(existing.innerHTML!==next.innerHTML)existing.innerHTML=next.innerHTML;children.push(existing);}
  else{children.push(next);entering.push(next);}
 }
 for(const el of old.values()){el.classList.add('marker-exit');el.style.pointerEvents='none';exits.push(el);leave(el,{scale:.88,duration:130});}
 host.replaceChildren(...children,...exits);for(const el of entering)springIn(el,{sx:.82,opacity:0,duration:350});
}
function paint(){
 const photo=document.querySelector('#main-photo'),markers=document.querySelector('#markers');if(!photo||!markers)return;
 app.classList.toggle('zoomed',!state.sheet&&!state.draft&&state.t.w>W*1.02);const t=photoTransform();Object.assign(photo.style,{left:`${t.x}px`,top:`${t.y}px`,width:`${t.w}px`,height:`${t.h}px`});
 if(state.draft){const c=state.draft,p=project(c,t),width=Math.min(250,54+Math.max(7,c.text.length)*13),x=clamp(p.x-24,6,396-width),y=clamp(p.y-52,50,(native?nativeTop:428)-54);setMarkers(`<div data-marker-key="draft" class="bubble single-bubble draft-bubble" style="left:${x}px;top:${y}px">${img(A.imgAvatar,'avatar')}<span class="bubble-title">${escape(c.text||'在这里说点什么')}</span><button class="draft-cancel" data-action="cancel-draft" aria-label="取消共看草稿">${img(D.imgGenuineCloseC)}</button></div>`);return;}
 if(state.sheet){const c=comments.find(c=>c.id===state.selected);if(!c){markers.innerHTML='';return;}const p=project(c,t),width=Math.min(260,50+c.text.length*13),x=clamp(p.x-24,5,397-width),y=clamp(p.y-56,48,350);setMarkers(single(c,x,y,'','none'));return;}
 if(!state.on){markers.innerHTML='';return;}
 const groups=clusters(comments,t);state.groups=groups;
 const best=groups.slice().sort((a,b)=>rank(a.members[0],b.members[0])).slice(0,2);
 const occupied=[],parts=[];
 function place(x,y,w,h){
  const ox=clamp(x,6,396-w),oy=clamp(y,96,781-h);let best={x:ox,y:oy,score:Infinity};
  const offsets=[[0,0]];for(let row=1;row<=12;row++)for(const dy of [row*(h+8),-row*(h+8)])for(const dx of [0,-w-8,w+8])offsets.push([dx,dy]);
  for(const [dx,dy]of offsets){const cx=clamp(ox+dx,6,396-w),cy=clamp(oy+dy,96,781-h);const overlap=occupied.reduce((sum,r)=>sum+Math.max(0,Math.min(cx+w+6,r.x+r.w+6)-Math.max(cx,r.x))*Math.max(0,Math.min(cy+h+6,r.y+r.h+6)-Math.max(cy,r.y)),0);const score=overlap*10000+(cx-ox)**2+(cy-oy)**2;if(score<best.score)best={x:cx,y:cy,score};if(score===0)break;}
  occupied.push({...best,w,h});return best;
 }
 // Own content has a dedicated preview; it still opens its spatial cluster, including other independent comments.
 const mine=groups.flatMap(g=>g.members.filter(c=>c.mine).map(c=>({c,g}))).sort((a,b)=>Number(b.c.id===state.editing)-Number(a.c.id===state.editing)||(b.c.createdAt||0)-(a.c.createdAt||0)).slice(0,2);
 for(const {c,g}of mine){const p=project(c,t),w=Math.min(260,66+c.text.length*13),pos=place(p.x-24,p.y-52,w,40);parts.push(single(c,pos.x,pos.y,'','group',g.id));}
 for(const g of groups){const count=g.members.length,c=g.members[0];if(count===1){if(mine.some(m=>m.c.id===c.id))continue;const pos=place(g.x-24,g.y-52,Math.min(260,50+c.text.length*13),40);parts.push(single(c,pos.x,pos.y,'','group',g.id));continue;}
 parts.push(`<button data-marker-key="number:${escape(g.id)}" class="number-target" style="left:${g.x-22}px;top:${g.y-22}px" data-action="group" data-group="${escape(g.id)}" aria-label="查看此处${count}条共看"><span class="number-dot ${count>99?'three':count>9?'two':''}">${count}</span></button>`);
 if(best.includes(g)){const blanket=c.area==='blanket',w=count>99?170:165;const pos=place(g.x-(blanket?95:76),g.y+(blanket?24:-83),w,62);parts.push(`<button data-marker-key="group:${escape(g.id)}" class="bubble" style="left:${pos.x}px;top:${pos.y}px;width:${w}px" data-action="group" data-group="${escape(g.id)}" aria-label="${escape(c.text)}，附近${count}条共看"><span class="bubble-title">${escape(c.text)}</span><span class="bubble-meta">${stack(g)}<span>${count} 条共看在附近</span></span></button>`);}
 }
 setMarkers(parts.join(''));updateTools();
}
function showGuide(force=false){if(!force&&saved.seenGuide)return;state.guide=true;saved.seenGuide=true;persist();document.querySelector('.guide')?.remove();document.querySelector('.viewer')?.insertAdjacentHTML('beforeend',`<div class="guide">${img(G.imgEllipse2,'guide-circle')}${img(G.img2,'guide-hand')}<p class="guide-text">试试长按留下共看</p></div>`);clearTimeout(guideTimer);guideTimer=setTimeout(dismissGuide,3400);}
function dismissGuide(){clearTimeout(guideTimer);state.guide=false;document.querySelector('.guide')?.remove();}
function enter(on){stopZoom();state.editing=null;state.deleteConfirm=null;dismissGuide();state.screen='viewer';state.on=on;state.sheet=null;state.selected=null;state.draft=null;state.t=transform();render();if(on)showGuide();}
function back(){if(state.deleteConfirm){cancelDelete();return;}if(state.editing){state.editing=null;paint();return;}stopZoom();dismissGuide();if(state.draft){cancelDraft();return;}if(state.sheet){closeSheet();return;}state.screen='note';render();}
function openGroup(id){stopZoom();state.editing=null;const g=state.groups.find(g=>g.id===id);if(!g)return;dismissGuide();restoreTransform={...state.t};state.sheet=g.members.map(c=>c.id);state.selected=g.members[0].id;render();document.querySelector('.sheet-close')?.focus({preventScroll:true});}
function closeSheet(){state.editing=null;state.sheet=null;state.selected=null;if(restoreTransform)state.t=restoreTransform;render();}
function locate(id){state.editing=null;state.selected=id;document.querySelectorAll('.region-comment').forEach(n=>(n.classList.toggle('selected',n.dataset.comment===id),n.setAttribute('aria-current',n.dataset.comment===id)));paint();}
function like(id){const c=comments.find(c=>c.id===id);if(!c)return;liked[id]=!liked[id];c.likes+=liked[id]?1:-1;persist();const scroll=document.querySelector('#comment-scroll')?.scrollTop||0;document.querySelector('.sheet').outerHTML=sheet();document.querySelector('#comment-scroll').scrollTop=scroll;paint();}
function startDraft(p){if(!state.on||state.sheet||state.draft||state.deleteConfirm)return;stopZoom();state.editing=null;dismissGuide();const t=state.t;if(p.x<t.x||p.x>t.x+t.w||p.y<t.y||p.y>t.y+t.h)return;const point=unproject(p,t);restoreTransform={...state.t};state.draft={...point,text:''};state.emoji=false;imeRaw='';imeMode='zh';nativeTop=428;render();focusInput();}
function focusInput(){document.querySelector('#draft-input')?.focus({preventScroll:true});}
function cancelDraft(){imeRaw='';state.draft=null;state.emoji=false;if(restoreTransform)state.t=restoreTransform;document.activeElement?.blur();render();fit();}
function send(){for(let i=0;i<40&&imeRaw;i++)commitCandidate(0);if(!state.draft||!state.draft.text.trim())return;const c={id:'mine-'+crypto.randomUUID(),x:state.draft.x,y:state.draft.y,text:state.draft.text.trim().slice(0,120),name:'我',mine:true,likes:0,avatar:0,createdAt:Date.now()};comments.push(c);const ok=persist();state.draft=null;state.emoji=false;state.t=restoreTransform||transform();document.activeElement?.blur();render();fit();toast(ok?'已留下共看': '已留下共看；此浏览器暂时无法保存');}
function updateText(text){if(!state.draft)return;state.draft.text=text.slice(0,120);const input=document.querySelector('#draft-input');if(input&&input.value!==state.draft.text)input.value=state.draft.text;document.querySelector('.send').disabled=!state.draft.text.trim();paint();}
function insertText(text){const input=document.querySelector('#draft-input');if(!input||!state.draft)return;const a=input.selectionStart??input.value.length,b=input.selectionEnd??a;updateText(input.value.slice(0,a)+text+input.value.slice(b));input.setSelectionRange(a+text.length,a+text.length);focusInput();}
function toast(text){toastText=text;drawToast();clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toastText='';document.querySelector('.toast')?.remove();},2200);}
function drawToast(){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=toastText;app.append(el);}
function updateTools(){document.querySelector('#zoom-label').value=Math.round(state.t.w/W*100)+'%';document.querySelectorAll('[data-tool="in"],[data-tool="out"],[data-tool="fit"]').forEach(b=>b.disabled=state.screen!=='viewer'||!!state.sheet||!!state.draft);}
let zoomAnimation=0,zoomGoal=null;
function stopZoom(){cancelAnimationFrame(zoomAnimation);zoomAnimation=0;zoomGoal=null;}
function zoom(scale,p={x:201,y:437},smooth=true){
 if(state.screen!=='viewer'||state.sheet||state.draft||state.deleteConfirm)return;
 dismissGuide();state.editing=null;const next=clamp(scale,1,MAX_ZOOM),from={...state.t},target=next===1?transform():constrain(zoomAt(state.t,next,p));stopZoom();
 if(!smooth||matchMedia('(prefers-reduced-motion: reduce)').matches){state.t=target;paint();return;}
 zoomGoal=target;const began=performance.now();
 function tick(now){const progress=Math.min(1,(now-began)/460),eased=progress===1?1:1-(1+9*progress)*Math.exp(-9*progress);state.t=Object.fromEntries(Object.keys(target).map(k=>[k,from[k]+(target[k]-from[k])*eased]));paint();if(progress<1)zoomAnimation=requestAnimationFrame(tick);else{zoomAnimation=0;zoomGoal=null;}}
 zoomAnimation=requestAnimationFrame(tick);
}
function updateNative(){if(!native||!state.draft)return;const rect=device.getBoundingClientRect();const visible=window.visualViewport?.height||window.innerHeight;nativeTop=clamp((visible-rect.top)/viewScale-104,200,770);const el=document.querySelector('.composer');if(el)el.style.top=nativeTop+'px';paint();}
let shift=false,deleteHeld=false,deleteDelay,deleteRepeat;
let ownPress=null,suppressOwnClickUntil=0;
function stopOwnPress(){if(ownPress)clearTimeout(ownPress.timer);ownPress=null;}
app.addEventListener('click',async e=>{
 if(performance.now()<suppressOwnClickUntil&&!e.target.closest('[data-action="ask-delete"]')){suppressOwnClickUntil=0;e.preventDefault();return;}
 const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(state.deleteConfirm&&!['cancel-delete','confirm-delete'].includes(a))return;
 if(a==='cowatch')enter(true);else if(a==='preview')enter(false);else if(a==='back')back();
 else if(a==='toggle'){state.editing=null;state.on=!state.on;dismissGuide();render();if(state.on)showGuide();}
 else if(a==='group')openGroup(b.dataset.group);else if(a==='close-sheet')closeSheet();else if(a==='locate')locate(b.dataset.id);else if(a==='like')like(b.dataset.id);
 else if(a==='ask-delete')askDelete(b.dataset.id);else if(a==='cancel-delete')cancelDelete();else if(a==='confirm-delete')confirmDelete();
 else if(a==='cancel-draft')cancelDraft();else if(a==='send')send();else if(a==='emoji'){if(imeRaw)commitCandidate(0);insertText(emojis[Number(b.dataset.index)]);}else if(a==='key')typePinyin(shift?b.dataset.key.toUpperCase():b.dataset.key);
 else if(a==='candidate')commitCandidate(Number(b.dataset.index));else if(a==='insert')insertText(b.dataset.key);else if(a==='literal'){imeRaw='';refreshCandidates();}
 else if(a==='space'){if(imeRaw)commitCandidate(0);else insertText(' ');}
 else if(a==='keyboard-return'){if(imeRaw)commitCandidate(0);else send();}
 else if(a==='language'){if(imeRaw)commitCandidate(0);imeMode=imeMode==='zh'?'en':imeMode==='en'?'number':'zh';refreshKeyboard();}
 else if(a==='delete'){if(!deleteHeld)backspace();deleteHeld=false;}
 else if(a==='shift'){shift=!shift;refreshKeyboard();}
 else if(a==='expression'){state.emoji=!state.emoji;const focus=document.activeElement?.id==='draft-input';document.querySelector('.composer').outerHTML=composer();if(focus)focusInput();if(native)updateNative();refreshCandidates();}
 else if(a==='numbers'){const letters=[...document.querySelectorAll('.key-row [data-action="key"]')];const nums='1234567890-/:;()¥&@.,?!';letters.forEach((n,i)=>{const k=b.textContent==='ABC'?nums[i%nums.length]:'qwertyuiopasdfghjklzxcvbnm'[i];n.dataset.key=k;n.textContent=k;});b.textContent=b.textContent==='ABC'?'123':'ABC';}
 else if(a==='follow'){state.follow=!state.follow;b.textContent=state.follow?'已关注':'关注';}
 else if(a==='note-like'){state.noteLike=!state.noteLike;const y=document.querySelector('.note-scroll').scrollTop;render();document.querySelector('.note-scroll').scrollTop=y;}
 else if(a==='collect'){state.collect=!state.collect;const y=document.querySelector('.note-scroll').scrollTop;render();document.querySelector('.note-scroll').scrollTop=y;}
 else if(a==='scroll-comments')document.querySelector('.note-scroll').scrollTo({top:488,behavior:'smooth'});
 else if(a==='note-comment-like'){const active=b.classList.toggle('liked');b.querySelector('span').textContent=active?'436':'435';}
 else if(a==='share'){try{await navigator.clipboard.writeText(location.href);toast('原型链接已复制');}catch{toast('可以复制浏览器地址分享原型');}}
 else if(a==='note-comment')toast('点击图片上的「共看」，在具体位置留下想法');
 else if(a==='note-back')toast('当前从这篇笔记开始体验');else if(a==='mic')toast('请使用键盘输入共看内容');
});
app.addEventListener('pointerdown',e=>{
 const mine=e.target.closest('[data-mine="true"]');
 if(mine&&e.button===0&&!state.deleteConfirm){stopOwnPress();const id=mine.dataset.commentId;ownPress={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{suppressOwnClickUntil=performance.now()+600;editOwn(id);ownPress=null;},550)};}
 if(e.target.closest('.keyboard,.emoji-strip,.emoji-expanded,.expression'))e.preventDefault();
 if(e.target.closest('[data-action="delete"]')){deleteHeld=false;deleteDelay=setTimeout(()=>{deleteHeld=true;backspace();deleteRepeat=setInterval(backspace,65);},450);}
});
window.addEventListener('pointermove',e=>{if(ownPress&&Math.hypot(e.clientX-ownPress.x,e.clientY-ownPress.y)>8)stopOwnPress();});
window.addEventListener('pointerup',()=>{stopOwnPress();clearTimeout(deleteDelay);clearInterval(deleteRepeat);});
window.addEventListener('pointercancel',()=>{stopOwnPress();clearTimeout(deleteDelay);clearInterval(deleteRepeat);});
app.addEventListener('compositionstart',()=>{nativeComposing=true;imeRaw='';refreshCandidates();});
app.addEventListener('compositionend',e=>{nativeComposing=false;if(e.target.id==='draft-input')updateText(e.target.value);});
app.addEventListener('input',e=>{if(e.target.id==='draft-input'){imeRaw='';refreshCandidates();updateText(e.target.value);}});
app.addEventListener('keydown',e=>{
 if(e.target.matches('.region-comment')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();locate(e.target.dataset.id);return;}
 if(state.deleteConfirm&&e.key==='Tab'){const buttons=[...document.querySelectorAll('.delete-actions button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&e.target===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&e.target===last){e.preventDefault();first.focus();}return;}
 if(e.target.matches('[data-mine="true"]')&&(e.key==='Delete'||(e.shiftKey&&e.key==='F10'))){e.preventDefault();editOwn(e.target.dataset.commentId);return;}
 if(e.target.id!=='draft-input'||e.isComposing||nativeComposing)return;
 if(!native&&imeMode==='zh'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&/^[a-z]$/.test(e.key)){e.preventDefault();typePinyin(e.key);return;}
 if(imeRaw){if(e.key===' '||e.key==='Enter'){e.preventDefault();commitCandidate(0);return;}if(/^[1-9]$/.test(e.key)){e.preventDefault();commitCandidate(Number(e.key)-1);return;}if(e.key==='Backspace'){e.preventDefault();backspace();return;}}
 if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}
});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.screen==='viewer'){e.preventDefault();back();}else if(state.screen==='viewer'&&!state.draft&&!state.sheet){if(e.key==='+'||e.key==='=')zoom(state.t.w/W*1.25);if(e.key==='-')zoom(state.t.w/W/1.25);if(e.key==='0')zoom(1);}});
document.querySelector('#preview-tools').addEventListener('click',e=>{const a=e.target.closest('[data-tool]')?.dataset.tool;if(a==='note'){state.draft=null;state.sheet=null;state.screen='note';dismissGuide();render();}else if(a==='cowatch')enter(true);else if(a==='in')zoom(state.t.w/W*1.4);else if(a==='out')zoom(state.t.w/W/1.4);else if(a==='fit')zoom(1);else if(a==='guide'){enter(true);showGuide(true);}});
function localPoint(e){const r=app.getBoundingClientRect();return{x:(e.clientX-r.left)/viewScale,y:(e.clientY-r.top)/viewScale};}
let pendingPress=null;
function bindCanvas(){
 const canvas=document.querySelector('#canvas'),pointers=new Map();let start=null,last=null,base=null,pinch=null,moved=false,longFired=false,lastTap=0,lastTapPoint=null;
 const stopPress=()=>{clearTimeout(pendingPress);pendingPress=null;};
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',e=>{if(state.sheet||state.draft||state.deleteConfirm)return;e.preventDefault();zoom((zoomGoal?.w||state.t.w)/W*Math.exp(-e.deltaY*.0015),localPoint(e));},{passive:false});
 canvas.addEventListener('pointerdown',e=>{
  if(state.sheet||state.draft||state.deleteConfirm||e.target.closest('button')||e.button>0)return;
  if(state.editing){state.editing=null;paint();return;}stopZoom();
  dismissGuide();const p=localPoint(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);longFired=false;
  if(pointers.size===1){start=last=p;base={...state.t};moved=false;stopPress();if(state.on&&p.y>=88&&p.y<=795)pendingPress=setTimeout(()=>{longFired=true;startDraft(p)},550);}
  else if(pointers.size===2){stopPress();moved=true;const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),t:{...state.t},center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||state.sheet||state.draft)return;const p=localPoint(e);pointers.set(e.pointerId,p);
  if(pointers.size===2&&pinch){stopPress();const[a,b]=[...pointers.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2},scale=clamp(pinch.t.w/W*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),1,MAX_ZOOM);const t=zoomAt(pinch.t,scale,pinch.center);t.x+=center.x-pinch.center.x;t.y+=center.y-pinch.center.y;state.t=scale===1?transform():constrain(t);paint();return;}
  if(start&&Math.hypot(p.x-start.x,p.y-start.y)>8){moved=true;stopPress();}
  if(moved&&base&&state.t.w>W){state.t=constrain({...base,x:base.x+p.x-start.x,y:base.y+p.y-start.y});paint();}last=p;
 });
 const up=e=>{stopPress();if(!pointers.has(e.pointerId))return;const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(state.draft){focusInput();return;}
  if(!moved&&!longFired&&e.type==='pointerup'){const now=Date.now();if(now-lastTap<300&&lastTapPoint&&Math.hypot(p.x-lastTapPoint.x,p.y-lastTapPoint.y)<24){const scale=state.t.w/W,next=[2.05,4,8,16,MAX_ZOOM].find(s=>s>scale*1.1)||1;zoom(next,p);lastTap=0;}else{lastTap=now;lastTapPoint=p;}}
  if(pointers.size===1){start=[...pointers.values()][0];base={...state.t};moved=true;pinch=null;}else{start=null;pinch=null;}
 };
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',stopPress);
}
window.addEventListener('pointerup',()=>{clearTimeout(pendingPress);if(state.draft)focusInput();});
window.addEventListener('blur',()=>{clearTimeout(pendingPress);stopOwnPress();});
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',updateNative);
render();fit();
