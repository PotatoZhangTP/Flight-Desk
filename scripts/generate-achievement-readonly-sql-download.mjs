import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sources = [
  {
    name: "20261030000100_flight_achievements_postflight_read_only.sql",
    label: "下载执行后只读验证 SQL",
    description: "验证 14 个系列、56 个等级、权限、Purple 映射与机场大洲覆盖率。",
  },
  {
    name: "20261030000100_verify_achievement_user_read_only.sql",
    label: "下载当前用户只读验证 SQL",
    description: "替换登录邮箱后，验证实时进度、历史补发以及 323 小时的 Time Aloft Silver。",
  },
].map(item => {
  const bytes = readFileSync(resolve(root, "supabase", item.name));
  return {
    ...item,
    encoded: bytes.toString("base64"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    lines: bytes.toString("utf8").split("\n").length - 1,
  };
});

const cards = sources.map((source, index) => `
  <section class="card">
    <h2>${source.label.replace("下载", "")}</h2>
    <p>${source.description}</p>
    <dl><div><dt>文件</dt><dd><code>${source.name}</code></dd></div><div><dt>行数</dt><dd>${source.lines}</dd></div><div><dt>SHA-256</dt><dd><code>${source.sha256}</code></dd></div></dl>
    <div class="actions"><button type="button" class="primary" data-download="${index}">${source.label}</button><button type="button" data-copy="${index}">复制完整 SQL</button></div>
  </section>`).join("");

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flight Desk Achievements 只读验证 SQL</title>
<style>:root{--brand:#7455cc;--page:#f7f5fb;--card:#fff;--text:#17141f;--muted:#696374;--line:#ded8ec}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:32px;background:radial-gradient(circle at top right,rgba(116,85,204,.16),transparent 40%),var(--page);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--text)}main{width:min(900px,100%);margin:auto}.eyebrow{color:var(--brand);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}h1{margin:8px 0;font-size:clamp(30px,5vw,46px)}.intro,.card p{color:var(--muted)}.grid{display:grid;gap:18px;margin-top:28px}.card{padding:26px;border:1px solid var(--line);border-radius:22px;background:var(--card);box-shadow:0 18px 55px rgba(35,24,69,.09)}h2{margin:0}dl{display:grid;gap:8px;margin:18px 0}dl div{display:grid;grid-template-columns:90px minmax(0,1fr);gap:12px}dt{font-weight:800}dd{margin:0;overflow-wrap:anywhere}code{font-size:12px}.actions{display:flex;flex-wrap:wrap;gap:10px}button{min-height:46px;padding:0 20px;border:1px solid var(--brand);border-radius:999px;background:#fff;color:var(--brand);font-weight:800;cursor:pointer}.primary{background:var(--brand);color:#fff}.status{min-height:26px;margin-top:18px;color:var(--brand);font-weight:800}@media(max-width:560px){body{padding:18px}.card{padding:20px}dl div{grid-template-columns:1fr;gap:2px}}</style></head>
<body><main><p class="eyebrow">Flight Desk · Supabase</p><h1>Achievements 只读验证 SQL</h1><p class="intro">两个文件均以只读事务运行，不会新增、修改或删除数据库数据。</p><div class="grid">${cards}</div><p id="status" class="status" role="status" aria-live="polite"></p></main>
<script>const files=${JSON.stringify(sources.map(({name,encoded}) => ({name,encoded})))};const status=document.getElementById("status");const sqlAt=i=>new TextDecoder().decode(Uint8Array.from(atob(files[i].encoded),c=>c.charCodeAt(0)));document.querySelectorAll("[data-download]").forEach(button=>button.addEventListener("click",()=>{const i=Number(button.dataset.download),url=URL.createObjectURL(new Blob([sqlAt(i)],{type:"application/sql;charset=utf-8"})),link=document.createElement("a");link.href=url;link.download=files[i].name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent="只读 SQL 已开始下载。"}));document.querySelectorAll("[data-copy]").forEach(button=>button.addEventListener("click",async()=>{const i=Number(button.dataset.copy);try{await navigator.clipboard.writeText(sqlAt(i));status.textContent="完整 SQL 已复制。"}catch{status.textContent="浏览器未允许自动复制，请使用下载按钮。"}}));</script></body></html>`;

const output = "public/Flight_Desk_Achievements_Readonly_SQL_Download.html";
writeFileSync(resolve(root, output), html);
console.log(JSON.stringify({ output, files: sources.map(({ name, lines, sha256 }) => ({ name, lines, sha256 })) }));
