# Roadmap 动态内容自动翻译：交付与启用

## 本轮实现与边界

已实现 Roadmap 的 title、description、category 翻译，复用现有 next-intl、LanguageProvider、后台导航、is_site_admin 和网站 Supabase 客户端。固定 UI 仍使用原来的 translation_overrides，不把动态内容塞进 UI Key 字典。

本轮没有连接远程 Supabase、执行远程 SQL、配置密钥、启用定时任务或调用真实 DeepL；因此**真实自动翻译尚未启用，生产端翻译质量及连通性尚未验收**。没有修改 Auth、机场库、航班保存或现有 Roadmap 业务字段、排序、状态及原始数据。普通用户的飞行日志、简介、备注不会被发送给翻译服务。

第一阶段只接入 Roadmap；Landing Page 的 Roadmap 卡片和完整 Roadmap 页面已接入。CMS 其他动态文案、公告、FAQ、Changelog 不会自动翻译，它们是后续适配器扩展范围。

## 保存与翻译流程

English 保存 → 同事务触发器写入持久任务 → 定时 Worker 领取租约并预留预算 → DeepL → 校验版本后保存译文 → 页面批量读取

- 英文保存不等待翻译 API。任务队列是真实 PostgreSQL 表，不是浏览器后台请求或进程内 Promise。
- 只修改排序、开发状态、发布时间等，不改变原文字段时，不重新入队。
- source_hash 标识原文，generation UUID 同时提供乐观锁及 ABA 防护（A→B→A 的旧任务仍无效）。每次人工保存、原文变更、重译、完成都会更新 generation。
- 任务有两分钟租约；Worker 重启后可领取过期任务。最多 4 次尝试，指数退避 30、60、120 秒，失败后保留状态，管理员可显式重新生成。
- RPC 按原文→译文→任务的顺序加锁；完成时校验任务状态、租约、原文 hash、generation、人工标记。过期任务、已删除内容和旧租约不能覆盖新结果。
- 相同字段版本不会重复入队。其他实体的相同英文/语言已有有效自动译文时，可复用，不再调用供应商；人工译文不作为共享缓存。主动 Regenerate 会绕过缓存。
- 原文更新：自动译文过期并重新入队；人工译文保留，标记 Outdated，不自动入队。
- 原文删除：删除翻译记录，外键级联删除任务。已在进行的外部 HTTP 无法撤销，但返回结果不能重新创建内容。

这是 at-least-once 处理：数据库写入幂等，但供应商请求已成功、Worker 随后崩溃时，无法保证付费 HTTP 恰好执行一次。租约、有限重试、缓存和预算限制控制该窗口，不能把它宣传为绝对零重复计费。

## 数据库迁移（手动审核执行）

文件：`supabase/migrations/20261016000300_dynamic_content_translations.sql`

请先在测试/Preview 的**网站 Auth/CMS 所在 Supabase 项目**执行，不是在独立机场参考数据库执行。依赖已有 roadmap_items 与 is_site_admin()。不要重新运行旧 migration。

若 Preview 与 Production 共用同一网站 Supabase 项目，迁移也会作用于共享数据库；先确认数据库隔离或评估共享影响，不要把 Preview 部署误当作独立测试数据库。

新增对象：

- content_translations：按 entity_type + entity_id + field_name + locale 唯一，人工/自动来源、原文和译文 hash、状态、版本、时间及安全错误码。
- content_translation_jobs：持久任务、去重、租约、重试时间、调用预留信息。
- content_translation_locales：语言及供应商目标语言映射，初始 zh-CN→ZH。
- content_translation_limits：全局启用开关及每日限制，**初始 enabled=false**。
- content_translation_usage：UTC 每日请求、字符预留及响应统计。
- 原文引用验证、保存入队及删除清理触发器；公开批量读取、管理员人工保存/重译/分批补齐 RPC；Worker 专用领取/预留/完成/失败 RPC。

普通用户与访客只能读已公开 Roadmap 的译文。即使管理员调用公开读取 RPC，也不会返回草稿。新表不授予普通客户端 DML；后台写入经已有管理员检查的受控 RPC。Worker RPC 仅授权 service_role；内部辅助函数撤销 PUBLIC 执行权限。没有改变既有业务表的 RLS。

