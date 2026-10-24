import {withTimeout,releaseGatt} from './gatt-session.js';
import {writePacket,browserLabel,connectionErrorMessage,isAppleMobile} from './bluetooth-compat.js';
import {SERVICE,CHARACTERISTIC,HUMIDITIES,MODES,command,INITIAL_READ,parseStatus,remainingText} from './protocol.js';
const $=id=>document.getElementById(id);
const browser=browserLabel(navigator.userAgent);
const appleMobile=isAppleMobile(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
const hasBluetooth=!!navigator.bluetooth && typeof navigator.bluetooth.requestDevice==='function';
const titles={timer:'꺼짐 예약',humidity:'목표 습도',mode:'운전 모드'};
let device=null,characteristic=null,state=null,ready=false,busy=false,epoch=0,writeQueue=Promise.resolve(),initialTimer=null,pending=null,countdown=null,panel=null,lastUpdate=0;
let renderedOptionsKey=null;
let connectStage="기기 선택",navigationReleased=false;
const lines=[];
function log(text){lines.push(`${new Date().toLocaleTimeString('ko-KR')}  ${text}`);if(lines.length>300)lines.shift();$('log').textContent=lines.join('\n');}
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);$('connection-error').hidden=!error;$('connection-error').textContent=error?text:'';}
function hex(data){return [...data].map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ');}
function storageKey(){return device?`niagara.timer.${device.id}`:null;}
function saveCountdown(){try{const key=storageKey();if(!key)return;countdown?localStorage.setItem(key,JSON.stringify(countdown)):localStorage.removeItem(key);}catch{}}
function loadCountdown(){try{countdown=JSON.parse(localStorage.getItem(storageKey()));if(!countdown||!Number.isFinite(countdown.deadline)||!Number.isInteger(countdown.hours))countdown=null;}catch{countdown=null;}}
function clearConnection(){clearTimeout(initialTimer);epoch++;characteristic=null;state=null;ready=false;busy=false;pending=null;panel=null;writeQueue=Promise.resolve();render();}
function disconnected(){log('BLE 연결 해제');clearConnection();message('가습기 연결이 해제되었습니다.');}
async function disconnect(){
  if(device)device.removeEventListener('gattserverdisconnected',disconnected);
  releaseGatt(device);clearConnection();message('연결을 해제했습니다.');
}
async function connect(){
  if(busy)return;
  if(!window.isSecureContext){message('HTTPS 주소로 접속해 주세요.',true);return;}
  if(!hasBluetooth){message('Bluetooth API를 사용할 수 없습니다. 아래 기본 BLE 연결 점검에서 지원 여부를 확인해 주세요.',true);return;}
  const current=++epoch;let chosen=null;navigationReleased=false;connectStage='기기 선택창';
  try{
    // First browser operation within the click: do not await or update UI before it.
    const selection=navigator.bluetooth.requestDevice({filters:[{namePrefix:'Niagara'},{services:[SERVICE]}],optionalServices:[SERVICE]});
    busy=true;render();message('브라우저의 기기 선택창에서 Niagara를 선택해 주세요.');
    log(`기기 선택창 요청 · ${browser}`);
    chosen=await selection;
    if(current!==epoch){releaseGatt(chosen);return;}
    device=chosen;device.addEventListener('gattserverdisconnected',disconnected);loadCountdown();
    connectStage='GATT 연결';log(`${connectStage} 시작 · ${device.name||'Niagara'}`);render();
    const server=await withTimeout(device.gatt.connect(),20000,connectStage);
    if(current!==epoch){releaseGatt(chosen);return;}
    connectStage='서비스 검색';log(connectStage);render();
    const service=await withTimeout(server.getPrimaryService(SERVICE),12000,connectStage);
    if(current!==epoch){releaseGatt(chosen);return;}
    connectStage='특성 검색';log(connectStage);render();
    const ch=await withTimeout(service.getCharacteristic(CHARACTERISTIC),12000,connectStage);
    if(current!==epoch){releaseGatt(chosen);return;}
    if(!ch.properties.write&&!ch.properties.writeWithoutResponse)throw new Error('지원되는 쓰기 특성이 없습니다');
    if(!ch.properties.notify&&!ch.properties.indicate)throw new Error('상태 알림을 지원하지 않습니다');
    characteristic=ch;ch.addEventListener('characteristicvaluechanged',notification);
    connectStage='알림 구독';log(connectStage);render();
    await withTimeout(ch.startNotifications(),12000,connectStage);
    if(current!==epoch){releaseGatt(chosen);return;}
    ready=true;busy=false;log(`알림 구독 완료 · 응답 ${ch.properties.write?'있는':'없는'} 쓰기`);message('연결되었습니다. 초기 상태를 읽고 있습니다.');render();
    initialTimer=setTimeout(()=>{if(current===epoch&&ready)send(INITIAL_READ).catch(handleError);},3000);
  }catch(error){
    if(current!==epoch)return;
    const failedStage=connectStage;
    if(chosen)chosen.removeEventListener('gattserverdisconnected',disconnected);
    releaseGatt(chosen);clearConnection();
    log(`${failedStage} 실패 · ${error.name} · ${error.message}`);
    if(error.name==='NotFoundError')message('기기 선택이 취소됐거나 Niagara를 찾지 못했습니다.');
    else message(`${failedStage}: ${connectionErrorMessage(error,browser,appleMobile)} [${error.name}: ${error.message}]`,true);
  }finally{if(current===epoch){busy=false;render();}}
}

function send(data){
  const current=epoch;
  const operation=writeQueue.then(async()=>{
    if(current!==epoch||!ready||!device?.gatt?.connected||!characteristic)throw new Error('가습기를 먼저 연결해 주세요');
    log(`TX ${hex(data)}`);
    const method=await writePacket(characteristic,data);
    log(`쓰기 완료 · ${method}`);
  });
  writeQueue=operation.catch(()=>{});return operation;
}
function notification(event){
  const view=event.target.value;
  const bytes=new Uint8Array(view.buffer,view.byteOffset,view.byteLength);log(`RX ${hex(bytes)}`);
  const next=parseStatus(view);if(!next)return;
  const previousFault=state?.fault;
  state=next;lastUpdate=Date.now();
  if(previousFault&&!state.fault&&!pending)message("기기 오류가 해제되었습니다.");
  if(pending){
    const match=pending.kind==='timer'?state.timer===pending.value:pending.kind==='mode'?state.mode===pending.value:state.preset===pending.value&&state.target===HUMIDITIES[pending.value];
    if(match){if(pending.kind==='timer'){countdown=pending.value?{hours:pending.value,deadline:pending.issued+pending.value*3600000}:null;saveCountdown();}message(`${titles[pending.kind]} · ${label(pending.kind,pending.value)} 적용됨`);pending=null;}
  }
  if(countdown&&countdown.hours!==state.timer){countdown=null;saveCountdown();}
  if(!pending&&$('message').textContent==='연결되었습니다. 초기 상태를 읽고 있습니다.')message('가습기 상태를 수신하고 있습니다.');
  render();
}
function label(kind,value){return kind==='timer'?(value?`${value}시간`:'예약 해제'):kind==='mode'?MODES[value]:`${HUMIDITIES[value]}%`;}
function openPanel(kind){panel=panel===kind?null:kind;renderOptions();}
function renderOptions(){
  $('choices').hidden=!panel;
  document.querySelectorAll('[data-panel]').forEach(el=>{el.classList.toggle('active',el.dataset.panel===panel);el.setAttribute('aria-expanded',String(el.dataset.panel===panel));});
  if(!panel){renderedOptionsKey=null;return;}
  const currentValue=state?(panel==='timer'?state.timer:panel==='mode'?state.mode:state.preset):null;
  const optionsKey=`${panel}:${currentValue}`;
  if(renderedOptionsKey===optionsKey)return;
  renderedOptionsKey=optionsKey;
  $('choices-title').textContent=titles[panel];$('options').replaceChildren();
  const length=panel==='timer'?13:panel==='mode'?9:5;
  for(let value=0;value<length;value++){
    const kind=panel;const selected=state&&(kind==='timer'?state.timer===value:kind==='mode'?state.mode===value:state.preset===value);
    const button=document.createElement('button');button.className=`option${selected?' selected':''}`;button.textContent=`${label(kind,value)}${selected?' ✓':''}`;button.setAttribute('aria-label',`${titles[kind]} ${label(kind,value)}`);
    button.addEventListener('click',()=>apply(kind,value));$('options').append(button);
  }
}
async function apply(kind,value){
  if(!ready||!state)return;
  pending={kind,value,issued:Date.now()};panel=null;renderOptions();message('기기에 적용 중…');
  try{await send(command(kind,value));}catch(error){pending=null;handleError(error);}
}
function handleError(error){log(`오류 · ${error.name} · ${error.message}`);message(`${connectionErrorMessage(error,browser,appleMobile)} [${error.name}: ${error.message}]`,true);}
function renderTimer(){
  const active=state&&state.timer>0;
  const estimated=active&&countdown&&countdown.hours===state.timer;
  $('timer-value').textContent=!state?'—':!active?'예약 꺼짐':estimated?`약 ${remainingText(countdown.deadline)}`:'남은 시간 —';
  $('timer-value').classList.toggle('countdown',!!active);
  $('timer-detail').textContent=active?`/ ${state.timer}시간 설정`:'';$('countdown-note').hidden=!active;
}
function render(){
  $('badge').textContent=ready?'연결됨':busy?'연결 중':'미연결';$('badge').classList.toggle('connected',ready);
  $('connection-description').textContent=ready?(state?'가습기 상태 수신 중':'가습기 상태를 기다립니다'):busy?`${connectStage} 중…`:'휴대폰의 Bluetooth로 가습기를 연결하세요.';
  $('connect').hidden=ready;$('connect').disabled=busy||!window.isSecureContext||!hasBluetooth;
  $('disconnect').hidden=!device?.gatt?.connected&&!busy;$('disconnect').textContent=busy?'연결 취소':'연결 해제';$('retry').hidden=!ready;
  $('humidity').textContent=state?.humidity??'—';$('temperature').textContent=state?.temperature??'—';$('water').textContent=state?.water??'—';
  $('target-value').textContent=state?`${state.target}%`:'—';$('mode-value').textContent=state?(MODES[state.mode]??`모드 ${state.mode}`):'—';
  document.querySelectorAll('[data-panel]').forEach(el=>el.disabled=!ready||!state);
  $('updated').textContent=state?`마지막 수신 ${new Date(lastUpdate).toLocaleTimeString('ko-KR')}`:`${browser} · Web Bluetooth ${hasBluetooth?'지원':'미지원'}`;
  const faults=['','커버를 확인해 주세요','물이 부족합니다','팬 모터를 확인해 주세요','펌프 모터를 확인해 주세요','수위 센서를 확인해 주세요','온도 센서를 확인해 주세요','UV 램프를 확인해 주세요','캘리브레이션 오류'];
  if(state?.fault)message(faults[state.fault]??`기기 오류 ${state.fault}`,true);
  renderTimer();renderOptions();
}
$('connect').addEventListener('click',connect);$('disconnect').addEventListener('click',disconnect);
$('retry').addEventListener('click',()=>send(INITIAL_READ).then(()=>message('초기 읽기를 다시 요청했습니다.')).catch(handleError));
document.querySelectorAll('[data-panel]').forEach(el=>el.addEventListener('click',()=>openPanel(el.dataset.panel)));
$('close-choices').addEventListener('click',()=>{panel=null;renderOptions();});
$('log-toggle').addEventListener('click',()=>{$('log-panel').hidden=!$('log-panel').hidden;});
$('copy-log').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(lines.join('\n'));message('통신 기록을 복사했습니다.');}catch{message('기록을 길게 눌러 복사해 주세요.');}});
function releaseForNavigation(){
  if(navigationReleased)return;
  navigationReleased=true;epoch++;clearTimeout(initialTimer);
  if(characteristic)characteristic.removeEventListener('characteristicvaluechanged',notification);
  if(device)device.removeEventListener('gattserverdisconnected',disconnected);
  releaseGatt(device);characteristic=null;ready=false;busy=false;pending=null;state=null;
}
window.addEventListener('beforeunload',releaseForNavigation);
window.addEventListener('pagehide',releaseForNavigation);
window.addEventListener('pageshow',event=>{
  if(event.persisted){navigationReleased=false;clearConnection();message('페이지를 떠날 때 연결을 해제했습니다. 다시 연결해 주세요.');}
  else if(ready&&!device?.gatt?.connected)clearConnection();
});
setInterval(()=>{renderTimer();if(pending&&Date.now()-pending.issued>8000)message('기기 응답을 기다리고 있습니다.');},1000);
if(!window.isSecureContext){$('setup').hidden=false;message('휴대폰에서 Bluetooth를 사용하려면 아래 HTTPS 준비를 완료해 주세요.',true);}
else if(!hasBluetooth)message('이 브라우저 환경에서는 Web Bluetooth를 사용할 수 없습니다. 아래 브라우저 연결 진단을 확인해 주세요.',true);
const localServer=location.hostname==='localhost'||location.hostname==='127.0.0.1'||/^192\.168\./.test(location.hostname)||/^10\./.test(location.hostname);
$('https-link').href=localServer?`https://${location.hostname==='localhost'?'localhost':location.hostname}:8443/`:new URL('./',location.href).href;
$('ios-support').hidden=!(appleMobile&&!hasBluetooth);
if(appleMobile&&!hasBluetooth&&window.isSecureContext)message('iPhone에서 직접 연결하려면 아래 안내에 따라 Bluefy 같은 BLE 지원 브라우저로 열어 주세요.',true);
render();

$('environment-browser').textContent=browser;
$('environment-https').textContent=window.isSecureContext?'정상 · 보안 연결':'보안 연결 아님 · HTTPS로 접속 필요';
$('environment-bluetooth').textContent=hasBluetooth?'지원 · 기기 선택 가능':'사용 불가 · 최신 버전 및 사이트 권한 확인';
$('environment-hint').textContent=appleMobile&&!hasBluetooth?'iPhone Safari/일반 Chrome의 기본 환경은 Web Bluetooth를 제공하지 않습니다. iPhone 연결 안내를 확인해 주세요.':hasBluetooth?'삼성 인터넷과 Chrome은 기기 선택 권한을 각각 받습니다. Chrome에서 연결 해제한 뒤 이 브라우저에서 Niagara를 다시 선택하세요.':'삼성 인터넷을 최신 버전으로 업데이트하고 HTTPS 주소로 접속해 주세요. 계속 사용 불가하면 삼성 인터넷 버전과 이 진단 내용을 알려주세요.';

document.documentElement.dataset.appReady="true";
