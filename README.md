# Niagara Humidifier Web

Niagara BLE 가습기를 휴대폰의 웹브라우저에서 제어하는 비공식 웹앱입니다.

**웹앱 주소:** https://hdc1104.github.io/niagara-humidifer/  
GitHub Pages 게시가 완료된 후 위 주소에서 이용할 수 있습니다.

## 만들어진 배경

Niagara 가습기를 기존 안드로이드 앱 외의 환경에서도 사용하기 위해 시작했습니다. 제공된 Niagara APK의 통신 동작을 분석하고 실제 가습기와 통신하면서 BLE 명령과 상태 데이터를 확인했습니다. 이를 바탕으로 macOS 앱을 만들었고, 별도 설치 없이 휴대폰에서도 사용할 수 있도록 Web Bluetooth 웹앱으로 확장했습니다.

Android Chrome에서 연결과 제어를 확인했으며, Samsung Internet에서는 기기 선택창이 열리지 않는 문제를 점검하고 사용자가 권한 설정을 변경한 뒤 동작을 확인했습니다. iPhone에는 BLE 지원 브라우저를 이용하는 방법을 안내합니다. GitHub Pages를 이용하면 개발용 컴퓨터를 켜두거나 로컬 인증서를 설치할 필요 없이 HTTPS로 웹앱을 열 수 있습니다.

이 프로젝트는 가습기 제조사와 관계없는 개인 프로젝트입니다. BLE 호환 동작을 구현하기 위해 원본 Android 앱을 디스어셈블하여 통신 정보를 참고했으며, 분석 결과를 바탕으로 웹용 코드를 새로 작성했습니다. 별도의 독립 팀을 둔 클린룸 개발로 주장하지 않습니다. 원본 APK, 제조사 앱의 이미지 및 원본 코드는 배포하지 않습니다. Niagara 명칭과 관련 상표의 권리는 해당 권리자에게 있습니다.

## 주요 기능

- BLE 장치 검색, 연결 및 연결 해제
- 현재 습도, 온도, 물량 단계 표시
- 목표 습도: 40%, 45%, 50%, 55%, 60%
- 운전 모드: 정지, 1~6단, 자동, 필터 건조
- 꺼짐 예약: 해제 또는 1~12시간
- 설정 선택 즉시 기기에 적용
- 페이지 이동·닫기 시 연결 해제 시도
- 기본 BLE 점검 화면과 연결 진단 기록

물량은 기기가 보내는 0~6 단계이며 리터나 잔량 백분율이 아닙니다. 예약의 남은 시간은 확인된 설정 시각을 바탕으로 브라우저에서 계산하는 추정값이며, 기기가 보내는 초 단위 잔여 시간이 아닙니다. 브라우저나 OS가 강제 종료되면 종료 이벤트가 실행되지 않을 수 있습니다.

## 지원 환경

| 환경 | 사용 방법 및 확인 범위 |
| --- | --- |
| Android Chrome | Web Bluetooth 사용. 실제 연결 및 동작 확인 |
| Android Samsung Internet | 실제 동작 확인. 브라우저 및 OS 권한 설정에 따라 차이 있음 |
| iPhone / iPad | Bluefy 등 Web Bluetooth 지원 브라우저 필요. 실기기 연결은 아직 미검증 |
| macOS / 기타 데스크톱 | Web Bluetooth를 제공하는 브라우저와 BLE 어댑터 필요. 이 웹앱의 전체 조합은 미검증 |

일반 iPhone Safari나 Web Bluetooth를 제공하지 않는 브라우저에서는 사이트만으로 BLE 기능을 추가할 수 없습니다. iPhone 사용법은 [iPhone 안내](ios.html)를 참고하세요.

## 사용 방법

1. 휴대폰의 Bluetooth를 켜고 가습기 가까이에서 웹앱의 HTTPS 주소를 엽니다.
2. 기존 Niagara 앱이나 다른 기기가 가습기에 연결되어 있다면 연결을 해제합니다.
3. 연결 버튼을 누르고 브라우저의 기기 선택창에서 Niagara 가습기를 선택합니다.
4. 상태가 수신되면 온도·습도·물량을 확인하고 원하는 설정을 선택합니다.
5. 사용을 마칠 때 연결 해제 버튼을 누릅니다.

