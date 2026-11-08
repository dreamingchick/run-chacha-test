'use strict';
(() => {
  const button = document.getElementById('install');
  const message = document.getElementById('appMessage');
  let prompt;
  let messageTimer;
  function tell(text) {
    clearTimeout(messageTimer);
    message.textContent = text;
    message.hidden = false;
    messageTimer = setTimeout(() => { message.hidden = true; }, 6000);
  }
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  button.hidden = Boolean(standalone);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    prompt = event;
    button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!prompt) {
      tell(location.protocol === 'file:' ? '앱 설치는 HTTPS로 배포된 게임에서 사용할 수 있어요.' : '브라우저 메뉴의 앱 설치 또는 공유 → 홈 화면에 추가를 선택해 주세요.');
      return;
    }
    button.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') button.hidden = true;
    } catch { tell('설치를 완료하지 못했어요. 브라우저 메뉴에서 다시 시도해 주세요.'); }
    finally { prompt = null; button.disabled = false; }
  });
  window.addEventListener('appinstalled', () => { button.hidden = true; tell('차차가 홈 화면에 도착했어요!'); });
  // Real same-origin service worker, scoped to the deployment subdirectory.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    window.addEventListener('load', () => {
      let updating=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)location.reload()});
      navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(registration=>{
        function offerUpdate(){if(!registration.waiting)return;clearTimeout(messageTimer);message.textContent='새 버전이 준비됐어요. ';message.hidden=false;const update=document.createElement('button');update.className='chip';update.textContent='업데이트';update.onclick=()=>{updating=true;registration.waiting?.postMessage({type:'SKIP_WAITING'})};message.append(update)}
        registration.update().catch(()=>{});offerUpdate();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate()})});
      }).catch(() => {
        tell('오프라인 저장을 완료하지 못했어요. 온라인에서는 계속 플레이할 수 있어요.');
      });
    });
  }
})();
