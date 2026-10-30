import {ROLES, MARKET} from './data.js';
import {TEAM_NAMES, NAMES, newGame, join, start, alive, submitAction, submitKill, submitVote, buy, resolveNight, beginVote, resolveVote, overview, finishText, statusPrivate} from './engine.js';

const RULES=`🌃 НЕОН: ВІЙНА КОРПОРАЦІЙ — кіберпанк-мафія\n\n👥 6–16 гравців.\n🟥 Арасака вночі спільно ліквідує людей.\n🟦 Містяни з'ясовують, хто належить до корпорації, і виганяють агентів.\n🟪 Кіберпсихи (від 10 людей) збирають психоз та атакують незалежно.\n\nФази: ніч → обговорення → суд → ніч.\nРолі, дії та голоси приховані в особистих повідомленнях.\nЖиві можуть купувати імпланти за нейрокредити.\nПеремога міста — вигнати всіх агентів Арасаки. Арасака перемагає, коли живих агентів не менше за містян, або наприкінці 8-го суду. Кіберпсих отримує особисту перемогу за 2 власні ліквідації.`;
const now=()=>Math.floor(Date.now()/1000);
const durations=e=>({night:Math.max(30,+e.NIGHT_SECONDS||100),day:Math.max(30,+e.DAY_SECONDS||150),vote:Math.max(30,+e.VOTE_SECONDS||75)});
const keyboard=rows=>({inline_keyboard:rows.filter(x=>x.length).map(r=>r.map(([text,callback_data,url])=>url?({text,url}):({text,callback_data})))});
const chunkButtons=(list,width=2)=>{const rows=[];for(let i=0;i<list.length;i+=width)rows.push(list.slice(i,i+width));return rows;};
const tg=async(env,method,payload)=>{
 const res=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
 const j=await res.json().catch(()=>({ok:false,description:`HTTP ${res.status}`}));
 if(!j.ok)throw Error(`Telegram ${method}: ${j.description||res.status}`);return j.result;
};
async function send(env,chat,text,rows=null){return tg(env,'sendMessage',{chat_id:chat,text, ...(rows?{reply_markup:keyboard(rows)}:{})});}
async function alert(env,cid,text){try{await send(env,cid,text);}catch(err){console.log('dm failed',String(err));}}
async function show(env,callback,text,rows=null){
 try {await tg(env,'answerCallbackQuery',{callback_query_id:callback.id});}catch{}
 const chat=callback.message?.chat?.id,mid=callback.message?.message_id;
 if(!chat)return;
 try{await tg(env,'editMessageText',{chat_id:chat,message_id:mid,text, ...(rows?{reply_markup:keyboard(rows)}:{reply_markup:{inline_keyboard:[]}})});}
 catch(err){if(!String(err).includes('message is not modified'))await send(env,chat,text,rows);}
}
async function getGame(env,chatId){const row=await env.DB.prepare('SELECT state, revision, deadline FROM games WHERE chat_id = ?').bind(String(chatId)).first();
 if(!row)return null;return {g:JSON.parse(row.state),version:row.revision,deadline:row.deadline};
}
async function saveGame(env,obj){
 const {g,version}=obj,gid=String(g.chat_id);g.revision=(g.revision||0)+1;
 const r=await env.DB.prepare('UPDATE games SET state = ?, deadline = ?, revision = revision + 1 WHERE chat_id = ? AND revision = ?').bind(JSON.stringify(g),g.deadline||0,gid,version).run();
 if(!r.meta?.changes)throw Error('Інший гравець щойно оновив матч. Повтори дію.');
 obj.version++;return g;
}
async function getMembership(env,user){return env.DB.prepare('SELECT chat_id FROM membership WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').bind(String(user)).first();}
async function initDb(env){
 await env.DB.exec(`CREATE TABLE IF NOT EXISTS games (chat_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, deadline INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL);\nCREATE INDEX IF NOT EXISTS games_due ON games(deadline);\nCREATE TABLE IF NOT EXISTS membership (user_id TEXT NOT NULL, chat_id TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id, chat_id));\nCREATE TABLE IF NOT EXISTS scores (user_id TEXT PRIMARY KEY, name TEXT, games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, psycho_wins INTEGER NOT NULL DEFAULT 0);`);
}
async function registerScores(env,g){if(!g.winner||g.scored)return;
 for(const p of Object.values(g.players)){
  const won=p.team===g.winner;const psychowin=g.glitch_winners.includes(p.uid);
  await env.DB.prepare('INSERT INTO scores(user_id,name,games,wins,psycho_wins) VALUES(?,?,1,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, games=games+1, wins=wins+excluded.wins, psycho_wins=psycho_wins+excluded.psycho_wins').bind(p.uid,p.name,won?1:0,psychowin?1:0).run();
 }
 g.scored=true;
}
const targetButtons=(g,cb,{self=true}={})=>chunkButtons(alive(g).filter(p=>self||p.uid!==String(self)).map(p=>[p.name.slice(0,23),cb(p.uid)]),2);
function targets(g,viewer,callback,skipSelf=false){return chunkButtons(alive(g).filter(p=>!skipSelf||p.uid!==String(viewer)).map(p=>[`${p.name}`.slice(0,31),callback(p.uid)]),2);}
function panel(g,id){
 const p=g.players[String(id)];if(!p)return {text:'Ти не в цьому матчі. Використай посилання входу в групі.',rows:[]};
 const txt=statusPrivate(g,id);
 const gid=g.chat_id;
 const rows=[];
 if(p.alive&&g.phase==='night'){
  rows.push([['🌙 Нічна дія',`A:${gid}:menu`],['🛒 Чорний ринок',`M:${gid}`]]);
  if(p.team==='syn')rows.push([['🟥 Обрати жертву Арасаки',`K:${gid}:menu`]]);
 }
 if(p.alive&&g.phase==='vote')rows.push([['⚖️ Голосувати',`V:${gid}:menu`]]);
 rows.push([['📨 Мої дані',`I:${gid}`],['📜 Хроніка',`H:${gid}`]]);
 rows.push([['🔄 Оновити пульт',`P:${gid}`]]);
 return {text:txt,rows};
}
function actionMenu(g,id){
 const p=g.players[String(id)],gid=g.chat_id;
 if(!p||!p.alive||g.phase!=='night')throw Error('Нічні здібності зараз недоступні.');
 const kind=ROLES[p.role].action;
 const rows=[[['🌫️ Залягти на дно',`A:${gid}:hide`]]];
 if(kind&&!(p.power_used&&['install','leak','forge','stun','pierce','bounty','raid','overload','blackout','soulkill'].includes(kind))){
  if(!['rampage','ghoststrike'].includes(kind)||p.psychosis>=2)rows.push([[NAMES[kind]||kind,`A:${gid}:${kind}`]]);
 }
 rows.push([['⬅️ До пульта',`P:${gid}`]]);
 return {text:`${statusPrivate(g,id)}\n\nОбери нічну дію. Можна змінювати вибір до завершення ночі.`,rows};
}
function marketMenu(g,id){const p=g.players[String(id)],gid=g.chat_id;if(!p||!p.alive||g.phase!=='night')throw Error('Ринок відкритий лише вночі для живих гравців.');
 const rows=Object.entries(MARKET).map(([key,x])=>[[`${x.name} — ${x.price}₵`,`B:${gid}:${key}`]]);
 rows.push([['⬅️ До пульта',`P:${gid}`]]);
 return {text:`🛒 ЧОРНИЙ РИНОК\nТвої кредити: ${p.credits}₵\nМожна замінити замовлення до кінця ночі.\n\n`+Object.entries(MARKET).map(([k,m])=>`${m.name}: ${m.price}₵ — ${m.description}`).join('\n'),rows};
}
function usableTargets(g,id,kind){
 const allowSelf=['heal','install','cloak','forge','heat','leak','suppress','memory'].includes(kind),idStr=String(id);
 return alive(g).filter(p=> (allowSelf||p.uid!==idStr) && !(kind==='stun'&&p.team==='syn'&&g.players[idStr]?.team==='syn') && !(['rampage','ghoststrike'].includes(kind)&&p.team==='glitch'));
}
function back(g){return [['⬅️ Пульт',`P:${g.chat_id}`]];}
function needTarget(kind){return !['hide','pierce','blackout'].includes(kind);}
async function advance(env,obj){
 const g=obj.g;
 if(!['night','day','vote'].includes(g.phase))return;
 const oldPhase=g.phase;let message='';let intelBefore={};
 if(g.phase==='night'){
  const res=resolveNight(g);message=res.public;intelBefore=res.oldIntel;
 }else if(g.phase==='day')message=beginVote(g);else message=resolveVote(g);
 if(g.phase==='finished')await registerScores(env,g);
 g.deadline=g.phase==='finished'?0:now()+durations(env)[g.phase];
 await saveGame(env,obj);
 await send(env,g.chat_id,message);
 if(oldPhase==='night'){
  for(const p of Object.values(g.players)){
   const msgs=p.intel.slice(intelBefore[p.uid]||0);
   if(msgs.length)await alert(env,p.uid,`🔐 ПРИВАТНІ ДАНІ · ніч ${g.round_no}\n${msgs.join('\n')}`);
  }
 }
 if(g.phase==='finished'){await send(env,g.chat_id,finishText(g));return;}
 if(g.phase==='day')await send(env,g.chat_id,'🗣️ Обговорюйте підозри у групі. На суд бот перейде автоматично.');
 if(g.phase==='vote'){
  await send(env,g.chat_id,'⚖️ Приватні голоси приймаються. Кожен учасник має відкрити особистий чат із ботом.');
  for(const p of alive(g))await alert(env,p.uid,`⚖️ Суд ${g.round_no}: відкрий /panel і проголосуй.`);
 }
 if(g.phase==='night'){
  await send(env,g.chat_id,`🌑 НІЧ ${g.round_no}\nАрасака вибирає жертву, мешканці активують здібності. Відкрий /panel у приватному чаті.`,null);
  for(const p of alive(g))await alert(env,p.uid,`🌑 Ніч ${g.round_no}. Дії та імпланти доступні через /panel.`);
 }
}
async function handleGroup(env,msg){
 const chatId=String(msg.chat.id),user=String(msg.from?.id||''),text=String(msg.text||'').trim(),cmd=text.split(/\s+/)[0]?.split('@')[0].toLowerCase();
 if(!cmd.startsWith('/'))return;
 if(cmd==='/newgame'){
  const old=await getGame(env,chatId);
  if(old&&old.g.phase!=='finished'&&old.g.phase!=='lobby')throw Error('У групі вже триває гра. Організатор може скасувати її командою /cancel.');
  if(old&&old.g.phase==='lobby'&&old.g.host_id!==user)throw Error('Лобі вже створене іншим організатором.');
  const g=newGame(chatId,user,msg.chat.title||'Night City');
  if(old){g.revision=old.g.revision+1;g.deadline=0;await env.DB.prepare('UPDATE games SET state=?, deadline=0, revision=revision+1 WHERE chat_id=?').bind(JSON.stringify(g),chatId).run();}
  else await env.DB.prepare('INSERT INTO games (chat_id,state,deadline,revision) VALUES(?,?,0,0)').bind(chatId,JSON.stringify(g)).run();
  const me=await tg(env,'getMe',{});const name=me.username;
  await send(env,msg.chat.id,'🌃 ВІЙНА КОРПОРАЦІЙ\nНовий матч! Натисни кнопку, зайди в особистий чат із ботом та натисни Start.\n\nПотрібно 6–16 гравців.',[[[`🚪 Приєднатися`,``, `https://t.me/${name}?start=join_${chatId}`]]]);
  return;
 }
 const obj=await getGame(env,chatId);
 if(['/rules','/roles'].includes(cmd)){
  if(cmd==='/rules')await send(env,chatId,RULES);
  else{const rs=Object.values(ROLES);for(let i=0;i<rs.length;i+=10)await send(env,chatId,`🧬 РОЛІ (${i+1}–${Math.min(i+10,rs.length)}/${rs.length})\n\n`+rs.slice(i,i+10).map(r=>`${r.name}\n${r.description}`).join('\n\n'));}return;
 }
 if(cmd==='/top'){
  const scores=await env.DB.prepare('SELECT name,games,wins,psycho_wins FROM scores ORDER BY wins DESC,games DESC LIMIT 15').all();
  await send(env,chatId,'🏆 РЕЙТИНГ NIGHT CITY\n'+((scores.results||[]).map((s,i)=>`${i+1}. ${s.name}: перемог ${s.wins}/${s.games}, кіберпсих ${s.psycho_wins}`).join('\n')||'Ще немає завершених матчів.'));return;
 }
 if(!obj){await send(env,chatId,'Немає активного лобі. Створи його командою /newgame.');return;}
 const g=obj.g;
 if(cmd==='/join'){
  const me=await tg(env,'getMe',{});
  await send(env,chatId,overview(g),[[[`🚪 Приєднатися`,'',`https://t.me/${me.username}?start=join_${chatId}`]]]);return;
 }
 if(cmd==='/status'){await send(env,chatId,overview(g));return;}
 if(cmd==='/history'){await send(env,chatId,`📜 Хроніка:\n${g.history.slice(-6).join('\n\n')||'Ще немає подій.'}`);return;}
 if(['/begin','/next','/cancel'].includes(cmd)&&user!==g.host_id){throw Error('Цю команду може виконати лише організатор матчу.');}
 if(cmd==='/cancel'){
  g.phase='finished';g.deadline=0;g.winner='';await saveGame(env,obj);await send(env,chatId,'🛑 Матч скасовано. /newgame — новий матч.');return;
 }
 if(cmd==='/begin'){
  start(g);g.deadline=now()+durations(env).night;await saveGame(env,obj);
  await send(env,chatId,overview(g)+'\n\n🔒 Ролі надіслані особисто. Ніч почалася.');
  for(const p of Object.values(g.players))await alert(env,p.uid,`🎭 ТВОЯ РОЛЬ\n${statusPrivate(g,p.uid)}\n\nДля вибору дії напиши /panel.`);
  return;
 }
 if(cmd==='/next'){await advance(env,obj);return;}
 await send(env,chatId,'Команди: /newgame /join /begin /status /next /roles /rules /history /top /cancel');
}
async function handlePrivate(env,msg){
 const id=String(msg.from?.id||''),text=String(msg.text||'').trim();let gobj=null;
 if(/^\/start(?:@\w+)?\s+join_[-\d]+/i.test(text)){
  const chatId=text.match(/join_(-?\d+)/)?.[1];if(!chatId)throw Error('Помилкове посилання запрошення.');
  const obj=await getGame(env,chatId);if(!obj||obj.g.phase!=='lobby')throw Error('Лобі закрите або більше не існує.');
  join(obj.g,id,[msg.from?.first_name,msg.from?.last_name].filter(Boolean).join(' ')||msg.from.username||id);
  await saveGame(env,obj);
  await env.DB.prepare('INSERT INTO membership (user_id,chat_id,updated_at) VALUES(?,?,?) ON CONFLICT(user_id,chat_id) DO UPDATE SET updated_at=excluded.updated_at').bind(id,chatId,now()).run();
  await send(env,id,`✅ Ти в грі!\n\n${overview(obj.g)}`,[[`📟 Мій пульт`,`P:${chatId}`]]);
  await send(env,chatId,`✅ ${obj.g.players[id].name} приєднався до гри. Зараз ${Object.keys(obj.g.players).length}/16.`);
  return;
 }
 const member=await getMembership(env,id);if(!member){await send(env,id,'🌃 НЕОН: ВІЙНА КОРПОРАЦІЙ\nЗайди до групи з ботом, напиши /newgame та натисни кнопку «Приєднатися».');return;}
 gobj=await getGame(env,member.chat_id);if(!gobj||!gobj.g.players[id]){await send(env,id,'Ти ще не приєднався до активного матчу.');return;}
 const g=gobj.g;if(text.startsWith('/role'))await send(env,id,statusPrivate(g,id));
 else if(text.startsWith('/rules'))await send(env,id,RULES);
 else if(text.startsWith('/history'))await send(env,id,`📜 Хроніка:\n${g.history.slice(-8).join('\n\n')}`);
 else {const {text,rows}=panel(g,id);await send(env,msg.chat.id,text,rows);}
}
async function handleCallback(env,cb){
 const user=String(cb.from.id),parts=String(cb.data||'').split(':'),[cmd,gid,arg,a2]=parts;
 const obj=await getGame(env,gid);
 if(!obj||!obj.g.players[user]){await show(env,cb,'Ця кнопка більше неактивна або ти не в матчі.');return;}
 const g=obj.g,p=g.players[user];let screen=null,changed=false;
 if(cmd==='P')screen=panel(g,user);
 else if(cmd==='I')screen={text:statusPrivate(g,user)+'\n\n📨 Останні дані:\n'+(p.intel.slice(-8).join('\n')||'Даних немає.'),rows:[back(g)]};
 else if(cmd==='H')screen={text:'📜 Хроніка:\n'+g.history.slice(-7).join('\n\n'),rows:[back(g)]};
 else if(cmd==='A'){
  if(arg==='menu')screen=actionMenu(g,user);
  else if(arg==='hide'||['pierce','blackout'].includes(arg)){
   submitAction(g,user,arg);changed=true;screen={text:`✅ Обрано: ${NAMES[arg]||arg}. Дію можна змінити до кінця ночі.`,rows:[back(g)]};
  }else if(!ROLES[p.role]?.action||arg!==ROLES[p.role].action)throw Error('Недоступна здібність.');
  else{const choices=usableTargets(g,user,arg);
   screen={text:`🌙 ${NAMES[arg]}\nОбери ціль.`,rows:[...chunkButtons(choices.map(x=>[x.name.slice(0,30),`T:${gid}:${arg}:${x.uid}`])),[back(g)]]};}
 }
 else if(cmd==='T'){
  if(g.phase!=='night')throw Error('Ця ніч уже закінчилася.');
  if(arg==='compare'){
   const choices=usableTargets(g,user,'compare').filter(x=>x.uid!==a2);
   screen={text:`🔗 Порівняти ${g.players[a2]?.name} з ким?`,rows:[...chunkButtons(choices.map(x=>[x.name.slice(0,30),`C:${gid}:${a2}:${x.uid}`])),[back(g)]]};
  }else{submitAction(g,user,arg,a2);changed=true;screen={text:`✅ Дія обрана: ${NAMES[arg]||arg}\nЦіль: ${g.players[a2]?.name}.`,rows:[back(g)]};}
 }
 else if(cmd==='C'){
  submitAction(g,user,'compare',arg,a2);changed=true;screen={text:`✅ Брейнданс: ${g.players[arg]?.name} ↔ ${g.players[a2]?.name}.`,rows:[back(g)]};
 }
 else if(cmd==='K'){
  if(g.phase!=='night'||p.team!=='syn'||!p.alive)throw Error('Ти не можеш обирати жертву Арасаки.');
  if(arg==='menu')screen={text:'🟥 АРАСАКА · обери нічну жертву',rows:[...chunkButtons(alive(g).filter(x=>x.team!=='syn').map(x=>[x.name,`K:${gid}:${x.uid}`])),[back(g)]]};
  else{submitKill(g,user,arg);changed=true;screen={text:`🟥 Голос Арасаки: ${g.players[arg]?.name}.`,rows:[back(g)]};}
 }
 else if(cmd==='V'){
  if(g.phase!=='vote'||!p.alive)throw Error('Суд уже закрито або ти вибув.');
  if(arg==='menu')screen={text:'⚖️ Кого вигнати з Night City?',rows:[...chunkButtons(alive(g).map(x=>[x.name,`V:${gid}:${x.uid}`])),[['Утриматися',`V:${gid}:0`]], [back(g)]]};
  else{submitVote(g,user,arg);changed=true;screen={text:`✅ Таємний голос прийнято: ${arg==='0'?'утримався(-лася)':g.players[arg]?.name}.`,rows:[back(g)]};}
 }
 else if(cmd==='M')screen=marketMenu(g,user);
 else if(cmd==='B'){
  if(!p.alive||g.phase!=='night')throw Error('Зараз ринок закрито.');
  if(!MARKET[arg])throw Error('Невідомий товар.');
  if(['tag','emp','kiroshi'].includes(arg))screen={text:`${MARKET[arg].name}: обери ціль`,rows:[...chunkButtons(alive(g).filter(x=>x.uid!==user).map(x=>[x.name,`Q:${gid}:${arg}:${x.uid}`])),[back(g)]]};
  else{buy(g,user,arg);changed=true;screen={text:`✅ Куплено: ${MARKET[arg].name}. Залишилось ${p.credits}₵.`,rows:[back(g)]};}
 }
 else if(cmd==='Q'){
  buy(g,user,arg,a2);changed=true;screen={text:`✅ Куплено: ${MARKET[arg].name}. Ціль: ${g.players[a2]?.name}. Залишок ${p.credits}₵.`,rows:[back(g)]};
 }
 else throw Error('Стара кнопка. Відкрий /panel.');
 if(changed)await saveGame(env,obj);
 await show(env,cb,screen?.text||'Оновлено.',screen?.rows||[]);
}
async function route(env,upd){
 if(upd.callback_query){try{await handleCallback(env,upd.callback_query);}catch(err){await show(env,upd.callback_query,'⚠️ '+String(err.message||err));}return;}
 const msg=upd.message;if(!msg)return;
 try{if(msg.chat.type==='private')await handlePrivate(env,msg);else await handleGroup(env,msg);}
 catch(err){console.error(err);await alert(env,msg.chat.id,'⚠️ '+String(err.message||err));}
}
async function cron(env){
 const due=await env.DB.prepare("SELECT chat_id FROM games WHERE deadline > 0 AND deadline <= ? ORDER BY deadline LIMIT 20").bind(now()).all();
 for(const row of due.results||[]){try{
  const obj=await getGame(env,row.chat_id);if(obj?.g?.deadline>0&&obj.g.deadline<=now())await advance(env,obj);
 }catch(err){console.error('cron error',row.chat_id,String(err));}}
}
export default {
 async fetch(req,env,ctx){
  const url=new URL(req.url);
  if(url.pathname==='/health')return new Response('NEON CITY ONLINE', {status:200});
  if(url.pathname==='/setup'){
   if(!env.SETUP_KEY||url.searchParams.get('key')!==env.SETUP_KEY)return new Response('Unauthorized',{status:401});
   if(!env.BOT_TOKEN||!env.DB||!env.WEBHOOK_SECRET)return new Response('Missing BOT_TOKEN, DB or WEBHOOK_SECRET',{status:500});
   await initDb(env);
   const hook=await tg(env,'setWebhook',{url:new URL('/webhook',req.url).href,secret_token:env.WEBHOOK_SECRET,allowed_updates:['message','callback_query'],drop_pending_updates:true});
   const me=await tg(env,'getMe',{});
   await tg(env,'setMyCommands',{commands:[{command:'newgame',description:'Створити нову гру (група)'},{command:'join',description:'Приєднатися (група)'},{command:'begin',description:'Почати гру (організатор)'},{command:'panel',description:'Особистий пульт'},{command:'status',description:'Стан матчу'},{command:'roles',description:'26 ролей'},{command:'rules',description:'Правила'},{command:'next',description:'Наступна фаза (організатор)'}]});
   return new Response(`✅ Готово! Telegram @${me.username} підключено до Cloudflare. Відкрий групу та введи /newgame.`,{headers:{'content-type':'text/plain; charset=utf-8'}});
  }
  if(url.pathname!=='/webhook'||req.method!=='POST')return new Response('Not Found',{status:404});
  if(!env.WEBHOOK_SECRET||req.headers.get('X-Telegram-Bot-Api-Secret-Token')!==env.WEBHOOK_SECRET)return new Response('Forbidden',{status:403});
  const upd=await req.json();
  if(!upd||typeof upd.update_id!=='number')return new Response('Bad Request',{status:400});
  try{await route(env,upd);return new Response('ok',{status:200});}
  catch(err){console.error('unhandled',String(err));return new Response('Processing failed',{status:503});}
 },
 async scheduled(ctrl,env,ctx){ctx.waitUntil(cron(env));}
};
