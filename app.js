"use strict";

/* =========================
   DOM
========================= */
const codeArea = document.getElementById("codeArea");
const resultFrame = document.getElementById("result");
const statusText = document.getElementById("statusText");
const autoRun = document.getElementById("autoRun");

const fileInputCode = document.getElementById("fileInputCode");
const fileInputAsset = document.getElementById("fileInputAsset");
const fileInputProject = document.getElementById("fileInputProject");

const btnRun = document.getElementById("btnRun");
const btnImportCode = document.getElementById("btnImportCode");
const btnAddAsset = document.getElementById("btnAddAsset");
const btnExportProject = document.getElementById("btnExportProject");
const btnImportProject = document.getElementById("btnImportProject");
const btnReset = document.getElementById("btnReset");

const tabs = Array.from(document.querySelectorAll(".tab"));

const filesView = document.getElementById("filesView");
const filesList = document.getElementById("filesList");
const filesCount = document.getElementById("filesCount");

const helpBackdrop = document.getElementById("helpBackdrop");
const btnHelp = document.getElementById("btnHelp");
const btnCloseHelp = document.getElementById("btnCloseHelp");

/* =========================
   Storage + State
========================= */
const STORAGE_KEY = "darkcodetest.project.v1";

let activeTab = "html";

let state = {
  html: `<h1>Hello World</h1>
<p>اكتب كودك وشوف النتيجة.</p>
<button id="btn">اضغطني</button>`,
  css: `body{
  background:#f2f2f2;
  text-align:center;
  padding:18px;
  font-family: 'Tajawal', sans-serif;
}
h1{ color: #2563eb; }`,
  js: `document.getElementById('btn')?.addEventListener('click', ()=> alert('يشتغل!'));`,
  assets: [] // { id, name, type: "css"|"js"|"txt"|"json", content }
};

function setStatus(msg){
  statusText.textContent = msg;
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(()=> statusText.textContent = "جاهز", 1200);
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{
    const parsed = JSON.parse(raw);
    if(parsed && typeof parsed === "object"){
      state = {
        html: typeof parsed.html === "string" ? parsed.html : state.html,
        css: typeof parsed.css === "string" ? parsed.css : state.css,
        js: typeof parsed.js === "string" ? parsed.js : state.js,
        assets: Array.isArray(parsed.assets) ? parsed.assets : []
      };
    }
  }catch{
    // ignore
  }
}

/* =========================
   Tabs + Editor binding
========================= */
function applyActiveTabToEditor(){
  if(activeTab === "files"){
    codeArea.hidden = true;
    filesView.hidden = false;
    renderFiles();
    return;
  }
  filesView.hidden = true;
  codeArea.hidden = false;
  codeArea.value = state[activeTab] ?? "";
}

function commitEditorToState(){
  if(activeTab === "files") return;
  state[activeTab] = codeArea.value;
  save();
}

function setActiveTab(tab){
  activeTab = tab;

  tabs.forEach(t=>{
    const is = t.dataset.tab === tab;
    t.classList.toggle("active", is);
    t.setAttribute("aria-selected", is ? "true" : "false");
  });

  applyActiveTabToEditor();

  if(activeTab !== "files") codeArea.focus();
  setStatus(`تبويب: ${tab.toUpperCase()}`);
}

/* =========================
   Preview build (inject assets)
========================= */
function buildAssetsInjection(){
  const cssAssets = state.assets
    .filter(a => a.type === "css")
    .map(a => a.content)
    .join("\n\n/* ---- asset ---- */\n\n");

  const jsAssets = state.assets
    .filter(a => a.type === "js")
    .map(a => a.content)
    .join("\n\n// ---- asset ----\n\n");

  return { cssAssets, jsAssets };
}

