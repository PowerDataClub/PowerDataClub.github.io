import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  {
      text: "技术",
      icon: "rocket",
      prefix: "/technology/",
      children: [
        {
          text: "数据中台",
          link: "data-mid-platform/",
          activeMatch: "^/data-mid-platform/$",
        },
        {
          text: "大数据组件",
          link: "bigdata-component/",
          activeMatch: "^/bigdata-component/$",
        }
      ], 
},
  {
     text: "开源",
      icon: "code",
      prefix: "/open/",
      children: ["bigdata-learning-roadmap.md", "bigdata-data-component-evaluation.md"], 
},
  { 
    text: "活动", 
    icon: "bell", 
    prefix: "/activity/",
    children:[
      {
        text: "模拟面试",
        link: "interview/",
        activeMatch: "^/interview/$",
      },
      {
        text: "主题研讨会",
        link: "seminar/",
        activeMatch: "^/seminar/$",
      },
      {
        text: "城市开源行",
        link: "open-city/",
        activeMatch: "^/open-city/$",
      }
    ]

  },
  { text: "文章", icon: "pen", link: "/blog/" },
  { text: "关于", icon: "info", link: "/about.md" },

]);
