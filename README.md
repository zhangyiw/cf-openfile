# cf-openfile

基于 Cloudflare 技术栈的线上共享文件服务器。用户输入 4 位房间钥匙进入隔离的文件分享房间，可上传、下载、浏览文件。文件保存 30 天，单文件最大 100MB。

## 功能特性

- 🔑 4 位数字房间钥匙隔离访问
- 📁 文件上传与下载（最大 100MB）
- 📝 文件描述与历史清单
- ⏰ 30 天自动过期清理
- 🚀 GitHub Actions 自动部署到 Cloudflare

## 技术栈

- **运行时**：Cloudflare Worker
- **前端**：React + Vite + TypeScript
- **文件存储**：Cloudflare R2
- **元数据**：Cloudflare D1
- **认证**：JWT
- **CI/CD**：GitHub Actions

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/cf-openfile.git
cd cf-openfile
```

### 2. 安装依赖

```bash
npm install
cd frontend && npm install && cd ..
```

### 3. 配置环境变量

复制并编辑 `wrangler.toml`：

```toml
[vars]
ALLOWED_KEYS = "1234,5678,9012"
SESSION_SECRET = "your-32-byte-secret"
```

或使用 Wrangler secret：

```bash
wrangler secret put SESSION_SECRET
```

### 4. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
wrangler d1 create cf-openfile-db

# 创建 R2 bucket
wrangler r2 bucket create cf-openfile-files

# 应用数据库迁移
wrangler d1 migrations apply cf-openfile-db --local
```

将生成的 D1 database_id 填入 `wrangler.toml`。

### 5. 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787`。

### 6. 构建前端

```bash
npm run build:frontend
```

### 7. 运行测试

```bash
npm run test
npm run test:coverage
npm run test:e2e
```

### 8. 部署

```bash
npm run deploy
```

或在 GitHub 上配置 Secrets 后 push 到 `main` 分支自动部署。

## 环境变量

| 变量 | 说明 | 位置 |
|------|------|------|
| `ALLOWED_KEYS` | 逗号分隔的 4 位房间钥匙 | `wrangler.toml` vars |
| `SESSION_SECRET` | JWT 签名密钥 | Wrangler secret |
| `MAX_UPLOAD_SIZE_BYTES` | 最大上传大小（默认 100MB） | `wrangler.toml` vars |
| `FILE_TTL_DAYS` | 文件保存天数（默认 30） | `wrangler.toml` vars |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | GitHub Secrets |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | GitHub Secrets |

## API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/room` | 校验房间钥匙，返回 JWT |
| GET | `/api/rooms/:key/files` | 获取房间文件列表 |
| POST | `/api/rooms/:key/files` | 上传文件 |
| GET | `/api/files/:id` | 下载文件 |
| GET | `/api/health` | 健康检查 |

## 目录结构

```
cf-openfile/
├── frontend/          # React SPA 前端
├── src/               # Worker 后端
│   ├── routes/        # API 路由
│   ├── middleware/    # 认证中间件
│   ├── services/      # JWT 等核心服务
│   ├── db/            # D1 查询封装
│   └── utils/         # 工具函数
├── migrations/        # D1 数据库迁移
├── .github/workflows/ # CI/CD
└── wrangler.toml      # Cloudflare 配置
```

## 许可证

MIT