function run(){
  commitEditorToState();

  const { cssAssets, jsAssets } = buildAssetsInjection();

  const output = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    body{ font-family:'Tajawal', sans-serif; }
    ${state.css || ""}
    /* ===== CSS Assets ===== */
    ${cssAssets || ""}
  </style>
</head>
<body>
  ${state.html || ""}

  <script>
  try{
    ${state.js || ""}
    /* ===== JS Assets ===== */
    ${jsAssets || ""}
  }catch(e){
    document.body.insertAdjacentHTML('beforeend',
      '<pre style="white-space:pre-wrap;background:#fee2e2;color:#7f1d1d;padding:12px;border-radius:12px;margin-top:12px;">JS Error: ' + e + '</pre>'
    );
    console.error(e);
  }
  <\/script>
</body>
</html>
`;

  resultFrame.srcdoc = output;
  setStatus("تم التحديث");
}

let debounceT = null;
function scheduleRun(){
  if(!autoRun.checked) return;
  clearTimeout(debounceT);
  debounceT = setTimeout(run, 200);
}

/* =========================
   Files (Assets) management
========================= */
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function extToType(name){
  const n = (name || "").toLowerCase();
  if(n.endsWith(".js")) return "js";
  if(n.endsWith(".css")) return "css";
  if(n.endsWith(".json")) return "json";
  return "txt";
}

function renderFiles(){
  filesList.innerHTML = "";
  filesCount.textContent = `${state.assets.length} ملفات`;

  if(state.assets.length === 0){
    const empty = document.createElement("div");
    empty.className = "status-line";
    empty.textContent = "لا توجد ملفات إضافية. اضغط (إضافة ملف للمشروع).";
    filesList.appendChild(empty);
    return;
  }

  state.assets.forEach(asset=>{
    const row = document.createElement("div");
    row.className = "file-item";

    const meta = document.createElement("div");
    meta.className = "file-meta";

    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = asset.name;

    const type = document.createElement("div");
    type.className = "file-type";
    const runsInPreview = (asset.type === "css" || asset.type === "js") ? "نعم" : "لا";
    type.textContent = `النوع: ${asset.type.toUpperCase()} • يشتغل داخل المعاينة: ${runsInPreview}`;

    meta.appendChild(name);
    meta.appendChild(type);

    const acts = document.createElement("div");
    acts.className = "file-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn mini";
    btnEdit.textContent = "عرض/تعديل";
    btnEdit.addEventListener("click", ()=> openAssetEditor(asset.id));

    const btnRemove = document.createElement("button");
    btnRemove.className = "btn mini danger";
    btnRemove.textContent = "حذف";
    btnRemove.addEventListener("click", ()=> removeAsset(asset.id));

    acts.appendChild(btnEdit);
    acts.appendChild(btnRemove);

    row.appendChild(meta);
    row.appendChild(acts);
    filesList.appendChild(row);
  });
}

function removeAsset(id){
  state.assets = state.assets.filter(a => a.id !== id);
  save();
  renderFiles();
  run();
  setStatus("تم حذف الملف");
}

function openAssetEditor(id){
  const asset = state.assets.find(a => a.id === id);
  if(!asset) return;

  const newContent = prompt(
    `تعديل محتوى الملف: ${asset.name}\n(انسخ/الصق وعدّل ثم OK)\nملاحظة: للمحتوى الطويل جدًا يفضل تصدير/استيراد مشروع.`,
    asset.content
  );
  if(newContent === null) return;

  asset.content = newContent;
  save();
  renderFiles();
  run();
  setStatus("تم تعديل الملف");
}

async function readFileText(file){
  return await file.text();
}

async function importCodeFile(file){
  const text = await readFileText(file);
  const type = extToType(file.name);

  if(type === "js" || type === "css"){
    state[type] = text;
    save();
    setActiveTab(type);
    run();
    setStatus(`تم استيراد ${file.name}`);
    return;
  }

  if(file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm")){
    state.html = text;
    save();
    setActiveTab("html");
    run();
    setStatus(`تم استيراد ${file.name}`);
    return;
  }

  const where = prompt("الملف TXT. تبيه يروح وين؟ اكتب: html أو css أو js", "html");
  const w = (where || "html").toLowerCase().trim();

  if(["html","css","js"].includes(w)){
    state[w] = text;
    save();
    setActiveTab(w);
    run();
    setStatus(`تم استيراد ${file.name}`);
  }else{
    setStatus("تم إلغاء الاستيراد");
  }
}

async function addAssetFiles(fileList){
  const files = Array.from(fileList || []);
  for(const f of files){
    const type = extToType(f.name);
    const content = await readFileText(f);

    state.assets.push({
      id: uid(),
      name: f.name,
      type,
      content
    });
  }
  save();
  if(activeTab === "files") renderFiles();
  run();
  setStatus("تمت إضافة الملفات");
}

/* =========================
   Export/Import project JSON
========================= */
function downloadText(filename, text){
  const blob = new Blob([text], {type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportProject(){
  const payload = JSON.stringify(state, null, 2);
  const filename = `darkcodetest-project-${new Date().toISOString().slice(0,10)}.json`;
  downloadText(filename, payload);
  setStatus("تم تصدير المشروع");
}

async function importProjectFile(file){
  const text = await readFileText(file);
  try{
    const parsed = JSON.parse(text);
    if(!parsed || typeof parsed !== "object") throw new Error("bad");

    state = {
      html: typeof parsed.html === "string" ? parsed.html : "",
      css: typeof parsed.css === "string" ? parsed.css : "",
      js: typeof parsed.js === "string" ? parsed.js : "",
      assets: Array.isArray(parsed.assets) ? parsed.assets : []
    };
    save();
    setActiveTab("html");
    run();
    setStatus("تم استيراد المشروع");
  }catch{
    setStatus("ملف المشروع غير صالح");
  }
}

/* =========================
   Help modal
========================= */
function openHelp(){
  helpBackdrop.classList.add("open");
  helpBackdrop.setAttribute("aria-hidden","false");
}
function closeHelp(){
  helpBackdrop.classList.remove("open");
  helpBackdrop.setAttribute("aria-hidden","true");
}
btnHelp.addEventListener("click", openHelp);
btnCloseHelp.addEventListener("click", closeHelp);
helpBackdrop.addEventListener("click", (e)=>{
  if(e.target === helpBackdrop) closeHelp();
});

/* =========================
   Snippets
========================= */
const SNIPPETS = {
  "html-basic": `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>صفحة</title>
</head>
<body>
  <h1>عنوان الصفحة</h1>
  <p>نص بسيط</p>
</body>
</html>`,

  "html-card": `<div class="card">
  <h2>Card</h2>
  <p>هذا مثال بطاقة بسيطة.</p>
  <button id="btn">زر</button>
</div>`,

  "html-navbar": `<nav class="nav">
  <strong>DarkCode</strong>
  <div>
    <a href="#">الرئيسية</a>
    <a href="#">الخدمات</a>
    <a href="#">تواصل</a>
  </div>
</nav>`,

  "css-center": `body{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}`,

  "css-dark": `body{
  background:#0b1220;
  color:#e5e7eb;
}
a{color:#93c5fd}`,

  "css-card": `.card{
  width:min(520px,100%);
  border:1px solid rgba(0,0,0,.12);
  border-radius:16px;
  padding:16px;
  background:white;
  box-shadow: 0 12px 30px rgba(0,0,0,.12);
}`,

  "js-click": `document.getElementById("btn")?.addEventListener("click", ()=>{
  alert("تم الضغط!");
});`,

  "js-fetch": `async function load(){
  const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  const data = await res.json();
  console.log(data);
}
load();`
};

function ensureEditorTab(){
  if(activeTab === "files"){
    setStatus("ارجع لتبويب HTML/CSS/JS أولاً");
    return false;
  }
  return true;
}

function insertAtSelection(text){
  const start = codeArea.selectionStart ?? codeArea.value.length;
  const end = codeArea.selectionEnd ?? codeArea.value.length;

  const before = codeArea.value.slice(0, start);
  const after = codeArea.value.slice(end);

  const needsSpace = before && !before.endsWith("\n");
  const insert = needsSpace ? "\n\n" + text : text;

  const final = before + insert + "\n\n" + after;
  codeArea.value = final;

  const newPos = (before + insert + "\n\n").length;
  codeArea.selectionStart = codeArea.selectionEnd = newPos;

  commitEditorToState();
  scheduleRun();
}

function insertSnippet(key){
  if(!ensureEditorTab()) return;
  const text = SNIPPETS[key];
  if(!text) return;
  insertAtSelection(text);
  setStatus("تم إدخال كود جاهز");
}

document.querySelectorAll("[data-snippet]").forEach(el=>{
  el.addEventListener("click", ()=>{
    insertSnippet(el.getAttribute("data-snippet"));
  });
});

/* =========================
   Editor Tools
========================= */
function getSelection(){
  return {
    start: codeArea.selectionStart ?? 0,
    end: codeArea.selectionEnd ?? 0,
    value: codeArea.value
  };
}

function getLineRangeAt(pos){
  const v = codeArea.value;
  let s = pos, e = pos;
  while(s > 0 && v[s-1] !== "\n") s--;
  while(e < v.length && v[e] !== "\n") e++;
  return { s, e };
}

function replaceRange(s, e, replacement){
  const v = codeArea.value;
  codeArea.value = v.slice(0, s) + replacement + v.slice(e);
  codeArea.selectionStart = s;
  codeArea.selectionEnd = s + replacement.length;
  commitEditorToState();
  scheduleRun();
}

function toolToggleComment(){
  if(!ensureEditorTab()) return;

  const { start, end, value } = getSelection();
  const hasSel = end > start;

  // CSS: wrap line/selection with /* */
  if(activeTab === "css"){
    if(!hasSel){
      const lr = getLineRangeAt(start);
      const line = value.slice(lr.s, lr.e);
      const trimmed = line.trim();
      const isCommented = trimmed.startsWith("/*") && trimmed.endsWith("*/");
      const next = isCommented ? line.replace("/*","").replace("*/","") : `/*${line}*/`;
      replaceRange(lr.s, lr.e, next);
      setStatus("تعليق/فك تعليق (CSS)");
      return;
    }
    const chunk = value.slice(start, end);
    const trimmed = chunk.trim();
    const isCommented = trimmed.startsWith("/*") && trimmed.endsWith("*/");
    const next = isCommented ? chunk.replace("/*","").replace("*/","") : `/*${chunk}*/`;
    replaceRange(start, end, next);
    setStatus("تعليق/فك تعليق (CSS)");
    return;
  }

  // HTML/JS: use //
  if(!hasSel){
    const lr = getLineRangeAt(start);
    const line = value.slice(lr.s, lr.e);
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);
    const isCommented = trimmed.startsWith("//");
    const next = isCommented ? indent + trimmed.replace(/^\/\/\s?/, "") : indent + "// " + trimmed;
    replaceRange(lr.s, lr.e, next);
    setStatus("تعليق/فك تعليق");
    return;
  }

  const chunk = value.slice(start, end);
  const lines = chunk.split("\n");
  const allCommented = lines.every(l => l.trim() === "" || l.trimStart().startsWith("//"));

  const nextLines = lines.map(l=>{
    if(l.trim() === "") return l;
    const trimmed = l.trimStart();
    const indent = l.slice(0, l.length - trimmed.length);
    return allCommented
      ? indent + trimmed.replace(/^\/\/\s?/, "")
      : indent + "// " + trimmed;
  });

  replaceRange(start, end, nextLines.join("\n"));
  setStatus("تعليق/فك تعليق");
}

