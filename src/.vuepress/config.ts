import { defineUserConfig } from "vuepress";
import theme from "./theme.js";
import { searchProPlugin } from "vuepress-plugin-search-pro";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "PowerData",
  description: "凝聚国内数据力量",

  theme,

  // Enable it with pwa
  // shouldPrefetch: false,

plugins: [
  [
    searchProPlugin({
      // 索引全部内容
      indexContent: true,
    }),
  ]
]
});
