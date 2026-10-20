export const achievementCategoryCatalog = [
  { slug: "flight_milestones", name_en: "Flight Milestones", name_zh: "飞行里程碑", description_en: "Celebrate the completed flights that shape your journey.", description_zh: "记录每一次已完成飞行所汇聚成的旅程。" },
  { slug: "world_explorer", name_en: "World Explorer", name_zh: "世界探索者", description_en: "Discover achievements from the places you reach.", description_zh: "探索你抵达的世界各地。" },
  { slug: "aircraft_collector", name_en: "Aircraft Collector", name_zh: "飞机收藏家", description_en: "Build a collection of aircraft experiences.", description_zh: "收集不同机型的飞行体验。" },
  { slug: "route_explorer", name_en: "Route Explorer", name_zh: "航线探索者", description_en: "Celebrate the routes you have explored.", description_zh: "记录你探索过的航线。" },
  { slug: "flight_challenges", name_en: "Flight Challenges", name_zh: "飞行挑战", description_en: "Complete Flight Desk challenges.", description_zh: "完成 Flight Desk 飞行挑战。" },
  { slug: "aviation_heritage", name_en: "Aviation Heritage", name_zh: "航空传承", description_en: "Honour meaningful moments in aviation history.", description_zh: "纪念航空历史中的重要时刻。" },
  { slug: "flight_experiences", name_en: "Flight Experiences", name_zh: "飞行体验", description_en: "Unlock unique moments from your journeys.", description_zh: "解锁旅程中的独特飞行体验。" },
] as const;

export type AchievementCategorySlug = typeof achievementCategoryCatalog[number]["slug"];
