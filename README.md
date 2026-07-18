# cf-openfile

基于 Cloudflare 原生技术栈的线上共享文件服务器。用户输入 4 位数字房间钥匙进入一个隔离的文件分享房间，可在房间内上传、下载、浏览文件。文件默认保存 30 天，单文件最大 100MB。

## 功能特性

- 🔑 4 位数字房间钥匙隔离访问
- 📁 文件上传与下载（最大 100MB）
- 📝 文件描述与历史清单
- ⏰ 30 天自动过期清理（D1 定时任务 + R2 生命周期兜底）
- 🛡️ 上传/下载 JWT 认证、房间隔离、速率限制
- 🚀 GitHub Actions 自动部署到 Cloudflare

## 技术栈

- **运行时**：Cloudflare Worker（Hono + Static Assets）
- **前端**：React + Vite + TypeScript SPA
- **文件存储**：Cloudflare R2
- **元数据**：Cloudflare D1
- **认证**：JWT（`jose`）
- **测试**：Vitest（单元/集成）+ Playwright（E2E）
- **CI/CD**：GitHub Actions + Wrangler Action

## 本地开发

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/cf-openfile.git
cd cf-openfile
```

### 2. 安装依赖

```bash
npm install
cd frontend && npm install && cd ..
npm run test:e2e:install   # 安装 Playwright 浏览器（仅需一次）
```

### 3. 配置本地环境变量

```bash
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars`，填入至少 32 字节的 `SESSION_SECRET`：

```
SESSION_SECRET=your-local-secret-key-must-be-at-least-32-bytes
```

`ALLOWED_KEYS` 等变量已在 `wrangler.toml` 的 `[vars]` 中配置，可直接使用或按需修改。

### 4. 创建本地 Cloudflare 资源

```bash
# 创建 D1 数据库
wrangler d1 create cf-openfile-db

# 创建 R2 bucket
wrangler r2 bucket create cf-openfile-files

# 应用数据库迁移
npm run db:migrate:local
```

将生成的 D1 `database_id` 填入 `wrangler.toml`。

### 5. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:8787`，使用 `wrangler.toml` 中 `ALLOWED_KEYS` 配置的钥匙（如 `1234`）进入房间。

### 6. 运行测试

```bash
# 单元测试 + 集成测试
npm run test

# 覆盖率
npm run test:coverage

# E2E 测试（会自动启动 wrangler dev）
npm run test:e2e

# 代码检查
npm run lint
```

## 部署到 Cloudflare

### 1. 准备 Cloudflare 资源

如果你还没有创建，在本地执行：

```bash
wrangler d1 create cf-openfile-db
wrangler r2 bucket create cf-openfile-files
```

将 D1 的 `database_id` 更新到 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "cf-openfile-db"
database_id = "你的真实 database_id"
```

### 2. 配置 R2 生命周期规则

确保 30 天后自动删除 R2 中的文件对象：

```bash
wrangler r2 bucket lifecycle add cf-openfile-files \
  --prefix rooms/ \
  --days 30 \
  --transition-actions Delete
```

> 具体命令可能随 Wrangler 版本变化，请参照 [R2 生命周期文档](https://developers.cloudflare.com/r2/buckets/object-lifecycle-rules/)。

### 3. 应用数据库迁移到远程

```bash
npm run db:migrate:prod
```

### 4. 配置 GitHub Secrets

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加以下 Secrets：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | 具有 **Cloudflare Workers Edit**、**D1 Edit**、**R2 Edit** 权限的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `SESSION_SECRET` | 至少 32 字节的 JWT 签名密钥 |
| `ALLOWED_KEYS` | 逗号分隔的 4 位房间钥匙，例如 `1234,5678,9012` |

`CLOUDFLARE_API_TOKEN` 创建方式：

1. 打开 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)。
2. 使用 **Create Custom Token**。
3. 权限建议：
   - **Cloudflare Workers**: `Edit`
   - **Account**: `Cloudflare Pages:Edit`（如使用 Pages）或仅 Workers 权限
   - **D1**: `Edit`
   - **R2**: `Edit`
4. 账户资源选择你的账户，区域资源选择 **Include - All zones** 或对应区域。

### 5. 推送代码

```bash
git push -u origin main
```

GitHub Actions 会自动：

1. 运行 `npm run lint` 与 `npm run test`。
2. 构建前端。
3. 设置 `SESSION_SECRET` 并部署 Worker 到 Cloudflare。
4. 将 `ALLOWED_KEYS` 作为部署变量注入。

PR 会触发预览部署，并在 PR 评论中回复预览链接。

### 6. 验证部署

访问 GitHub Actions 输出的部署 URL，输入 `ALLOWED_KEYS` 中的房间钥匙，测试上传、列表、下载流程。

## 环境变量

| 变量 | 说明 | 推荐位置 |
|------|------|----------|
| `ALLOWED_KEYS` | 逗号分隔的 4 位房间钥匙 | GitHub Secret / `wrangler.toml` vars |
| `SESSION_SECRET` | JWT 签名密钥（≥32 字节） | GitHub Secret / `.dev.vars` |
| `MAX_UPLOAD_SIZE_BYTES` | 最大上传大小，默认 104857600（100MB） | `wrangler.toml` vars |
| `FILE_TTL_DAYS` | 文件保存天数，默认 30 | `wrangler.toml` vars |
| `SESSION_TTL_SECONDS` | 登录会话有效期，默认 28800（8 小时） | `wrangler.toml` vars |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | GitHub Secret |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | GitHub Secret |

## API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/room` | 校验房间钥匙，返回 JWT |
| GET | `/api/rooms/:key/files` | 获取房间文件列表（需 Bearer Token） |
| POST | `/api/rooms/:key/files` | 上传文件（需 Bearer Token） |
| GET | `/api/files/:id` | 下载文件（需 Bearer Token） |
| GET | `/api/health` | 健康检查 |

### 请求/响应示例

**POST /api/auth/room**

```json
// request
{ "key": "1234" }

// response 200
{
  "success": true,
  "data": {
    "key": "1234",
    "token": "eyJ...",
    "expires_in": 28800
  }
}

// response 403
{ "success": false, "error": "钥匙无效，无法进入房间" }
```

## 目录结构

```
cf-openfile/
├── .github/workflows/   # CI/CD 工作流
├── e2e/                 # Playwright E2E 测试
├── frontend/            # React SPA 前端
├── migrations/          # D1 数据库迁移
├── src/                 # Cloudflare Worker 后端
│   ├── db/              # D1 查询与 schema
│   ├── middleware/      # JWT 认证中间件
│   ├── routes/          # API 路由
│   ├── services/        # JWT 服务
│   ├── utils/           # 响应、校验、限流等工具
│   └── types/           # 类型定义
├── tests/               # Vitest 单元/集成测试
├── package.json
├── playwright.config.ts
├── vitest.config.ts
└── wrangler.toml
```

## 许可证

MIT
