import { defineConfig } from 'vitepress'

export default defineConfig({
    title: 'HotCat Bot',
    description: '基于 napcat 的 QQ 机器人框架',
    base: '/',
    themeConfig: {
        search: {
            provider: 'local',
        },
        nav: [
            { text: '首页', link: '/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: 'API', link: '/api/' },
        ],
        sidebar: {
            '/guide/': [
                {
                    text: '指南',
                    items: [
                        { text: '快速开始', link: '/guide/getting-started' },
                    ],
                },
            ],
            '/api/': [
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
        },
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
