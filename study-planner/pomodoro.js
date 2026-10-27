(()=>{
'use strict';
const C=window.studylogBridge, X=window.studyExtras, $=id=>document.getElementById(id);
if(!C||!X||!$('pom-work')) return;
const KEY='studylog-pomodoro-v1';
const initial=()=>({version:1,work:50,rest:10,loops:4,infinite:false,auto:true,sound:true,subject:'物理',note:'',phase:'focus',completed:0,running:false,endAt:0,remainingMs:3000000,phaseDate:'',savedMinutes:0,started:false});
let s=initial(),wasBackgrounded=false,soundContext=null;
const dateNow=()=>X.today();
const limits=(v,min,max,def)=>Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):def;
function loadData(obj){
 const base=initial();
 if(!obj||obj.version!==1)return base;
 const work=limits(obj.work,1,180,50),rest=limits(obj.rest,1,60,10),loops=limits(obj.loops,1,20,4);
 const phase=['focus','break','done'].includes(obj.phase)?obj.phase:'focus';
 const duration=(phase==='break'?rest:work)*60000;
 return {...base,work,rest,loops,infinite:!!obj.infinite,auto:obj.auto!==false,sound:obj.sound!==false,
 subject:C.SUBJECTS.includes(obj.subject)?obj.subject:'物理',note:typeof obj.note==='string'?obj.note.slice(0,500):'',phase,
 completed:limits(obj.completed,0,100000,0),running:Boolean(obj.running),endAt:Number(obj.endAt)||0,
 remainingMs:Math.max(0,Math.min(duration,Number(obj.remainingMs)||duration)),
 phaseDate:C.DATES.includes(obj.phaseDate)?obj.phaseDate:'',savedMinutes:Math.max(0,Number(obj.savedMinutes)||0),
 started:!!obj.started};
}
try{s=loadData(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){C.toast('タイマーの保存に失敗しました')}X.backupSoon()}
function phaseDuration(){return (s.phase==='break'?s.rest:s.work)*60000}
function remain(){return s.running?Math.max(0,s.endAt-Date.now()):s.remainingMs}
function elapsed(){return Math.max(0,phaseDuration()-remain())}
function remainingDisplay(ms){const total=Math.ceil(Math.max(0,ms)/1000),mm=Math.floor(total/60),ss=total%60;return String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0')}
function requestSoundUnlock(){if(!s.sound)return;try{const T=window.AudioContext||window.webkitAudioContext;if(T){soundContext=soundContext||new T();if(soundContext.state==='suspended')soundContext.resume().catch(()=>{})}}catch(e){}}
function beep(){if(!s.sound)return;try{requestSoundUnlock();if(!soundContext||soundContext.state!=='running')return;const now=soundContext.currentTime;for(let i=0;i<2;i++){const osc=soundContext.createOscillator(),gain=soundContext.createGain();osc.type='sine';osc.frequency.value=i===0?660:880;gain.gain.setValueAtTime(.0001,now+i*.27);gain.gain.exponentialRampToValueAtTime(.12,now+i*.27+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.27+.2);osc.connect(gain);gain.connect(soundContext.destination);osc.start(now+i*.27);osc.stop(now+i*.27+.22)}}catch(e){}}
function notify(title,body){beep();try{if('Notification' in window&&Notification.permission==='granted')new Notification(title,{body,tag:'studylog-pomodoro'})}catch(e){}}
function setSavedMinutes(n){s.savedMinutes+=n}
function addStudy(minutes){
 if(minutes<1)return;
 let chosen=s.phaseDate||dateNow();
 if(!C.DATES.includes(chosen)){C.toast('テスト期間外なので記録に加算できません');return}
 const id=C.addLog(chosen,s.subject,minutes);
 if(id&&s.note){X.s.notes[id]=s.note;X.persist()}
}
function finishFocus(complete,hidden){
 // The finished focus period is recorded exactly once before starting the next phase.
 const studied=complete?s.work:Math.min(s.work,Math.floor(elapsed()/60000));
 s.completed+=1;
 setSavedMinutes(studied);
 const ended=s.phaseDate;
 const isLast=!s.infinite&&s.completed>=s.loops;
 s.phase=isLast?'done':'break';s.remainingMs=isLast?0:s.rest*60000;
 s.endAt=0;s.running=false;
 s.phaseDate='';persist();
 addStudy(studied);
 if(isLast){notify('ポモドーロ完了','設定した勉強回数が終了しました。');C.toast('ポモドーロ完了！');render();return}
 notify('勉強終了','休憩を始めましょう');
 if(s.auto&&!hidden){s.running=true;s.endAt=Date.now()+s.remainingMs}
 render();persist();
}
function finishRest(hidden){
 s.phase='focus';s.remainingMs=s.work*60000;s.endAt=0;s.phaseDate=dateNow();s.running=false;
 notify('休憩終了','次の勉強を始めましょう');
 if(s.auto&&!hidden){s.running=true;s.endAt=Date.now()+s.remainingMs}
 persist();render();
}
function tick(){
 if(!s.running)return render();
 const now=Date.now();
 if(s.endAt>now){render();return}
 // If the app was suspended, only close one phase, and leave the next phase paused.
 const hidden=wasBackgrounded||document.hidden;
 wasBackgrounded=false;
 if(s.phase==='focus')finishFocus(true,hidden);
 else if(s.phase==='break')finishRest(hidden);
 else{s.running=false;persist();render()}
}
function begin(){
 if(s.phase==='done'){s.phase='focus';s.completed=0;s.remainingMs=s.work*60000;s.started=false;s.savedMinutes=0}
 if(s.running)return;
 if(s.phase==='focus'&&!s.phaseDate)s.phaseDate=dateNow();
 if(!s.started)s.started=true;
 s.running=true;s.endAt=Date.now()+s.remainingMs;
 requestSoundUnlock();persist();render();
}
function pause(){
 if(!s.running)return;
 if(s.endAt<=Date.now()){tick();return}
 s.remainingMs=remain();s.running=false;s.endAt=0;persist();render();
}
function endSession(){
 if(s.running&&s.endAt<=Date.now()){tick();return}
 if(s.phase==='done'){reset();return}
 const studied=s.phase==='focus'?Math.floor(elapsed()/60000):0;
 if(studied>=1){s.savedMinutes+=studied;addStudy(studied)}
 s.phase='done';s.running=false;s.endAt=0;s.remainingMs=0;
 persist();render();C.toast(studied>=1?studied+'分を記録して終了しました':'セッションを終了しました');
}
function skip(){
 if(s.phase==='done'){C.toast('開始してから操作してください');return}
 if(s.phase==='focus'){
   // Skipped time is not counted: only full minutes actually elapsed are saved.
   if(s.running&&s.endAt<=Date.now()){tick();return}
   finishFocus(false,true);
 }else{
   finishRest(true);
 }
}
function reset(){
 if(s.started&&(s.running||s.phase!=='done')&&!confirm('現在の区間を破棄して最初から始めますか？\n記録済みの勉強時間は消えません。'))return;
 const config={work:s.work,rest:s.rest,loops:s.loops,infinite:s.infinite,auto:s.auto,sound:s.sound,subject:s.subject,note:s.note};
 s={...initial(),...config,remainingMs:s.work*60000};persist();render();
}
function fullReset(){s=initial();persist();render()}
function render(){
 const clock=$('pom-clock');if(!clock)return;
 const state=s.phase==='focus'?'勉強':s.phase==='break'?'休憩':'終了';
 const remaining=s.phase==='done'?0:remain();
 const total=s.phase==='done'?1:phaseDuration();
 clock.textContent=remainingDisplay(remaining);
 $('pom-phase').textContent=state+(s.phase==='done'?'':s.running?'中':'（停止中）');
 const round=s.phase==='done'?s.completed:s.completed+1;
 $('pom-round').textContent=s.infinite?'第'+round+'セット（無制限）':Math.min(round,s.loops)+' / '+s.loops+' セット';
 $('pom-bar').style.width=(s.phase==='done'?0:Math.max(0,Math.min(100,remaining/total*100)))+'%';
 $('pom-ring').style.background='conic-gradient('+(s.phase==='break'?'#16a38d':'#536be8')+' '+(s.phase==='done'?100:Math.round((1-remaining/total)*100))+'%,#e5eafa 0%)';
 $('pom-saved').textContent=X.fmt(s.savedMinutes);
 $('pom-start').disabled=s.running;
 $('pom-start').textContent=s.phase==='done'?'最初から開始':s.started&&!s.running?'▶ 再開':'▶ 開始';
 $('pom-pause').disabled=!s.running;
 $('pom-stop').disabled=!s.started||s.phase==='done';
 $('pom-skip').disabled=!s.started||s.phase==='done';
 $('pom-reset').disabled=!s.started;
 ['pom-work','pom-rest','pom-loops','pom-infinite'].forEach(id=>$(id).disabled=s.started&&s.phase!=='done');
 $('pom-loops').disabled=$('pom-loops').disabled||s.infinite;
 $('pom-note').disabled=s.started&&s.phase!=='done';
 $('pom-subject').disabled=s.started&&s.phase!=='done';
 $('pom-auto').checked=s.auto;$('pom-sound').checked=s.sound;
 $('pom-infinite').checked=s.infinite;
 $('pom-note').value=document.activeElement===$('pom-note')?$('pom-note').value:s.note;
 $('pom-work').value=String(s.work);$('pom-rest').value=String(s.rest);$('pom-loops').value=String(s.loops);
 if($('pom-subject').value!==s.subject)$('pom-subject').value=s.subject;
 $('pom-alert').textContent=('Notification' in window)&&Notification.permission==='granted'?'通知：許可済み':'通知を許可';
}
function saveSettings(){
 if(s.started&&s.phase!=='done')return;
 const work=limits($('pom-work').value,1,180,NaN),rest=limits($('pom-rest').value,1,60,NaN),loops=limits($('pom-loops').value,1,20,NaN);
 if(!Number.isFinite(work)||!Number.isFinite(rest)||(!s.infinite&&!Number.isFinite(loops))){C.toast('時間と回数の範囲を確認してください');render();return}
 s.work=work;s.rest=rest;s.loops=Number.isFinite(loops)?loops:s.loops;
 s.phase='focus';s.remainingMs=s.work*60000;s.completed=0;s.started=false;s.endAt=0;s.running=false;s.savedMinutes=0;
 s.subject=$('pom-subject').value;s.note=$('pom-note').value.slice(0,500);
 persist();render();
}
function setBoolean(which,value){
 s[which]=value;
 if(which==='infinite'){$('pom-loops').disabled=value||(s.started&&s.phase!=='done')}
 persist();render()
}
async function permission(){
 if(!('Notification' in window)){C.toast('このSafariでは通知に対応していません');return}
 if(Notification.permission==='granted'){C.toast('通知は許可済みです');return}
 try{const status=await Notification.requestPermission();C.toast(status==='granted'?'通知を許可しました':'通知が許可されませんでした')}catch(e){C.toast('iPhoneではホーム画面に追加したサイトで通知を許可してください')}
 render();
}
function snapshot(){return JSON.parse(JSON.stringify(s))}
function restore(obj){
 s=loadData(obj);
 // A restored timer cannot safely claim study time from the time that it was not open.
 if(s.running){s.remainingMs=Math.max(0,s.endAt-Date.now());s.running=false;s.endAt=0}
 persist();render();
}
window.studyPomodoro={snapshot,restore,reset:fullReset,tick,render};
$('pom-subject').innerHTML=C.SUBJECTS.filter(n=>n!=='予備').map(n=>'<option value="'+X.html(n)+'">'+X.html(n)+'</option>').join('');
$('pom-subject').value=s.subject;
$('pom-note').value=s.note;
$('pom-work').value=s.work;$('pom-rest').value=s.rest;$('pom-loops').value=s.loops;
$('pom-infinite').checked=s.infinite;$('pom-auto').checked=s.auto;$('pom-sound').checked=s.sound;
$('pom-start').addEventListener('click',begin);
$('pom-pause').addEventListener('click',pause);
$('pom-stop').addEventListener('click',endSession);
$('pom-skip').addEventListener('click',skip);
$('pom-reset').addEventListener('click',reset);
$('pom-alert').addEventListener('click',permission);
['pom-work','pom-rest','pom-loops'].forEach(id=>$(id).addEventListener('change',saveSettings));
$('pom-subject').addEventListener('change',saveSettings);
$('pom-note').addEventListener('change',saveSettings);
['pom-infinite','pom-auto','pom-sound'].forEach(id=>$(id).addEventListener('change',e=>setBoolean(id.slice(4),e.target.checked)));
setInterval(tick,1000);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){wasBackgrounded=true;persist()}
 else tick();
});
window.addEventListener('pageshow',tick);
window.addEventListener('pagehide',()=>{wasBackgrounded=true;persist()});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{s=loadData(JSON.parse(e.newValue));render()}catch(e){}}});
render();
})();