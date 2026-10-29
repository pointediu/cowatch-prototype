import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PinyinEngine} from '../dist/pinyin.js';
const e=new PinyinEngine(JSON.parse(readFileSync(new URL('../dist/pinyin-dict.json',import.meta.url))));
test('common and contextual Chinese words appear as candidates',()=>{for(const [py,text]of [['nihao','你好'],['xiaomao','小猫'],['haokeai','好可爱'],['beizi','被子'],['xihuan','喜欢']])assert.equal(e.candidates(py)[0].text,text);});
test('continuous Chinese phrases are composed rather than left as Latin letters',()=>{for(const py of ['wohaoxihuanxiaomao','xiaozhuazihaokeai','woxiangshuijiao']){const c=e.candidates(py).find(c=>c.consume===py.length);assert.ok(c&&!/[a-z]/i.test(c.text));}});
test('incomplete Pinyin can select a leading word without losing the remaining letters',()=>{const c=e.candidates('xiaomaoh').find(c=>c.text==='小猫');assert.ok(c);assert.equal(c.consume,7);});
test('candidates are unique and empty input is empty',()=>{assert.deepEqual(e.candidates(''),[]);const c=e.candidates('shi');assert.equal(new Set(c.map(v=>v.text)).size,c.length);});
