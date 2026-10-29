// Offline dictionary-backed Pinyin composition. Dictionary license: THIRD_PARTY_LICENSES.txt.
export class PinyinEngine {
 constructor(dictionary={}){this.setDictionary(dictionary)}
 setDictionary(dictionary){this.dict=dictionary;this.prefix={};for(const [key,words]of Object.entries(dictionary)){const word=words[0];if(!word)continue;for(let i=1;i<Math.min(key.length,7);i++){const prefix=key.slice(0,i),bucket=this.prefix[prefix]||(this.prefix[prefix]=[]);bucket.push({key,text:word[0],score:word[1]});}}
  for(const k of Object.keys(this.prefix))this.prefix[k].sort((a,b)=>b.score-a.score).splice(24);
 }
 compose(raw){const memo=new Map();const visit=i=>{if(i===raw.length)return{text:'',score:0};if(memo.has(i))return memo.get(i);let best=null;
  for(let end=i+1;end<=Math.min(raw.length,i+30);end++){const entry=this.dict[raw.slice(i,end)]?.[0];if(!entry)continue;const rest=visit(end);if(!rest)continue;const candidate={text:entry[0]+rest.text,score:Math.log(entry[1]+1)-16+rest.score};if(!best||candidate.score>best.score)best=candidate;}
  memo.set(i,best);return best;};return visit(0)?.text||null;
 }
 candidates(input){const raw=input.toLowerCase().replace(/[^a-zv]/g,'');if(!raw)return[];const list=[],seen=new Set();const add=(text,consume)=>{if(!seen.has(text)){seen.add(text);list.push({text,consume});}};
  const exact=this.dict[raw];if(exact)for(const [word]of exact)add(word,raw.length);
  const full=this.compose(raw);if(full)add(full,raw.length);
  for(const candidate of this.prefix[raw]||[])add(candidate.text,raw.length);
  // Offer a leading word even when the rest of the sentence is still incomplete.
  for(let n=raw.length-1;n>0&&list.length<24;n--)if(this.dict[raw.slice(0,n)])for(const [word]of this.dict[raw.slice(0,n)].slice(0,6))add(word,n);
  return list.slice(0,24);
 }
}