function toolDuplicate(){
  if(!ensureEditorTab()) return;

  const { start, end, value } = getSelection();
  if(end > start){
    const chunk = value.slice(start, end);
    replaceRange(end, end, chunk);
    setStatus("تم تكرار التحديد");
    return;
  }

  const lr = getLineRangeAt(start);
  const line = value.slice(lr.s, lr.e);
  replaceRange(lr.e, lr.e, "\n" + line);
  setStatus("تم تكرار السطر");
}

function toolDeleteLine(){
  if(!ensureEditorTab()) return;

  const { start, value } = getSelection();
  const lr = getLineRangeAt(start);

  let e = lr.e;
  if(e < value.length && value[e] === "\n") e++;
  replaceRange(lr.s, e, "");
  setStatus("تم حذف السطر");
}

function toolMoveLine(dir){
  if(!ensureEditorTab()) return;

  const v = codeArea.value;
  const pos = codeArea.selectionStart ?? 0;
  const lr = getLineRangeAt(pos);
  const line = v.slice(lr.s, lr.e);

  if(dir === -1){
    if(lr.s === 0) return;
    const prevPos = lr.s - 1;
    const prev = getLineRangeAt(Math.max(0, prevPos - 1));
    const prevLine = v.slice(prev.s, prev.e);

    const before = v.slice(0, prev.s);
    const after = v.slice(lr.e);

    codeArea.value = before + line + "\n" + prevLine + after;
    codeArea.selectionStart = codeArea.selectionEnd = prev.s;
    commitEditorToState(); scheduleRun();
    setStatus("تم نقل السطر لأعلى");
    return;
  }

  // down
  let nextStart = lr.e;
  if(nextStart < v.length && v[nextStart] === "\n") nextStart++;
  if(nextStart >= v.length) return;

  const next = getLineRangeAt(nextStart);
  const nextLine = v.slice(next.s, next.e);

  const before = v.slice(0, lr.s);
  const after = v.slice(next.e);

  codeArea.value = before + nextLine + "\n" + line + after;
  codeArea.selectionStart = codeArea.selectionEnd = next.s;
  commitEditorToState(); scheduleRun();
  setStatus("تم نقل السطر لأسفل");
}

