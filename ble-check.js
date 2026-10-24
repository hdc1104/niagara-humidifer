/* Dependency-free classic JS. Directly invokes the chooser from the click. */
(function () {
  var SERVICE='6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  var CHAR='6e400003-b5a3-f393-e0a9-e50e24dcca9e';
  var device=null, characteristic=null, timeout=null, readTimer=null, token=0, stage='기기 선택창';
  var logEl=document.getElementById('check-log'),messageEl=document.getElementById('check-message');
  var available=!!(navigator.bluetooth&&typeof navigator.bluetooth.requestDevice==='function');
  var samsung=/SamsungBrowser\/([\d.]+)/.exec(navigator.userAgent);
  var chrome=/Chrome\/([\d.]+)/.exec(navigator.userAgent);
  var browser=samsung?'삼성 인터넷 '+samsung[1]:chrome?'Chrome '+chrome[1]:'브라우저 버전 미확인';
  var policy='확인 API 없음';
  try {var featurePolicy=document.permissionsPolicy||document.featurePolicy;if(featurePolicy&&featurePolicy.allowsFeature)policy=String(featurePolicy.allowsFeature('bluetooth'));} catch(e){policy='확인 불가';}
  var summary='진단4 | '+browser+' | HTTPS='+String(window.isSecureContext)+' | BluetoothAPI='+String(available)+' | 사이트정책='+policy;
  document.getElementById('check-environment').textContent=summary;
  var reason=!window.isSecureContext?'인증서가 신뢰된 HTTPS 주소로 접속해야 합니다.':!available?'이 삼성 브라우저 환경에서 Bluetooth API가 노출되지 않습니다. 브라우저 버전과 앱의 주변 기기 권한을 확인해야 합니다.':policy==='false'?'사이트 정책이 Bluetooth API 사용을 차단하고 있습니다.':'API가 제공됩니다. 장치 검색창 열기를 누른 뒤 결과를 확인하세요.';
  document.getElementById('check-reason').textContent=reason;
  document.getElementById('check-copy').onclick=function(){
    var text=summary+'\n'+logEl.textContent;
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){messageEl.textContent='진단을 복사했습니다. 대화에 붙여넣어 주세요.';},function(){messageEl.textContent=summary;});
    else {messageEl.textContent=summary;}
  };
  function log(text){logEl.textContent+=new Date().toLocaleTimeString()+' '+text+'\n';messageEl.textContent=text;}
  function release(){token++;clearTimeout(timeout);clearTimeout(readTimer);if(device&&device.gatt)device.gatt.disconnect();characteristic=null;}
  function startSearch(nameOnly){
    if(!available||!window.isSecureContext){log('선택 API 호출 불가: 보안 환경과 Bluetooth API 표시를 확인해 주세요.');return;}
    release();var current=token,selected=null;stage='기기 선택창';
    var selection,active=navigator.userActivation?String(navigator.userActivation.isActive):'확인 불가';
    try{selection=navigator.bluetooth.requestDevice(nameOnly?{filters:[{namePrefix:'Niagara'}],optionalServices:[SERVICE]}:{acceptAllDevices:true,optionalServices:[SERVICE]});}
    catch(error){log(stage+' '+error.name+': '+error.message);return;}
    log('requestDevice 호출 완료 | 방식='+(nameOnly?'Niagara 이름':'모든 기기')+' | 클릭활성='+active+' | 브라우저 선택창 대기');
    setTimeout(function(){if(current===token&&stage==='기기 선택창')log('선택창 응답 대기 중. 화면에 선택창이 전혀 없다면 진단 복사를 눌러 알려주세요.');},8000);
    selection.then(function(chosen){
      if(current!==token){if(chosen.gatt)chosen.gatt.disconnect();return Promise.reject(new Error('취소됨'));}
      selected=chosen;device=chosen;stage='GATT 연결';log(stage+' '+(device.name||'이름 없음'));
      timeout=setTimeout(function(){if(current===token){release();log(stage+' 시간 초과. 연결을 정리했습니다.');}},25000);
      device.addEventListener('gattserverdisconnected',function(){log('가습기 연결 해제됨');});
      return device.gatt.connect();
    }).then(function(server){
      if(current!==token){if(selected&&selected.gatt)selected.gatt.disconnect();throw new Error('취소됨');}stage='서비스 검색';log(stage);return server.getPrimaryService(SERVICE);
    }).then(function(service){
      if(current!==token){if(selected&&selected.gatt)selected.gatt.disconnect();throw new Error('취소됨');}stage='특성 검색';log(stage);return service.getCharacteristic(CHAR);
    }).then(function(ch){
      if(current!==token){if(selected&&selected.gatt)selected.gatt.disconnect();throw new Error('취소됨');}characteristic=ch;stage='알림 구독';log(stage);
      ch.addEventListener('characteristicvaluechanged',function(event){
        var v=event.target.value;
        if(v.byteLength===20&&v.getUint8(19)===0x58)log('상태 수신 성공: 습도 '+v.getUint8(7)+'%, 온도 '+v.getInt8(6)+'°C, 물량 '+v.getUint8(8)+'/6');
      });
      return ch.startNotifications();
    }).then(function(){
      if(current!==token){if(selected&&selected.gatt)selected.gatt.disconnect();throw new Error('취소됨');}clearTimeout(timeout);log('알림 구독 성공. 3초 뒤 초기 읽기를 요청합니다.');
      readTimer=setTimeout(function(){
        if(current!==token)return;
        var data=new Uint8Array([0x43,0x44,0,0]),result;
        try{
          if(characteristic.properties.write&&typeof characteristic.writeValueWithResponse==='function')result=characteristic.writeValueWithResponse(data);
          else if(characteristic.properties.writeWithoutResponse&&typeof characteristic.writeValueWithoutResponse==='function')result=characteristic.writeValueWithoutResponse(data);
          else if(typeof characteristic.writeValue==='function')result=characteristic.writeValue(data);
          else throw new Error('쓰기 API 없음');
          Promise.resolve(result).catch(function(error){log('초기 읽기 '+error.name+': '+error.message);});
        }catch(error){log('초기 읽기 '+error.name+': '+error.message);}
      },3000);
    }).catch(function(error){if(current!==token)return;release();log(stage+' 실패 '+error.name+': '+error.message);});
  };
  document.getElementById('check-connect').onclick=function(){startSearch(false);};
  document.getElementById('check-name').onclick=function(){startSearch(true);};
  document.getElementById('check-minimal').onclick=function(){
    if(!available||!window.isSecureContext){log('보안 환경과 Bluetooth API를 확인해 주세요.');return;}
    release();var current=token;
    try {
      var promise=navigator.bluetooth.requestDevice({acceptAllDevices:true});
      log('최소 요청 완료: 서비스 UUID 없이 선택창만 요청함');
      promise.then(function(chosen){if(current!==token){if(chosen.gatt)chosen.gatt.disconnect();return;}log('선택창 정상: '+(chosen.name||'기기')+' 선택됨. 이 점검은 가습기에 연결하지 않습니다.');},function(error){if(current===token)log('최소 요청 실패 '+error.name+': '+error.message);});
    } catch(error){log('최소 요청 실패 '+error.name+': '+error.message);}
  };
  document.getElementById('check-disconnect').onclick=function(){release();log('연결 해제를 요청했습니다.');};
  window.addEventListener('beforeunload',release);
  window.addEventListener('pagehide',release);
})();
