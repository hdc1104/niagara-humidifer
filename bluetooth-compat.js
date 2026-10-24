/** Select by capabilities, never by browser name. Do not retry a failed write:
 * it may already have reached the humidifier. */
export async function writePacket(characteristic, packet) {
  const properties = characteristic.properties || {};
  if (properties.write) {
    if (typeof characteristic.writeValueWithResponse === 'function') {
      await characteristic.writeValueWithResponse(packet);
      return '응답 있는 쓰기';
    }
    if (typeof characteristic.writeValue === 'function') {
      await characteristic.writeValue(packet);
      return '기존 GATT 쓰기 API';
    }
  }
  if (properties.writeWithoutResponse) {
    if (typeof characteristic.writeValueWithoutResponse === 'function') {
      await characteristic.writeValueWithoutResponse(packet);
      return '응답 없는 쓰기';
    }
    if (typeof characteristic.writeValue === 'function') {
      await characteristic.writeValue(packet);
      return '기존 GATT 쓰기 API';
    }
  }
  throw new Error('이 브라우저에서 지원하는 Bluetooth 쓰기 API가 없습니다. 브라우저를 최신 버전으로 업데이트해 주세요.');
}

export function isAppleMobile(userAgent, platform = "", maxTouchPoints = 0) {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function browserLabel(userAgent) {
  if (/Bluefy/i.test(userAgent)) return "Bluefy (iPhone/iPad)";
  const iosChrome = /CriOS\/([\d.]+)/.exec(userAgent);
  if (iosChrome) return `iPhone Chrome ${iosChrome[1]}`;
  const samsung = /SamsungBrowser\/([\d.]+)/.exec(userAgent);
  if (samsung) return `삼성 인터넷 ${samsung[1]}`;
  const chrome = /Chrome\/([\d.]+)/.exec(userAgent);
  if (chrome) return `Chrome ${chrome[1]}`;
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iPhone/iPad 브라우저';
  return '현재 브라우저';
}

export function connectionErrorMessage(error, browser, appleMobile = false) {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    if (appleMobile) return 'iPhone 설정 → 개인정보 보호 및 보안 → Bluetooth에서 BLE 브라우저(Bluefy)의 접근을 허용하고 HTTPS 접속을 확인해 주세요.';
    return `${browser}의 Bluetooth 사이트 권한과 Android 앱의 주변 기기 권한을 확인해 주세요. HTTPS 접속도 확인해 주세요.`;
  }
  if (error.name === 'NetworkError') {
    return '가습기에 연결하지 못했습니다. 다른 앱·Chrome 탭의 연결을 해제하고 가습기 가까이에서 다시 연결해 주세요.';
  }
  return error.message || '연결 상태를 확인해 주세요.';
}
