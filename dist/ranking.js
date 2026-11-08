'use strict';
(() => {
 const endpoint='https://andnqwjhnykppumeikgx.supabase.co/functions/v1/ranking';
 const publishableKey='sb_publishable_qaCv6LifqZqOreFiJ5EWzw_0zWVFyOp';
 const el=id=>document.getElementById(id);
 let token,runPromise,currentResult,sequence=0,submitted=false,busy=false;
 try{token=localStorage.getItem('chacha_player_token')}catch{}
 if(!/^[a-f0-9]{64}$/.test(token||'')){
  token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
  try{localStorage.setItem('chacha_player_token',token)}catch{}
 }
 try{el('rankNickname').value=localStorage.getItem('chacha_nickname')||''}catch{}
 async function api(action,data={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':publishableKey},body:JSON.stringify({action,gameVersion:2,playerToken:token,...data}),signal:controller.signal});
   const body=await response.json();if(!response.ok)throw new Error(body.error||'랭킹을 불러오지 못했어요.');return body;
  }finally{clearTimeout(timer)}
 }
 function render(data){
  const list=el('rankingRows');list.replaceChildren();
  for(const entry of data.leaders){const row=document.createElement('li');
   const rank=document.createElement('span'),name=document.createElement('span'),score=document.createElement('strong');
   rank.className='rank-number';rank.textContent=String(entry.rank).padStart(2,'0');name.textContent=entry.nickname;score.textContent=Number(entry.distance).toLocaleString()+' m';
   row.append(rank,name,score);list.append(row);
  }
  el('rankingEmpty').hidden=data.leaders.length>0;
  el('rankingTotal').textContent=Number(data.total).toLocaleString()+'명의 러너';
  el('myRanking').textContent=data.mine?'내 최고 순위 '+data.mine.rank+'위 · '+Number(data.mine.distance).toLocaleString()+' m':'첫 기록을 남겨보세요!';
 }
 async function refresh(){el('rankRefresh').disabled=true;el('rankingStatus').textContent='순위를 불러오는 중…';
  try{render(await api('top'));el('rankingStatus').textContent='최고 기록순 · 동점이면 먼저 달성한 순서'}catch{el('rankingStatus').textContent='순위를 불러오지 못했어요. 잠시 후 새로고침해 주세요.'}finally{el('rankRefresh').disabled=false}
 }
 function showForm(){el('rankingPanel').scrollIntoView({behavior:'smooth',block:'center'});el('rankNickname').focus({preventScroll:true})}
 window.addEventListener('chacha:run-start',()=>{
  const seq=++sequence;currentResult=null;submitted=false;el('rankSubmit').disabled=true;el('rankSubmitStatus').textContent='달리기를 마치면 이번 기록을 등록할 수 있어요.';
  runPromise=api('start').then(value=>seq===sequence?value:null).catch(()=>null);
 });
 window.addEventListener('chacha:run-end',event=>{
  currentResult={...event.detail};el('rankSubmit').disabled=false;el('rankSubmitStatus').textContent='이번 기록 '+currentResult.score+' m · 닉네임과 기록이 공개됩니다.';
 });
 el('rankingForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!currentResult||submitted||busy)return;
  const nickname=el('rankNickname').value.normalize('NFKC').trim();
  if(!/^[\p{L}\p{N} _-]{2,12}$/u.test(nickname)){el('rankSubmitStatus').textContent='닉네임은 한글·영문·숫자 등 2~12자로 입력해 주세요.';return}
  busy=true;el('rankSubmit').disabled=true;const seq=sequence,result={...currentResult};
  try{const run=await runPromise;if(!run)throw new Error('온라인 연결이 필요해요. 연결 후 새 게임으로 도전해 주세요.');
   const data=await api('submit',{nickname,runId:run.runId,ticks:result.ticks});
   render(data);try{localStorage.setItem('chacha_nickname',nickname)}catch{}
   if(seq===sequence){submitted=true;el('rankSubmitStatus').textContent='등록 완료! 이번 기기의 최고 기록만 순위에 표시됩니다.'}
  }catch(error){if(seq===sequence)el('rankSubmitStatus').textContent=error.name==='AbortError'?'연결이 지연되고 있어요. 다시 등록해 주세요.':error.message}
  finally{busy=false;el('rankSubmit').disabled=submitted||!currentResult}
 });
 el('rankRefresh').addEventListener('click',refresh);el('openRanking').addEventListener('click',showForm);
 refresh();
})();
