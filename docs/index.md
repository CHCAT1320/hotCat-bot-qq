---
layout: home

hero:
  name: HotCat Bot
  text: 基于 node-napcat-ts 的 QQ 机器人框架
  tagline: 类型安全、功能完善、易于扩展
  image:
    src: /logo.png
    alt: HotCat Bot
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: API 参考
      link: /api/

features:
  - icon: 🚀
    title: 类型安全
    details: 基于 TypeScript，完整的类型推导，封装 napcat 全部 API
  - icon: 📦
    title: 消息段构建
    details: Message 类提供链式消息段构建，支持文本、图片、表情、文件等所有类型
  - icon: 🎨
    title: 彩色日志
    details: 内置 BotConsole 控制台日志，自动解析 CQ 码，带 ANSI 颜色高亮
  - icon: 🔌
    title: 事件系统
    details: BotEvent 按类别分组暴露 message/messageSent/notice/request 事件监听
---