Samsung Internet에서 기기 선택창이 열리지 않으면 사이트의 Bluetooth 사용 허용과 Android의 브라우저 앱 권한을 확인하세요. 이 프로젝트의 테스트 환경에서는 사용자가 권한 선택을 **“앱이 계속 작동하도록 허용”에서 “허용”으로 변경한 뒤** 선택창이 열렸습니다. 메뉴 이름은 OS와 브라우저 버전에 따라 다를 수 있습니다.

연결이 안 되면 [기본 BLE 점검](ble-check.html)을 사용하세요. 진단을 공유할 때는 장치 이름 등 공개하고 싶지 않은 정보를 확인하세요.

## 데이터 처리

BLE 통신은 방문자의 브라우저와 가까이에 있는 가습기 사이에서 직접 이루어집니다. 별도 제어 서버나 사용자 계정은 없으며 앱 코드에는 상태·진단 정보를 외부로 전송하는 기능이 없습니다. 예약 계산용 정보는 브라우저의 로컬 저장소에 남을 수 있습니다. 웹 파일 요청에는 GitHub Pages 호스팅 서비스의 데이터 처리 정책이 적용됩니다.

인터넷을 통해 멀리 있는 가습기에 접속하는 서비스는 아닙니다. 사용자의 장치가 가습기의 BLE 통신 범위 안에 있어야 합니다.

## GitHub Pages로 직접 게시하기

이 저장소는 빌드 과정이나 npm 의존성이 없는 정적 HTML/CSS/JavaScript 앱입니다.

1. 저장소의 **Settings → Pages**를 엽니다.
2. Source에서 **Deploy from a branch**를 선택합니다.
3. 브랜치는 **main**, 폴더는 **/(root)**로 지정하고 저장합니다.
4. 배포 완료 후 표시되는 HTTPS 주소로 접속합니다.

리소스 경로는 상대 경로이므로 프로젝트 Pages 하위 경로에서도 사용할 수 있습니다. 개발 시에는 localhost의 정적 웹서버를 사용할 수 있지만, 휴대폰에서 접근하는 주소는 유효한 HTTPS여야 합니다.

주요 파일은 `app.js`(화면·연결), `protocol.js`(명령·상태 해석), `bluetooth-compat.js`(브라우저 호환), `gatt-session.js`(연결 관리)입니다. `ble-check.html`은 진단 화면, `ios.html`은 iPhone 안내입니다.

## 라이선스 및 이용 조건

Copyright (c) 2026 hdc1104.

이 저장소에서 새로 작성한 웹앱 코드와 문서는 [비상업적 이용 라이선스](LICENSE)에 따라 제공됩니다.

- 비상업적 목적의 사용, 복제, 수정 및 재배포를 허용합니다.
- 원본 또는 수정본을 배포할 때 저작권 표시와 라이선스 전문을 함께 제공해야 합니다.
- 판매, 유료 서비스 제공, 광고·후원 수익 창출 등 상업적 이용은 저작권자의 사전 서면 허락이 필요합니다. 허락 요청은 이 저장소의 이슈를 통해 문의할 수 있습니다.
- 소프트웨어는 보증 없이 제공됩니다. 지원 기기·펌웨어별 동작을 보장하지 않으며 제조사의 사용 지침을 함께 따라야 합니다.
- 제조사의 소프트웨어·상표 등 제3자의 권리를 사용할 권한을 부여하지 않습니다.

상업적 이용을 제한하므로 OSI 정의의 오픈소스 라이선스는 아닙니다. 자세한 허용 범위와 조건은 LICENSE를 확인하세요. 원본 앱 분석 경위와 권리 범위는 [제3자 권리 고지](THIRD_PARTY_NOTICES.md)에 설명합니다. 비상업적 조건이나 출처 고지만으로 제3자 권리 문제가 해소되는 것은 아닙니다.

## 참고 자료

- [GitHub Pages 소개](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages 게시 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Chrome Web Bluetooth 안내](https://developer.chrome.com/docs/capabilities/bluetooth)
- [Samsung Internet Web Bluetooth](https://samsunginternet.github.io/docs/web-bluetooth)
- [Bluefy 사용 안내](https://bluefy.app/guide.html)
