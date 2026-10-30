import { ROLES, MARKET } from './data.js';

export const TEAM_NAMES = {city:'🟦 Вільні мешканці Найт-Сіті',syn:'🟥 Корпорація Арасака',glitch:'🟪 Кіберпсихи'};
export const MAX_ROUNDS = 8;
const ONE_USE = new Set(['install','leak','forge','stun','pierce','bounty','raid','overload','blackout','soulkill']);
const SELFLESS = new Set(['hide','pierce','blackout']);
const PSYCHO = new Set(['rampage','ghoststrike']);
const SELF_OK = new Set(['heal','install','cloak','forge','heat','leak','suppress','memory']);
const CITY_ROLES = Object.keys(ROLES).filter(k=>ROLES[k].team==='city');
const SYN_ROLES = Object.keys(ROLES).filter(k=>ROLES[k].team==='syn');
const PSY_ROLES = ['glitch','phantom'];
export const NAMES = {hide:'Залягти на дно',scan:'Нейросканування',heal:'Лікувати',jam:'Заглушити',watch:'Відстежити відвідувачів',compare:'Порівняти',install:'Встановити броню',leak:'Репортаж',follow:'Стежити дроном',heat:'Зчитати цифровий слід',cloak:'Приховати',cover:'Прикрити',suppress:'MaxTac: затримати',bounty:'Оголосити контракт',raid:'Рейд Militech',memory:'Брейнданс-перевірка',overload:'Перевантажити',forge:'Підставити',stun:'Black ICE',pierce:'Пробити захист',intercept:'Зняти роль',blackout:'Вимкнути камери',soulkill:'Soulkiller',rampage:'Напад кіберпсиха',ghoststrike:'Тіньовий напад'};
export const uid = v => String(v);
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const count = arr => Object.fromEntries([...new Set(arr)].map(k=>[k,arr.filter(a=>a===k).length]));
const gvals = o => Object.values(o || {});
const clamp = (v,low,high) => Math.min(high,Math.max(low,v));
export const alive = (g,team=null) => gvals(g.players).filter(p=>p.alive&&(!team||p.team===team));
export const newGame = (chatId,host,title) => ({chat_id:uid(chatId),host_id:uid(host),title,players:{},phase:'lobby',round_no:0,revision:0,deadline:0,actions:{},syndicate_votes:{},market_orders:{},exile_votes:{},glitch_winners:[],pending_bounties:[],winner:'',scored:false,history:[],last_report:''});
export function join(g,id,name){
 if(g.phase!=='lobby') throw Error('Матч уже почався.');
 id=uid(id); if(!g.players[id]&&gvals(g.players).length>=16) throw Error('У лобі вже 16 гравців.');
 if(g.players[id]) {g.players[id].name=String(name).slice(0,45);return;}
 g.players[id]={uid:id,name:String(name).slice(0,45),role:'',team:'',alive:true,ready:true,heat:0,armor:0,credits:2,passive_used:false,power_used:false,last_heal:'',last_cover:'',intel:[],psychosis:0,psycho_kills:0};
}
export function start(g){
 if(g.phase!=='lobby')throw Error('Гра вже почалася.');
 const n=gvals(g.players).length;
 if(n<6||n>16)throw Error(`Для старту потрібно 6–16 людей, зараз ${n}.`);
 const syn=n<=7?1:n<=10?2:n<=13?3:4,psy=n<10?0:n>=15?2:1,city=n-syn-psy;
 const roles=shuffle(['scanner','medic',...shuffle(CITY_ROLES.filter(k=>!['scanner','medic'].includes(k))).slice(0,city-2),'architect',...shuffle(SYN_ROLES.filter(k=>k!=='architect')).slice(0,syn-1),...shuffle(PSY_ROLES).slice(0,psy)]);
 for(const [i,p] of gvals(g.players).entries()){
  p.role=roles[i];p.team=ROLES[p.role].team;p.alive=true;p.heat=0;p.armor=0;p.credits=2;p.power_used=false;p.passive_used=false;p.psychosis=p.team==='glitch'?1:0;p.psycho_kills=0;p.last_heal='';p.last_cover='';p.intel=[];
 }
 Object.assign(g,{phase:'night',round_no:1,revision:g.revision+1,actions:{},syndicate_votes:{},market_orders:{},exile_votes:{},glitch_winners:[],pending_bounties:[],winner:'',scored:false,history:['🌑 Розпочалася ніч 1.']});
}
function player(g,id){ const p=g.players[uid(id)]; if(!p)throw Error('Ти не є учасником цього матчу.');return p; }
export function submitAction(g,id,kind,target='',other=''){
 id=uid(id);target=uid(target);other=uid(other);const p=player(g,id);
 if(g.phase!=='night'||!p.alive)throw Error('Зараз не ніч або ти вибув.');
 if(kind!=='hide'&&kind!==ROLES[p.role].action)throw Error('Ця дія не належить твоїй ролі.');
 if(ONE_USE.has(kind)&&p.power_used)throw Error('Одноразову здібність уже використано.');
 if(PSYCHO.has(kind)&&p.psychosis<2)throw Error(`Не вистачає психозу: ${p.psychosis}/3, потрібно 2.`);
 if(!SELFLESS.has(kind)){
  if(!g.players[target]||!g.players[target].alive)throw Error('Потрібно вибрати живу ціль.');
  if(target===id&&!SELF_OK.has(kind))throw Error('Не можна вибрати себе.');
 }
 if(kind==='compare'&&(!g.players[other]||!g.players[other].alive||other===target||other===id||target===id))throw Error('Потрібно вибрати двох інших різних гравців.');
 if(kind==='heal'&&target===p.last_heal)throw Error('Цю ж людину дві ночі поспіль лікувати не можна.');
 if(kind==='cover'&&target===p.last_cover)throw Error('Цю ж людину дві ночі поспіль прикривати не можна.');
 if(kind==='stun'&&g.players[target].team==='syn')throw Error('Союзника Арасаки блокувати не можна.');
 if(PSYCHO.has(kind)&&g.players[target].team==='glitch')throw Error('Кіберпсихи не атакують інших кіберпсихів.');
 g.actions[id]={kind,target,other};
}
export function submitKill(g,id,target){
 id=uid(id);target=uid(target);const p=player(g,id);
 if(g.phase!=='night'||!p.alive||p.team!=='syn')throw Error('Нічну жертву обирає лише Арасака.');
 if(!g.players[target]||!g.players[target].alive||g.players[target].team==='syn')throw Error('Можна обрати лише живу ціль поза Арасакою.');
 g.syndicate_votes[id]=target;
}
export function submitVote(g,id,target){
 id=uid(id);target=uid(target);const p=player(g,id);
 if(g.phase!=='vote'||!p.alive)throw Error('Голосувати можна лише живим під час суду.');
 if(target!=='0'&&(!g.players[target]||!g.players[target].alive))throw Error('Невідома ціль голосування.');
 g.exile_votes[id]=target;
}
export function buy(g,id,item,target=''){
 id=uid(id);target=uid(target);const p=player(g,id);
 if(g.phase!=='night'||!p.alive)throw Error('Ринок доступний лише живим уночі.');
 if(!MARKET[item])throw Error('Невідомий імплант.');
 if(['tag','emp','kiroshi'].includes(item)&&(!g.players[target]||!g.players[target].alive||target===id))throw Error('Цей предмет застосовується до іншого живого гравця.');
 if(item==='plate'&&p.armor)throw Error('Броня вже встановлена.');
 const old=g.market_orders[id],available=p.credits+(old?MARKET[old.item].price:0),price=MARKET[item].price;
 if(available<price)throw Error(`Недостатньо кредитів: потрібно ${price}, є ${available}.`);
 p.credits=available-price;g.market_orders[id]={item,target};
}
export const effectiveTeam=p=>['architect','glitch','phantom'].includes(p.role)?'city':p.team;
function checkWin(g,timeout=false){
 const c=alive(g,'city').length,s=alive(g,'syn').length;
 if(s===0){g.winner='city';g.phase='finished';g.deadline=0;}
 else if(c===0||s>=c||timeout){g.winner='syn';g.phase='finished';g.deadline=0;}
}
function nightKill(g){
 const crew=alive(g,'syn'),candidates=alive(g).filter(p=>p.team!=='syn').map(p=>p.uid);
 if(!crew.length||!candidates.length)return {victim:'',attacker:''};
 const ballots=Object.fromEntries(crew.filter(p=>candidates.includes(g.syndicate_votes[p.uid])).map(p=>[p.uid,g.syndicate_votes[p.uid]]));
 if(!Object.keys(ballots).length)return {victim:pick(candidates),attacker:pick(crew).uid};
 const cnt=count(Object.values(ballots)),max=Math.max(...Object.values(cnt)),tied=Object.keys(cnt).filter(t=>cnt[t]===max);
 const boss=crew.find(p=>p.role==='architect');const victim=boss&&tied.includes(ballots[boss.uid])?ballots[boss.uid]:pick(tied);
 const possible=Object.keys(ballots).filter(k=>ballots[k]===victim);
 return {victim,attacker:pick(possible.length?possible:crew.map(p=>p.uid))};
}
export function resolveNight(g){
 if(g.phase!=='night')throw Error('Зараз не ніч.');
 const living=alive(g),before=new Set(living.map(p=>p.uid)),oldIntel=Object.fromEntries(gvals(g.players).map(p=>[p.uid,p.intel.length]));
 const selections=Object.fromEntries(living.map(p=>[p.uid,g.actions[p.uid]||{kind:'hide',target:'',other:''}]));
 const disabled=new Set(Object.values(selections).filter(a=>['jam','stun'].includes(a.kind)).map(a=>a.target));
 for(const [id,o] of Object.entries(g.market_orders))if(before.has(id)&&o.item==='emp')disabled.add(o.target);
 for(const [id,a] of Object.entries(selections))if(a.kind==='suppress'&&!disabled.has(id)&&g.players[a.target].team==='glitch')disabled.add(a.target);
 const actions=Object.fromEntries(Object.entries(selections).filter(([id,a])=>!disabled.has(id)||['jam','stun'].includes(a.kind)));
 const blackout=Object.values(actions).some(a=>a.kind==='blackout');
 const visits={};const addVisit=(t,who)=>{if(!t)return;(visits[t] ||= []).push(who);};
 for(const [id,a] of Object.entries(actions))if(!SELFLESS.has(a.kind)){addVisit(a.target,id);if(a.kind==='compare')addVisit(a.other,id);}
 for(const p of living){
  const a=actions[p.uid];if(p.team==='glitch'){p.psychosis= a&&PSYCHO.has(a.kind)?Math.max(0,p.psychosis-2):Math.min(3,p.psychosis+1);}
  p.heat=a&&a.kind!=='hide'?clamp(p.heat+1,0,4):clamp(p.heat-2,0,4);
 }
 for(const [id,a] of Object.entries(actions)){
  if(ONE_USE.has(a.kind))g.players[id].power_used=true;
  if(a.kind==='heal')g.players[id].last_heal=a.target;
  if(a.kind==='cover')g.players[id].last_cover=a.target;
 }
 const cloaked=new Set(),evading=new Set(),kiroshi=[];
 for(const [id,o] of Object.entries(g.market_orders)){
  if(!before.has(id))continue;
  const p=g.players[id];p.heat=clamp(p.heat+1,0,4);
  switch(o.item){
   case 'smoke':cloaked.add(id);break;
   case 'plate':p.armor=1;break;
   case 'tag':g.players[o.target].heat=clamp(g.players[o.target].heat+2,0,4);addVisit(o.target,id);break;
   case 'emp':addVisit(o.target,id);break;
   case 'sandi':evading.add(id);break;
   case 'kiroshi':kiroshi.push([id,o.target]);addVisit(o.target,id);break;
  }
 }
 const protectedIds=new Set(),guards={};let fake='',pierce=false;const publics=[];g.pending_bounties=[];
 for(const [id,a] of Object.entries(actions)){
  const t=a.target,p=g.players[id];switch(a.kind){
   case 'heal':protectedIds.add(t);break;
   case 'cover':guards[t]=id;break;
   case 'install':g.players[t].armor=1;p.intel.push('🦾 Броню встановлено: '+g.players[t].name);break;
   case 'cloak':cloaked.add(t);break;
   case 'forge':fake=t;break;
   case 'bounty':g.pending_bounties.push(t);break;
   case 'overload':g.players[t].armor=0;g.players[t].heat=4;break;
   case 'pierce':pierce=true;break;
   case 'raid':if(g.players[t].team!=='syn'){p.heat=4;p.intel.push('🎯 Рейд Militech провалився. Твій слід викрито!');}break;
  }
 }
 for(const id of cloaked)g.players[id].heat=clamp(g.players[id].heat-2,0,4);
 const attack=(id,{unstoppable=false,ignoreArmor=false}={})=>{
  const p=g.players[id];if(!p||!p.alive)return {dead:'',blocked:false};
  if(!unstoppable&&(evading.has(id)||protectedIds.has(id)))return {dead:'',blocked:true};
  if(!unstoppable&&!ignoreArmor&&p.armor){p.armor--;return {dead:'',blocked:true};}
  if(!unstoppable&&!ignoreArmor&&p.role==='samurai'&&!p.passive_used){p.passive_used=true;return {dead:'',blocked:true};}
  if(!unstoppable&&guards[id]&&g.players[guards[id]]?.alive)return {dead:guards[id],blocked:false};
  return {dead:id,blocked:false};
 };
 const {victim,attacker}=nightKill(g);
 if(attacker){addVisit(victim,attacker);g.players[attacker].heat=clamp(g.players[attacker].heat+2,0,4);}
 const dead=new Set();let blocked=false;
 if(victim){const out=attack(victim,{unstoppable:pierce});if(out.dead)dead.add(out.dead);blocked=out.blocked;}
 const psychoLoss=[];
 for(const [id,a] of Object.entries(actions)){
  if(a.kind==='raid'&&g.players[a.target].team==='syn')dead.add(a.target);
  if(PSYCHO.has(a.kind)){
   const out=attack(a.target,{ignoreArmor:a.kind==='rampage'});
   if(out.dead){dead.add(out.dead);psychoLoss.push([id,out.dead]);}
   if(a.kind==='rampage')g.players[id].heat=clamp(g.players[id].heat+2,0,4);
   else {cloaked.add(id);g.players[id].heat=clamp(g.players[id].heat-2,0,4);}
  }
 }
 for(const id of dead)g.players[id].alive=false;
 const newlyWon=[];
 for(const [id,t] of psychoLoss){if(dead.has(t)&&t!==id&&g.players[t].team!=='glitch'){
  const p=g.players[id];p.psycho_kills++;if(p.psycho_kills>=2&&!g.glitch_winners.includes(id)){g.glitch_winners.push(id);newlyWon.push(id);}
 }}
 const filtered=Object.fromEntries(Object.entries(visits).map(([t,ids])=>[t,ids.filter(id=>!cloaked.has(id))]));
 const outgoing={};for(const [target,ids] of Object.entries(filtered))for(const id of ids)(outgoing[id] ||= []).push(target);
 const activeUsers=new Set(Object.entries(actions).filter(([,a])=>a.kind!=='hide').map(([id])=>id));if(attacker)activeUsers.add(attacker);
 for(const [id,a] of Object.entries(actions)){
  const p=g.players[id],t=a.target,tp=g.players[t];switch(a.kind){
   case 'scan':p.intel.push(`🧠 NetWatch: ${tp.name} → ${TEAM_NAMES[effectiveTeam(tp)]}. Можливе маскування.`);break;
   case 'compare':p.intel.push(`🔗 ${tp.name} і ${g.players[a.other].name}: ${effectiveTeam(tp)===effectiveTeam(g.players[a.other])?'ОДНАКОВИЙ':'РІЗНИЙ'} сигнал.`);break;
   case 'suppress':p.intel.push(`🚨 MaxTac: ${tp.name} — ${tp.team==='glitch'?'КІБЕРПСИХ! Атаку заблоковано.':'ознак психозу немає.'}`);break;
   case 'watch':case 'follow':case 'memory':
    if(blackout){p.intel.push('🖥️ Арасака вимкнула мережу спостереження. Дані втрачено.');break;}
    if(a.kind==='watch')p.intel.push(`📷 NCPD / ${tp.name}: ${(filtered[t]||[]).map(i=>g.players[i].name).join(', ')||'відвідувачів не видно'}.`);
    if(a.kind==='follow')p.intel.push(`🛸 Militech / ${tp.name}: ${(outgoing[t]||[]).map(i=>g.players[i].name).join(', ')||'візитів не видно'}.`);
    if(a.kind==='memory')p.intel.push(`💿 Брейнданс ${tp.name}: дія «${disabled.has(t)&&selections[t]?.kind!=='hide'?'blocked':selections[t]?.kind||'hide'}».`);
    break;
   case 'intercept':p.intel.push(`🕶️ Контррозвідка: ${tp.name} → ${ROLES[tp.role].name}.`);break;
   case 'heat':p.intel.push(`🌡️ Цифровий слід ${tp.name}: ${tp.heat}/4. Не доказ вини.`);break;
   case 'leak':publics.push(`📡 Репортаж: ${tp.name} ${activeUsers.has(t)?'був(-ла) активним(-ою)':'не проявляв(-ла) активності'} цієї ночі.`);break;
  }
 }
 for(const [id,t] of kiroshi)g.players[id].intel.push(`👁️ Кіроші: ${g.players[t].name} — цифровий слід ${g.players[t].heat}/4.`);
 for(const a of Object.values(actions))if(a.kind==='soulkill'){
  const p=g.players[a.target];p.intel=p.intel.slice(0,oldIntel[p.uid]);p.intel.push('🧿 Soulkiller стер нові нейродані цієї ночі.');
 }
 const notable=living.filter(p=>p.alive&&p.heat>=3);let signal;
 if(fake)signal=`📶 СЛІД: підозріла активність — ${g.players[fake].name}. Це не доказ провини.`;
 else if(notable.length){const top=Math.max(...notable.map(p=>p.heat));signal=`📶 СЛІД: підозріла активність — ${pick(notable.filter(p=>p.heat===top)).name}. Це не доказ провини.`;}
 else signal='📶 СЛІД: бракує даних для встановлення особи.';
 let outcome;if(dead.size)outcome='☠️ Загиблі цієї ночі: '+[...dead].map(i=>`${g.players[i].name} (${TEAM_NAMES[g.players[i].team]})`).join(', ')+'.';
 else if(blocked)outcome='🛡️ Була спроба ліквідації, але захист спрацював.';else outcome='🌙 Цієї ночі ніхто не загинув.';
 for(const id of disabled)if(before.has(id)&&!Object.values(actions).some(a=>a.kind==='soulkill'&&a.target===id))g.players[id].intel.push('⚠️ Твою здібність заглушено. Атака Арасаки не блокується.');
 for(const id of newlyWon)publics.push(`👹 ${g.players[id].name} досягнув(-ла) двох власних ліквідацій. Особиста перемога кіберпсиха!`);
 for(const id of g.pending_bounties)if(g.players[id].alive)publics.push(`💰 Контракт Фіксера: ${g.players[id].name} отримує +1 голос проти себе на суді.`);
 g.last_report=[`🌅 НАЙТ-СІТІ · РАНОК ${g.round_no}`,outcome,signal,...publics].join('\n');
 g.history.push(g.last_report);g.actions={};g.syndicate_votes={};g.market_orders={};g.phase='day';g.revision++;checkWin(g);
 return {public:g.last_report,oldIntel};
}
export function beginVote(g){if(g.phase!=='day')throw Error('Зараз не день.');g.exile_votes={};g.phase='vote';g.revision++;
 return `⚖️ СУД НАЙТ-СІТІ · раунд ${g.round_no}. Усі живі голосують таємно у приватному чаті. Нічия — нікого не виганяють.${g.pending_bounties.length?'\n💰 Активний контракт Фіксера: +1 голос.':''}`;
}
export function resolveVote(g){
 if(g.phase!=='vote')throw Error('Зараз не суд.');
 const cnt=count(Object.entries(g.exile_votes).filter(([id,t])=>g.players[id]?.alive&&t!=='0').map(([,t])=>t));
 for(const t of g.pending_bounties)if(g.players[t].alive&&cnt[t])cnt[t]++;
 g.pending_bounties=[];let chosen='';if(Object.keys(cnt).length){const max=Math.max(...Object.values(cnt)),leaders=Object.keys(cnt).filter(id=>cnt[id]===max);if(leaders.length===1)chosen=leaders[0];}
 let result;
 if(chosen){const p=g.players[chosen];p.alive=false;result=`⚖️ Вигнано: ${p.name}. Роль: ${ROLES[p.role].name}. Фракція: ${TEAM_NAMES[p.team]}.`;}
 else result='⚖️ Нічия або немає голосів — сьогодні нікого не вигнано.';
 g.history.push(result);g.exile_votes={};checkWin(g,g.round_no>=MAX_ROUNDS);
 if(g.phase!=='finished'){g.round_no++;g.phase='night';for(const p of alive(g))p.credits=clamp(p.credits+1,0,5);}
 g.revision++;return result;
}
export function overview(g){
 const ps=alive(g),names=ps.map(p=>p.name).join(', ')||'нікого';
 if(g.phase==='lobby')return `🌆 ЛОБІ NIGHT CITY · ${gvals(g.players).length}/16\nУчасники: ${names}\n\nДля старту потрібно 6–16 гравців.`;
 const phase={night:'🌑 Ніч',day:'🌆 Обговорення',vote:'⚖️ Суд',finished:'🏁 Фінал'}[g.phase];
 return `🌃 НЕОН: ВІЙНА КОРПОРАЦІЙ\n${phase} · раунд ${g.round_no}/${MAX_ROUNDS}\nЖивих: ${ps.length}/${gvals(g.players).length}\nУчасники: ${names}`;
}
export function finishText(g){const wins=g.glitch_winners.map(i=>g.players[i]?.name).join(', ')||'немає';
 return `🏁 КІНЕЦЬ МАТЧУ\nПеремогли: ${TEAM_NAMES[g.winner]}\n👹 Особисті перемоги кіберпсихів: ${wins}\n\n🔓 Усі ролі:\n`+gvals(g.players).map(p=>`• ${p.name}: ${ROLES[p.role].name} — ${TEAM_NAMES[p.team]}`).join('\n');
}
export function statusPrivate(g,id){const p=g.players[uid(id)];if(!p)return 'Ти не в цьому матчі.';
 const colleagues=p.team==='syn'?`\n🟥 Агенти Арасаки: ${alive(g,'syn').map(x=>x.name).join(', ')}`:'';
 return `${ROLES[p.role]?.name||'Гравець'}\n${TEAM_NAMES[p.team]||''}\n${ROLES[p.role]?.description||''}\n\n${p.alive?'✅ Живий':'☠️ Вибув'} | 🔋 ${p.credits}/5 | 🦾 Броня: ${p.armor} | 📶 Слід: ${p.heat}/4${p.team==='glitch'?` | 👹 Психоз: ${p.psychosis}/3, убивства: ${p.psycho_kills}/2`:''}${colleagues}\n\nФаза: ${g.phase}, раунд ${g.round_no}/8`;
}