function toolWrap(tag){
  if(!ensureEditorTab()) return;

  const { start, end, value } = getSelection();
  const chunk = (end > start) ? value.slice(start, end) : "اكتب هنا";
  const wrapped = `<${tag}>${chunk}</${tag}>`;
  replaceRange(start, end, wrapped);
  setStatus(`تم لف التحديد بـ <${tag}>`);
}

function toolLogSelection(){
  if(!ensureEditorTab()) return;

  const { start, end, value } = getSelection();
  const chunk = (end > start) ? value.slice(start, end).trim() : "";
  const text = chunk ? `console.log(${chunk});` : `console.log("log");`;
  insertAtSelection(text);
  setStatus("تم إدخال console.log");
}

function toolMakeFunction(){
  if(!ensureEditorTab()) return;

  const name = prompt("اكتب اسم الدالة (function name):", "myFunction");
  if(!name) return;
  const safe = name.replace(/[^\w$]/g, "") || "myFunction";
  insertAtSelection(`function ${safe}(){
  // TODO
}\n`);
  setStatus("تم إدخال function");
}

const TOOL_HANDLERS = {
  "toggle-comment": toolToggleComment,
  "duplicate": toolDuplicate,
  "delete-line": toolDeleteLine,
  "move-up": ()=> toolMoveLine(-1),
  "move-down": ()=> toolMoveLine(1),
  "wrap-div": ()=> toolWrap("div"),
  "wrap-section": ()=> toolWrap("section"),
  "wrap-span": ()=> toolWrap("span"),
  "wrap-a": ()=> toolWrap("a"),
  "wrap-button": ()=> toolWrap("button"),
  "log-selection": toolLogSelection,
  "make-fn": toolMakeFunction
};

