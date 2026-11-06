'use strict';
// These are authored fictional scenarios. No files, input, AI requests, or user logging.
// Each scenario: source (원본), map ([원래 값, 가명]), answer (가명으로 작성된 AI 초안).
// masked/restored are derived from map so every stage stays consistent.
const rawScenarios = {
  labor: {
    title: '직장 내 괴롭힘 신고 조사 정리',
    source: `문서번호: LAB-2026-0083 · 인사기밀
의뢰기관: 주식회사 늘봄기술
신고인: 한채원 대리 (사번 NB-0238, 010-0000-2381)
피신고인: 김예준 팀장 (사번 NB-0107)
참고인: 정유민 과장 (인사총무팀)

2026.08.26 정기회의 중 참석자 6명 앞 공개 질책
2026.09.03 17:40 익일 오전까지 120페이지 보고서 수정 지시
2026.09.18 인사팀 신고 접수

8월 26일 회의 참석자에게 확인할 질문지를 작성해 주세요.`,
    map: [['늘봄기술','[회사_1]'],['한채원','[이름_1]'],['NB-0238','[사번_1]'],['010-0000-2381','[전화_1]'],['김예준','[이름_2]'],['NB-0107','[사번_2]'],['정유민','[이름_3]']],
    answer: `[회사_1] 운영기획팀 회의 참석자 확인 질문

1. 2026.08.26 정기회의에서 [이름_2] 팀장이
   [이름_1] 대리에게 한 발언을 기억하십니까?
2. 당시 발언 내용과 분위기를 구체적으로 말씀해 주세요.
3. 비슷한 공개 질책이 이전에도 있었습니까?
4. 2026.09.03 보고서 수정 업무가
   다른 팀원에게도 배정되었습니까?

※ 답변 내용은 조사 목적 외로 사용하지 않습니다.`
  },
  tax: {
    title: '3분기 거래 증빙 확인 요청',
    source: `문서번호: TAX-2026-0392 · 고객자료
의뢰사업자: 모의커머스 (대표 이나율)
연락처: 010-0000-4018 · nayul.lee@example.com

07.08 가상유통 상품 매입 5,280,000원
07.22 예시물류 배송대행 1,375,000원
      지급계좌 가상은행 000-0000-000000
08.11 청람디자인 상세페이지 제작 2,640,000원
09.03 가상유통 상품 추가 매입 3,960,000원

9월 매입분·청람디자인 세금계산서가 확인되지 않습니다.
대표자에게 보낼 자료 요청 메일을 작성해 주세요.`,
    map: [['모의커머스','[상호_1]'],['이나율','[이름_1]'],['010-0000-4018','[전화_1]'],['nayul.lee@example.com','[이메일_1]'],['가상유통','[거래처_1]'],['예시물류','[거래처_2]'],['000-0000-000000','[계좌_1]'],['청람디자인','[거래처_3]']],
    answer: `받는 사람: [이메일_1]
제목: [상호_1] 2026년 3분기 증빙자료 요청

[이름_1] 대표님, 3분기 거래 대사 중
아래 건의 증빙 확인이 필요합니다.

- 09.03 [거래처_1] 매입 3,960,000원: 세금계산서·입금액
- 08.11 [거래처_3] 제작 2,640,000원: 세금계산서 수취 여부
- 07.22 [거래처_2] 1,375,000원: 공급자 정보

7~9월 사업용 계좌 거래내역도 함께 보내주세요.`
  },
  law: {
    title: '용역계약 해지 · 선급금 반환 검토',
    source: `문서번호: LEG-2026-0147 · 대외비
의뢰인: 김서린 (010-0000-1427)
이메일: seorin.kim@example.com
상대방: 주식회사 청람데이터랩 (대표이사 박지후)
상대방 담당자: 이도윤

2026.03.12 용역계약 체결, 대금 32,000,000원
같은 날 선급금 16,000,000원 송금
2026.05.30 납품기한 경과, 핵심 기능 미완성
2026.06.08 계약 해지 통보 및 선급금 반환 요구

상대방에게 보낼 선급금 반환 요청서 초안을 작성해 주세요.`,
    map: [['김서린','[이름_1]'],['010-0000-1427','[전화_1]'],['seorin.kim@example.com','[이메일_1]'],['청람데이터랩','[회사_1]'],['박지후','[이름_2]'],['이도윤','[이름_3]']],
    answer: `수신: 주식회사 [회사_1] 대표이사 [이름_2]
참조: 담당자 [이름_3]

[이름_1]은 2026.03.12 귀사와 용역계약을 체결하고
선급금 16,000,000원을 지급하였습니다.
납품기한(2026.05.30)이 지나도록 예약 변경·
관리자 통계 기능이 완성되지 않아
2026.06.08 계약 해지를 통보하였습니다.

선급금 16,000,000원의 반환을 요청드리며,
정산 의견은 서면으로 회신해 주시기 바랍니다.`
  }
};
const swap=(text,pairs)=>pairs.reduce((out,[from,to])=>out.split(from).join(to),text);
const scenarios=Object.fromEntries(Object.entries(rawScenarios).map(([key,s])=>[key,{
  title:s.title,source:s.source,answer:s.answer,
  masked:swap(s.source,s.map),
  restored:swap(s.answer,s.map.map(([real,alias])=>[alias,real]))
}]));
const stages = [
  {label:'아직 외부로 보내지 않은 상태',badge:'시작',title:'먼저, 식별정보를 분리합니다.',field:null,foot:'가명 처리를 눌러 식별정보와 업무 내용을 구분해 확인하세요.',button:'가명 처리'},
  {label:'가명 처리된 문서',badge:'식별정보 치환',title:'금액과 사실관계는 남깁니다.',field:'masked',foot:'식별정보는 가명으로 바꾸고, 금액과 사실관계는 유지하는 흐름입니다.',button:'초안 확인'},
  {label:'가명으로 작성된 초안',badge:'초안 확인',title:'AI는 가명을 기준으로 작성합니다.',field:'answer',foot:'가명으로 작성한 초안을 검토한 뒤 원문 복원 단계로 이동하세요.',button:'원문 복원'},
  {label:'원래 정보로 복원한 초안',badge:'원문 복원',title:'초안에는 원래 정보를 되돌립니다.',field:'restored',foot:'고객 이름과 연락처를 확인하고, 문서의 내용과 표현을 최종 검토하세요.',button:'다시 보기'}
];
let currentCase='labor', step=0;
const get=id=>document.getElementById(id);
function markedText(element,text){
  element.replaceChildren();
  for(const part of text.split(/(\[[^\]\n]+\])/g)){
    if(/^\[[^\]\n]+\]$/.test(part)){const mark=document.createElement('mark');mark.textContent=part;element.append(mark);}
    else element.append(document.createTextNode(part));
  }
}
function render(){
  const scenario=scenarios[currentCase], stage=stages[step];
  get('sourceTitle').textContent=scenario.title;
  get('sourceText').textContent=scenario.source;
  for(const [id,key] of [['stageLabel','label'],['stageBadge','badge'],['stageTitle','title'],['stageFoot','foot']])get(id).textContent=stage[key];
  markedText(get('stageText'),stage.field?scenario[stage.field]:'이름 · 연락처 · 식별번호는 가명으로\n금액 · 날짜 · 사실관계는 그대로\n\n원문 → 가명 처리 → AI 초안 → 원문 복원\n\n아래 버튼으로 각 단계를 확인하세요.');
  get('advance').textContent=stage.button;
  window.dispatchEvent(new CustomEvent('maski:workflow',{detail:{step}}));
  get('progress').textContent=`${step+1} / 4 단계`;
  document.querySelectorAll('.steps li').forEach((item,i)=>{item.classList.toggle('active',i<=step);if(i===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
}
document.querySelectorAll('[data-case]').forEach(button=>button.addEventListener('click',()=>{
  currentCase=button.dataset.case;step=0;
  document.querySelectorAll('[data-case]').forEach(item=>{const active=item===button;item.classList.toggle('on',active);item.setAttribute('aria-pressed',String(active));});render();
}));
get('advance').addEventListener('click',()=>{step=(step+1)%stages.length;render();});
get('restart').addEventListener('click',()=>{step=0;render();});
render();
