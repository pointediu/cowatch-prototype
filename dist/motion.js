const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const naturalEase='cubic-bezier(.22,.75,.25,1)';
export function easeIn(el,{x=0,y=0,sx=1,sy=sx,opacity=1,duration=320}={}){
 if(!el||reduced())return;
 return el.animate([{transform:`translate(${x}px,${y}px) scale(${sx},${sy})`,opacity},{transform:'none',opacity:1}],{duration,easing:naturalEase});
}
// A lightly damped response, sampled for consistent spring motion without a runtime dependency.
export function springProgress(t){return 1-Math.exp(-8*t)*(Math.cos(10*t)+.8*Math.sin(10*t));}
export function springIn(el,{x=0,y=0,sx=1,sy=sx,opacity=1,duration=480}={}){
 if(!el||reduced())return;
 const frames=Array.from({length:49},(_,i)=>{const t=i/48,p=i===48?1:springProgress(t),q=1-p;return{offset:t,transform:`translate(${x*q}px,${y*q}px) scale(${1+(sx-1)*q},${1+(sy-1)*q})`,opacity:Math.min(1,opacity+(1-opacity)*p)};});
 return el.animate(frames,{duration,easing:'linear'});
}
export function leave(el,{y=0,scale=1,duration=190,opacity=0,easing='cubic-bezier(.4,0,1,1)'}={}){
 if(!el)return;
 el.inert=true;el.setAttribute('aria-hidden','true');
 if(reduced()){el.remove();return;}
 el.animate([{transform:'none',opacity:1},{transform:`translateY(${y}px) scale(${scale})`,opacity}],{duration,easing,fill:'forwards'}).finished.then(()=>el.remove()).catch(()=>el.remove());
}
export function photoFrame(el){if(!el)return null;return{x:parseFloat(el.style.left),y:parseFloat(el.style.top),w:parseFloat(el.style.width),h:parseFloat(el.style.height)};}
export function movePhoto(el,from,{duration=320}={}){const to=photoFrame(el);if(!from||!to||!to.w)return;if(Math.abs(from.x-to.x)+Math.abs(from.y-to.y)+Math.abs(from.w-to.w)<.1)return;easeIn(el,{x:from.x-to.x,y:from.y-to.y,sx:from.w/to.w,sy:from.h/to.h,duration});}

export function capturePreview(app){
 const scroll=app.querySelector(':scope > .note-scroll'),image=scroll?.querySelector('.note-image-button>img');
 if(!image||!scroll||reduced())return null;
 const a=app.getBoundingClientRect(),r=image.getBoundingClientRect(),scale=a.width/app.offsetWidth;
 const origin=document.createElement('div');origin.className='preview-origin';origin.inert=true;origin.setAttribute('aria-hidden','true');
 for(const child of app.children)origin.append(child.cloneNode(true));
 return {origin,image,scrollTop:scroll.scrollTop,x:(r.left-a.left)/scale,y:(r.top-a.top)/scale};
}
export function enterPreview(app,from){
 const viewer=app.querySelector('.viewer'),photo=app.querySelector('#main-photo'),to=photoFrame(photo);
 if(!from||!viewer||!to)return;
 const {origin,image}=from;app.append(origin);origin.querySelector('.note-scroll').scrollTop=from.scrollTop;
 const moving=document.createElement('div');moving.className='preview-image-transition';moving.setAttribute('aria-hidden','true');
 Object.assign(moving.style,{left:`${to.x}px`,top:`${to.y}px`,width:`${to.w}px`,height:`${to.h}px`});
 // Translate the whole original image; its size and crop stay fixed throughout.
 image.className='preview-moving-photo';Object.assign(image.style,{position:'absolute',left:'0px',top:'0px',width:`${to.w}px`,height:`${to.h}px`,maxWidth:'none',objectFit:'cover'});
 moving.append(image);app.append(moving);photo.style.visibility='hidden';
 origin.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out',fill:'forwards'});
 const animation=moving.animate([
  {transform:`translate(${from.x-to.x}px,${from.y-to.y}px)`},
  {transform:'translate(0px,0px)'}
 ],{duration:320,easing:naturalEase});
 for(const el of viewer.querySelectorAll('.status,.viewer-nav,.viewer-hint,.home,.markers,.guide'))el.animate([{opacity:0},{opacity:1}],{duration:160,delay:160,fill:'backwards',easing:'ease-out'});
 const cleanup=()=>{photo.style.visibility='';moving.remove();origin.remove();};animation.finished.then(cleanup).catch(cleanup);
}
