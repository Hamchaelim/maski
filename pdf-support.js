// Only static library assets are loaded over the network. PDF bytes stay in memory.
let pdfLibraryPromise;
let pdfBusy = false;
let pdfJob = 0;
const pdfDrop = document.getElementById('pdfDrop');
const pdfInput = document.getElementById('pdfFile');
const pdfStatus = document.getElementById('pdfStatus');

function getPdfLibrary() {
  if (!pdfLibraryPromise) {
    pdfLibraryPromise = import('./vendor/pdf.mjs').then(lib => {
      lib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', location.href).href;
      return lib;
    }).catch(error => { pdfLibraryPromise = null; throw error; });
  }
  return pdfLibraryPromise;
}

function pdfPageText(items) {
  let result = '', previous = null;
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    if (previous && Math.abs(item.transform[5] - previous.transform[5]) > 3 && !result.endsWith('\n')) result += '\n';
    else if (previous && !result.endsWith('\n')) {
      const gap = item.transform[4] - (previous.transform[4] + previous.width);
      if (gap > Math.max(2, Math.abs(item.transform[0]) * .15)) result += ' ';
    }
    result += item.str;
    if (item.hasEOL) result += '\n';
    previous = item;
  }
  return result.trim();
}

async function processPdf(file) {
  if (pdfBusy) return;
  const job = ++pdfJob;
  lastPdfName = null; lastWb = null; lastText = '';
  document.getElementById('result').classList.remove('on');
  pdfStatus.textContent = '';
  if (!/\.pdf$/i.test(file.name)) { pdfStatus.textContent = 'PDF 파일을 선택해 주세요.'; return; }
  if (file.size > 20 * 1024 * 1024) { pdfStatus.textContent = '20MB 이하의 PDF를 선택해 주세요.'; return; }
  pdfBusy = true; pdfDrop.disabled = true;
  let task;
  try {
    pdfStatus.textContent = '내 브라우저에서 PDF를 읽고 있습니다…';
    const lib = await getPdfLibrary();
    task = lib.getDocument({data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, useSystemFonts: true,
      cMapUrl: new URL('./vendor/cmaps/', location.href).href, cMapPacked: true,
      standardFontDataUrl: new URL('./vendor/standard_fonts/', location.href).href,
      wasmUrl: new URL('./vendor/wasm/', location.href).href});
    const pdf = await task.promise;
    if (pdf.numPages > 50) throw new Error('50쪽 이하의 PDF를 선택해 주세요.');
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      if (job !== pdfJob) return;
      pdfStatus.textContent = `내 브라우저에서 ${i} / ${pdf.numPages}쪽을 읽고 있습니다…`;
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = pdfPageText(content.items);
      // Reject the whole document if any page has no text: do not silently omit scans.
      if (!text) throw new Error(`${i}쪽에서 텍스트를 읽을 수 없습니다. 스캔본이나 빈 페이지가 포함된 PDF는 지원하지 않습니다.`);
      pages.push(text);
      page.cleanup();
    }
    if (job !== pdfJob) return;
    processText(pages.map((text,i) => `[${i+1}쪽]\n${text}`).join('\n\n'));
    lastPdfName = null;
    pdfStatus.textContent = `${pages.length}쪽 텍스트 처리 완료. 누락·오탐과 원문 대비 내용 손실을 확인해 주세요. 이미지·서명·도장은 출력에 포함되지 않습니다.`;
  } catch (error) {
    if (job === pdfJob) {
      lastPdfName = null; lastText = '';
      document.getElementById('result').classList.remove('on');
      pdfStatus.textContent = error.name === 'PasswordException' ? '암호가 걸린 PDF는 지원하지 않습니다. 암호 없는 사본으로 시험해 주세요.' : (error.message && /쪽|20MB/.test(error.message) ? error.message : 'PDF를 읽지 못했습니다. 파일 손상·텍스트 포함 여부와 브라우저 지원을 확인해 주세요.');
    }
  } finally {
    if (task) await task.destroy().catch(() => {});
    pdfBusy = false; pdfDrop.disabled = false; pdfInput.value = '';
  }
}

pdfDrop.onclick = () => pdfInput.click();
pdfDrop.ondragover = event => { event.preventDefault(); pdfDrop.classList.add('hover'); };
pdfDrop.ondragleave = () => pdfDrop.classList.remove('hover');
pdfDrop.ondrop = event => { event.preventDefault(); pdfDrop.classList.remove('hover'); if (event.dataTransfer.files[0]) processPdf(event.dataTransfer.files[0]); };
pdfInput.onchange = event => { if (event.target.files[0]) processPdf(event.target.files[0]); };
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { ++pdfJob; }));

let pdfFontPromise;
async function createTextPdf(text) {
  if (!pdfFontPromise) pdfFontPromise = fetch('./vendor/NanumGothic-Regular.ttf').then(response => {
    if (!response.ok) throw new Error('한글 PDF 글꼴을 불러오지 못했습니다.');
    return response.arrayBuffer();
  }).then(buffer => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }).catch(error => { pdfFontPromise = null; throw error; });
  const font = await pdfFontPromise;
  const doc = new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
  doc.addFileToVFS('NanumGothic.ttf',font);
  doc.addFont('NanumGothic.ttf','NanumGothic','normal');
  doc.setFont('NanumGothic'); doc.setFontSize(11);
  let y = 20;
  for (const paragraph of text.split('\n')) {
    const lines = doc.splitTextToSize(paragraph || ' ',170);
    for (const line of lines) {
      if (y > 277) { doc.addPage(); y = 20; }
      doc.text(line,20,y); y += 6;
    }
  }
  return doc;
}
document.getElementById('samplePdf').onclick = async () => {
  if (pdfBusy) return;
  try {
    pdfStatus.textContent = '가상 자료로 샘플 PDF를 만들고 있습니다…';
    const doc = await createTextPdf('성명: 김민수\n주민번호: 900101-1234567\n연락처: 010-1234-5678\n급여: 3,200,000원\n사업자번호: 123-45-67890');
    await processPdf(new File([doc.output('arraybuffer')],'샘플.pdf',{type:'application/pdf'}));
  } catch (error) { pdfStatus.textContent = '샘플을 준비하지 못했습니다. 새로고침 후 다시 시도해 주세요.'; }
};
