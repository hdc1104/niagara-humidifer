export function withTimeout(operation, milliseconds, stage) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(`${stage} 응답이 ${milliseconds / 1000}초 동안 없습니다. 연결을 정리한 뒤 다시 시도해 주세요.`);
      error.name = 'TimeoutError';
      reject(error);
    }, milliseconds);
    Promise.resolve(operation).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

// Also call while connect() is pending; connected=false does not mean no pending request.
export function releaseGatt(device) {
  if (device && device.gatt && typeof device.gatt.disconnect === 'function') device.gatt.disconnect();
}
