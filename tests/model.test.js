import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_ZOOM,removeOwnComment,clusters,createSeed,transform,project,unproject,zoomAt,rank} from '../dist/model.js';
const seed=createSeed(),bounds={left:-10000,right:10000,top:-10000,bottom:10000};
test('initial visible regions keep independent comments and correct counts',()=>{
 const result=clusters(seed,transform());assert.deepEqual(result.map(g=>g.members.length).sort((a,b)=>a-b),[5,20,103]);assert.equal(new Set(result.flatMap(g=>g.members.map(c=>c.id))).size,128);
});
test('nearby samples split progressively into individual bubbles',()=>{
 const all=clusters(seed,transform(2.05),bounds);const face=all.filter(g=>g.members[0].area==='face');assert.deepEqual(face.map(g=>g.members.length).sort((a,b)=>a-b),[2,18]);
 const toys=seed.filter(c=>c.area==='toy');assert.equal(clusters(toys,transform(6),bounds).length,5);
 const blanket=seed.filter(c=>c.area==='blanket');const counts=[1,2,4,8,MAX_ZOOM].map(s=>clusters(blanket,transform(s),bounds).length);
 assert.equal(counts[0],1);assert.ok(counts.every((n,i)=>!i||n>counts[i-1]));assert.equal(counts.at(-1),103);
 assert.ok(clusters(seed,transform(MAX_ZOOM),bounds).every(g=>g.members.length===1));
});
test('genuinely coincident independent comments stay together at every zoom level',()=>{
 const same=seed.slice(0,5).map(c=>({...c,x:.5,y:.5}));
 for(const s of [1,2,4,6,MAX_ZOOM]){const groups=clusters(same,transform(s),bounds);assert.equal(groups.length,1);assert.equal(groups[0].members.length,5);}
});
test('visible viewport alone determines clusters',()=>{
 const result=clusters(seed,transform(),{left:300,right:402,top:88,bottom:500});assert.equal(result.length,1);assert.equal(result[0].members.length,5);
});
test('exact positions survive arbitrary zoom and sheet changes',()=>{
 for(const c of seed){for(const t of [transform(),transform(3,40,-100),{x:67,y:44,w:268,h:357}]){const p=unproject(project(c,t),t);assert.ok(Math.abs(c.x-p.x)<1e-10);assert.ok(Math.abs(c.y-p.y)<1e-10);}}
});
test('zoom keeps the content beneath the gesture anchored',()=>{
 const t=transform(),p={x:153,y:311},next=zoomAt(t,2.2,p),point=unproject(p,t),after=project(point,next);assert.ok(Math.abs(after.x-p.x)<1e-10&&Math.abs(after.y-p.y)<1e-10);
});
test('ranking reorders on likes without joining independent messages',()=>{
 const rows=seed.filter(c=>c.area==='toy');rows[4].likes=20;const ordered=rows.slice().sort(rank);assert.equal(ordered[0].id,rows[4].id);assert.equal(new Set(ordered.map(c=>c.id)).size,5);
});
test('deletion only removes the selected own comment, including when positions coincide',()=>{
 const rows=[{id:'a',mine:true,x:.5,y:.5},{id:'b',mine:true,x:.5,y:.5},{id:'c',mine:false,x:.5,y:.5}];
 assert.deepEqual(removeOwnComment(rows,'a').map(c=>c.id),['b','c']);
 assert.deepEqual(removeOwnComment(rows,'c'),rows);
 assert.deepEqual(removeOwnComment(rows,'missing'),rows);
 assert.equal(rows.length,3);
});
