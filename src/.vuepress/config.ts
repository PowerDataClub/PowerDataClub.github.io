import { defineUserConfig } from "vuepress";
import theme from "./theme.js";
import { searchProPlugin } from "vuepress-plugin-search-pro";
import markdownItTaskCheckbox from 'markdown-it-task-checkbox';

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "PowerData",
  description: "凝聚国内数据力量",

  theme,

  head: [
    ["script", { src: "https://hm.baidu.com/hm.js?e386f3bc12f7e151ac5d683b767db28f" }]
  ],

  // Enable it with pwa
  // shouldPrefetch: false,

plugins: [
  [
    searchProPlugin({
      // 索引全部内容
      indexContent: true,
    }),
  ]
],
markdown: {
  // 是否在每个代码块的左侧显示行号。
  lineNumbers: true,
  toc: { includeLevel: [1, 2, 3 , 4] },
  // Markdown 文件的 headers (标题 & 小标题) 会在准备阶段被提取出来，并存储在 this.$page.headers 中。
  //默认情况下，VuePress 会提取 h2 和 h3 标题。你可以通过这个选项来修改提取出的标题级别。
  extractHeaders: ['h1','h2'],
  // 自定义文章页面标题列表的深度。
  headers:{ level: [1, 2, 3, 4] }
},
});

