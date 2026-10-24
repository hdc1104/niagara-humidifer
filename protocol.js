export const SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const CHARACTERISTIC = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const HUMIDITIES = [40,45,50,55,60];
export const MODES = ['정지','1단','2단','3단','4단','5단','6단','자동','필터 건조'];
export function command(kind, value) {
  const definitions = {mode:[0x31,8],timer:[0x33,12],humidity:[0x34,4]};
  const definition = definitions[kind];
  if (!definition || !Number.isInteger(value) || value < 0 || value > definition[1]) throw new RangeError('설정값을 확인해 주세요');
  return Uint8Array.of(0x43,definition[0],value,0);
}
export const INITIAL_READ = Uint8Array.of(0x43,0x44,0,0);
export function parseStatus(value) {
  const bytes = value instanceof DataView ? new Uint8Array(value.buffer,value.byteOffset,value.byteLength) : new Uint8Array(value);
  if (bytes.length !== 20 || bytes[19] !== 0x58) return null;
  const signed = n => n > 127 ? n-256 : n;
  return {temperature:signed(bytes[6]),humidity:signed(bytes[7]),water:bytes[8],mode:bytes[9],fault:bytes[12],timer:bytes[13],target:bytes[14],preset:bytes[16]};
}
export function remainingText(deadline, now=Date.now()) {
  const seconds = Math.max(0,Math.ceil((deadline-now)/1000));
  return `${Math.floor(seconds/3600)}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
