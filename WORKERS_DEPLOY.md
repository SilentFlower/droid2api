# Cloudflare Workers 部署指南

这是 droid2api 的 Cloudflare Workers 版本部署指南。

## 📋 前提条件

1. **Cloudflare 账号**：注册 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号
2. **Node.js**：安装 Node.js 18 或更高版本
3. **Wrangler CLI**：Cloudflare Workers 的命令行工具

## 🚀 快速开始

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，让您授权 Wrangler 访问您的 Cloudflare 账号。

### 3. 配置环境变量

Workers 版本使用环境变量存储敏感信息。您需要设置以下密钥：

```bash
# 设置 Factory API Key（必需）
wrangler secret put FACTORY_API_KEY

# 如果需要，也可以设置其他 API keys
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENAI_API_KEY
```

执行命令后，会提示您输入密钥值。

### 4. 部署到 Cloudflare Workers

```bash
npx wrangler deploy
```

部署成功后，您会看到类似这样的输出：

```
✨ Success! Uploaded 1 file (x.xx sec)
✨ Uploaded droid2api-worker (x.xx sec)
✨ Published droid2api-worker (x.xx sec)
  https://droid2api-worker.your-subdomain.workers.dev
```

## 🔧 配置说明

### wrangler.toml

主要配置文件，已经预配置好：

```toml
name = "droid2api-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"
node_compat = true
```

### 修改模型配置

编辑 [`src/worker-config.js`](src/worker-config.js:1) 文件来修改模型列表和端点配置：

```javascript
export const config = {
  models: [
    {
      name: "Opus 4.1",
      id: "claude-opus-4-1-20250805",
      type: "anthropic",
      reasoning: "auto"
    },
    // 添加更多模型...
  ],
  endpoint: [
    {
      name: "openai",
      base_url: "https://app.factory.ai/api/llm/o/v1/responses"
    },
    // 添加更多端点...
  ]
};
```

**注意**：修改配置后需要重新部署。

## 📝 使用方法

部署成功后，您的 API 端点将是：

```
https://droid2api-worker.your-subdomain.workers.dev
```

### 可用端点

- `GET /v1/models` - 获取模型列表
- `POST /v1/chat/completions` - OpenAI 格式聊天补全（带格式转换）
- `POST /v1/responses` - 直接转发到 OpenAI 端点
- `POST /v1/messages` - 直接转发到 Anthropic 端点

### 示例请求

```bash
# 获取模型列表
curl https://droid2api-worker.your-subdomain.workers.dev/v1/models

# 聊天补全
curl https://droid2api-worker.your-subdomain.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4-1-20250805",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "stream": false
  }'
```

## 🔐 认证机制

Workers 版本使用简化的认证机制：

1. **环境变量优先**：如果设置了 `FACTORY_API_KEY`，将使用该密钥
2. **客户端回退**：如果没有环境变量，将使用客户端请求头中的 `Authorization` 字段

## 📊 监控和日志

### 查看实时日志

```bash
wrangler tail
```

### 在 Cloudflare Dashboard 查看

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Workers & Pages
3. 选择您的 Worker
4. 查看 Metrics 和 Logs

## 🔄 更新部署

修改代码后，重新部署：

```bash
npx wrangler deploy
```

## ⚙️ 高级配置

### 自定义域名

在 `wrangler.toml` 中添加：

```toml
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

### 环境变量（非敏感信息）

在 `wrangler.toml` 中添加：

```toml
[vars]
DEV_MODE = "false"
```

### 使用不同环境

```bash
# 部署到生产环境
wrangler deploy

# 部署到开发环境
wrangler deploy --env dev
```

## 🆚 与 Express 版本的区别

| 特性 | Express 版本 | Workers 版本 |
|------|-------------|-------------|
| 运行环境 | Node.js 服务器 | Cloudflare Workers (V8 Isolate) |
| 配置文件 | config.json (文件系统) | worker-config.js (硬编码) |
| 认证 | 支持自动刷新 token | 仅支持固定 API key |
| 代理支持 | 支持自定义 HTTP 代理 | 不支持（通过 Cloudflare 网络） |
| 部署方式 | 需要服务器 | 无服务器，全球分布 |
| 冷启动 | 无 | 极快（<10ms） |
| 扩展性 | 需要手动扩展 | 自动扩展 |

## ❌ 已移除的功能

1. **自动 Token 刷新**：Workers 版本不支持文件系统，无法保存刷新后的 token
2. **自定义 HTTP 代理**：Workers 不支持自定义代理，所有请求通过 Cloudflare 网络
3. **动态配置**：配置需要硬编码在代码中，修改后需要重新部署

## 🐛 故障排查

### 部署失败

```bash
# 检查 wrangler 版本
wrangler --version

# 重新登录
wrangler logout
wrangler login
```

### 运行时错误

```bash
# 查看实时日志
wrangler tail

# 查看最近的错误
wrangler tail --format pretty
```

### 环境变量未生效

```bash
# 列出所有 secrets
wrangler secret list

# 删除并重新设置
wrangler secret delete FACTORY_API_KEY
wrangler secret put FACTORY_API_KEY
```

## 💰 费用说明

Cloudflare Workers 免费套餐：
- 每天 100,000 次请求
- 每次请求最多 10ms CPU 时间

超出免费额度后：
- $0.50 / 百万次请求
- $12.50 / 百万 GB-s CPU 时间

对于大多数个人使用场景，免费套餐已经足够。

## 📚 相关资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Hono 框架文档](https://hono.dev/)
- [原项目 README](README.md)

## 🤝 贡献

如果您发现问题或有改进建议，欢迎提交 Issue 或 Pull Request。

## 📄 许可证

MIT