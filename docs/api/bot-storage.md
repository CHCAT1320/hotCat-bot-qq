---
title: BotStorage JSON 键值存储
description: HotCat Bot 的 BotStorage 存储工具：JSON 文件持久化、命名空间隔离，用于保存插件配置、用户数据和运行状态。
---

# BotStorage

基于 JSON 文件的简单键值存储，通过 `bot.storage` 访问。写入使用临时文件 + rename 保证原子性。

默认文件为 `./data/storage.json`，可通过 `storagePath` 配置。

## 方法

### get(key, fallback?)

```ts
storage.get<T>(key: string, fallback?: T): T | undefined
```

读取值，不存在时返回默认值。

### set(key, value)

```ts
storage.set<T>(key: string, value: T): void
```

写入并立即持久化。

### has(key)

```ts
storage.has(key: string): boolean
```

### delete(key)

```ts
storage.delete(key: string): boolean
```

### keys()

```ts
storage.keys(prefix?: string): string[]
```

### namespace(prefix)

```ts
storage.namespace(prefix: string): NamespacedStorage
```

创建隔离命名空间，读写自动加前缀。插件中可直接使用 `this.storage`。

```ts
bot.storage.set('count', 1)
const user = bot.storage.namespace('user')
user.set('123', { name: 'test' })
```
