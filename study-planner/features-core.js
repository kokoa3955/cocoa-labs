(()=>{'use strict';
const C=window.studylogBridge,KEY='studylog-extras-v2',DB='studylog-backups-v2';
const defaults=()=>({version:2,notes:{},overrides:{},rewardMin:240,rewardText:'ゲーム・自由時間',timer:{running:false,start:0,elapsed:0,subject:'物理',note:'',date:''},lastBackup:''});
let s=defaults();try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.version===2)s=Object.assign(defaults(),v)}catch(e){}
s.notes=s.notes||{};s.overrides=s.overrides||{};s.timer=Object.assign(defaults().timer,s.timer||{});
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>iso(new Date());
const fmt=n=>{n=Math.max(0,Math.round(n));return Math.floor(n/60)+'時間'+(n%60?n%60+'分':'')};
const total=()=>C.getState().logs.reduce((a,r)=>a+r.minutes,0);
const inDay=d=>C.getState().logs.reduce((a,r)=>a+(r.date===d?r.minutes:0),0);
const inSubject=n=>C.getState().logs.reduce((a,r)=>a+(r.subject===n?r.minutes:0),0);
const standard=d=>{const w=new Date(d+'T12:00:00').getDay();return w===0||w===6||['2026-11-03','2026-11-23'].includes(d)?480:240};
const dayGoal=d=>Object.prototype.hasOwnProperty.call(s.overrides,d)?s.overrides[d]:standard(d);
window.studylogDayGoal=dayGoal;
const future=()=>C.DATES.filter(d=>d>=today());
const forecast=()=>{const days=future(),left=Math.max(0,C.getState().total-total()),weight=days.reduce((a,d)=>a+Math.max(1,dayGoal(d)),0);return {days,left,mean:days.length?Math.ceil(left/days.length/5)*5:0,ratio:weight?left/weight:0}};
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let backupTimer=null,dbInstance=null;
const snapshot=()=>({version:2,savedAt:new Date().toISOString(),core:C.getState(),features:s});
function persist(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){C.toast('データ保存に失敗しました')}backupSoon();window.studylogRefresh?.()}
function backupSoon(){clearTimeout(backupTimer);backupTimer=setTimeout(autoBackup,1200)}
async function openDB(){if(dbInstance)return dbInstance;dbInstance=await new Promise((ok,no)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore('snapshots');req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error)});return dbInstance}
async function autoBackup(){try{const db=await openDB(),b=snapshot(),tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(b,'latest');s.lastBackup=b.savedAt;localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
async function restoreBackup(){try{const db=await openDB();const b=await new Promise((ok,no)=>{const q=db.transaction('snapshots').objectStore('snapshots').get('latest');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});if(!b){C.toast('バックアップが見つかりません');return}if(!confirm('端末内バックアップで現在の記録を置き換えますか？'))return;restore(b.features);C.setState(b.core);C.toast('バックアップを復元しました')}catch(e){C.toast('復元に失敗しました')}}
function restore(v){if(!v||typeof v!=='object')return;s=Object.assign(defaults(),v,{version:2});s.timer=Object.assign(defaults().timer,s.timer||{});s.notes=s.notes||{};s.overrides=s.overrides||{};persist()}
function reset(){s=defaults();persist()}
const clockMs=()=>Math.max(0,s.timer.elapsed+(s.timer.running?Date.now()-s.timer.start:0));
function timerStart(subject,note){const t=s.timer;if(t.running)return;if(!t.elapsed){t.subject=subject;t.note=note;t.date=today()}t.start=Date.now();t.running=true;persist()}
function timerPause(){const t=s.timer;if(!t.running)return;t.elapsed=clockMs();t.running=false;t.start=0;persist()}
function timerReset(){s.timer=defaults().timer;persist()}
function timerFinish(){const t=s.timer,m=Math.round(clockMs()/60000);if(m<1||m>1440){C.toast('1分〜24時間で記録してください');return}if(!C.DATES.includes(t.date)){C.toast('テスト期間外のため手動で記録してください');return}const id=C.addLog(t.date,t.subject,m);if(!id)return;if(t.note)s.notes[id]=t.note;s.timer=defaults().timer;persist();C.toast(fmt(m)+'を記録しました')}
function streak(){let longest=0,run=0;for(const d of C.DATES){if(dayGoal(d)>0&&inDay(d)>=dayGoal(d)){run++;longest=Math.max(longest,run)}else run=0}return longest}
