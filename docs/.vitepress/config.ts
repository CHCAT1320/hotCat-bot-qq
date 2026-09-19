import { defineConfig } from 'vitepress'

const hostname = 'https://hotcat-bot-qq.docs.chcat1320.top'

export default defineConfig({
    lang: 'zh-CN',
    title: 'HotCat Bot',
    description:
        'HotCat Bot 是基于 node-napcat-ts 的 TypeScript QQ 机器人框架，封装 NapCat / OneBot 全部 API，内置类型安全的消息段、事件系统、cron 定时任务与热插拔插件系统，帮助开发者快速搭建稳定、易扩展的 QQ 群聊与私聊机器人。',
    base: '/',
    sitemap: {
        hostname,
    },
    transformPageData(pageData) {
        const path = pageData.relativePath
            .replace(/index\.md$/, '')
            .replace(/\.md$/, '.html')
        pageData.frontmatter.head ??= []
        pageData.frontmatter.head.push([
            'link',
            { rel: 'canonical', href: `${hostname}/${path}` },
        ])
    },
    head: [
        ['meta', { name: 'robots', content: 'index, follow' }],
        ['meta', { name: 'author', content: 'CHCAT1320' }],
        ['meta', { name: 'keywords', content: 'QQ机器人, NapCat, OneBot, TypeScript, node-napcat-ts, 机器人框架, 插件系统' }],
        ['meta', { property: 'og:site_name', content: 'HotCat Bot' }],
        ['meta', { property: 'og:title', content: 'HotCat Bot - 基于 NapCat 的 TypeScript QQ 机器人框架' }],
        [
            'meta',
            {
                property: 'og:description',
                content:
                    '基于 node-napcat-ts 的 TypeScript QQ 机器人框架，封装 NapCat / OneBot 全部 API，内置消息段、事件系统、定时任务与热插拔插件系统。',
            },
        ],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:url', content: hostname }],
        ['meta', { property: 'og:locale', content: 'zh_CN' }],
        ['meta', { property: 'og:image', content: `${hostname}/logo.png` }],
        ['meta', { property: 'og:image:alt', content: 'HotCat Bot' }],
        ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
        ['meta', { name: 'twitter:title', content: 'HotCat Bot - 基于 NapCat 的 TypeScript QQ 机器人框架' }],
        [
            'meta',
            {
                name: 'twitter:description',
                content:
                    '基于 node-napcat-ts 的 TypeScript QQ 机器人框架，封装 NapCat / OneBot 全部 API，内置消息段、事件系统、定时任务与热插拔插件系统。',
            },
        ],
        ['meta', { name: 'twitter:image', content: `${hostname}/logo.png` }],
    ],
    themeConfig: {
        search: {
            provider: 'local',
            options: {
                translations: {
                    button: {
                        buttonText: '搜索文档',
                        buttonAriaLabel: '搜索文档',
                    },
                    modal: {
                        noResultsText: '无结果',
                        resetButtonTitle: '清除',
                        footer: {
                            selectText: '选择',
                            navigateText: '切换',
                            closeText: '关闭',
                        },
                    },
                },
            },
        },
        nav: [
            { text: '首页', link: '/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: 'API', link: '/api/' },
        ],
        sidebar: [
            {
                text: '指南',
                items: [
                    { text: '快速开始', link: '/guide/getting-started' },
                    { text: '插件开发', link: '/guide/plugin-dev' },
                    { text: 'CQ 码与 JSON 互转', link: '/guide/cq-json' },
                ],
            },
            {
                text: '总览',
                link: '/api/',
            },
            {
                text: '核心类',
                collapsed: false,
                items: [
                    { text: 'BotClient', link: '/api/bot-client' },
                    {
                        text: 'BotApi',
                        link: '/api/bot-api',
                        collapsed: false,
                        items: [
                            { text: '消息发送', link: '/api/bot-api#消息发送' },
                            { text: '消息管理', link: '/api/bot-api#消息管理' },
                            { text: '群管理', link: '/api/bot-api#群管理' },
                            { text: '群公告', link: '/api/bot-api#群公告' },
                            { text: '群信息查询', link: '/api/bot-api#群信息查询' },
                            { text: '精华消息', link: '/api/bot-api#精华消息' },
                            { text: '用户 / 好友', link: '/api/bot-api#用户-好友' },
                            { text: '群互动', link: '/api/bot-api#群互动' },
                            { text: '文件 / 资源', link: '/api/bot-api#文件-资源' },
                            { text: '群文件管理', link: '/api/bot-api#群文件管理' },
                            { text: '收藏', link: '/api/bot-api#收藏' },
                            { text: '推荐 / 分享', link: '/api/bot-api#推荐-分享' },
                            { text: 'AI', link: '/api/bot-api#ai' },
                            { text: '系统', link: '/api/bot-api#系统' },
                        ],
                    },
                    { text: 'BotEvent', link: '/api/bot-event' },
                    { text: 'BotScheduler', link: '/api/bot-scheduler' },
                    { text: 'BotPluginSystem', link: '/api/bot-plugin' },
                ],
            },
            {
                text: '消息段',
                collapsed: false,
                items: [
                    { text: 'Message', link: '/api/message' },
                ],
            },
        ],
        socialLinks: [
            { icon: 'github', link: 'https://github.com/CHCAT1320/hotCat-bot-qq' },
        ],

        editLink: {
            pattern: 'https://github.com/CHCAT1320/hotCat-bot-qq/edit/master/docs/:path',
            text: '在 GitHub 上编辑此页面',
        },

        footer: {
            message: '基于 MIT 许可发布',
            copyright: '版权所有 © 2026 CHCAT1320',
        },

        lastUpdated: {
            text: '最后更新于',
            formatOptions: {
                dateStyle: 'short',
                timeStyle: 'short',
            },
        },

        docFooter: {
            prev: '上一页',
            next: '下一页',
        },
    },
})
