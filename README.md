# MASKI · 마스키

**고객 정보는 지키고, 문서의 맥락은 그대로.**

전문직 사무소의 생성형 AI 활용을 위한 로컬 가명 처리 서비스 **마스키(MASKI)**의 랜딩페이지입니다. 가천대학교 가천코코네스쿨(GCS) 드림즈 팀이 솔루션 수요를 검증하기 위해 운영합니다.

- **웹사이트:** [hamchaelim.github.io/maski](https://hamchaelim.github.io/maski/)
- **GitHub:** [Hamchaelim/maski](https://github.com/Hamchaelim/maski)
- **문의:** [co9kei6@gachon.ac.kr](mailto:co9kei6@gachon.ac.kr)

## 현재 제공하는 기능

- 노무·세무·법률 업무의 가상 문서로 원본 → 가명 처리 → AI 초안 → 원문 복원 흐름을 확인합니다.
- 체험 신청(내부 값 preregistration)은 이름·이메일을 받습니다. 전화번호와 직군은 선택 입력이며(선택 동의 필요), 직군이 기타면 직접 입력을 받습니다.
- 기업 도입 문의는 회사·사무소 이름과 회사 규모를 추가로 받습니다.
- 방문·버튼 클릭·입력 시작·신청 완료를 구분해 측정합니다. 유입 경로·버튼 위치별로 비교할 수 있습니다.
- 신청 정보는 공개 조회를 차단한 Supabase 테이블에 저장합니다. 사용자 승인에 따라 6개월이 지난 기록은 일일 작업으로 삭제합니다.

현재 문서 화면은 미리 작성된 가상 사례입니다. 실제 고객 파일 업로드, 업무 텍스트 입력, 자동 탐지·복원, 외부 AI 호출, 결제 기능은 연결되어 있지 않습니다. 이메일 자동 알림도 연결하지 않았습니다.

## 구성

| 파일 | 역할 |
|---|---|
| index.html | 랜딩페이지, 체험 신청·기업 문의 폼 |
| light.css, maski.css, leads.css | 밝은 테마, MASKI 브랜드, 신청 폼 스타일 |
| assets/maski-logo.png | 사용자 제공 MASKI 로고 원본 |
| demo.js | 가상 문서의 단계별 화면 전환 |
| config.js | Supabase 공개 연결 정보와 문의 이메일 |
| leads.js | 입력 검증, 신청 저장, 행동 측정 |
| privacy.html | 개인정보 처리방침(개인정보 수집·이용 및 측정 안내) |
| terms.html | 서비스 이용 안내 |
| sections.css | 고객정보 확인 섹션·하단 경로 카드·FAQ 제목·푸터 스타일 |
| supabase/ | 저장 구조, 집계 쿼리, 보고서 뷰, 보유기간 설정 |
| [MEASUREMENT.md](MEASUREMENT.md) | 집계 확인 방법과 테스트·광고 링크 |

공개 설정에는 Publishable key만 사용합니다. Secret key나 service_role 키를 소스에 넣지 않습니다. 이름·이메일·전화번호·회사 정보는 클릭 이벤트에 포함하지 않습니다.

## 실행·배포

별도 빌드 과정이 없는 HTML·CSS·JavaScript 프로젝트입니다. 로컬 HTTP 서버로 저장소 루트를 열어 확인할 수 있습니다. 운영 사이트는 GitHub Pages의 main 브랜치 루트에서 게시합니다.

GitHub 저장소와 사이트 이름은 **maski**, 서비스 표기는 **마스키(MASKI)**입니다. 기존 신청·측정 데이터와 연결 호환성을 위해 데이터베이스의 내부 테이블·함수 식별자는 유지합니다.

## 팀

가천코코네스쿨(GCS) 9기 · 드림즈 — 남성수 · 임아메드 · 함채림

## 글꼴

한글 UI·본문은 SUIT Variable, 영문 제목은 Poppins ExtraBold를 사용합니다. 폰트는 assets/fonts에서 직접 제공하며 외부 폰트 서버를 호출하지 않습니다. 각 폰트의 SIL Open Font License는 같은 폴더에 포함했습니다.

## 화면 디자인

현재 랜딩페이지는 검은 배경, 보라색 조명 효과와 반투명 문서 카드를 조합한 테마입니다. premium.css가 화면과 신청 폼의 최종 스타일을 담당하며, 참고 이미지의 가격·평점·사용자 수는 사용하지 않았습니다.