document.querySelectorAll("[data-tool]").forEach(el=>{
  el.addEventListener("click", ()=>{
    const key = el.getAttribute("data-tool");
    const fn = TOOL_HANDLERS[key];
    if(fn) fn();
  });
});

/* =========================
   Buttons + Inputs
========================= */
btnRun.addEventListener("click", run);

btnReset.addEventListener("click", ()=>{
  if(!confirm("أكيد تبي مسح كل شيء؟")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { html:"", css:"", js:"", assets:[] };
  setActiveTab("html");
  run();
  setStatus("تم مسح الكل");
});

btnImportCode.addEventListener("click", ()=>{
  fileInputCode.value = "";
  fileInputCode.click();
});
fileInputCode.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  await importCodeFile(file);
});

btnAddAsset.addEventListener("click", ()=>{
  fileInputAsset.value = "";
  fileInputAsset.click();
});
fileInputAsset.addEventListener("change", async (e)=>{
  const files = e.target.files;
  if(!files || files.length === 0) return;
  await addAssetFiles(files);
});

btnExportProject.addEventListener("click", exportProject);

btnImportProject.addEventListener("click", ()=>{
  fileInputProject.value = "";
  fileInputProject.click();
});
fileInputProject.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  await importProjectFile(file);
});

tabs.forEach(btn=>{
  btn.addEventListener("click", ()=> setActiveTab(btn.dataset.tab));
});