迁移不回填现有内容、不创建计划任务、不调用供应商。新保存会入队，但启用开关关闭时不会处理。

## 翻译服务与环境变量

当前实现 DeepL v2 REST Free/Pro 适配器：成熟、支持 EN→ZH，不需要大型 SDK。TranslationProvider 接口允许替换供应商；并未虚构 Google/OpenAI 已配置。

在 Vercel **Preview 的服务端环境变量**安全配置，配置后重新部署：

| 名称 | 含义 |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | 复用现有网站 Supabase URL，不是机场库 URL |
| SUPABASE_SERVICE_ROLE_KEY | 对应网站项目的后台服务密钥，仅 Worker 模块使用，绝不能加 NEXT_PUBLIC_ 前缀 |
| DEEPL_AUTH_KEY | DeepL 控制台的 API Key |
| DEEPL_API_PLAN | free 或 pro，选择对应官方固定域名，不接受任意上游 URL |
| CRON_SECRET | 至少 32 字符的高熵服务端调用密钥；若项目已有合适配置可复用，不要在聊天中发送 |
| CONTENT_TRANSLATIONS_ENABLED | true 才允许 Worker 工作；不配置时关闭 |
| DEEPL_GLOSSARY_ID | 可选，已在 DeepL 创建且匹配 EN/ZH 的术语表 ID；没有就不配置 |

不要把密钥提交到 Git、粘贴到 SQL 文件或截图。Worker 不转发用户 Cookie；入口只接受正确的 Bearer CRON_SECRET，忽略请求体中的任意翻译文本。普通用户不能借此触发付费调用。

共享保护层保留 Flight Desk、IATA/ICAO/大写机场代码、常见飞机型号、URL、嵌套花括号占位符、printf 标记、换行/Tab。供应商改写、丢弃或复制保护标记时拒绝结果，不发布错误标识。自动输出只作为纯文本渲染，有字符数及响应体上限。特殊型号/标记仍应在真实服务验收中抽样；Glossary 需单独确认供应商支持。

## 定时执行：必须手动配置

只有部署路由不会自动运行任务。本轮不提供隐式启用的 vercel.json，也没有自动开付费计划。

可选方式：

1. **Supabase Cron + pg_net + Vault**，推荐用于需要每分钟运行但 Vercel Hobby 无法提供每分钟 Cron 的项目。先确认你的项目支持这些功能并手动启用。在 Vault 安全创建：
   - flightdesk_translation_worker_url：选定 Preview 部署的 HTTPS 地址 + `/api/internal/translations/process`。
   - flightdesk_translation_cron_secret：与 Vercel CRON_SECRET 相同。
   - flightdesk_vercel_bypass：可选，受保护 Preview 需要 Vercel Automation Bypass secret。
   审核后手动执行 `docs/dynamic-translations-cron.sql`。它只替换本功能自己的具名计划；私有函数从 Vault 读密钥，cron.job 中不嵌入明文密钥。该脚本依赖真实平台扩展，未在远程 Supabase 安装验证。
2. 已有可信调度器，或支持相应频率的 Vercel Cron：定时 GET/POST Worker 路径，发送服务端 Authorization Bearer 头。Vercel Cron 会使用项目 CRON_SECRET；频率、套餐及调用时长必须在账户中确认。不要用普通用户浏览器触发 Worker。

Preview 可能有部署保护，外部调度器即使带应用密钥也可能被 Vercel 拦截。必须测试绕过授权或使用允许访问的测试部署，不能将 401/403 当作已启动成功。不要把调度 URL 指向 Production，也不要指向旧部署后误以为新版本在运行。

验证调度器连通、确认预算后，在 SQL Editor 手动启用（按自身预算调整）：

```sql
update public.content_translation_limits
set enabled=true, daily_char_limit=20000, daily_request_limit=100
where singleton=true;
```

Worker 每次最多处理 3 个供应商调用，35 秒循环预算、8 秒单次上游超时；Vercel 路由 maxDuration=60，实际账户限制仍需确认。

## 成本与暂停/恢复

