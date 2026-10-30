import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

function fakeEnv(){
 const games=new Map(),members=new Map(),scores=new Map();
 const env={BOT_TOKEN:'TESTTOKEN',WEBHOOK_SECRET:'secretHeader_2026',SETUP_KEY:'setup-secret',DB:{
  async exec(sql){assert.match(sql,/CREATE TABLE/);},
  prepare(sql){return {bind(...args){return {
   async first(){if(sql.includes('FROM games WHERE chat_id')){const x=games.get(args[0]);return x?{state:x.state,revision:x.revision,deadline:x.deadline}:null;}
    if(sql.includes('FROM membership'))return [...members.values()].find(m=>m.user_id===args[0])||null;
    throw Error('Unknown first '+sql);},
   async run(){
    if(sql.startsWith('INSERT INTO games')){games.set(args[0],{state:args[1],deadline:args[2]||0,revision:args[3]||0});return {meta:{changes:1}};}
    if(sql.startsWith('UPDATE games')){
     if(sql.includes('revision = revision + 1 WHERE chat_id = ? AND revision = ?')){const x=games.get(args[2]);if(!x||x.revision!==args[3])return {meta:{changes:0}};games.set(args[2],{state:args[0],deadline:args[1],revision:x.revision+1});return {meta:{changes:1}};}
     if(sql.includes('deadline=0')){const x=games.get(args[1]);games.set(args[1],{state:args[0],deadline:0,revision:x.revision+1});return {meta:{changes:1}};}
    }
    if(sql.startsWith('INSERT INTO membership')){members.set(args[0]+'_'+args[1],{user_id:args[0],chat_id:args[1],updated_at:args[2]});return {meta:{changes:1}};}
    if(sql.startsWith('INSERT INTO scores')){const x=scores.get(args[0])||{name:args[1],games:0,wins:0,psycho_wins:0};x.name=args[1];x.games++;x.wins+=args[2];x.psycho_wins+=args[3];scores.set(args[0],x);return {meta:{changes:1}};}
    throw Error('Unknown run '+sql);
   },
   async all(){if(sql.includes('FROM games WHERE deadline'))return {results:[...games.entries()].filter(([,g])=>g.deadline>0&&g.deadline<=args[0]).map(([chat_id])=>({chat_id}))};
    if(sql.includes('FROM scores'))return {results:[...scores.values()]};
    throw Error('Unknown all '+sql);}
  };}};}
 }};
 return {env,games,members,scores};
}
const telegram=[];
const originalFetch=globalThis.fetch;
function mockTelegram(){telegram.length=0;globalThis.fetch=async(url,options)=>{
 const method=String(url).split('/').pop(),body=JSON.parse(options.body);telegram.push({method,body});
 return new Response(JSON.stringify({ok:true,result:method==='getMe'?{username:'NeonTestBot'}:true}),{status:200,headers:{'content-type':'application/json'}});
};}
async function post(env,update,secret='secretHeader_2026'){
 return worker.fetch(new Request('https://neon.workers.dev/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify(update)}),env,{waitUntil(){}});
}
function group(text,uid=1,idx=1){return {update_id:idx,message:{chat:{id:-100500,type:'supergroup',title:'Test'},from:{id:uid,first_name:'G'+uid},text}};}
function priv(text,id,idx=1){return {update_id:idx,message:{chat:{id,type:'private'},from:{id,first_name:'G'+id},text}};}

test('Cloudflare webhook connection, lobby, players, round and scheduled switch',async()=>{
 mockTelegram();try{
 const {env,games,members}=fakeEnv();
 let res=await worker.fetch(new Request('https://neon.workers.dev/setup?key=setup-secret'),env,{});
 assert.equal(res.status,200);assert.ok(telegram.some(x=>x.method==='setWebhook'&&x.body.secret_token===env.WEBHOOK_SECRET));
 const invalid=await post(env,group('/status'), 'wrong');assert.equal(invalid.status,403);
 res=await post(env,group('/newgame'));assert.equal(res.status,200);
 assert.equal(games.size,1);assert.match(telegram.at(-1).body.reply_markup.inline_keyboard[0][0].url,/start=join_-100500/);
 for(let i=1;i<=6;i++){res=await post(env,priv('/start join_-100500',i,20+i));assert.equal(res.status,200);}
 assert.equal(members.size,6);
 const gameBefore=JSON.parse(games.get('-100500').state);assert.equal(Object.keys(gameBefore.players).length,6);
 res=await post(env,group('/begin',1,100));assert.equal(res.status,200);
 let game=JSON.parse(games.get('-100500').state);assert.equal(game.phase,'night');assert.ok(game.deadline>0);
 // Simulate next phase without waiting: the scheduled handler reads the deadline.
 const current=games.get('-100500');current.deadline=1;game.deadline=1;current.state=JSON.stringify(game);
 await worker.scheduled({cron:'* * * * *'},env,{waitUntil:p=>{env.waitPromise=p;}});
 await env.waitPromise;
 game=JSON.parse(games.get('-100500').state);assert.ok(['day','finished'].includes(game.phase));
 assert.ok(telegram.some(x=>x.method==='sendMessage'&&x.body.text.includes('РАНОК')));
 }finally{globalThis.fetch=originalFetch;}
});

test('authorization for setup is mandatory',async()=>{
 mockTelegram();try{const {env}=fakeEnv();let response=await worker.fetch(new Request('https://neon.workers.dev/setup?key=wrong'),env,{});assert.equal(response.status,401);}finally{globalThis.fetch=originalFetch;}
});
