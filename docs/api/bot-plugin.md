# BotPluginSystem

插件管理器，通过 `bot.plugin` 访问。负责插件的注册、加载、卸载、热重载和目录监听。

## 方法

### register(name, ctor, meta)

```ts
register(name: string, ctor: PluginConstructor, meta: PluginMeta): void
```

注册插件但不加载。重复注册抛错。

```ts
bot.plugin.register('test', TestPlugin, {
    name: 'test',
    version: '1.0.0',
    description: '测试插件',
})
```

### load(name)

```ts
async load(name: string): Promise<void>
```

加载已注册的插件，调用 `PluginClass.create()` → `instance.load()`。跳过了 `register` 会抛错。

### unload(name)

```ts
async unload(name: string): Promise<void>
```

卸载已加载的插件，调用 `instance.unload()`。

### reload(name)

```ts
async reload(name: string): Promise<void>
```

热重载：`unload()` + `load()`，保证事件先解绑再重新注册。

### get(name)

```ts
get(name: string): PluginBase | undefined
```

获取已加载的插件实例，可调用插件自定义方法。

### list()

```ts
list(): string[]
```

返回所有已注册的插件名。

### loaded()

```ts
loaded(): string[]
```

返回所有已加载的插件名。

### scan(dir, autoLoad?)

```ts
async scan(dir: string, autoLoad?: boolean): Promise<string[]>
```

扫描目录下所有插件并加载。`autoLoad` 默认 `true`。

- 遍历 `dir` 下所有子目录
- 检查 `index.ts` 是否存在
- 动态 `import()` 并自动识别导出的插件类
- 返回成功加载的插件名列表

### watch(dir, interval?)

```ts
watch(dir: string, interval?: number): void
```

启动目录监听，`interval` 默认 5000ms。新增目录 → 自动加载，删除目录 → 自动卸载。

### unwatch()

```ts
unwatch(): void
```

停止目录监听。

## PluginBase

详见 [插件开发文档](/guide/plugin-dev)。
