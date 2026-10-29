export const W=402,H=874,IMAGE_H=536;
export const MAX_ZOOM=24;
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const project=(p,t)=>({x:t.x+p.x*t.w,y:t.y+p.y*t.h});
export const unproject=(p,t)=>({x:clamp((p.x-t.x)/t.w,0,1),y:clamp((p.y-t.y)/t.h,0,1)});
export function rank(a,b){return (b.likes-a.likes)||((b.createdAt||0)-(a.createdAt||0))||a.id.localeCompare(b.id);}
// Complete-link clustering avoids chains joining distant areas; membership is based on visible screen distance only.
export function clusters(comments,t,bounds={left:0,right:402,top:88,bottom:795},radius=78){
 const visible=comments.map(c=>({c,...project(c,t)})).filter(p=>p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom).sort((a,b)=>rank(a.c,b.c));
 const groups=[];
 for(const p of visible){let best=null,dist=Infinity;
  for(const g of groups){if(g.points.every(q=>Math.hypot(q.x-p.x,q.y-p.y)<=radius)){const d=Math.hypot(g.x-p.x,g.y-p.y);if(d<dist){best=g;dist=d;}}}
  if(!best){best={points:[],x:p.x,y:p.y};groups.push(best);}
  best.points.push(p);best.x=best.points.reduce((s,q)=>s+q.x,0)/best.points.length;best.y=best.points.reduce((s,q)=>s+q.y,0)/best.points.length;
 }
 return groups.map(g=>({...g,members:g.points.map(p=>p.c).sort(rank),id:g.points.map(p=>p.c.id).sort().join('|')}));
}
export function createSeed(){
 const out=[];
 const names=['茄拉丁','飞鸟👑','琳达达达达','Jennyyyy','邓可可kk','小鱼','晴天','月亮不打烊','一颗栗子','慢慢来'];
 const face=['想吃兔肉罐罐','谁的奔驰标落这儿了','蛋黄罐罐也可以','泰国佬又不洗脸','好可爱','小猫在想什么呢','这个眼神太认真了','像在等开饭','圆圆的眼睛','今天也被可爱到了'];
 for(let i=0;i<20;i++){
  const mouth=i===1||i===19;
  const j=i===0?0:i-1,offset=spread(j,18,14);
  out.push({id:'face-'+i,x:mouth?.505+(i===19?4/402:0):.418+offset.x/402,y:mouth?.4095+(i===19?4/536:0):.3265+offset.y/536,text:face[i%face.length],name:names[i%names.length],avatar:i%5,likes:[435,200,15,1][i]||0,area:'face'});
 }
 for(let i=0;i<103;i++){const p=spread(i,103,35);out.push({id:'blanket-'+i,x:(287+p.x)/402,y:(397+p.y)/536,text:['这被子看起来很好盖','看起来就暖乎乎的','小猫的专属被窝','想和小猫一起睡午觉','这个黄色好治愈','被窝已经被小猫承包了','毛茸茸的冬天'][i%7],name:names[(i+5)%names.length],avatar:(i+2)%5,likes:i===0?103:Math.max(0,38-i),area:'blanket'});}
 // Nearby, distinct sample anchors demonstrate a count opening into individual bubbles.
 for(let i=0;i<5;i++){const p=spread(i,5,29);out.push({id:'toy-'+i,x:(346+p.x)/402,y:(211+p.y)/536,text:['旁边这条鱼也好可爱','同款小鱼抱枕！','橘色的鱼鱼','小猫的玩具吗','它的鱼比它还大'][i],name:names[i+3],avatar:(i+1)%5,likes:5-i,area:'toy'});}
 return out;
}
function spread(i,count,radius){const r=radius*Math.sqrt(i/Math.max(1,count-1)),a=i*2.3999632297;return{x:Math.cos(a)*r,y:Math.sin(a)*r};}
export function removeOwnComment(comments,id){return comments.filter(c=>c.id!==id||!c.mine);}
export function transform(scale=1,panX=0,panY=0){return {x:(W-W*scale)/2+panX,y:(H-IMAGE_H*scale)/2+panY,w:W*scale,h:IMAGE_H*scale};}
export function zoomAt(t,newScale,p){const point=unproject(p,t);const w=W*newScale,h=IMAGE_H*newScale;return {x:p.x-point.x*w,y:p.y-point.y*h,w,h};}
export function constrain(t){return {...t,x:t.w<=W?(W-t.w)/2:clamp(t.x,W-t.w,0),y:t.h<=H?(H-t.h)/2:clamp(t.y,H-t.h,0)};}
