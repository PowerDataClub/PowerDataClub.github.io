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
  { text: "活动", icon: "bell", link: "/activity/" },
  { text: "文章", icon: "pen", link: "/blog/" },
  { text: "关于", icon: "info", link: "/about.md" },
  // {
  //   text: "博文",
  //   icon: "pen-to-square",
  //   prefix: "/posts/",
  //   children: [
  //     {
  //       text: "苹果",
  //       icon: "pen-to-square",
  //       prefix: "apple/",
  //       children: [
  //         { text: "苹果1", icon: "pen-to-square", link: "1" },
  //         { text: "苹果2", icon: "pen-to-square", link: "2" },
  //         "3",
  //         "4",
  //       ],
  //     },
  //     {
  //       text: "香蕉",
  //       icon: "pen-to-square",
  //       prefix: "banana/",
  //       children: [
  //         {
  //           text: "香蕉 1",
  //           icon: "pen-to-square",
  //           link: "1",
  //         },
  //         {
  //           text: "香蕉 2",
  //           icon: "pen-to-square",
  //           link: "2",
  //         },
  //         "3",
  //         "4",
  //       ],
  //     },
  //     { text: "樱桃", icon: "pen-to-square", link: "cherry" },
  //     { text: "火龙果", icon: "pen-to-square", link: "dragonfruit" },
  //     "tomato",
  //     "strawberry",
  //   ],
  // },
]);
