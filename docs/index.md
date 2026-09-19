---
layout: home
title: HotCat Bot - 基于 NapCat 的 TypeScript QQ 机器人框架
titleTemplate: false
description: HotCat Bot 是基于 node-napcat-ts 的 TypeScript QQ 机器人框架，封装 NapCat / OneBot 全部 API，内置类型安全的消息段、事件系统、cron 定时任务与热插拔插件系统。文档包含快速开始、插件开发指南与完整 API 参考。

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
  - icon: 🧩
    title: 插件系统
    details: 继承 PluginBase 即可开发，支持热重载、目录监听，启动自动扫描加载
  - icon: 🔌
    title: 事件系统
    details: BotEvent 按类别分组暴露 message/messageSent/notice/request 事件监听
  - icon: ⏰
    title: 定时任务
    details: BotScheduler 支持 cron 表达式、间隔时间、指定时间，轻松实现定时功能
---
