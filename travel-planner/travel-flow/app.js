const $=s=>document.querySelector(s),chat=$('#chat'),scroller=$('#scroll'),input=$('#input');
const defaultPrompt=input.value;
let voiceMode=false, activePrompt='', paused=false;
function syncComposer(){
 const form=$('#form');
 input.hidden=false;
 form.dataset.mode='one';
 input.style.height='22px';
 const multiline=input.value.includes('\n')||input.scrollHeight>24;
 const mode=voiceMode?'voice':!input.value?'empty':(multiline||typeof paused!=='undefined'&&paused)?'two':'one';
 form.dataset.mode=mode;
 input.style.height=mode==='two'?'44px':'22px';
 $('#send').hidden=mode==='empty'||mode==='voice';
 $('#mode-toggle').hidden=mode==='one'||mode==='two';
 $('#voice-toggle').hidden=mode!=='two';
 $('#voice-hold').hidden=mode!=='voice';
 input.hidden=mode==='voice';
 $('#mode-toggle img').src='assets/input-'+(mode==='voice'?'voice':'empty')+'-imgFrame.svg';
 $('#mode-toggle').setAttribute('aria-label',mode==='voice'?'切换到文字输入':'切换到语音输入');
 $('#send img').src='assets/input-'+(mode==='two'?'two':'one')+'-imgFrame.svg';
 $('#footer').style.setProperty('--composer-height',(mode==='two'?121:54)+'px');
}
function fillInput(text){if(state==='generating'&&!paused)return;voiceMode=false;input.value=text;syncComposer();input.focus();input.setSelectionRange(input.value.length,input.value.length);}
input.addEventListener('input',syncComposer);
$('#mode-toggle').onclick=()=>{voiceMode=!voiceMode;syncComposer();if(!voiceMode)input.focus();};
$('#voice-toggle').onclick=()=>{voiceMode=true;syncComposer();};
$('#voice-hold').onpointerdown=e=>{e.preventDefault();$('#voice-hold').textContent='松开结束';$('#voice-hold').setPointerCapture(e.pointerId);};
$('#voice-hold').onpointerup=$('#voice-hold').onpointercancel=()=>{$('#voice-hold').textContent='按住说话';};
syncComposer();
let state='idle',run=0,follow=true;
const steps=['了解你的需求','查找目的地信息','查询热门景点','挑选合适酒店','规划交通路线','整理出行贴士','安排每日行程'];
const results=['','','已找到20个推荐景点','已找到20个推荐酒店','已找到13个交通方案','已找到北京的实用指南','已为您生成专属行程方案'];
const asset=(n,ext='svg',prefix='end')=>'assets/'+prefix+'-'+n+'.'+ext;
const image=(n,alt='',cls='',ext='svg',prefix='end')=>'<img class="'+cls+'" src="'+asset(n,ext,prefix)+'" alt="'+alt+'">';
function scrollLatest(){if(follow)requestAnimationFrame(()=>scroller.scrollTo({top:scroller.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
function add(html,parent=chat){const el=document.createElement('div');el.className='enter';el.innerHTML=html;parent.append(el);scrollLatest();return el;}
function questions(){const list=['为我规划行程','为我找便宜机票','忙我找找银川酒店','忙了一周，这周末去济南周边放松下'];$('#questions').innerHTML=list.map(x=>'<button class="question"><em>#</em><span>'+x+'</span>'+image('imgGroup450')+'</button>').join('');}
questions();
$('#questions').onclick=e=>{const button=e.target.closest('.question');if(button)fillInput(button.querySelector('span').textContent);};
$('#shuffle').onclick=()=>{const q=$('#questions');q.append(q.firstElementChild);};
$('.chips').onclick=e=>{const button=e.target.closest('button');if(button)fillInput(button.textContent.replace(/^[^\u4e00-\u9fff]+/,'').trim());};
scroller.addEventListener('wheel',e=>{if(e.deltaY<0)follow=false;},{passive:true});
let touchY=0;scroller.addEventListener('touchstart',e=>touchY=e.touches[0].clientY,{passive:true});scroller.addEventListener('touchmove',e=>{if(e.touches[0].clientY>touchY+5)follow=false;},{passive:true});
scroller.addEventListener('scroll',()=>{const near=scroller.scrollHeight-scroller.clientHeight-scroller.scrollTop<60;if(near)follow=true;$('#follow').hidden=follow||state==='idle';});
$('#follow').onclick=()=>{follow=true;$('#follow').hidden=true;scrollLatest();};
async function wait(ms,id){ms=ms/(window.journeySpeed||1);let elapsed=0;while(elapsed<ms){const started=performance.now();await new Promise(r=>setTimeout(r,Math.min(80,ms-elapsed)));if(id!==run)throw Error('cancel');if(!paused)elapsed+=performance.now()-started;}}
function reset(){run++;state='idle';paused=false;follow=true;chat.replaceChildren();$('.phone').classList.remove('compact');$('#form').hidden=false;$('#stop').hidden=true;$('.chips').hidden=false;input.disabled=false;input.value=defaultPrompt;voiceMode=false;syncComposer();$('#follow').hidden=true;scroller.scrollTo(0,0);}
$('#reset').onclick=reset;$('#back').onclick=reset;$('#menu').onclick=reset;
function resumeGeneration(){
 if(state!=='generating'||!paused)return;
 paused=false;$('#resume-generation')?.remove();$('#form').hidden=true;$('#stop').hidden=false;
 syncComposer();scrollLatest();
}
$('#stop').onclick=()=>{
 if(state!=='generating'||paused)return;
 paused=true;voiceMode=false;input.value=activePrompt;
 $('#stop').hidden=true;$('#form').hidden=false;syncComposer();
 let title=$('.progress');
 if(!title)title=add('<div class="progress" role="status"><span class="progress-label">线路正在生成中…</span></div>').firstChild;
 const resume=document.createElement('button');resume.id='resume-generation';resume.type='button';resume.textContent='继续生成';resume.onclick=resumeGeneration;title.append(resume);
 input.focus();input.setSelectionRange(input.value.length,input.value.length);
};
$('#form').onsubmit=async e=>{e.preventDefault();if((state==='generating'&&!paused)||!input.value.trim())return;
const prompt=input.value.trim();reset();activePrompt=prompt;const id=++run;state='generating';$('.phone').classList.add('compact');$('#form').hidden=true;$('.chips').hidden=true;$('#stop').hidden=false;$('#stop').classList.remove('paused');$('#stop').textContent='停止生成';
const user=add('<div class="bubble user"></div>');user.firstChild.textContent=prompt;
if(prompt.replace(/\s/g,'')!==defaultPrompt.replace(/\s/g,'')){
 try{
  await wait(550,id);
  const reply=add('<div class="bubble ai demo-reply"></div>').firstChild;
  const text='当前为交互演示 Demo，暂未接入真实 AI，无法根据其他需求生成行程。你可以使用预设的“济南出发、情侣出行、北京4日游”体验完整流程，查看生成进度、暂停修改和最终行程结果。点击下方“输入预设文字”，即可回到初始页面继续体验。';
  for(let i=0;i<text.length;i+=3){reply.textContent=text.slice(0,i+3);scrollLatest();await wait(45,id);}
  await wait(250,id);
  $('.progress')?.parentElement.remove();
  add('<button type="button" class="restore-preset">输入预设文字</button>');
  state='unsupported';$('#stop').hidden=true;$('#form').hidden=false;input.value='';voiceMode=false;syncComposer();scrollLatest();
 }catch(err){if(err.message!=='cancel')console.error(err);}
 return;
}
try{await wait(550,id);
const reply=add('<div class="bubble ai"></div>').firstChild;
const text='好的！我现在将为您生成专属线路。由于生成需要一段时间，我们为您查找到一些当地新鲜事，先一睹为快。当然如果您感兴趣的话可以试着先收藏一下，稍后再将收藏的地点安排到线路内。';
for(let i=0;i<text.length;i+=3){reply.textContent=text.slice(0,i+3);scrollLatest();await wait(20,id);}
add('<div class="photos" aria-label="推荐图片">'+galleryPhotos.map((photo,i)=>'<button class="photo-card" type="button" data-photo="'+i+'" aria-label="放大查看'+photo.alt+'"><img src="'+photo.src+'" alt="'+photo.alt+'"'+(i===1?' class="second-photo"':'')+'></button>').join('')+'</div>');
const progress=$('.progress')||add('<div class="progress" role="status"><span class="progress-label">线路正在生成中…（0%）</span></div>').firstChild;
chat.append(progress.parentElement);
const container=add('<div class="steps"></div>').firstChild;
for(let i=0;i<steps.length;i++){const el=add('<div class="step"><div class="steptitle"><span class="spin"></span><span>'+steps[i]+'</span></div></div>',container).firstChild;
let map;
if(i===2)map=add('<div class="map"><small>正在查询北京的景点体验</small>'+image('imgImage1633141206','北京景点地图','mapbase','png','mid')+'<span class="pin">八达岭长城</span><span class="pin">北京野生动物园</span><span class="pin">北京环球度假区</span></div>',el);
for(let j=0;j<5;j++){progress.querySelector('.progress-label').textContent='线路正在生成中…（'+Math.round((i+j/5)/steps.length*100)+'%）';await wait(i===2?480:220,id);}
el.querySelector('.spin').outerHTML=image('imgFrame3','','check');
if(map)map.remove();if(results[i])add('<div class="resultline">'+results[i]+image('imgFrame345')+'</div>',el);
}
container.id='thinking-steps';
progress.removeAttribute('role');
progress.innerHTML='<button class="thinking-toggle" type="button" aria-expanded="true" aria-controls="thinking-steps"><span>深度思考已完成</span>'+image('imgFrame343','','thinking-arrow')+'</button>';
progress.querySelector('button').onclick=()=>{
 const button=progress.querySelector('button');
 const expanded=button.getAttribute('aria-expanded')==='true';
 const anchorTop=progress.getBoundingClientRect().top;
 button.setAttribute('aria-expanded',String(!expanded));
 container.parentElement.hidden=expanded;
 // Keep the heading in place when the removed content shortens the page.
 scroller.scrollTop+=progress.getBoundingClientRect().top-anchorTop;
};
add('<section class="trip"><h2>北京4日游</h2><div class="tripcard"><div class="cover">'+image('img9C869341Ccdfb99A205Ccfa26789A518C545554F1A10EUsXoqtFw1200Webp1','北京天坛行程封面','','png')+'<button class="heart" aria-label="收藏行程" aria-pressed="false">'+image('imgUnion')+'</button></div><div class="tripinfo"><div><b>进入地图编辑模式</b><small>可以结合地图，自己编辑哦！</small></div><button class="go">GO!!</button></div></div><div class="disclaimer">以上内容由AI生成</div><div class="feedback"><button aria-label="分享">'+image('imgGroup2147232564')+'</button><button aria-label="赞" aria-pressed="false">'+image('imgVector')+'</button><button aria-label="踩" aria-pressed="false">'+image('imgVector1')+'</button></div></section>');
state='completed';$('#stop').hidden=true;$('#form').hidden=false;input.value='';voiceMode=false;syncComposer();scrollLatest();
}catch(err){if(err.message!=='cancel')console.error(err);}};
chat.addEventListener('click',e=>{const toggle=e.target.closest('.heart,.feedback button');if(toggle){const value=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',value);toggle.style.opacity=value?'.45':'1';}if(e.target.closest('.go')){const d=document.createElement('dialog');d.innerHTML='<p>北京4日游</p><p>此演示展示行程生成流程，地图编辑尚未接入。</p><button>返回行程</button>';document.body.append(d);d.querySelector('button').onclick=()=>d.remove();d.showModal();}});



const galleryPhotos=[{src:'assets/recommendation-temple.png',alt:'天坛',rotate:false},{src:'assets/recommendation-tiananmen.png',alt:'天安门',rotate:false}];
const viewer=document.createElement('dialog');viewer.className='photo-viewer';
viewer.setAttribute('aria-label','图片预览');
viewer.innerHTML='<div class="viewer-top"><span class="viewer-count"></span><button type="button" class="viewer-close" aria-label="关闭图片预览">×</button></div><div class="viewer-stage"><img alt="" draggable="false"></div><button type="button" class="viewer-prev" aria-label="上一张">‹</button><button type="button" class="viewer-next" aria-label="下一张">›</button><p class="viewer-caption"></p>';
document.body.append(viewer);let photoIndex=0,photoTrigger=null,previousFollow=true;
const previewImage=viewer.querySelector('.viewer-stage img');
function fitPreview(){
 if(!previewImage.naturalWidth)return;
 const stage=viewer.querySelector('.viewer-stage'),photo=galleryPhotos[photoIndex];
 const w=stage.clientWidth-24,h=stage.clientHeight-24;
 const scale=Math.min(w/(photo.rotate?previewImage.naturalHeight:previewImage.naturalWidth),h/(photo.rotate?previewImage.naturalWidth:previewImage.naturalHeight));
 previewImage.style.width=previewImage.naturalWidth*scale+'px';previewImage.style.height=previewImage.naturalHeight*scale+'px';previewImage.style.transform=photo.rotate?'rotate(90deg)':'none';
}
function showPhoto(index){
 photoIndex=(index+galleryPhotos.length)%galleryPhotos.length;const photo=galleryPhotos[photoIndex];
 previewImage.src=photo.src;previewImage.alt=photo.alt;viewer.querySelector('.viewer-count').textContent=(photoIndex+1)+' / '+galleryPhotos.length;
 viewer.querySelector('.viewer-caption').textContent=photo.alt;previewImage.onload=fitPreview;if(previewImage.complete)fitPreview();
}
chat.addEventListener('click',e=>{const card=e.target.closest('[data-photo]');if(!card)return;photoTrigger=card;previousFollow=follow;follow=false;viewer.showModal();showPhoto(Number(card.dataset.photo));});
viewer.querySelector('.viewer-close').onclick=()=>viewer.close();
viewer.querySelector('.viewer-prev').onclick=()=>showPhoto(photoIndex-1);viewer.querySelector('.viewer-next').onclick=()=>showPhoto(photoIndex+1);
viewer.addEventListener('close',()=>{follow=previousFollow;photoTrigger?.focus({preventScroll:true});});
viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(photoIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(photoIndex+1);}});
let swipeStart=null;
const stage=viewer.querySelector('.viewer-stage');
stage.addEventListener('pointerdown',e=>{swipeStart={x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);});
stage.addEventListener('pointerup',e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))showPhoto(photoIndex+(dx<0?1:-1));});
stage.addEventListener('pointercancel',()=>swipeStart=null);
window.addEventListener('resize',()=>{if(viewer.open)fitPreview();});

/* Embedded journey bridge: keep navigation and the actual page state synchronized. */
if(new URLSearchParams(location.search).has('journey')){
 document.querySelector('#back').setAttribute('aria-label','返回上一级');
 document.querySelector('#back').addEventListener('click',e=>{
   e.stopImmediatePropagation();run++;
   parent.postMessage({type:'journey-state',stage:'back'},location.origin);
 },true);

 let previousStage='',commandTarget='';
 const notify=stage=>{if(stage===previousStage)return;previousStage=stage;parent.postMessage({type:'journey-state',stage},location.origin);};
 const detect=()=>{
   let stage=state==='unsupported'?'input':state==='completed'?'completed':state==='generating'?(paused?'input':document.querySelector('.progress')?'thinking':'sent'):'input';
   if(commandTarget==='completed'&&stage!=='completed')return;
   if(stage==='completed'){window.journeySpeed=1;commandTarget='';}
   notify(stage);
 };
 new MutationObserver(detect).observe(chat,{childList:true,subtree:true,characterData:true});
 document.querySelector('#stop').addEventListener('click',detect);
 document.querySelector('#form').addEventListener('submit',()=>queueMicrotask(detect));
 document.querySelector('#reset').addEventListener('click',detect);
 document.querySelector('#back').addEventListener('click',detect);
 window.addEventListener('message',e=>{
   if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='journey-command')return;
   const stage=e.data.stage;commandTarget=stage;previousStage=stage;
   if(stage==='input'){reset();if(e.data.prompt){input.value=e.data.prompt;syncComposer();}return;}
   if(stage==='completed'&&state==='completed')return;
   if(stage==='completed')window.journeySpeed=100;
   else window.journeySpeed=1;
   if(state==='idle'||state==='completed'){if(state==='completed')reset();input.value=e.data.prompt||defaultPrompt;syncComposer();document.querySelector('#form').requestSubmit();}
   else if(paused)resumeGeneration();
 });
 chat.addEventListener('click',e=>{
   if(!e.target.closest('.go'))return;
   e.stopImmediatePropagation();
   parent.postMessage({type:'journey-state',stage:'overview'},location.origin);
 },true);
}

(function(){
 let timer;const toast=document.createElement('div');toast.className='inactive-hint';toast.hidden=true;toast.setAttribute('role','status');document.querySelector('.phone').append(toast);
 document.querySelector('#scroll').addEventListener('click',e=>{
  if(e.target.closest('button,a,input,textarea,[data-photo]'))return;
  toast.textContent=state==='generating'?(paused?'可修改需求后发送，或点击“继续生成”':'正在生成，可点击底部“停止生成”'):state==='completed'?'可展开思考步骤，或点击 GO 查看行程':'点击推荐问题，或在底部输入需求后发送';
  clearTimeout(timer);toast.hidden=false;timer=setTimeout(()=>toast.hidden=true,2800);
 });
})();

chat.addEventListener('click',e=>{
 if(!e.target.closest('.restore-preset'))return;
 reset();
 if(new URLSearchParams(location.search).has('journey'))parent.postMessage({type:'journey-state',stage:'input'},location.origin);
});

/* The hand-held mockup has a deeper camera capsule than the flat demo shell. */
try{if(parent!==window&&parent.document.documentElement.classList.contains('device-only'))document.documentElement.classList.add('hand-status-aligned');}catch(e){}

// Drag the recommendation gallery without triggering the image viewer.
let galleryDrag=null,gallerySuppress=false;
chat.addEventListener('pointerdown',e=>{const gallery=e.target.closest('.photos');if(!gallery||e.pointerType==='touch')return;galleryDrag={gallery,x:e.clientX,left:gallery.scrollLeft,moved:false};gallerySuppress=false;});
window.addEventListener('pointermove',e=>{if(!galleryDrag)return;const d=galleryDrag,delta=e.clientX-d.x;if(Math.abs(delta)>5){d.moved=true;gallerySuppress=true;d.gallery.classList.add('dragging');}if(d.moved){d.gallery.scrollLeft=d.left-delta;e.preventDefault();}});
window.addEventListener('pointerup',()=>{if(galleryDrag)galleryDrag.gallery.classList.remove('dragging');galleryDrag=null;setTimeout(()=>gallerySuppress=false,0);});
chat.addEventListener('click',e=>{if(gallerySuppress&&e.target.closest('.photos')){e.preventDefault();e.stopImmediatePropagation();}},true);
chat.addEventListener('dragstart',e=>{if(e.target.closest('.photos'))e.preventDefault();});
