
let N=6; const ANIMAL='🦊'; let sizeMode=localStorage.getItem('wildokuSizeMode')||'6';let difficultyMode=localStorage.getItem('wildokuDifficulty')||'normal',activeDifficulty=difficultyMode;let showRegionBorders=localStorage.getItem('wildokuRegionBorders')!=='0';
const board=document.getElementById('board'),status=document.getElementById('status'),toast=document.getElementById('toast');
function lockBoardSquare(){const w=Math.floor(board.getBoundingClientRect().width);if(w>0)board.style.height=w+'px'}
window.addEventListener('resize',lockBoardSquare,{passive:true});
if(window.ResizeObserver)new ResizeObserver(lockBoardSquare).observe(board);

let puzzle=null,state=[],fixed=new Set(),history=[],started=Date.now(),timerInt=null,lives=3,hints=3,reveals=1,hintCells=new Set(),hintSourceCells=new Set(),levelNo=+(localStorage.getItem('wildokuLevel')||1);let networkAllowed=localStorage.getItem('wildokuNetworkAllowed')!=='0';
const I=(r,c)=>r*N+c, RC=i=>[Math.floor(i/N),i%N];
function shuffled(a){a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function validSolution(cols){for(let r=1;r<N;r++)if(Math.abs(cols[r]-cols[r-1])<=1)return false;return new Set(cols).size===N}
function makeSolution(){for(let k=0;k<10000;k++){let p=shuffled([...Array(N).keys()]);if(validSolution(p))return p}return null}
function neighbors(i){let [r,c]=RC(i),a=[];for(let [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){let rr=r+dr,cc=c+dc;if(rr>=0&&rr<N&&cc>=0&&cc<N)a.push(I(rr,cc))}return a}
function growRegions(sol){let reg=Array(N*N).fill(-1), seeds=sol.map((c,r)=>I(r,c));seeds.forEach((s,k)=>reg[s]=k);let singleton=Math.floor(Math.random()*N), unassigned=N*N-N, guard=0;while(unassigned&&guard++<10000){let choices=[];for(let i=0;i<N*N;i++)if(reg[i]===-1){let rs=[...new Set(neighbors(i).map(j=>reg[j]).filter(x=>x>=0&&x!==singleton))];if(rs.length)choices.push([i,rs])}if(!choices.length){singleton=(singleton+1)%N;continue}let [i,rs]=choices[Math.floor(Math.random()*choices.length)];reg[i]=rs[Math.floor(Math.random()*rs.length)];unassigned--}return {reg,singleton}}
function countSolutions(reg,limit=2){let regionCells=Array.from({length:N},()=>[]);for(let i=0;i<N*N;i++)regionCells[reg[i]].push(i);let count=0, rows=new Set(),cols=new Set(),placed=[];let order=[...Array(N).keys()].sort((a,b)=>regionCells[a].length-regionCells[b].length);function bt(k){if(count>=limit)return;if(k===N){count++;return}let rg=order[k];for(let i of regionCells[rg]){let [r,c]=RC(i);if(rows.has(r)||cols.has(c))continue;let bad=placed.some(j=>{let [rr,cc]=RC(j);return Math.abs(rr-r)<=1&&Math.abs(cc-c)<=1});if(bad)continue;rows.add(r);cols.add(c);placed.push(i);bt(k+1);placed.pop();rows.delete(r);cols.delete(c)}}bt(0);return count}
function logicRun(reg,sol,stopAfterFirst=false){
 let animals=new Set(),excluded=new Set(),steps=[],guesses=0;
 const regCells=Array.from({length:N},()=>[]);for(let i=0;i<N*N;i++)regCells[reg[i]].push(i);
 for(let rg=0;rg<N;rg++)if(regCells[rg].length===1)animals.add(regCells[rg][0]);
 function exclude(i,reason){if(animals.has(i)||excluded.has(i))return false;excluded.add(i);steps.push({type:'exclude',cells:[i],reason});return true}
 function place(i,reason){if(animals.has(i))return false;animals.add(i);steps.push({type:'place',cells:[i],reason});return true}
 function propagate(){let changed=true;while(changed){changed=false;
   for(let a of [...animals]){let [r,c]=RC(a),rg=reg[a];for(let i=0;i<N*N;i++)if(i!==a&&!animals.has(i)){let [rr,cc]=RC(i);if(rr===r&&exclude(i,'In dieser Zeile steht bereits ein Tier.'))changed=true;else if(cc===c&&exclude(i,'In dieser Spalte steht bereits ein Tier.'))changed=true;else if(reg[i]===rg&&exclude(i,'In dieser Farbregion steht bereits ein Tier.'))changed=true;else if(Math.abs(rr-r)<=1&&Math.abs(cc-c)<=1&&exclude(i,'Dieses Feld berührt ein bereits gesetztes Tier – auch diagonal ist das nicht erlaubt.'))changed=true}}
   const groups=[];for(let rg=0;rg<N;rg++)groups.push(['region',rg,regCells[rg]]);for(let r=0;r<N;r++)groups.push(['row',r,[...Array(N)].map((_,c)=>I(r,c))]);for(let c=0;c<N;c++)groups.push(['col',c,[...Array(N)].map((_,r)=>I(r,c))]);
   for(let [kind,k,cells] of groups){if(cells.some(i=>animals.has(i)))continue;let cand=cells.filter(i=>!excluded.has(i)&&!animals.has(i));if(cand.length===1){let label=kind==='region'?'dieser Farbregion':kind==='row'?'dieser Zeile':'dieser Spalte';if(place(cand[0],'In '+label+' bleibt nur noch dieses Feld als möglicher Tierplatz übrig.'))changed=true}}
   // Locked candidates: alle Möglichkeiten einer Region liegen in derselben Zeile/Spalte.
   for(let rg=0;rg<N;rg++){if(regCells[rg].some(i=>animals.has(i)))continue;let cand=regCells[rg].filter(i=>!excluded.has(i));if(cand.length<2)continue;let rows=[...new Set(cand.map(i=>RC(i)[0]))],cols=[...new Set(cand.map(i=>RC(i)[1]))];if(rows.length===1){let r=rows[0];for(let c=0;c<N;c++){let i=I(r,c);if(reg[i]!==rg&&exclude(i,'Das Tier dieser Farbregion muss in dieser Zeile liegen. Deshalb können die anderen Felder der Zeile kein Tier enthalten.'))changed=true}}if(cols.length===1){let c=cols[0];for(let r=0;r<N;r++){let i=I(r,c);if(reg[i]!==rg&&exclude(i,'Das Tier dieser Farbregion muss in dieser Spalte liegen. Deshalb können die anderen Felder der Spalte kein Tier enthalten.'))changed=true}}}
 }
 }
 propagate();
 while(animals.size<N){let unresolved=[];for(let r=0;r<N;r++){let i=I(r,sol[r]);if(!animals.has(i))unresolved.push(i)}if(!unresolved.length)break;guesses++;place(unresolved[0],'An dieser Stelle ist eine Annahme nötig.');propagate();if(guesses>3)break}
 return {solved:animals.size===N,guesses,steps};
}
function generatePuzzle(){for(let tries=0;tries<2600;tries++){let sol=makeSolution();if(!sol)continue;let g=growRegions(sol);if(g.reg.includes(-1)||countSolutions(g.reg)!==1)continue;let q=logicRun(g.reg,sol);if(!q.solved)continue;let ok=activeDifficulty==='relaxed'?q.guesses===0:activeDifficulty==='normal'?q.guesses<=1:(q.guesses>=1&&q.guesses<=2);if(ok)return {solution:sol,regions:g.reg,singleton:g.singleton,logicGuesses:q.guesses,difficulty:activeDifficulty}}throw new Error('Kein passendes Rätsel erzeugt') }
function regionSize(rg){return puzzle.regions.filter(x=>x===rg).length}
function updateLives(){document.getElementById('lives').textContent='❤️'.repeat(lives)+'🖤'.repeat(3-lives)}
function updateHelps(){document.getElementById('hintCount').textContent=hints;document.getElementById('revealCount').textContent=reveals;document.getElementById('hint').disabled=hints<=0;document.getElementById('reveal').disabled=reveals<=0}
function clearHint(){hintCells.clear();hintSourceCells.clear();let b=document.getElementById('hintbox');b.classList.remove('show');b.textContent=''}
function showHintMessage(msg){let b=document.getElementById('hintbox');b.textContent=msg;b.classList.add('show');requestAnimationFrame(()=>{let bb=document.getElementById('hintbox');bb.textContent=msg;bb.classList.add('show')})}
function resetSamePuzzle(message=''){state=Array(N*N).fill('');fixed.clear();history=[];for(let rg=0;rg<N;rg++)if(regionSize(rg)===1){let i=puzzle.regions.indexOf(rg);state[i]='animal';fixed.add(i)}lives=3;hints=3;reveals=1;clearHint();updateLives();updateHelps();started=Date.now();status.textContent=message;status.className='status';startTimer();render()}
function chooseN(){N=sizeMode==='random'?[5,6,7,8][Math.floor(Math.random()*4)]:Number(sizeMode);activeDifficulty=sizeMode==='random'?['relaxed','normal','tricky'][Math.floor(Math.random()*3)]:difficultyMode;document.querySelectorAll('.sizebtn').forEach(b=>b.classList.toggle('active',b.dataset.size===sizeMode));document.querySelectorAll('.diffbtn').forEach(b=>b.classList.toggle('active',b.dataset.diff===activeDifficulty))}
function startPuzzle(){chooseN();document.getElementById('creating').classList.add('show');status.textContent='';status.className='status';document.getElementById('sub').textContent='Erzeuge eindeutiges Rätsel lokal …';setTimeout(()=>{try{puzzle=generatePuzzle();}catch(e){status.textContent='Rätselgenerator versucht es erneut …';setTimeout(startPuzzle,50);return}state=Array(N*N).fill('');fixed.clear();history=[];lives=3;hints=3;reveals=1;clearHint();updateLives();updateHelps();for(let rg=0;rg<N;rg++)if(regionSize(rg)===1){let i=puzzle.regions.indexOf(rg);state[i]='animal';fixed.add(i)}started=Date.now();startTimer();render();document.getElementById('creating').classList.remove('show');document.getElementById('level').textContent='Rätsel '+levelNo+' · '+N+'×'+N;document.getElementById('sub').textContent='Eindeutig lösbar · '+({relaxed:'Entspannt',normal:'Normal',tricky:'Knifflig'}[activeDifficulty])+' · '+fixed.size+' sicherer Start'+(fixed.size===1?'':'s');localStorage.setItem('wildokuCurrent',JSON.stringify({puzzle,state:[...state],levelNo}));},30)}
function save(){localStorage.setItem('wildokuCurrent',JSON.stringify({puzzle,state,levelNo,lives,hints,reveals}))}
function snapshot(){history.push([...state]);if(history.length>100)history.shift()}
function render(){board.innerHTML='';board.style.gridTemplateColumns=`repeat(${N},minmax(0,1fr))`;board.style.gridTemplateRows=`repeat(${N},minmax(0,1fr))`;for(let i=0;i<N*N;i++){let [r,c]=RC(i),rg=puzzle.regions[i],d=document.createElement('div');d.className='cell r'+rg+(state[i]?' '+state[i]:'')+(fixed.has(i)?' fixed':'')+(hintCells.has(i)?' hint':'')+(hintSourceCells.has(i)?' hint-source':'');if(c===N-1)d.classList.add('last-col');else if(puzzle.regions[I(r,c+1)]!==rg)d.classList.add('region-right');if(r===N-1)d.classList.add('last-row');else if(puzzle.regions[I(r+1,c)]!==rg)d.classList.add('region-bottom');let m=document.createElement('span');m.className='mark';m.textContent=state[i]==='x'?'×':state[i]==='q'?'?':state[i]==='animal'?ANIMAL:state[i]==='bad'?'✕':'';d.appendChild(m);bind(d,r,c);board.appendChild(d)}lockBoardSquare();save()}
function setState(r,c,v){let i=I(r,c);if(fixed.has(i))return;clearHint();snapshot();state[i]=v;status.textContent='';render();checkWin()}
function single(r,c){let i=I(r,c);setState(r,c,state[i]==='x'?'':'x')}
function question(r,c){let i=I(r,c);setState(r,c,state[i]==='q'?'':'q')}
function animal(r,c){clearHint();let i=I(r,c);if(fixed.has(i)||state[i]==='bad')return;if(puzzle.solution[r]!==c){snapshot();state[i]='bad';lives--;updateLives();render();if(lives<=0){status.textContent='💔 Keine Leben mehr – dasselbe Rätsel startet neu …';setTimeout(()=>resetSamePuzzle('↻ Dasselbe Rätsel neu gestartet · 3 Leben'),900)}else{status.textContent='Falsch gesetzt · noch '+lives+' '+(lives===1?'Leben':'Leben');status.className='status'}return}setState(r,c,state[i]==='animal'?'':'animal')}
let lastTapCell=-1,lastTapAt=0;
function bind(el,r,c){let lt=null,long=false;el.addEventListener('pointerdown',()=>{long=false;clearTimeout(lt);lt=setTimeout(()=>{long=true;lastTapCell=-1;lastTapAt=0;question(r,c)},520)});el.addEventListener('pointerup',()=>clearTimeout(lt));for(let ev of ['pointercancel','pointerleave'])el.addEventListener(ev,()=>clearTimeout(lt));el.addEventListener('click',()=>{if(long){long=false;return}const i=I(r,c),now=Date.now();if(lastTapCell===i&&now-lastTapAt<=320){lastTapCell=-1;lastTapAt=0;animal(r,c)}else{lastTapCell=i;lastTapAt=now;single(r,c)}})}

function placedAnimals(){let a=[];for(let i=0;i<N*N;i++)if(state[i]==='animal')a.push(i);return a}
function directReason(i){let [r,c]=RC(i),animals=placedAnimals();for(let j of animals){let [rr,cc]=RC(j);if(rr===r)return 'In dieser Zeile steht bereits ein Tier.';if(cc===c)return 'In dieser Spalte steht bereits ein Tier.';if(Math.abs(rr-r)<=1&&Math.abs(cc-c)<=1)return 'Dieses Feld berührt ein bereits gesetztes Tier – auch diagonal ist das nicht erlaubt.'}return ''}
function possibleWithForced(forced){let regionCells=Array.from({length:N},()=>[]);for(let i=0;i<N*N;i++)regionCells[puzzle.regions[i]].push(i);let required=new Set(placedAnimals());if(forced>=0)required.add(forced);let req=[...required],rows=new Set(),cols=new Set(),regs=new Set();for(let i of req){let [r,c]=RC(i),rg=puzzle.regions[i];if(rows.has(r)||cols.has(c)||regs.has(rg))return false;for(let j of req){if(j===i)continue;let [rr,cc]=RC(j);if(Math.abs(rr-r)<=1&&Math.abs(cc-c)<=1)return false}rows.add(r);cols.add(c);regs.add(rg)}let order=[...Array(N).keys()].filter(rg=>!regs.has(rg)).sort((a,b)=>regionCells[a].length-regionCells[b].length);let placed=[...req];function bt(k){if(k===order.length)return true;let rg=order[k];for(let i of regionCells[rg]){if(state[i]==='bad')continue;let [r,c]=RC(i);if(rows.has(r)||cols.has(c))continue;if(placed.some(j=>{let [rr,cc]=RC(j);return Math.abs(rr-r)<=1&&Math.abs(cc-c)<=1}))continue;rows.add(r);cols.add(c);placed.push(i);if(bt(k+1))return true;placed.pop();rows.delete(r);cols.delete(c)}return false}return bt(0)}
function nextLogicalHint(){
 let animals=new Set(placedAnimals()),excluded=new Set();for(let i=0;i<N*N;i++)if(state[i]==='x'||state[i]==='bad')excluded.add(i);
 const regCells=Array.from({length:N},()=>[]);for(let i=0;i<N*N;i++)regCells[puzzle.regions[i]].push(i);
 const open=i=>!animals.has(i)&&!excluded.has(i)&&!directReason(i);
 const rowName=r=>'Zeile '+(r+1), colName=c=>'Spalte '+(c+1);
 const regionName=rg=>'die markierte Farbregion';
 // 1) Sichtbare Folgen eines bereits gesetzten Tiers.
 for(let a of animals){let [r,c]=RC(a),rg=puzzle.regions[a];let rules=[['Zeile',i=>RC(i)[0]===r,'In dieser Zeile steht bereits ein Tier.'],['Spalte',i=>RC(i)[1]===c,'In dieser Spalte steht bereits ein Tier.'],['Farbregion',i=>puzzle.regions[i]===rg,'In dieser Farbregion steht bereits ein Tier.'],['Nachbarschaft',i=>{let [rr,cc]=RC(i);return Math.abs(rr-r)<=1&&Math.abs(cc-c)<=1},'Diese Felder berühren ein bereits gesetztes Tier; auch diagonal ist das nicht erlaubt.']];for(let [kind,test,reason] of rules){let cells=[];for(let i=0;i<N*N;i++)if(!animals.has(i)&&!excluded.has(i)&&test(i))cells.push(i);if(cells.length)return {type:'exclude',cells,reason}}}
 // 2) Nur noch ein sichtbarer Kandidat in Region, Zeile oder Spalte.
 const groups=[];for(let rg=0;rg<N;rg++)groups.push(['Farbregion',regCells[rg]]);for(let r=0;r<N;r++)groups.push(['Zeile',[...Array(N)].map((_,c)=>I(r,c))]);for(let c=0;c<N;c++)groups.push(['Spalte',[...Array(N)].map((_,r)=>I(r,c))]);
 for(let [name,cells] of groups){if(cells.some(i=>animals.has(i)))continue;let cand=cells.filter(open);if(cand.length===1)return {type:'place',cells:cand,reason:'In dieser '+name+' ist nur noch dieses Feld als Tierplatz möglich. Da jede '+name+' genau ein Tier enthalten muss, gehört das Tier sicher hierhin.'}}
 // 3) Kandidaten einer Farbregion liegen alle in derselben Zeile/Spalte -> außerhalb ausschließen.
 for(let rg=0;rg<N;rg++){if(regCells[rg].some(i=>animals.has(i)))continue;let cand=regCells[rg].filter(open);if(cand.length<2)continue;let rows=[...new Set(cand.map(i=>RC(i)[0]))],cols=[...new Set(cand.map(i=>RC(i)[1]))];if(rows.length===1){let r=rows[0],cells=[];for(let c=0;c<N;c++){let i=I(r,c);if(puzzle.regions[i]!==rg&&open(i))cells.push(i)}if(cells.length)return {type:'exclude',cells,source:cand,reason:'Die blau markierten Felder sind die einzigen noch möglichen Plätze für das Tier in '+regionName(rg)+'. Alle liegen in '+rowName(r)+'. Damit steht sicher genau ein Tier dieser Region irgendwo in '+rowName(r)+'. Weil pro Zeile nur ein Tier erlaubt ist, können die orange markierten Felder derselben Zeile außerhalb dieser Region ausgeschlossen werden.'}}if(cols.length===1){let c=cols[0],cells=[];for(let r=0;r<N;r++){let i=I(r,c);if(puzzle.regions[i]!==rg&&open(i))cells.push(i)}if(cells.length)return {type:'exclude',cells,source:cand,reason:'Die blau markierten Felder sind die einzigen noch möglichen Plätze für das Tier in '+regionName(rg)+'. Alle liegen in '+colName(c)+'. Damit steht sicher genau ein Tier dieser Region irgendwo in '+colName(c)+'. Weil pro Spalte nur ein Tier erlaubt ist, können die orange markierten Felder derselben Spalte außerhalb dieser Region ausgeschlossen werden.'}}}
 // 4) Kein echter sichtbarer Logikfortschritt vorhanden. Kein Pseudo-Tipp mit bloßen Kandidaten.
 return {type:'stuck',cells:[],reason:'Im aktuellen sichtbaren Spielstand ist mit den bekannten direkten Logikregeln kein sicherer weiterer Schritt ableitbar.'};
}
function useHint(){
 if(hints<=0)return;clearHint();let box=document.getElementById('hintbox'),h=nextLogicalHint();
 if(!h){box.textContent='';box.classList.remove('show');return}
 for(let i of h.cells)hintCells.add(i);if(h.source)for(let i of h.source)hintSourceCells.add(i);
 if(h.type==='stuck'){
   // Kein sicherer Logikschritt: Der Tipp wird bewusst zur kleinen Glueckshilfe.
   // Er verbraucht einen normalen Tipp, aber NICHT den separaten "Tier zeigen"-Joker.
   let choices=[];for(let r=0;r<N;r++){let i=I(r,puzzle.solution[r]);if(state[i]!=='animal')choices.push(i)}
   if(!choices.length){box.textContent='';box.classList.remove('show');return}
   let i=choices[Math.floor(Math.random()*choices.length)];snapshot();state[i]='animal';fixed.add(i);hintCells.add(i);hints--;updateHelps();
   let [rr,cc]=RC(i);
   const msg='🍀 Jetzt ist ein bisschen Glück gefragt. Aus dem aktuellen sichtbaren Spielstand lässt sich kein sicherer nächster Schritt ableiten. Ich helfe dir netterweise weiter und setze ein Tier an die richtige Stelle: '+rowName(rr)+', '+colName(cc)+'. Dafür wird 1 Tipp verbraucht; dein „Tier zeigen“-Joker bleibt erhalten.';
   render();showHintMessage(msg);status.textContent='🍀 Glückshilfe: Ein richtiges Tier wurde gesetzt.';
   checkWin();return;
 }
 // Ein echter Tipp ist ein vollständiger sicherer Logikschritt: erklären und automatisch ausführen.
 snapshot();
 if(h.type==='exclude')for(let i of h.cells)if(state[i]===''||state[i]==='q')state[i]='x';
 if(h.type==='place'){let i=h.cells[0];state[i]='animal';fixed.add(i)}
 hints--;updateHelps();
 const msg='Tipp: '+h.reason+(h.type==='place'?' Das logisch sichere Tier wurde automatisch gesetzt.':' Die daraus sicher ausgeschlossenen Felder wurden automatisch mit × markiert.');
 render();showHintMessage(msg);checkWin();
}
function revealAnimal(){if(reveals<=0)return;clearHint();let choices=[];for(let r=0;r<N;r++){let i=I(r,puzzle.solution[r]);if(state[i]!=='animal')choices.push(i)}if(!choices.length)return;let i=choices[Math.floor(Math.random()*choices.length)];snapshot();state[i]='animal';fixed.add(i);reveals--;updateHelps();let [r,c]=RC(i);status.textContent='🦊 Ein richtiges Tier wurde für dich gesetzt.';render();checkWin()}

function confettiBomb(){const layer=document.createElement('div');layer.className='confetti';const colors=['#ff4d6d','#ffd166','#06d6a0','#118ab2','#8338ec','#fb8500'];for(let i=0;i<150;i++){const x=document.createElement('i'),angle=(-72+Math.random()*144)*Math.PI/180,power=170+Math.random()*260,dx=Math.sin(angle)*power,peak=-(240+Math.cos(angle)*power*.75+Math.random()*180);x.style.background=colors[i%colors.length];x.style.setProperty('--dur',(4.2+Math.random()*2.3)+'s');x.style.setProperty('--dx',dx+'px');x.style.setProperty('--dx2',(dx*1.35+(-70+Math.random()*140))+'px');x.style.setProperty('--peak',peak+'px');x.style.setProperty('--rot1',((-540+Math.random()*1080))+'deg');x.style.setProperty('--rot2',((-1080+Math.random()*2160))+'deg');x.style.animationDelay=(Math.random()*.28)+'s';layer.appendChild(x)}document.body.appendChild(layer);setTimeout(()=>layer.remove(),7000)}
function checkWin(){for(let r=0;r<N;r++)if(state[I(r,puzzle.solution[r])]!=='animal')return;status.textContent='🎉 Gelöst!';status.className='status win';clearInterval(timerInt);confettiBomb();localStorage.setItem('wildokuSolved',+(localStorage.getItem('wildokuSolved')||0)+1)}
function startTimer(){clearInterval(timerInt);timerInt=setInterval(()=>{let s=Math.floor((Date.now()-started)/1000);document.getElementById('timer').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},1000)}
document.getElementById('hint').onclick=useHint;document.getElementById('reveal').onclick=revealAnimal;
document.querySelectorAll('.sizebtn').forEach(b=>b.onclick=()=>{sizeMode=b.dataset.size;localStorage.setItem('wildokuSizeMode',sizeMode);levelNo++;localStorage.setItem('wildokuLevel',levelNo);startPuzzle()});
document.querySelectorAll('.diffbtn').forEach(b=>b.onclick=()=>{difficultyMode=b.dataset.diff;localStorage.setItem('wildokuDifficulty',difficultyMode);if(sizeMode==='random')sizeMode=String(N);levelNo++;localStorage.setItem('wildokuLevel',levelNo);startPuzzle()});
document.getElementById('infoBtn').onclick=()=>document.getElementById('infoModal').classList.add('show');document.getElementById('infoClose').onclick=()=>document.getElementById('infoModal').classList.remove('show');document.getElementById('infoModal').onclick=e=>{if(e.target.id==='infoModal')e.currentTarget.classList.remove('show')};
function applyRegionBorders(){board.classList.toggle('no-regions',!showRegionBorders);let b=document.getElementById('regionToggle');if(b){b.textContent=showRegionBorders?'Ein':'Aus';b.classList.toggle('off',!showRegionBorders)}}document.getElementById('regionToggle').onclick=()=>{showRegionBorders=!showRegionBorders;localStorage.setItem('wildokuRegionBorders',showRegionBorders?'1':'0');applyRegionBorders()};applyRegionBorders();
document.getElementById('undo').onclick=()=>{if(history.length){state=history.pop();render()}};document.getElementById('reset').onclick=()=>resetSamePuzzle('↻ Rätsel neu gestartet · 3 Leben');document.getElementById('new').onclick=()=>{levelNo++;localStorage.setItem('wildokuLevel',levelNo);startPuzzle()};
function net(){let n=document.getElementById('net');if(!networkAllowed){n.textContent='● App offline';n.className='badge offline';return}n.textContent=navigator.onLine?'● online':'● offline';n.className='badge '+(navigator.onLine?'online':'offline')}
function applyNetworkMode(){let b=document.getElementById('networkToggle'),t=document.getElementById('networkModeText');if(b){b.textContent=networkAllowed?'Online':'Offline';b.classList.toggle('off',!networkAllowed)}if(t)t.textContent=networkAllowed?'Wildoku darf für Updates ins Internet':'Wildoku nutzt keine Internetverbindung';net()}
document.getElementById('networkToggle').onclick=()=>{networkAllowed=!networkAllowed;localStorage.setItem('wildokuNetworkAllowed',networkAllowed?'1':'0');applyNetworkMode();if(networkAllowed&&navigator.onLine)explicitVersionCheckGlobal()};
addEventListener('online',net);addEventListener('offline',net);applyNetworkMode();
const APP_VERSION='0.5.9';
async function fetchServerVersion(){
  // Immer dieselbe Wildoku-Installation ansprechen, unabhängig davon,
  // ob die PWA über /wildoku/, /wildoku/index.html oder mit Query gestartet wurde.
  const base=new URL('./',location.href);
  const url=new URL('version.json',base);
  url.searchParams.set('_',Date.now().toString());
  const r=await fetch(url.href,{method:'GET',cache:'no-store',credentials:'same-origin',redirect:'follow'});
  if(!r.ok)throw new Error('HTTP '+r.status+' '+r.statusText);
  const text=(await r.text()).replace(/^\uFEFF/,'').trim();
  let v;
  try{v=JSON.parse(text)}catch(_){throw new Error('version.json ist kein gültiges JSON')}
  if(!v||typeof v.version!=='string'||!v.version.trim())throw new Error('Versionsnummer fehlt');
  return v.version.trim();
}
let pendingUpdateVersion='';
function offerUpdate(version){
  pendingUpdateVersion=version;
  const bar=document.getElementById('updatebar'),txt=document.getElementById('updatebarText');
  txt.textContent='Wildoku '+version+' ist verfügbar.';
  bar.classList.add('show');
}
async function installPendingUpdate(){
  const serverVersion=pendingUpdateVersion||await fetchServerVersion();
  const st=document.getElementById('updateStatus'),btn=document.getElementById('updatebtn');
  btn.disabled=true;btn.textContent='Aktualisiere …';
  if(st)st.textContent='Version '+serverVersion+' wird jetzt installiert …';
  try{
    const base=new URL('./',location.href);
    const probe=new URL('index.html',base);probe.searchParams.set('_update',Date.now().toString());
    const pr=await fetch(probe.href,{cache:'no-store',credentials:'same-origin',redirect:'follow'});
    if(!pr.ok)throw new Error('index.html HTTP '+pr.status);

    // Wichtig: Erst NACH ausdrücklicher Zustimmung wird die bestehende
    // Offline-Steuerung gelöst. Dadurch kann iOS keine neue Wildoku-Version
    // allein durch einen Service-Worker-Wechsel aktivieren.
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const reg of regs){
        try{
          const scopeUrl=new URL(reg.scope);
          if(scopeUrl.pathname.startsWith(base.pathname))await reg.unregister();
        }catch(_){await reg.unregister();}
      }
    }
    const fresh=new URL('index.html',base);
    fresh.searchParams.set('_update',Date.now().toString());
    location.replace(fresh.href);
  }catch(e){
    const msg=e&&e.message?e.message:String(e);if(st)st.textContent='Update fehlgeschlagen: '+msg;
    btn.disabled=false;btn.textContent='Jetzt aktualisieren';
  }
}
async function checkForUpdate(manual=false){
  const st=document.getElementById('updateStatus'),b=document.getElementById('checkUpdateBtn');
  if(!networkAllowed){if(manual)st.textContent='Wildoku ist auf App-Offline gestellt.';return}
  if(!navigator.onLine){if(manual)st.textContent='Keine Internetverbindung.';return}
  if(manual){b.disabled=true;b.textContent='Prüfe …';st.textContent='Suche nach Updates …';}
  try{
    const serverVersion=await fetchServerVersion();
    if(serverVersion===APP_VERSION){if(manual)st.textContent='Wildoku ist aktuell (Version '+APP_VERSION+').';}
    else {offerUpdate(serverVersion);if(manual)st.textContent='Version '+serverVersion+' ist verfügbar. Du entscheidest, wann sie installiert wird.';}
  }catch(e){if(manual)st.textContent='Updateprüfung fehlgeschlagen: '+(e&&e.message?e.message:String(e));}
  finally{if(manual){b.textContent='Suchen';b.disabled=false;}}
}
document.getElementById('checkUpdateBtn').onclick=()=>checkForUpdate(true);
document.getElementById('updatebtn').onclick=installPendingUpdate;
document.getElementById('updateLater').onclick=()=>{document.getElementById('updatebar').classList.remove('show');};
let explicitVersionCheckGlobal=()=>checkForUpdate(false);
if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;location.reload();});
  addEventListener('load',async()=>{
    try{await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});}catch(e){}
    await checkForUpdate(false);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate(false);});
    addEventListener('online',()=>checkForUpdate(false));
  });
}else{
  addEventListener('load',()=>checkForUpdate(false));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate(false);});
}
document.querySelectorAll('.sizebtn').forEach(b=>b.classList.toggle('active',b.dataset.size===sizeMode));document.querySelectorAll('.diffbtn').forEach(b=>b.classList.toggle('active',b.dataset.diff===difficultyMode));
startPuzzle();