- DeepL 的套餐、免费额度、订阅费和字符费以账户及 [官方价格](https://www.deepl.com/pro-api) 为准；本轮没有产生真实翻译调用费。
- 默认每日最多预留 20,000 字符、100 次请求；字符按**保护标记处理后的实际请求字符**计入，重试及不确定调用不退款，避免低估成本。每日 20,000 字符按 30 天最多预留约 600,000 字符，并非承诺覆盖在任何免费套餐内。
- 额度在数据库事务中预留，跨 Worker 共享。达到限制会将任务留到次日 UTC，不调用 API、不把英文保存变成失败。另设供应商账户费用上限；多个数据库共用同一供应商账户时，预算需合并考虑。
- 403/456 等凭据/账户额度错误不自动无限重试，需修正配置后按字段重新生成。429/网络/5xx 使用有限重试。
- Vercel 函数执行和 Supabase Cron/数据库也可能消耗平台额度。每分钟调度约 43,200 次/月，即使无任务也有轻量调用，应按实际套餐评估频率。
- 紧急暂停：将数据库 enabled=false，或删除/关闭 CONTENT_TRANSLATIONS_ENABLED，并停用本功能具名 Cron。已发出的 HTTP 可能无法撤销，但版本检查仍有效。
- Worker 崩溃：保留任务，租约到期后恢复。不要清空队列表。失败达到上限后由管理员确认重试。预算提高后，已延后到次日的任务不会自动提前；可按需要在后台显式 Regenerate。

## 后台操作与历史数据

`/admin/translations` 提供“Dynamic content translations”入口，跳转既有 Roadmap 管理区域。

Roadmap 编辑器新增 English (Original) / 简体中文 (Translation) 标签。英文表单保持原保存逻辑，标签切换不会清空未保存内容。中文按字段显示状态、人工保存、重新生成、重新加载和已保存内容预览。预览与真实页面共用回退函数。

回退顺序：有效人工译文（Outdated 人工译文也保留）→ 当前原文的已完成自动译文 → 英文原文。过期自动译文不展示。已有页面按当前语言批量读取，中文每 20 秒/切回窗口更新，切换语言不整页刷新。访问页面不会调用 DeepL。

历史补齐每批最多扫描 25 个项目，显示继续下一批的游标。只补缺失/原文变化的字段；不覆盖人工、不重做有效自动译文、不重置已失败任务。失败字段使用显式 Regenerate。补齐动作只入队，不同步调用供应商。不要在发布脚本中自动全量回填。

人工译文重生成必须确认；确认后先回退英文，待新自动译文完成。此功能没有完整人工译文历史档案，重要人工文案请先备份。未保存编辑有提示、刷新离开/内部链接确认；浏览器 Back/Forward 不被强行拦截，请先保存。

## 验证 SQL（只读）

```sql
select locale,translation_source,translation_status,count(*)
from public.content_translations group by 1,2,3 order by 1,2,3;
select status,count(*),max(attempts) from public.content_translation_jobs group by 1;
select * from public.content_translation_usage order by usage_day desc limit 7;
select * from public.content_translation_limits;
select pg_size_pretty(pg_total_relation_size('public.content_translations')) as translations_size,
       pg_size_pretty(pg_total_relation_size('public.content_translation_jobs')) as jobs_size;
select count(*) as orphan_rows from public.content_translations t
where t.entity_type='roadmap' and not exists(select 1 from public.roadmap_items r where r.id::text=t.entity_id);
```

长期高频编辑会积累已完成/取消任务。当前不自动删除审计记录；需根据实际容量选择保留周期，再由可信管理流程清理终态记录，不能删除待处理/运行中的任务。

## 本地测试与真实服务验收

单元测试：`node --test tests/*.test.cjs`。

本地 PostgreSQL 集成测试使用独立安装的 PGlite 0.5.10（没有加入生产依赖）：

```sh
NPM_CONFIG_CACHE=/tmp/flightdesk-npm-cache npm install --prefix /tmp/flightdesk-translation-db --no-audit --no-fund --save-exact @electric-sql/pglite@0.5.10
PGLITE_MODULE=/tmp/flightdesk-translation-db/node_modules/@electric-sql/pglite node tests/content-translations-db.integration.cjs
```

它执行实际 migration 与 PostgreSQL 角色/触发器/RPC，验证入队、去重、失效、人工保护、过期租约、有限重试、预算及草稿隔离。它不是远程 Supabase 扩展或多连接压测的替代品。

浏览器测试：`tests/content-translations-browser.cjs`，使用本地 `tests/support/theme-api.cjs` 和 fake Worker 完成响应。实际供应商适配器由注入的 HTTP 模拟响应验证；不得将 fake completion 报告为真实 DeepL 调用成功。

手动 Preview 验收：迁移→配置密钥→部署→确认 Worker 路由授权→按预算启用和安排 Cron→新建一个非敏感英文草稿→观察 Pending/Completed→抽查品牌/型号/占位符→发布后切换中英文→人工校订→修改英文→确认人工保留/Outdated→确认重译→批量补齐一批。检查调用统计和任务错误，再考虑后续批次。不要合并 main 或发布 Production。
## 修改与新增文件

- `app/admin/roadmap/page.tsx`
- `app/admin/translations/content-actions.ts`
- `app/admin/translations/page.tsx`
- `app/api/content-translations/route.ts`
- `app/api/internal/translations/process/route.ts`
- `components/roadmap-cards.tsx`
- `components/roadmap-content.tsx`
- `components/roadmap-manager.tsx`
- `components/roadmap-translation-editor.tsx`
- `docs/dynamic-content-translations.md`
- `docs/dynamic-translations-cron.sql`
- `lib/content-translations/model.ts`
- `lib/content-translations/provider.ts`
- `lib/content-translations/read.server.ts`
- `lib/content-translations/worker-server.ts`
- `lib/content-translations/worker.ts`
- `lib/i18n/catalog.ts`
- `lib/roadmap/model.ts`
- `lib/roadmap/server.ts`
- `supabase/migrations/20261016000300_dynamic_content_translations.sql`
- `tests/content-translations-browser.cjs`
- `tests/content-translations-db.integration.cjs`
- `tests/content-translations-pending-browser.cjs`
- `tests/content-translations.test.cjs`
- `tests/content.test.cjs`
- `tests/roadmap.test.cjs`
- `tests/support/content-translation-fixture.cjs`
- `tests/support/theme-api.cjs`
## 本轮验证结果

- `npm run build`：通过，构建显式使用本地隔离 Supabase 协议服务配置。
- `node --test tests/*.test.cjs`：83 通过，0 失败，0 跳过。
- PostgreSQL 集成脚本：通过实际新 migration、管理员/普通用户/匿名/service_role 权限、原文保存入队、重复补齐、单字段重译、租约失效、重试、预算、缓存复用、人工保护、大小写 ID 归一化和删除清理测试。
- 可选 Cron SQL：在本地 stub Vault/Cron/pg_net 下验证语法、重复执行只保留本功能一个计划、私有函数权限与密钥不进入计划命令；没有对真实平台安装扩展或发送 HTTP。
- 动态内容浏览器套件：通过 SSR/无刷新中英文切换、英文草稿保留、人工保存、原文更新后的 Outdated、取消/确认重译、英文回退、fake Worker 完成后更新、历史补齐、越权拒绝；网络失败重新加载不会清空中文草稿。
- 缺动态迁移浏览器套件：通过禁用中文编辑、英文保存不受影响、中文回退英文的检查。
- 现有 `theme-browser`、`airports-browser`、`loading-browser`、`interactions-browser`：通过 Auth/重置密码、航班添加编辑/机场键盘搜索/DST、后台 Roadmap/CMS、主题、移动端、减少动画和导航反馈回归。完成的套件没有浏览器运行或 hydration 错误。
- 已查看中文移动端 Roadmap 截图，未出现横向溢出。截图里的 fake completion 文案不是实际 DeepL 翻译质量证明。
- 未验证：真实 DeepL 授权、实际译文质量、供应商收费、Vercel Preview Ready 状态、远程 Supabase RLS/扩展/调度器连通性、多连接压力测试。需用户安全配置并在 Preview 验收。
