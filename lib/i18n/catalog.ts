// Stable semantic keys. English remains the source language; values are plain text.
const rows = `
common.save|Save|保存
common.cancel|Cancel|取消
common.edit|Edit|编辑
common.view|View|查看
common.viewEdit|View/Edit|查看／编辑
common.search|Search|搜索
common.delete|Delete|删除
common.saved|Saved|已保存
common.saving|Saving…|正在保存…
challenge.markComplete|Mark as Complete|标记为已完成
challenge.completed|Completed|已完成
challenge.completedMessage|Challenge completed! Great flight, Captain!|挑战完成！精彩飞行，机长！
challenge.completionError|Unable to update challenge completion.|无法更新挑战完成状态。
challenge.flownBefore|Flown Before|曾飞过
memorial.start|Start|开始
memorial.storyBackground|Story Background|故事背景
memorial.historicalEventDate|Historical Event Date|历史事件日期
memorial.suggestedAircraft|Suggested Aircraft|推荐机型
memorial.markComplete|Mark as Complete|标记为已完成
memorial.completed|Completed|已完成
memorial.completionError|Unable to update memorial flight completion.|无法更新纪念飞行完成状态。
common.sending|Sending…|正在发送…
common.deleting|Deleting…|正在删除…
common.publishing|Publishing…|正在发布…
common.loading|Loading…|加载中…
common.optional|(optional)|（选填）
common.features|Features|功能
common.roadmap|Roadmap|开发路线图
common.blog|Blog|博客
common.community|Community|社区
common.pricing|Pricing|价格
common.product|Product|产品
common.company|Company|关于我们
common.legal|Legal|法律信息
common.about|About|关于
common.contact|Contact|联系
common.support|Support|支持
common.privacy|Privacy Policy|隐私政策
common.terms|Terms of Service|服务条款
common.started|Get Started|开始使用
common.dashboard|Dashboard|飞行概览
common.settings|Settings|设置
common.profile|My Profile|个人资料
common.openLogbook|Open Your Logbook|打开飞行日志
common.openLogbookLower|Open Your Logbook|打开飞行日志
common.explore|Explore Flight Desk|探索 Flight Desk
common.soon|Coming Soon|即将上线
common.next|Coming Next|后续上线
common.available|Available|已上线
common.unavailable|Not available yet|暂无数据
common.backHome|← Back Home|← 返回首页
common.backLanding|← Back to Landing Page|← 返回 Landing Page
common.backDashboard|← Back To Dashboard|← 返回飞行概览
common.backMain|← Back to Main Page|← 返回首页
common.backFlight|← Back To Flight|← 返回航班详情
common.backSignIn|← Back To Sign In|← 返回登录
common.backDashboardArrow|Back To Dashboard →|返回飞行概览 →
common.dismiss|Dismiss notification|关闭提示
common.mainNav|Main Navigation|主导航
common.footerNav|{group} Footer Navigation|{group}页脚导航
common.copyright|© 2026 Flight Desk. All rights reserved.|© 2026 Flight Desk。保留所有权利。
common.upcoming|该功能即将上线，敬请期待|该功能即将上线，敬请期待
common.upcomingEnglish|This feature is coming soon. Stay tuned.|该功能即将上线，敬请期待。
common.brandHome|Flight Desk home|Flight Desk 首页
common.errorTitle|This page could not be loaded|页面暂时无法加载
common.retry|Try loading again|重新加载
common.errorHelp|Check your connection and try loading the page again. If a save was interrupted, check the record before submitting it again.|请检查网络后重新加载。如果保存过程中断，请先查看记录，避免重复提交。
common.requestError|The request could not be confirmed. Check your connection and try again.|暂时无法确认操作结果，请检查网络后重试。
common.saveError|Save could not be confirmed. Your edits are still here; check before retrying.|暂时无法确认保存结果。编辑内容已保留，请确认后再重试。
common.loginRequired|You must be signed in.|请先登录。
common.genericError|Something went wrong. Check your entries and try again.|操作未完成，请检查填写内容后重试。
common.deleteFlightConfirm|Delete This Flight? This Action Cannot Be Undone.|确定删除这趟航班吗？此操作无法撤销。
auth.welcome|Welcome to Flight Desk|欢迎使用 Flight Desk
auth.ready|Ready for your next chapter?|准备好开启下一段旅程了吗？
auth.start|Start your flying story.|开启你的飞行故事。
auth.intro|Sign in to pick up where you left off.|登录，继续记录你的飞行旅程。
auth.signupIntro|Create your account and keep every journey together.|创建账号，珍藏每一段飞行旅程。
auth.mode|Account access mode|登录或注册
auth.access|Account access|账号登录
auth.signIn|Sign In|登录
auth.signUp|Create Account|创建账号
auth.email|Email|邮箱
auth.password|Password|密码
auth.passwordHint|At least 6 characters|至少 6 个字符
auth.show|Show password|显示密码
auth.hide|Hide password|隐藏密码
auth.forgot|Forgot password?|忘记密码？
auth.signingIn|Signing In…|正在登录…
auth.creating|Creating Account…|正在创建账号…
auth.signOut|Sign Out|退出登录
auth.signingOut|Signing Out…|正在退出…
auth.openMenu|Open User Menu|打开账号菜单
auth.invalidCredentials|Email or password is incorrect.|邮箱或密码不正确。
auth.created|Please Check Your Email For Verification Instructions.|请查看邮箱中的验证说明。
auth.signupExisting|We Could Not Create This Account. If You Already Have An Account, Please Sign In Or Reset Your Password.|无法创建账号。如果你已有账号，请直接登录或重置密码。
auth.networkError|Sign in or account creation could not be confirmed. Check your connection before trying again.|暂时无法确认登录或注册结果，请检查网络后再试。
auth.resetTitle|Reset Your Password|重置密码
auth.resetIntro|We’ll send a secure reset link to your email address.|我们将向你的邮箱发送安全的密码重置链接。
auth.sendReset|Send Reset Link|发送重置链接
auth.sendingReset|Sending Reset Link…|正在发送重置链接…
auth.resetSent|Check your inbox for the password reset link.|请前往邮箱查看密码重置链接。
auth.newPasswordTitle|Choose A New Password|设置新密码
auth.newPassword|New Password|新密码
auth.updatePassword|Update Password|更新密码
auth.updatingPassword|Updating Password…|正在更新密码…
auth.passwordUpdated|Password updated successfully.|密码已更新。
auth.updateError|The update could not be confirmed. Check your connection before retrying.|暂时无法确认更新结果，请检查网络后再试。
auth.invalidLink|The authentication link is invalid or expired.|验证链接无效或已过期。
auth.emailRequired|Enter your email address|请输入邮箱地址
auth.logbookEyebrow|A PERSONAL HOME FOR YOUR FLYING HISTORY.|专属于你的飞行记忆空间。
auth.keepEvery|Keep Every|珍藏每一段
auth.journeyView|Journey In View.|飞行旅程。
auth.capture|Capture the journeys and memories that make you love aviation.|记录那些让你热爱航空的旅程与回忆。
profile.account|Account|账号
profile.details|Profile Details|个人资料
profile.displayName|Display Name|显示名称
profile.editName|Edit Display Name|编辑显示名称
profile.defaultAvatar|Default avatar · uploads coming later|默认头像 · 上传功能将在后续推出
profile.emailTitle|Sign-In Email|登录邮箱
profile.emailHelp|This is the email connected to your Flight Desk account.|这是与你的 Flight Desk 账号关联的邮箱。
profile.settingsHelp|Manage your account details and preferences.|管理账号资料与偏好设置。
profile.aviation|Aviation Profile|航空爱好者资料
profile.memberSince|Member Since|加入时间
profile.bio|Profile Bio|个人简介
profile.bioEmpty|Add a short introduction about your aviation journey.|写几句话，介绍你的航空之旅。
profile.addBio|Add bio|添加简介
profile.editBio|Edit bio|编辑简介
profile.saveBio|Save bio|保存简介
profile.bioPlaceholder|Tell other future-you a little about your aviation journey.|为未来的自己，留下你的航空故事。
profile.bioTooLong|Your bio must be 280 characters or fewer.|个人简介不能超过 280 个字符。
profile.nameInvalid|Please enter a name up to 80 characters.|请输入不超过 80 个字符的名称。
profile.fromLogbook|From your private logbook|来自你的私人飞行日志
profile.noDuration|No duration yet|暂无时长数据
profile.journey|Aviation journey|航空之旅
profile.journeyHelp|A place for your favourite airlines, aircraft and future flying map.|收藏喜爱的航空公司、机型，并期待未来的飞行地图。
profile.airlines|Favourite airlines|喜爱的航空公司
profile.aircraft|Favourite aircraft|喜爱的机型
profile.map|Flying map|飞行地图
profile.achievements|Achievements|成就
profile.achievementsEmpty|Achievement badges will appear here as your flying history grows.|随着飞行记录不断丰富，你的成就徽章将在这里展示。
profile.statsError|We couldn’t load your profile statistics. Please refresh and try again.|暂时无法加载个人统计，请刷新后重试。
settings.appearance|Appearance|外观
settings.themeHelp|Choose your theme. System follows your device. Your choice is saved in this browser.|选择外观主题。“跟随系统”会使用设备设置，偏好将保存在此浏览器。
settings.light|Light|浅色
settings.dark|Dark|深色
settings.system|System|跟随系统
settings.chooseTheme|Choose color theme|选择外观主题
settings.colorTheme|Color theme|外观主题
settings.passwordHelp|Your password is protected and can never be viewed here.|你的密码受到安全保护，无法在此查看。
settings.changePassword|Change password|修改密码
settings.saveNewPassword|Save New Password|保存新密码
settings.passwordChanged|Password Changed Successfully.|密码修改成功。
settings.currentPassword|Current Password|当前密码
settings.newPassword|New Password|新密码
settings.showPassword|Show Password|显示密码
settings.hidePassword|Hide Password|隐藏密码
settings.passwordTooShort|New Password Must Be At Least 8 Characters.|新密码至少需要 8 个字符。
settings.currentPasswordIncorrect|Current Password Is Incorrect.|当前密码不正确。
settings.passwordUpdateError|The Password Could Not Be Updated. Please Try Again.|密码无法更新，请重试。
settings.passwordResetRequired|Password Reset Is Required For This Account.|此账号需要通过密码重置流程设置密码。
settings.passwordEmail|Check your email for a secure password change link.|请前往邮箱查看安全的密码修改链接。
settings.passwordError|The email request could not be confirmed. Check your connection and inbox before retrying.|暂时无法确认邮件发送结果，请检查网络和收件箱后再试。
settings.general|General Settings|常规设置
settings.generalHelp|Manage how Flight Desk displays your information.|管理 Flight Desk 的显示方式。
settings.account|Account Settings|账户设置
settings.flightPreferences|Flight Preferences|飞行偏好
settings.flightPreferencesHelp|More flight preferences will appear here as they become available.|更多飞行偏好将在相关功能推出后显示。
settings.dateFormat|Date Format|日期格式
settings.distanceUnit|Distance Unit|距离单位
settings.timeFormat|Time Format|时间格式
settings.saved|Settings Saved.|设置已保存。
settings.saveError|Settings Could Not Be Saved. Please Try Again.|设置无法保存，请重试。
settings.fullSettings|Go To Full Settings|进入完整设置
settings.kilometers|Kilometers (km)|千米 (km)
settings.miles|Miles (mi)|英里 (mi)
settings.nauticalMiles|Nautical Miles (nm)|海里 (nm)
settings.twelveHour|12-hour (AM/PM)|12小时制（上午/下午）
settings.twentyFourHour|24-hour|24小时制
timePicker.open|Open time picker|打开时间选择器
timePicker.title|Time picker|时间选择器
timePicker.hour|Hour|小时
timePicker.minute|Minute|分钟
timePicker.period|AM/PM|上午/下午
dashboard.personal|Personal Logbook|个人飞行日志
dashboard.greeting|Hello Captain|你好，机长
dashboard.aircraftCount|Aircraft|飞机
dashboard.status|Status|状态
dashboard.completed|Completed|已完成
dashboard.planned|Planned|计划中
dashboard.filters|Filters|筛选
dashboard.clearFilters|Clear Filters|清除筛选
dashboard.importButton|Import|导入
dashboard.viewAllFlights|View All Flights|查看全部航班
dashboard.viewEdit|View/Edit|查看／编辑
flight.status|Flight status|航班状态
flight.planned|Planned|计划中
flight.completed|Completed|已完成
dashboard.glance|Here’s your flying at a glance.|你的飞行经历，一目了然。
dashboard.total|Total Flights|航班总数
dashboard.recorded|Your Recorded Flights|已记录的航班
dashboard.empty|No flights recorded yet|尚未记录航班
dashboard.time|Flight Time|飞行时长
dashboard.noTime|No duration data yet|暂无时长数据
dashboard.afterMap|Available after mapping|地图功能上线后提供
dashboard.airports|Airports|机场
dashboard.countries|Countries|国家与地区
dashboard.flights|Flights|航班
dashboard.aircraftTypes|Aircraft Types|机型数量
dashboard.totalDistance|Total Distance|总距离
dashboard.recent|Recent Flights|最近航班
dashboard.latest|Your Latest Journeys|最近的飞行旅程
dashboard.emptyRecent|No flights yet. Import your history or add your first flight.|还没有航班记录。你可以添加第一段飞行，或等待历史导入功能上线。
dashboard.date|Date|日期
dashboard.route|Route|航线
dashboard.aircraft|Aircraft|飞机
dashboard.duration|Duration|时长
dashboard.action|Action|操作
dashboard.import|Import Your History|导入历史记录
dashboard.importHelp|Already have a spreadsheet? Bring your flights into Flight Desk in a few clicks.|已有航班表格？未来可通过导入功能，轻松整理到 Flight Desk。
dashboard.importSoon|Excel Import Coming Soon|Excel 导入即将上线
dashboard.importFormats|.xlsx or .csv · Preview before saving|.xlsx 或 .csv · 保存前可预览
dashboard.map|Flight Map|飞行地图
dashboard.allFlights|All Flights|全部航班
dashboard.allFlightsHelp|Manage Your Complete Flight History|管理完整航班记录
dashboard.records|Records|条记录
dashboard.durationFilterError|Duration values must be non-negative, and Max Duration cannot be less than Min Duration.|时长必须为非负数，且最大时长不能小于最小时长。
dashboard.showFilters|Show Filters|显示筛选
dashboard.hideFilters|Hide Filters|收起筛选
dashboard.showingFlights|Showing {from}–{to} Of {total} Flights|显示第 {from}–{to} 条，共 {total} 条航班
dashboard.number|#|序号
dashboard.flight|Flight|航班号
dashboard.mapHelp|Route visualisation will appear here as your logbook grows.|随着飞行日志不断丰富，你的航线将在这里呈现。
dashboard.mapEmpty|✦ Map view reserved for your routes|✦ 为你的航线预留的地图空间
dashboard.error|We couldn’t load your flight data. Please refresh and try again.|暂时无法加载航班数据，请刷新后重试。
dashboard.exploreMap|Explore Map|探索地图
dashboard.dailyChallenge|Daily Challenge|每日挑战
dashboard.dailyChallengeHelp|Build your flying rhythm with small daily goals.|用每日小目标保持你的飞行节奏。
dashboard.viewChallenges|View Challenges|查看挑战
dashboard.passport|Aviation Passport|航空护照
dashboard.passportCover|Your Aviation Story|你的航空故事
dashboard.passportPage|Passport Page|护照页面
dashboard.passportEmpty|Your completed journeys will appear here as passport stamps.|完成的旅程将在这里生成护照印章。
passport.title|Aviation Passport|航空护照
passport.customize|Customize|自定义
passport.design|Design|设计
passport.passportDesign|Passport Design|护照设计
passport.cover|Cover|封面
passport.innerPages|Inner Pages|内页
passport.identity|Aviation Identity|航空身份
passport.passportNo|PASSPORT NO.|护照编号
passport.defaultUser|USER|用户
passport.setUsernameHint|Set Your Username In Settings.|请前往设置中设置用户名。
passport.memberSince|Member Since|加入日期
passport.totalFlights|Total Flights|已完成航班
passport.countriesVisited|Countries Visited|到访国家
passport.flightTime|Flight Time|飞行时间
passport.stamps|AVIATION STAMPS|航空印章
passport.empty|Your passport is ready for its first stamp.|你的航空护照已准备好，等待第一枚印章。
passport.openHint|Click To Open Your Passport|点击打开你的航空护照
passport.open|Open Passport|打开护照
passport.close|Close Passport|合上护照
passport.totalVisits|Total Visits|到访次数
passport.firstVisit|First Visit|首次到访
passport.latestVisit|Latest Visit|最近到访
passport.relatedFlights|Related Flights|相关航班
passport.coverColor|Cover Color|封面颜色
passport.goToPage|Go To Page|跳转至页面
passport.selectPage|Select Page|选择页面
passport.go|Go|跳转
passport.endingPrimary|The sky is not the limit.|天空并非极限。
passport.endingPrimaryLine1|The sky is|天空并非
passport.endingPrimaryLine2|not the limit.|极限。
passport.endingSecondary|It's where your story begins.|你的故事，正从这里开始。
dashboard.previous|Previous|上一页
dashboard.next|Next|下一页
dashboard.achievements|Flight Achievements|飞行成就
dashboard.achievementsHelp|Milestones from your completed journeys will appear here.|完成的旅程里程碑将在这里展示。
dashboard.viewAllAchievements|View All Achievements|查看全部成就
dashboard.reports|Flight Reports|飞行报告
dashboard.reportsHelp|Review your flying by day, week, month, or year.|按日、周、月或年查看飞行记录。
dashboard.viewReports|View Reports|查看报告
dashboard.daily|Daily|每日
dashboard.weekly|Weekly|每周
dashboard.monthly|Monthly|每月
dashboard.yearly|Yearly|每年
dashboard.noReportData|Complete a flight to start building reports.|完成一次航班后即可生成报告。
dashboard.memories|Flight Memories|飞行回忆
dashboard.memoriesHelp|Keep meaningful moments from your journeys in one place.|将旅程中的珍贵瞬间记录在这里。
dashboard.noMemories|Your flight memories will appear here when you have matching journeys or saved notes.|当你有符合条件的旅程或保存备注后，飞行回忆将在这里展示。
dashboard.activityCalendar|Activity Calendar|活动日历
dashboard.activityCalendarHelp|Your completed flight activity will appear here.|已完成的飞行活动将在这里展示。
dashboard.noActivity|Complete a flight to start building your activity calendar.|完成一次航班后即可生成活动日历。
map.viewFull|View Full Map|查看完整地图
map.subtitle|Explore your completed journeys across the world.|探索你在世界各地完成的飞行旅程。
map.emptyTitle|Your Flight Map Awaits|你的飞行地图正等待开启
map.emptyDescription|Every journey starts with a flight. Start yours today.|每段旅程都始于一次飞行。今天，就开启你的故事。
map.addFirstFlight|Add Your First Flight|添加你的首段飞行
map.emptyData|Completed flights exist, but none can be mapped yet.|已有已完成航班，但暂时无法匹配地图坐标。
map.loading|Loading Flight Map…|正在加载飞行地图……
map.loadError|The Flight Map Could Not Be Loaded. Please Check The Map Configuration And Try Again.|飞行地图无法加载，请检查地图配置后重试。
map.styleMissing|A Production Map Style Is Not Configured Yet. Add NEXT_PUBLIC_MAP_STYLE_URL To Enable The Map.|尚未配置生产地图样式，请添加 NEXT_PUBLIC_MAP_STYLE_URL 以启用地图。
dashboard.pageComingSoon|This Flight Desk feature is coming soon.|该 Flight Desk 功能即将上线。
flight.add|Add a Flight|添加航班
flight.addLink|＋ Add a Flight|＋ 添加航班
flight.edit|Edit Flight|编辑航班
flight.delete|Delete Flight|删除航班
flight.editEntry|Edit Logbook Entry|编辑飞行记录
flight.editHelp|Update Your Journey Details Below.|在下方更新这段旅程的详细信息。
flight.record|Flight Record|飞行记录
flight.savedInfo|Saved Flight Information|已保存的航班信息
flight.ticket|Flight Ticket · Planned Journey|航班机票 · 计划行程
flight.departure|Departure|出发
flight.arrival|Arrival|到达
flight.departureAirport|Departure Airport|出发机场
flight.arrivalAirport|Arrival Airport|到达机场
flight.departureDate|Departure Date|出发日期
flight.arrivalDate|Arrival Date|到达日期
flight.plannedTime|Planned Time|计划时间
flight.localTime|Local Time|当地时间
flight.timezone|Timezone|时区
flight.chooseTimezone|Select or Type IANA Timezone|选择或输入 IANA 时区
flight.clockChange|Clock Change — Choose Occurrence|夏令时切换 — 选择对应时刻
flight.chooseClock|Choose Earlier or Later|选择较早或较晚的时刻
flight.terminal|Terminal (Optional)|航站楼（选填）
flight.gate|Gate (Optional)|登机口（选填）
flight.details|Flight Details|航班详情
flight.airline|Airline|航空公司
flight.number|Flight Number|航班号
flight.airlineHint|e.g. Air China|例如：中国国际航空
flight.type|Aircraft Type (Optional)|机型（选填）
flight.typeHint|e.g. Boeing 737-800|例如：Boeing 737-800
flight.registration|Registration (Optional)|注册号（选填）
flight.scheduled|Scheduled Duration|计划飞行时长
flight.actual|Actual Duration|实际飞行时长
flight.actualHours|Actual Duration Hours|实际飞行时长（小时）
flight.actualMinutes|Actual Duration Minutes|实际飞行时长（分钟）
flight.hours|Hours|小时
flight.minutes|Minutes|分钟
flight.calculated|Calculated after times are valid|有效日期和时间填写完成后自动计算
flight.notes|Notes|备注
flight.notesHint|Anything you want to remember…|记下这段旅程中值得珍藏的细节…
flight.save|Save Flight →|保存航班 →
flight.update|Save Changes →|保存修改 →
flight.saving|Saving Flight…|正在保存航班…
flight.updating|Updating Flight…|正在更新航班…
flight.saved|Flight saved successfully.|航班已保存。
flight.updated|Flight updated successfully.|航班已更新。
flight.pending|Duration pending|等待计算时长
flight.selectBoth|Select both airports or enter their information manually.|请选择出发和到达机场，或手动填写机场信息。
flight.invalidMinutes|Actual duration minutes must be between 0 and 59.|分钟部分必须在 0 到 59 之间。
flight.actualInvalid|Actual duration must be a non-negative whole number of minutes.|实际飞行时长必须是非负整数分钟。
flight.saveError|The save could not be confirmed. Your entries are still here. Check your logbook before retrying to avoid a duplicate.|暂时无法确认保存结果，填写内容已保留。请先查看飞行日志，再决定是否重试，以免重复记录。
flight.dbCreateError|Database request failed. Your flight was not saved. Please try again.|航班保存失败，请稍后重试。
flight.dbUpdateError|Database request failed. Your changes were not saved. Please try again.|修改保存失败，请稍后重试。
flight.invalidRecord|Invalid flight record.|航班记录无效。
flight.unavailable|This flight is unavailable or you do not have permission to edit it.|此航班不存在，或你没有编辑权限。
flight.checkDetails|Check the flight details.|请检查航班信息。
flight.checkTimes|Check planned times.|请检查计划日期和时间。
flight.requiredTimes|Enter both planned local date/times.|请填写出发和到达的当地日期及时间。
flight.invalidClock|Invalid clock-change choice.|夏令时切换选项无效。
flight.invalidTime|Enter a valid date, local time, and IANA timezone.|请输入有效的日期、当地时间和 IANA 时区。
flight.gap|This local time does not exist in the selected timezone. Check the clock change.|所选时区因夏令时切换不存在这个当地时刻，请检查时间。
flight.overlap|This local time occurs twice. Choose the earlier or later occurrence.|夏令时切换导致这个当地时刻出现两次，请选择较早或较晚的一次。
flight.arrivalBefore|Arrival must not precede departure; check the dates and timezones.|到达时间不能早于出发时间，请检查日期和时区。
airport.name|Airport name|机场名称
airport.searchHint|Search IATA, ICAO, Name, City Or Country|搜索 IATA、ICAO、机场名称、城市或国家
airport.searching|Searching Airports…|正在搜索机场…
airport.error|Airport search is unavailable. Try again or enter manually.|机场搜索暂时不可用，请重试或手动填写。
airport.empty|No matching airports. Try another name or enter manually.|未找到匹配机场，请尝试其他关键词或手动填写。
airport.manual|Enter Airport Manually|手动填写机场
airport.editManual|Edit Airport Manually|手动编辑机场
airport.manualEntry|· manual entry|· 手动填写
airport.back|Back to airport search|返回机场搜索
airport.iata|IATA (optional)|IATA（选填）
airport.icao|ICAO (optional)|ICAO（选填）
airport.country|Country code (optional)|国家／地区代码（选填）
airport.ident|Ident (optional)|Ident 标识（选填）
airport.manualHelp|Choose the airport's IANA timezone below. Manual entries do not change the shared airport database.|请在下方选择机场的 IANA 时区。手动填写不会修改共享机场数据库。
airport.select|Select an airport|请选择机场
airport.zoneNeeded|Timezone needs manual selection|请手动选择时区
airport.zoneBelow|Select timezone below|请在下方选择时区
airport.zoneRecommended|Recommended timezone: |建议时区：
airport.countryUnknown|Country unavailable|国家／地区未知
airport.locationUnknown|Location unavailable|所在地未知
airport.keyboard|Type at least 2 characters. Arrow keys to browse, Enter to select.|请输入至少 2 个字符，使用方向键浏览，按 Enter 选择。
airport.credit|Airports:|机场数据：
airport.boundaries|. Timezone boundaries:|。时区边界：
roadmap.title|Building the Next Journey|共同规划下一段旅程
roadmap.eyebrow|The Flight Desk flight plan|Flight Desk 开发计划
roadmap.description|What’s ready, what’s taking shape, and what’s next.|了解已上线、规划中与未来的功能。
roadmap.full|View Full Roadmap|查看完整开发路线图
roadmap.planned|Planned|已规划
roadmap.completed|Completed|已完成
roadmap.hold|On Hold|暂缓
roadmap.target|Target date|目标日期
roadmap.completedDate|Completed date|完成日期
roadmap.updated|Last updated|最近更新
roadmap.tbd|TBD|待定
roadmap.emptyItems|No published items yet.|暂无已发布项目。
roadmap.emptyTitle|Our public flight plan is taking shape.|公开开发计划正在逐步完善。
roadmap.emptyShort|Product updates will appear here when they’re ready to share.|准备就绪的产品更新将在这里发布。
roadmap.preparing|Preparing the next departure|准备下一次启程
roadmap.emptyHelp|We’re preparing our first product updates. Published milestones will appear here as they’re ready to share. You can follow along without an account.|我们正在准备首批产品更新，准备就绪后会在这里发布，无需登录即可关注开发进展。
roadmap.error|We couldn’t load the roadmap. Please refresh or try again later.|暂时无法加载开发路线图，请刷新或稍后重试。
roadmap.homeError|The roadmap is temporarily unavailable. Please try again later.|开发路线图暂时不可用，请稍后重试。
roadmap.itemUnavailable|This roadmap item is no longer available.|此开发项目已不可用。
roadmap.itemHelp|This roadmap item is no longer available. You can explore the current published roadmap below.|此开发项目已不可用，你可以在下方查看当前已发布的开发计划。
roadmap.sort|Sort By|排序方式
roadmap.sortTargetClosest|Target Date (Closest First)|目标日期（最近优先）
roadmap.sortTargetFarthest|Target Date (Farthest First)|目标日期（最远优先）
roadmap.sortUpdatedNewest|Last Updated (Newest First)|最近更新（从新到旧）
roadmap.sortUpdatedOldest|Last Updated (Oldest First)|最近更新（从旧到新）
roadmap.milestoneCount|published milestones · grouped by development status|个已发布里程碑 · 按开发状态分组
roadmap.noPublished|No published|暂无已发布的
roadmap.itemsYet|items yet.|项目。
admin.panel|Admin Panel|管理中心
admin.navigation|Administration|后台导航
admin.dashboard|Admin Dashboard|管理中心首页
admin.manageRoadmap|Manage Roadmap|管理开发路线图
admin.manageRoadmapLower|Manage roadmap|管理开发路线图
admin.manageLanding|Manage Landing Page|管理首页文案
admin.workspace|Administrator workspace|管理员工作区
admin.website|Website management|网站管理
admin.intro|Manage the public product story and the plan behind it.|管理网站内容与产品开发计划。
admin.roadmapHelp|Organize product milestones, development statuses and published updates.|管理产品里程碑、开发状态与公开更新。
admin.landingHelp|Edit homepage copy privately, save a draft, then publish it when you’re ready.|编辑首页文案，先保存草稿，确认后再发布。
admin.access|Administrator access|管理员访问
admin.denied|Access denied|无权访问
admin.deniedHelp|Your account does not have permission to manage this website.|你的账号没有网站管理权限。
admin.verifyError|We couldn’t verify administrator access. Please try again later.|暂时无法验证管理员权限，请稍后重试。
admin.back|Administrator access|管理员访问
admin.newItem|New roadmap item|新建开发项目
admin.newItemButton|＋ New roadmap item|＋ 新建开发项目
admin.editItem|Edit roadmap item|编辑开发项目
admin.draftHelp|Drafts are visible only to administrators. Publishing makes this item public immediately. Returning a published item to Draft hides it.|草稿仅管理员可见。发布后将立即公开，改回草稿即可隐藏。
admin.featureName|Feature name|功能名称
admin.description|Description|说明
admin.category|Category|分类
admin.status|Development status|开发状态
admin.visibility|Visibility|可见性
admin.priority|Priority (optional)|优先级（选填）
admin.unspecified|Not specified|未设置
admin.low|Low|低
admin.medium|Medium|中
admin.high|High|高
admin.targetDate|Target date (optional)|目标日期（选填）
admin.completedDate|Completion date (optional)|完成日期（选填）
admin.clearDate|Clear the field to remove the target date.|清空此字段即可移除目标日期。
admin.saveItem|Save item|保存项目
admin.filter|Filter By|筛选条件
admin.all|All Items|全部项目
admin.draft|Draft|草稿
admin.published|Published|已发布
admin.privateDraft|Draft — private|草稿 — 仅管理员可见
admin.publicPublished|Published — public|已发布 — 公开可见
admin.empty|No items in this view.|当前筛选条件下没有项目。
admin.viewRoadmap|View public roadmap ↗|查看公开开发路线图 ↗
admin.roadmapIntro|Save privately as a draft, or publish an update for everyone. Filter by status and sort by target date or last update.|保存私密草稿，或向所有人发布更新。可按状态筛选，并按目标日期或更新时间排序。
admin.itemsError|Roadmap items couldn’t be loaded. Refresh to try again.|暂时无法加载开发项目，请刷新后重试。
admin.savedDraft|Draft saved.|草稿已保存。
admin.savedPrivate|Draft saved. This item is private to administrators.|草稿已保存，目前仅管理员可见。
admin.publishedItem|Published. The public roadmap and homepage now reflect this item.|已发布，公开开发路线图和首页已更新。
admin.deleted|Roadmap item deleted.|开发项目已删除。
admin.saveError|The save could not be confirmed. Check the item before retrying.|暂时无法确认保存结果，请先查看项目再重试。
admin.deleteError|The delete could not be confirmed. Refresh to check the item before retrying.|暂时无法确认删除结果，请刷新检查项目后再重试。
admin.saveDenied|The item could not be saved. Refresh, check your administrator access, and try again.|项目保存失败，请刷新并确认管理员权限后重试。
admin.deleteDenied|The item could not be deleted. Refresh and check your administrator access.|项目删除失败，请刷新并确认管理员权限。
admin.invalidItem|Invalid roadmap item.|开发项目无效。
admin.titleInvalid|Title must be between 1 and 160 characters.|标题长度必须在 1 到 160 个字符之间。
admin.descriptionInvalid|Description must be 5,000 characters or fewer.|说明不能超过 5,000 个字符。
admin.categoryInvalid|Category must be between 1 and 80 characters.|分类长度必须在 1 到 80 个字符之间。
admin.statusInvalid|Choose a valid development status.|请选择有效的开发状态。
admin.publicationInvalid|Choose Draft or Published.|请选择草稿或已发布。
admin.priorityInvalid|Choose a valid priority.|请选择有效的优先级。
admin.dateInvalid|Enter a valid calendar date.|请输入有效的日期。
cms.title|Homepage content|首页内容
cms.intro|Edit the words, keep the design. Newlines in headings and descriptions are preserved.|修改文案，不改变设计。标题和说明中的换行会保留。
cms.view|View published homepage ↗|查看已发布首页 ↗
cms.separate|Draft and published copy are separate.|草稿与已发布文案相互独立。
cms.help|Save Draft keeps your edits private. Publish Saved Draft updates every section together. Button destinations, page layout and Roadmap items are managed separately.|保存草稿不会公开修改。发布已保存草稿会统一更新各部分文案。按钮目标、页面布局和开发项目单独管理。
cms.unsaved|You have unsaved edits. Save them before publishing.|有尚未保存的修改，请先保存再发布。
cms.noDraft|Save a complete draft before publishing.|请先保存完整草稿再发布。
cms.matches|The saved draft matches the published copy.|已保存草稿与当前已发布文案一致。
cms.saveDraft|Save Draft|保存草稿
cms.publishDraft|Publish Saved Draft|发布已保存草稿
cms.publicHelp|Changes are public only after publishing.|修改仅在发布后对外可见。
cms.publishConfirm|Publish the saved draft for all homepage sections? It will become visible to all visitors.|确定发布所有首页部分的已保存草稿吗？发布后所有访客均可看到。
cms.saveError|The save could not be confirmed. Your edits are still here; check before retrying.|暂时无法确认保存结果。编辑内容已保留，请确认后再重试。
cms.publishError|The publish request could not be confirmed. Refresh the homepage to check its status before retrying.|暂时无法确认发布结果，请先刷新首页检查，再决定是否重试。
cms.saved|Draft saved. The public homepage is unchanged.|草稿已保存，公开首页尚未改变。
cms.published|Published.|已发布。
cms.publishSuccess|Published. Refresh the public homepage to see the new copy.|已发布，刷新公开首页即可查看新文案。
cms.hero|Hero|首屏
cms.features|Core Features|核心功能
cms.roadmap|Product Roadmap|开发路线图
cms.why|Why Flight Desk|为什么选择 Flight Desk
cms.footer|Footer|页脚
cms.plainText|Plain text · up to|纯文本 · 最多
cms.characters|characters|个字符
cms.fields|fields|个字段
cms.error|Content couldn’t be loaded. Please refresh and check that the content migration and API permissions are available. Editing is disabled until loading succeeds.|内容暂时无法加载。请刷新，并检查内容迁移及 API 权限。加载成功前无法编辑。
cms.invalid|Invalid landing-page draft.|首页草稿无效。
cms.unknown|Unknown content field.|未知的内容字段。
cms.check|Check your draft.|请检查草稿内容。
cms.checkFields|Check the draft fields.|请检查草稿字段。
cms.saveFailed|Draft could not be saved. Check your connection and administrator access, then try again.|草稿保存失败，请检查网络和管理员权限后重试。
cms.verifyFailed|The saved draft could not be checked. Nothing was published.|无法检查已保存草稿，本次未发布任何内容。
cms.incomplete|The saved draft is incomplete or invalid. Save a complete draft before publishing.|已保存草稿不完整或无效，请先保存完整草稿再发布。
cms.publishUnconfirmed|Publishing could not be confirmed. Your draft remains saved; refresh the public homepage before retrying.|无法确认发布结果，草稿仍已保存。请先刷新公开首页检查，再决定是否重试。
landing.hero|Every Flight Tells a Story|每一次飞行，都有一个故事
landing.features|Built Around Your Journeys|围绕你的旅程而构建
landing.featuresIntro|From your first entry to your next discovery, make every journey part of your story.|从第一条记录到下一次探索，让每段旅程成为你的故事。
landing.logging|Flight Logging|记录航班
landing.loggingHelp|Record your flights with essential journey details, including airports, dates, and aircraft information.|记录机场、日期和飞机信息，珍藏每次飞行的重要细节。
landing.history|Flight History|飞行历史
landing.historyHelp|Keep your flights organized and revisit your past journeys in one place.|有序整理航班，在一个地方重温过去的旅程。
landing.statistics|Flight Statistics|飞行统计
landing.statisticsHelp|Discover insights and statistics from your personal flight history.|从个人飞行历史中发现数据与洞察。
landing.import|Excel Import|Excel 导入
landing.importHelp|Planned: bring your past journeys together with spreadsheet imports and a review before saving.|已规划：导入航班表格，保存前可预览与检查，轻松汇总历史旅程。
landing.map|Flight Map|飞行地图
landing.mapHelp|Planned: explore the routes and airports that shape your personal flying story on a map.|已规划：在地图上探索属于你的航线与机场。
landing.checklist|Flight Checklist|飞行清单
landing.checklistHelp|Planned: keep useful checklists for your aviation interests and simulator journeys in one place.|已规划：集中管理航空爱好与模拟飞行所需的实用清单。
landing.preview|Your Flights. All in One Place|你的所有飞行，尽在一处
landing.previewHelp|A clearer way to organize your journeys, revisit past flights, and explore your flight history.|更清晰地整理旅程、重温航班、探索飞行历史。
landing.previewAlt|Add Flight product preview showing the flight ticket and empty journey detail fields.|添加航班界面预览，展示机票和空白行程表单。
landing.previewCaption|Add Flight · Actual product interface, shown with an empty form|添加航班 · 实际产品界面，展示空白表单
landing.sky|FOR EVERYONE WHO LOVES THE SKY|献给每一位热爱天空的人
landing.demoTitle|A journey, captured|珍藏一段旅程
landing.demoAlt|Product demo of an illustrative flight from Beijing to New York, not a real user record|北京至纽约的示例航班展示，并非真实用户记录
landing.demoHelp|Illustrative product preview. An example route, not a user’s flight or live flight data.|示例产品预览。此航线并非用户航班，也不是实时航班数据。
landing.beijing|Beijing|北京
landing.newYork|New York|纽约
language.label|Language|语言
common.previousPage|Previous page|上一页
flight.durationValue|{hours}h {minutes}m|{hours} 小时 {minutes} 分钟
flight.scheduledValue|{hours}h {minutes}m scheduled|计划 {hours} 小时 {minutes} 分钟
airport.suggestions|{count} airport suggestions available. Use arrow keys to choose.|找到 {count} 个机场，可使用方向键选择。
flight.earlierOffset|Earlier occurrence (UTC{offset})|较早的一次（UTC{offset}）
flight.laterOffset|Later occurrence (UTC{offset})|较晚的一次（UTC{offset}）
cms.different|{count} saved fields differ from published copy.|已保存草稿中有 {count} 个字段与已发布文案不同。
content.heroEyebrow|For everyone who looks up.|献给每一位仰望天空的人。
content.heroExplore|Explore Flight Desk|探索 Flight Desk
content.roadmapTitle|Building the Next Journey|共同开启下一段旅程
content.roadmapDescription|What’s ready, what’s taking shape, and what’s next.|已完成、开发中与未来计划，一目了然。
content.roadmapLink|View Full Roadmap|查看完整开发路线图
content.copyright|© 2026 Flight Desk. All rights reserved.|© 2026 Flight Desk。保留所有权利。
cms.fieldEyebrow|eyebrow|引导文字
cms.fieldTitle|title|标题
cms.fieldDescription|description|说明
cms.fieldPrimary|primary label|主按钮文案
cms.fieldSecondary|secondary label|次按钮文案
cms.fieldLink|link label|链接文案
cms.fieldStatus|status label|状态标签
cms.fieldCopyright|copyright|版权信息
cms.fieldTagline|tagline|品牌标语
cms.fieldLogbook|logbook|飞行日志
cms.fieldTimezones|timezones|时区
cms.fieldPrivacy|privacy|隐私
cms.fieldEnthusiasts|enthusiasts|航空爱好者
cms.fieldAircraft|aircraft|飞机记录
cms.fieldAirports|airports|机场数据
cms.fieldChecklists|checklists|检查单
cms.fieldMaps|maps|地图与统计
cms.fieldMobile|mobile|移动体验
roadmap.summaryCounts|{total} items · {drafts} drafts · {published} published|共 {total} 项 · {drafts} 项草稿 · {published} 项已发布
roadmap.updatedValue|Updated {date}|更新于 {date}
roadmap.targetValue|Target {date}|目标日期 {date}
roadmap.priorityValue|{priority} priority|{priority}优先级
roadmap.updatedLabel|Updated|更新于
admin.priorityLabel|Priority|优先级
admin.deleteConfirm|Delete “{title}”? This permanently removes it from the roadmap, including the public page if published.|确定删除“{title}”吗？此操作会永久删除该开发项目；已发布的项目也会从公开页面移除。
common.pilot|Pilot|飞行者
dynamic.title|Dynamic content translations|动态内容翻译
dynamic.help|English is saved first. Automatic translations run in a persistent background queue. Manual edits are never overwritten without confirmation.|英文原文先保存，自动翻译由持久化后台任务处理。未经确认，不会覆盖人工译文。
dynamic.editLanguage|Content editing language|内容编辑语言
dynamic.original|English (Original)|English（原文）
dynamic.chinese|简体中文 (Translation)|简体中文（译文）
dynamic.field_title|Title|标题
dynamic.field_description|Description|说明
dynamic.field_category|Category|分类
dynamic.pending|Translation pending|等待翻译
dynamic.completed|Translated automatically|已自动翻译
dynamic.manual|Manually edited|人工译文
dynamic.outdated|Outdated — review needed|原文已更新，需审核
dynamic.failed|Translation failed|翻译失败
dynamic.notQueued|Not queued|尚未入队
dynamic.saveManual|Save Chinese translation|保存中文译文
dynamic.regenerate|Regenerate translation|重新生成译文
dynamic.reload|Reload latest|重新加载最新版本
dynamic.discard|Discard unsaved Chinese edits and reload the latest translation?|放弃尚未保存的中文修改，并加载最新译文吗？
dynamic.confirmManual|Replace the manually edited translation with a new automatic translation? The current manual wording will no longer be served.|确定用新的自动翻译替换人工译文吗？确认后，当前人工译文将不再展示。
dynamic.confirmRegenerate|Queue a new automatic translation? This may incur translation API charges when the worker runs.|确定创建新的自动翻译任务吗？后台执行时可能产生翻译 API 费用。
dynamic.confirmBackfill|Queue missing or outdated automatic translations for up to 25 Roadmap items? Existing manual/current translations are protected. Configured worker usage may incur charges.|为最多 25 个开发项目补充缺失或过期的自动翻译吗？人工译文和有效译文不会被覆盖。已配置的后台任务执行时可能产生费用。
dynamic.saved|Chinese translation saved as a manual override.|中文译文已保存，并标记为人工译文。
dynamic.queued|Translation queued. English remains available while waiting.|翻译任务已入队，等待期间仍可显示英文原文。
dynamic.failedRequest|The translation operation could not be confirmed. Your edits remain here. Reload and check before retrying.|无法确认翻译操作结果，编辑内容仍在。请重新加载检查后再试。
dynamic.migration|Dynamic translations are unavailable. Review and run the migration before editing. English content remains available.|动态翻译暂不可用，请先审核并执行迁移再编辑。英文原文不受影响。
dynamic.manualOutdated|The English source changed. This manual translation is preserved and still displayed until you review it.|英文原文已更新。人工译文已保留，审核前仍继续展示。
dynamic.autoOutdated|The English source changed. Visitors see English until an updated automatic translation is ready.|英文原文已更新。新的自动译文完成前，访客将看到英文。
dynamic.preview|Saved-content preview|已保存内容预览
dynamic.backfill|Backfill missing translations|补充历史内容译文
dynamic.continueBackfill|Continue next batch|继续处理下一批
dynamic.backfillHelp|Queue existing Roadmap content in batches of 25. This does not call the translation provider. Failed fields can be explicitly regenerated in the editor.|每批最多为 25 个历史开发项目创建翻译任务，此操作不调用翻译服务。失败的字段可在编辑器中手动重新生成。
dynamic.backfillMore|Batch queued. Continue to process more items.|本批已处理，可继续下一批。
dynamic.backfillDone|Backfill scan complete.|历史内容扫描完成。
dynamic.backfillCounts|Scanned {processed} items; updated {changed} translation fields.|已检查 {processed} 个项目，更新 {changed} 个翻译字段。
modules.dynamic|Dynamic translations|动态翻译
auth.aircraftLightAlt|A white passenger jet with a purple tail climbing toward the upper right, surrounded by subtle lavender flight trails and small sparkle stars.|一架紫色尾翼的白色客机向右上方爬升，周围点缀浅紫色航迹与星光。
auth.aircraftDarkAlt|A passenger jet with a purple tail climbing toward the upper right, with subtle stars and flight trails on a transparent background.|一架紫色尾翼的客机向右上方爬升，透明背景中点缀星光与航迹。
common.notFoundTitle|Page not found|未找到页面
common.notFoundHelp|This page is unavailable or you do not have access to it.|此页面不存在，或你没有查看权限。
modules.common|General|通用
modules.auth|Authentication|登录与账号
modules.profile|Profile|个人资料
modules.settings|Settings|设置
modules.preferences|Display & language settings|外观与语言设置
modules.dashboard|Logbook|飞行日志
modules.flight|Flights|航班
modules.airport|Airports|机场
modules.roadmap|Roadmap|开发路线图
modules.admin|Admin Panel|管理后台
modules.cms|Homepage CMS|首页内容管理
modules.landing|Landing Page|首页
modules.language|Language|语言
modules.translations|Translations|翻译
modules.loading|Loading|加载
modules.content|Published content|已发布文案
modules.modules|Translation modules|翻译模块
common.upcomingNotice|This feature is coming soon. Stay tuned.|该功能即将上线，敬请期待
airport.countryLabel|Country {code}|国家／地区 {code}
flight.depLocal|Departure local time|出发当地时间
flight.arrLocal|Arrival local time|到达当地时间
flight.depZone|Departure timezone|出发时区
flight.arrZone|Arrival timezone|到达时区
flight.depTerminal|Departure terminal|出发航站楼
flight.arrTerminal|Arrival terminal|到达航站楼
flight.depGate|Departure gate|登机口
flight.arrGate|Arrival gate|到达登机口
flight.depClock|Departure clock change|出发夏令时切换
flight.arrClock|Arrival clock change|到达夏令时切换
common.sampleFlight|e.g. CA1234|例如：CA1234
common.sampleRegistration|e.g. B-2087|例如：B-2087
common.hourValue|{hours}h|{hours} 小时
common.additionalMinutes|{minutes}m additional|另 {minutes} 分钟
common.nextPage|Next page|下一页
roadmap.noPlanned|No published planned items yet.|暂无已发布的计划中项目。
roadmap.noCompleted|No published completed items yet.|暂无已发布的已完成项目。
language.choose|Choose language|选择语言
language.help|Choose your display language. Flight records and theme settings stay unchanged.|选择界面语言，不会改变航班记录或外观主题。
language.browserSaved|Saved in this browser.|已保存在此浏览器。
language.accountSaved|Language preference saved to your account.|语言偏好已保存到账号。
language.accountPending|Saved in this browser. Account sync needs the language migration.|已保存在此浏览器。账号同步需先完成语言偏好数据库迁移。
language.saveError|Saved in this browser, but account sync failed. Try again later.|已保存在此浏览器，但账号同步失败，请稍后重试。
translations.title|Languages / Translations|语言与翻译
translations.help|Review and customize interface translations without redeploying the website.|审核并自定义界面译文，无需重新部署网站。
translations.key|Translation key|翻译 Key
translations.source|English source|英文原文
translations.default|Default Chinese|默认中文
translations.current|Current Chinese|当前中文
translations.search|Search keys, English or Chinese|搜索 Key、英文或中文
translations.module|Module|模块
translations.allModules|All modules|全部模块
translations.state|Translation status|翻译状态
translations.allStates|All states|全部状态
translations.customized|Customized|已自定义
translations.defaultState|Default|默认
translations.review|Needs review|待复核
translations.missing|Missing translation|缺少翻译
translations.save|Save and apply|保存并生效
translations.reset|Restore default|恢复默认
translations.resetConfirm|Restore the default translation? Only this override will be removed.|确定恢复默认译文吗？只会移除此条自定义覆盖。
translations.unsaved|You have unsaved translation edits.|有尚未保存的翻译修改。
translations.saved|Translation saved and applied.|译文已保存并生效。
translations.resetDone|Default translation restored.|已恢复默认译文。
translations.unavailable|Translation overrides are unavailable. Complete the reviewed migration before editing. Base dictionaries remain active.|翻译覆盖暂不可用，请先执行已审核的迁移再编辑。基础字典仍正常生效。
translations.conflict|This translation changed elsewhere. Reload it before saving.|此译文已被其他操作修改，请重新加载后再保存。
translations.invalid|Invalid translation. Check the text and placeholders.|译文无效，请检查文本和变量占位符。
translations.failed|The translation request could not be confirmed. Check before retrying.|无法确认翻译操作结果，请检查后再重试。
translations.englishReadOnly|English source is read-only. Saving applies Chinese changes immediately.|英文原文只读。保存后中文修改将立即生效。
translations.empty|No matching translations.|没有匹配的翻译。
landing.roadmapFilters|Filter roadmap by status|按状态筛选开发路线图
landing.roadmapAll|All|全部
landing.roadmapCount|Showing {shown} of {total} items|已显示 {shown} 项，共 {total} 项
landing.roadmapDetails|Toggle details|展开或收起详情
landing.roadmapViewItem|View on roadmap|在路线图中查看
landing.roadmapMore|Show more|查看更多
preferences.open|Open display and language settings|打开外观与语言设置
preferences.title|Display & language|外观与语言
preferences.close|Close settings|关闭设置
loading.page|Opening page|正在打开页面
loading.auth|Opening account access|正在打开账号页面
loading.flights|Loading your flight|正在加载航班
loading.admin|Loading administrator workspace|正在加载管理中心
loading.dashboard|Loading your logbook|正在加载飞行日志
loading.roadmap|Loading roadmap|正在加载开发路线图
loading.profile|Loading your profile|正在加载个人资料
loading.settings|Loading settings|正在加载设置
`.trim();

export type Locale = "en" | "zh-CN";
export const localeCookie = "flightdesk-locale";
export function normalizeLocale(value: unknown): Locale { return value === "zh-CN" ? "zh-CN" : "en"; }
export const catalog = rows.split("\n").map(line => {
  const [key, en, zh] = line.split("|");
  if (!key || !en) throw new Error("Invalid translation catalog entry");
  return { key, en, zh: zh || en, module: key.split(".")[0] };
});
if (new Set(catalog.map(entry => entry.key)).size !== catalog.length) throw new Error("Duplicate translation key");
export const byKey: Record<string, (typeof catalog)[number]> = Object.assign(Object.create(null), Object.fromEntries(catalog.map(entry => [entry.key, entry])));
export const sourceKeys: Record<string, string> = Object.assign(Object.create(null), Object.fromEntries(catalog.map(entry => [entry.en, entry.key])));
export function baseMessages(locale: Locale): Record<string, string> {
  return Object.fromEntries(catalog.map(entry => [entry.key.replaceAll(".", "__"), locale === "zh-CN" ? entry.zh || entry.en : entry.en]));
}
