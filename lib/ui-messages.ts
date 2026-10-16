/** UI copy only: future locale routing/providers can pass the selected locale. */
export const loadingMessages = {
  en: {
    lang: "en",
    label: "Loading…",
    details: { page: "Opening page", auth: "Opening account access", flights: "Loading your flight", admin: "Loading administrator workspace", dashboard: "Loading your logbook", roadmap: "Loading roadmap", profile: "Loading your profile", settings: "Loading settings" },
  },
  "zh-CN": {
    lang: "zh-CN",
    label: "加载中…",
    details: { page: "正在打开页面", auth: "正在打开账户页面", flights: "正在加载航班", admin: "正在加载管理中心", dashboard: "正在加载飞行日志", roadmap: "正在加载开发路线图", profile: "正在加载个人资料", settings: "正在加载设置" },
  },
} as const;

export type LoadingContext = keyof typeof loadingMessages.en.details;
export function getLoadingMessages(locale = "en") {
  return locale.toLowerCase() === "zh" || locale.toLowerCase() === "zh-cn" || locale.toLowerCase() === "zh-hans"
    ? loadingMessages["zh-CN"] : loadingMessages.en;
}
