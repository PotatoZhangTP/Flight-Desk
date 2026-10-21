import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sqlName = "20261030000100_enable_all_flight_achievements.sql";
const sql = readFileSync(resolve(root, "supabase/migrations", sqlName));
const encoded = sql.toString("base64");
const sha256 = createHash("sha256").update(sql).digest("hex");
const lines = sql.toString("utf8").split("\n").length - 1;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flight Desk Achievements SQL 下载</title>
  <style>
    :root{color-scheme:light dark;--brand:#7455cc;--brand2:#8a6de0;--page:#f7f5fb;--card:#fff;--text:#17141f;--muted:#696374;--line:#ded8ec}
    @media(prefers-color-scheme:dark){:root{--page:#121018;--card:#1c1924;--text:#f7f4ff;--muted:#bbb3c9;--line:#3a3348}}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top right,rgba(116,85,204,.15),transparent 42%),var(--page);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--text)}
    main{width:min(760px,100%);padding:34px;border:1px solid var(--line);border-radius:24px;background:var(--card);box-shadow:0 24px 70px rgba(35,24,69,.12)}
    .eyebrow{margin:0;color:var(--brand);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}h1{margin:8px 0 10px;font-size:clamp(28px,5vw,42px);line-height:1.15}p{color:var(--muted)}code{overflow-wrap:anywhere}.meta{margin:24px 0;padding:16px;border:1px solid var(--line);border-radius:16px;background:color-mix(in srgb,var(--brand) 6%,var(--card));font-size:14px}.meta div+div{margin-top:6px}.actions{display:flex;flex-wrap:wrap;gap:12px}.button{min-height:48px;padding:0 22px;border-radius:999px;border:1px solid var(--brand);font-weight:800;cursor:pointer}.primary{color:#fff;background:var(--brand)}.primary:hover{background:var(--brand2)}.secondary{color:var(--brand);background:transparent}.status{min-height:24px;margin:16px 0 0;color:var(--brand);font-weight:700}details{margin-top:22px}textarea{width:100%;height:260px;margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--page);color:var(--text);font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical}
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Flight Desk · Supabase Migration</p>
    <h1>Achievements SQL</h1>
    <p>这是完整、自包含的迁移文件。点击下方按钮即可下载为 <code>.sql</code>，也可以复制全部内容。</p>
    <div class="meta">
      <div><strong>文件：</strong><code>${sqlName}</code></div>
      <div><strong>行数：</strong>${lines}</div>
      <div><strong>SHA-256：</strong><code>${sha256}</code></div>
      <div><strong>事务：</strong><code>BEGIN;</code> → <code>COMMIT;</code></div>
    </div>
    <div class="actions">
      <button id="download" class="button primary" type="button">下载完整 SQL</button>
      <button id="copy" class="button secondary" type="button">复制完整 SQL</button>
    </div>
    <p id="status" class="status" role="status" aria-live="polite"></p>
    <details>
      <summary>查看完整 SQL</summary>
      <textarea id="preview" readonly spellcheck="false"></textarea>
    </details>
  </main>
  <script>
    const encoded = "${encoded}";
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const sql = new TextDecoder().decode(bytes);
    const status = document.getElementById("status");
    document.getElementById("preview").value = sql;
    document.getElementById("download").addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/sql;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "${sqlName}";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "SQL 文件已开始下载。";
    });
    document.getElementById("copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(sql);
        status.textContent = "完整 SQL 已复制到剪贴板。";
      } catch {
        const preview = document.getElementById("preview");
        preview.closest("details").open = true;
        preview.select();
        status.textContent = "浏览器未允许自动复制；已选中完整 SQL，请按 Ctrl/Cmd+C。";
      }
    });
  </script>
</body>
</html>`;

writeFileSync(resolve(root, "public/Flight_Desk_Achievements_SQL_Download.html"), html);
console.log(JSON.stringify({ output: "public/Flight_Desk_Achievements_SQL_Download.html", sqlName, lines, sha256 }));
