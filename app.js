"use strict";

/* عناصر */
const htmlEditor = document.getElementById("htmlEditor");
const cssEditor  = document.getElementById("cssEditor");
const jsEditor   = document.getElementById("jsEditor");
const preview    = document.getElementById("preview");
const statusText = document.getElementById("statusText");
const autoRun    = document.getElementById("autoRun");

const runBtn = document.getElementById("runBtn");
const saveBtn = document.getElementById("saveBtn");
const exportBtn = document.getElementById("exportBtn");
const importProjectBtn = document.getElementById("importProjectBtn");
const importCodeBtn = document.getElementById("importCodeBtn");
const addAssetBtn = document.getElementById("addAssetBtn");
const resetBtn = document.getElementById("resetBtn");

const importCodeInput = document.getElementById("importCodeInput");
const assetsInput = document.getElementById("assetsInput");
const importProjectInput = document.getElementById("importProjectInput");

const tabs = Array.from(document.querySelectorAll(".tab"));
const filesPanel = document.getElementById("filesPanel");
const filesList = document.getElementById("filesList");

const helpBtn = document.getElementById("helpBtn");
const helpBackdrop = document.getElementById("helpBackdrop");
const closeHelpBtn = document.getElementById("closeHelpBtn");

const splitter = document.getElementById("splitter");
const leftPane = document.querySelector(".left");
const rightPane = document.querySelector(".right");

/* تخزين */
const KEY = "darkcodetest.v2.project";
let activeTab = "html";

let state = {
  html: `<h1>Hello World</h1>
<p>اكتب كودك وشوف النتيجة.</p>
<button id="btn">اضغطني</button>`,
  css: `body{
  font-family:'Tajawal',sans-serif;
  text-align:center;
  padding:20px;
  background:#f3f4f6;
}
h1{color:#2563eb;}`,
  js: `document.getElementById("btn")?.addEventListener("click", ()=> alert("شغال!"));`,
  assets: [] // {id,name,type,content}
};

function setStatus(msg){
  statusText.textContent = msg;
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(()=> statusText.textContent = "جاهز", 1200);
}

function save(){
  localStorage.setItem(KEY, JSON.stringify(state));
}
function load(){
  const raw = localStorage.getItem(KEY);
  if(!raw) return;
  try{
    const p = JSON.parse(raw);
    if(!p || typeof p !== "object") return;
    state.html = typeof p.html === "string" ? p.html : state.html;
    state.css  = typeof p.css  === "string" ? p.css  : state.css;
    state.js   = typeof p.js   === "string" ? p.js   : state.js;
    state.assets = Array.isArray(p.assets) ? p.assets : [];
  }catch{}
}

/* تبويبات */
function showTab(name){
  activeTab = name;

  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));

  htmlEditor.hidden = name !== "html";
  cssEditor.hidden  = name !== "css";
  jsEditor.hidden   = name !== "js";
  filesPanel.hidden = name !== "files";

  if(name === "files"){
    renderFiles();
    setStatus("Files");
  } else {
    setStatus(name.toUpperCase());
    getEditor().focus();
  }
}

function getEditor(){
  if(activeTab === "css") return cssEditor;
  if(activeTab === "js") return jsEditor;
  return htmlEditor;
}

tabs.forEach(t => t.addEventListener("click", ()=> showTab(t.dataset.tab)));

/* تحديث المعاينة */
function buildAssets(){
  const cssAssets = state.assets.filter(a=>a.type==="css").map(a=>a.content).join("\n\n/* asset */\n\n");
  const jsAssets  = state.assets.filter(a=>a.type==="js").map(a=>a.content).join("\n\n// asset\n\n");
  return { cssAssets, jsAssets };
}

