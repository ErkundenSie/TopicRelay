# TopicRelay

基于 Cloudflare Workers、D1 和 Telegram Bot API 的双向私聊转发机器人。用户私聊 Bot 后，消息会进入后台 Telegram 论坛群中该用户对应的独立话题；后台管理员可直接在话题中回复。

## 功能

- 用户私聊与后台论坛话题双向转发
- 仅接收后台群和用户私聊，忽略其他群消息
- 用户首次验证与消息频率限制
- 每位用户复用独立话题
- 转发 Telegram 引用消息；引用图片、文件等媒体会复制到后台并保持回复关系
- 管理员面板：拉黑、解除拉黑、验证码开关、黑名单查询、重置用户状态
- Telegram Webhook 密钥校验
- D1 持久化用户状态、限流数据和话题映射

## 前置条件

1. 创建 Telegram Bot。
2. 创建后台 Telegram **超级群**，并开启“话题”。
3. 将 Bot 加入后台群并授予管理员权限；至少需要发送消息、管理话题和置顶消息权限。
4. 创建 Cloudflare D1 数据库。
5. 在 Cloudflare Workers Builds 中配置构建环境变量和运行时变量。

## Cloudflare 配置

### 构建环境变量

以下变量只用于构建时生成 `wrangler.jsonc`，不提交到 Git 仓库：

| 名称                           | 用途                   |
| ------------------------------ | ---------------------- |
| `TOPIC_RELAY_WORKER_NAME`      | Cloudflare Worker 名称 |
| `TOPIC_RELAY_D1_DATABASE_NAME` | D1 数据库名称          |
| `TOPIC_RELAY_D1_DATABASE_ID`   | D1 数据库 UUID         |

这些是资源标识，不是访问密钥；将它们放在构建配置中可避免公开仓库关联到实际部署资源。

### 运行时变量和密钥

在 Worker 的 **设置 → 变量和密钥** 中配置：

| 名称                          | 类型   | 说明                                                |
| ----------------------------- | ------ | --------------------------------------------------- |
| `BOT_TOKEN_ENV`               | 密钥   | Telegram Bot Token                                  |
| `GROUP_ID_ENV`                | 纯文本 | 后台论坛群 Chat ID，例如 `-1001234567890`           |
| `MAX_MESSAGES_PER_MINUTE_ENV` | 纯文本 | 单用户每分钟最大消息数，例如 `40`                   |
| `WEBHOOK_SECRET_ENV`          | 密钥   | 验证 Telegram Webhook 的随机长字符串                |
| `ADMIN_ACCESS_TOKEN_ENV`      | 密钥   | 访问维护接口的随机长字符串，必须不同于 Webhook 密钥 |
| `WEBHOOK_URL_ENV`             | 纯文本 | 完整 Webhook 地址，必须以 `/webhook` 结尾           |

不要将运行时密钥加入构建变量、Git 仓库、`wrangler.jsonc` 或截图。

## Git 自动部署

在 Cloudflare Workers Builds 的构建设置中配置：

| 配置项             | 值                                          |
| ------------------ | ------------------------------------------- |
| 构建命令           | `node scripts/generate-wrangler-config.mjs` |
| 部署命令           | `npx wrangler deploy`                       |
| 非生产分支部署命令 | `npx wrangler versions upload`              |
| 路径               | `/`                                         |

构建脚本会从构建环境变量生成被 `.gitignore` 忽略的 `wrangler.jsonc`。其中的 `keep_vars: true` 会保留控制台中配置的运行时变量和密钥。

> 不要在仓库中手工创建或提交 `wrangler.jsonc`。

## 手动部署

如需本地部署，先设置三个构建环境变量，再生成配置并部署：

```powershell
$env:TOPIC_RELAY_WORKER_NAME = "your-worker-name"
$env:TOPIC_RELAY_D1_DATABASE_NAME = "your-d1-database-name"
$env:TOPIC_RELAY_D1_DATABASE_ID = "your-d1-database-id"

node scripts/generate-wrangler-config.mjs
npx wrangler deploy
```

## 注册 Webhook

首次部署、更新 `BOT_TOKEN_ENV` 或更新 `WEBHOOK_SECRET_ENV` 后，都需要使用当前管理员令牌重新注册 Webhook：

```powershell
$adminToken = Read-Host "请输入 ADMIN_ACCESS_TOKEN_ENV"
$headers = @{ Authorization = "Bearer $adminToken" }
Invoke-WebRequest -Method POST -Headers $headers -Uri "https://example.workers.dev/registerWebhook"
```

看到 `Webhook set successfully` 后，私聊 Bot 发送 `/start` 进行测试。

## 使用

- 用户私聊 Bot 发送 `/start`，完成验证后即可发送消息。
- 后台管理员在用户对应话题内直接发送消息，即可回复该用户。
- 后台管理员在用户话题中发送 `/admin`，打开管理面板。
- 后台管理员可使用 `/reset_user <chat_id>` 清除指定用户的验证、限流和话题映射状态。

## 维护接口

所有维护接口要求 `POST` 和 `Authorization: Bearer <ADMIN_ACCESS_TOKEN_ENV>`：

| 地址                 | 用途                     |
| -------------------- | ------------------------ |
| `/registerWebhook`   | 注册 `WEBHOOK_URL_ENV`   |
| `/unRegisterWebhook` | 移除 Telegram Webhook    |
| `/checkTables`       | 检查并补齐 D1 数据表结构 |

## 安全说明

- 公开仓库前请轮换曾出现在聊天、截图或日志中的 Bot Token、Webhook 密钥和管理员令牌。
- 后台群成员可查看全部用户话题；仅邀请可信管理员。
- 只有后台群管理员可以回复用户、打开管理面板和执行重置命令。
- Git 提交前使用不暴露个人邮箱的 Git 身份；不要导入旧项目的 `.git` 目录。

## 许可证

[MIT License](LICENSE)
