(()=>{'use strict';const X=window.studyExtras;if(!X)return;const C=X.C, el=id=>document.getElementById(id);
const opts=(value='物理')=>C.SUBJECTS.map(s=>'<option '+(s===value?'selected ':'')+'value="'+X.html(s)+'">'+X.html(s==='予備'?'その他・予備':s)+'</option>').join('');
const but=(id,text,cls='secondary')=>'<button type="button" id="'+id+'" class="'+cls+'">'+text+'</button>';
const field=(id,label,type='text',value='')=>'<label class="extra-field"><span>'+label+'</span><input id="'+id+'" type="'+type+'" value="'+X.html(value)+'"></label>';
const tabs=document.querySelector('nav.tabs');tabs.insertAdjacentHTML('beforeend','<button class="tab" data-extra="analysis">分析</button><button class="tab" data-extra="achievements">実績・ご褒美</button>');
const rec=el('record-form');rec.querySelector('button[type=submit]').insertAdjacentHTML('beforebegin','<label class="extra-field"><span>勉強メモ（任意）</span><textarea id="extra-input-note" maxlength="500" placeholder="苦手だった内容や復習すること"></textarea></label>');
rec.insertAdjacentHTML('afterend','<div class="extra-btn-row"><button class="extra-button-minor" data-extraquick="15" type="button">＋15分</button><button class="extra-button-minor" data-extraquick="30" type="button">＋30分</button><button class="extra-button-minor" data-extraquick="60" type="button">＋60分</button></div>');
el('today-panel').insertAdjacentHTML('beforeend','<div class="extra-note" id="extra-today-forecast" style="margin-top:12px"></div>');