function run(){
  // التقط آخر نصوص
  state.html = htmlEditor.value;
  state.css = cssEditor.value;
  state.js = jsEditor.value;
  save();

  const { cssAssets, jsAssets } = buildAssets();

  const doc = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    body{ font-family:'Tajawal',sans-serif; }
    ${state.css || ""}
    ${cssAssets || ""}
  </style>
</head>
<body>
  ${state.html || ""}

  <script>
    (function(){
      const __err = (msg)=> {
        const pre = document.createElement("pre");
        pre.style.cssText="white-space:pre-wrap;background:#fee2e2;color:#7f1d1d;padding:12px;border-radius:12px;margin-top:12px;font-family:ui-monospace,monospace;";
        pre.textContent = msg;
        document.body.appendChild(pre);
      };

      window.addEventListener("error", (e)=> __err("JS Error: " + (e?.message || e)));
      window.addEventListener("unhandledrejection", (e)=> __err("Promise Error: " + (e?.reason || e)));

      try{
        ${state.js || ""}
        ${jsAssets || ""}
      }catch(e){
        __err("JS Error: " + e);
        console.error(e);
      }
    })();
  <\/script>
</body>
</html>`;

  preview.srcdoc = doc;
  setStatus("تم التشغيل");
}

let t = null;
function scheduleRun(){
  if(!autoRun.checked) return;
  clearTimeout(t);
  t = setTimeout(run, 180);
}

/* أحداث تحرير */
[htmlEditor, cssEditor, jsEditor].forEach(ed=>{
  ed.addEventListener("input", scheduleRun);
});

/* ملفات (Assets) */
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function extType(name){
  const n = (name||"").toLowerCase();
  if(n.endsWith(".css")) return "css";
  if(n.endsWith(".js")) return "js";
  if(n.endsWith(".json")) return "json";
  return "txt";
}

function renderFiles(){
  filesList.innerHTML = "";

  if(state.assets.length === 0){
    const div = document.createElement("div");
    div.className = "p";
    div.textContent = "لا توجد ملفات. اضغط (ملفات +) لإضافة CSS/JS للمشروع.";
    filesList.appendChild(div);
    return;
  }

  state.assets.forEach(a=>{
    const item = document.createElement("div");
    item.className = "fileItem";

    const meta = document.createElement("div");
    meta.className = "fileMeta";
    meta.innerHTML = `
      <div class="fileName">${a.name}</div>
      <div class="fileType">النوع: ${a.type.toUpperCase()} • يعمل بالمعاينة: ${a.type==="css"||a.type==="js" ? "نعم" : "لا"}</div>
    `;

    const btns = document.createElement("div");
    btns.className = "fileBtns";

    const edit = document.createElement("button");
    edit.className = "btn mini";
    edit.textContent = "تعديل";
    edit.onclick = ()=>{
      const v = prompt(`تعديل محتوى: ${a.name}`, a.content);
      if(v === null) return;
      a.content = v;
      save();
      renderFiles();
      run();
      setStatus("تم تعديل الملف");
    };

    const del = document.createElement("button");
    del.className = "btn mini danger";
    del.textContent = "حذف";
    del.onclick = ()=>{
      state.assets = state.assets.filter(x=>x.id!==a.id);
      save();
      renderFiles();
      run();
      setStatus("تم حذف الملف");
    };

    btns.appendChild(edit);
    btns.appendChild(del);

    item.appendChild(meta);
    item.appendChild(btns);
    filesList.appendChild(item);
  });
}

/* استيراد/تصدير */
function downloadJSON(filename, obj){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

exportBtn.onclick = ()=>{
  downloadJSON("darkcodetest-project.json", state);
  setStatus("تم التصدير");
};

importProjectBtn.onclick = ()=>{
  importProjectInput.value = "";
  importProjectInput.click();
};
importProjectInput.onchange = async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  try{
    const text = await f.text();
    const p = JSON.parse(text);
    if(!p || typeof p !== "object") throw 0;
    state.html = typeof p.html === "string" ? p.html : "";
    state.css  = typeof p.css  === "string" ? p.css  : "";
    state.js   = typeof p.js   === "string" ? p.js   : "";
    state.assets = Array.isArray(p.assets) ? p.assets : [];
    save();
    htmlEditor.value = state.html;
    cssEditor.value = state.css;
    jsEditor.value = state.js;
    showTab("html");
    run();
    setStatus("تم الاستيراد");
  }catch{
    setStatus("ملف مشروع غير صالح");
  }
};

importCodeBtn.onclick = ()=>{
  importCodeInput.value = "";
  importCodeInput.click();
};
importCodeInput.onchange = async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  const text = await f.text();
  const tp = extType(f.name);

  if(tp === "css"){ cssEditor.value = text; state.css = text; showTab("css"); }
  else if(tp === "js"){ jsEditor.value = text; state.js = text; showTab("js"); }
  else { htmlEditor.value = text; state.html = text; showTab("html"); }

  save();
  run();
  setStatus("تم استيراد الكود");
};

addAssetBtn.onclick = ()=>{
  assetsInput.value = "";
  assetsInput.click();
};
assetsInput.onchange = async (e)=>{
  const files = Array.from(e.target.files || []);
  if(files.length === 0) return;

  for(const f of files){
    const tp = extType(f.name);
    state.assets.push({ id: uid(), name: f.name, type: tp, content: await f.text() });
  }
  save();
  if(activeTab === "files") renderFiles();
  run();
  setStatus("تمت إضافة الملفات");
};

/* تشغيل/حفظ/مسح */
runBtn.onclick = run;

saveBtn.onclick = ()=>{
  state.html = htmlEditor.value;
  state.css = cssEditor.value;
  state.js = jsEditor.value;
  save();
  setStatus("تم الحفظ");
};

resetBtn.onclick = ()=>{
  if(!confirm("أكيد تبي مسح كل شيء؟")) return;
  localStorage.removeItem(KEY);
  state = { html:"", css:"", js:"", assets:[] };
  htmlEditor.value = "";
  cssEditor.value = "";
  jsEditor.value = "";
  showTab("html");
  run();
  setStatus("تم المسح");
};

/* المساعدة */
function openHelp(){
  helpBackdrop.classList.add("open");
  helpBackdrop.setAttribute("aria-hidden","false");
}
function closeHelp(){
  helpBackdrop.classList.remove("open");
  helpBackdrop.setAttribute("aria-hidden","true");
}
helpBtn.onclick = openHelp;
closeHelpBtn.onclick = closeHelp;
helpBackdrop.addEventListener("click", (e)=>{ if(e.target === helpBackdrop) closeHelp(); });

/* اختصارات */
window.addEventListener("keydown", (e)=>{
  // Help
  if(e.key === "F1"){
    e.preventDefault();
    openHelp();
    return;
  }
  if(e.ctrlKey && !e.shiftKey && (e.key||"").toLowerCase() === "k"){
    e.preventDefault();
    openHelp();
    return;
  }
  if(e.key === "Escape" && helpBackdrop.classList.contains("open")){
    e.preventDefault();
    closeHelp();
    return;
  }

  // Run
  if(e.ctrlKey && e.key === "Enter"){
    e.preventDefault();
    run();
    return;
  }

  // Save
  if(e.ctrlKey && !e.shiftKey && (e.key||"").toLowerCase() === "s"){
    e.preventDefault();
    saveBtn.click();
    return;
  }

  // Import Code
  if(e.ctrlKey && !e.shiftKey && (e.key||"").toLowerCase() === "o"){
    e.preventDefault();
    importCodeBtn.click();
    return;
  }

  // Add Assets
  if(e.ctrlKey && e.shiftKey && (e.key||"").toLowerCase() === "o"){
    e.preventDefault();
    addAssetBtn.click();
    return;
  }
});

/* سحب لتغيير حجم المحرر */
let dragging = false;
splitter.addEventListener("mousedown", ()=> dragging = true);
window.addEventListener("mouseup", ()=> dragging = false);
window.addEventListener("mousemove", (e)=>{
  if(!dragging) return;
  const rect = document.querySelector(".layout").getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = Math.max(25, Math.min(75, (x / rect.width) * 100));
  leftPane.style.flex = `0 0 ${pct}%`;
  rightPane.style.flex = `1 1 ${100-pct}%`;
});

/* تشغيل أولي */
load();
htmlEditor.value = state.html;
cssEditor.value = state.css;
jsEditor.value = state.js;
showTab("html");
run();