codeArea.addEventListener("input", ()=>{
  commitEditorToState();
  scheduleRun();
});
codeArea.addEventListener("blur", commitEditorToState);

/* =========================
   Keyboard Shortcuts
========================= */
window.addEventListener("keydown", (e)=>{
  // Help
  if(e.key === "F1"){
    e.preventDefault();
    openHelp();
    return;
  }
  if(e.key === "Escape" && helpBackdrop.classList.contains("open")){
    e.preventDefault();
    closeHelp();
    return;
  }

  const inEditor = (activeTab !== "files") && (document.activeElement === codeArea);

  // Editor tools
  if(inEditor && e.ctrlKey && !e.altKey && !e.shiftKey && e.key === "/"){
    e.preventDefault();
    toolToggleComment();
    return;
  }
  if(inEditor && e.ctrlKey && !e.altKey && !e.shiftKey && (e.key || "").toLowerCase() === "d"){
    e.preventDefault();
    toolDuplicate();
    return;
  }
  if(inEditor && e.ctrlKey && !e.altKey && !e.shiftKey && (e.key || "").toLowerCase() === "l"){
    e.preventDefault();
    toolDeleteLine();
    return;
  }
  if(inEditor && e.altKey && !e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown")){
    e.preventDefault();
    toolMoveLine(e.key === "ArrowUp" ? -1 : 1);
    return;
  }
  if(inEditor && e.ctrlKey && e.shiftKey && !e.altKey && (e.key || "").toLowerCase() === "l"){
    e.preventDefault();
    toolLogSelection();
    return;
  }

  // Global ctrl shortcuts
  if(e.ctrlKey && !e.altKey){
    if(e.key === "Enter"){
      e.preventDefault();
      run();
      return;
    }
    const k = (e.key || "").toLowerCase();
    if(k === "s"){
      e.preventDefault();
      exportProject();
      return;
    }
    if(k === "o" && !e.shiftKey){
      e.preventDefault();
      fileInputCode.value = "";
      fileInputCode.click();
      setStatus("اختر ملفًا للاستيراد");
      return;
    }
    if(k === "o" && e.shiftKey){
      e.preventDefault();
      fileInputAsset.value = "";
      fileInputAsset.click();
      setStatus("اختر ملفات للمشروع");
      return;
    }
  }
});

/* =========================
   Init
========================= */
load();
setActiveTab("html");
run();
