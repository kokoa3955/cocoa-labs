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
