/* Classic script: report module-load/syntax errors even in an older browser. */
setTimeout(function () {
  if (document.documentElement.getAttribute('data-app-ready') === 'true') return;
  var error = document.getElementById('connection-error');
  if (error) {
    error.hidden = false;
    error.textContent = '웹앱 스크립트를 불러오지 못했습니다. 새로고침하거나 아래의 기본 BLE 연결 점검을 열어 주세요.';
  }
}, 5000);
