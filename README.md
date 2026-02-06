# SES Sender

基于 AWS SES 的邮件批量发送管理平台，前后端分离架构，支持多用户、权限管理、客群管理和批量发送。

## 功能概览

### 管理员

| 功能 | 说明 |
|------|------|
| 用户管理 | 创建/禁用用户，为每个用户配置专属发送邮箱 |
| 发送实体 | 验证邮箱地址和域名（SES Identity） |
| 邮件模版 | 创建/删除 SES 邮件模版，支持 `{{name}}` 等变量 |
| 测试邮件 | 选择已验证的发送实体，自定义内容发送测试邮件 |

### 普通用户

| 功能 | 说明 |
|------|------|
| 客群管理 | 创建客群，管理联系人（支持多行批量添加） |
| Excel 导入 | 通过 Excel 批量导入联系人，支持下载导入模版 |
| Excel 导出 | 将客群联系人导出为 Excel 文件 |
| 批量发送 | 选择模版和目标客群，使用自己的邮箱批量发送 |

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python / FastAPI / SQLAlchemy / Alembic / Boto3 |
| 前端 | Next.js 16 / React / Tailwind CSS / TypeScript |
| 数据库 | MySQL 8 |
| 认证 | JWT (python-jose) + bcrypt |
| 部署 | Docker / Docker Compose |

## 项目结构

```
ses-sender/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── main.py                    # 应用入口，Alembic 迁移检查 + 路由注册
│   ├── alembic/                   # 数据库迁移
│   │   ├── env.py
│   │   └── versions/              # 迁移脚本
│   ├── core/                      # 核心层（基础设施）
│   │   ├── config.py              #   配置中心
│   │   ├── database.py            #   数据库连接
│   │   ├── deps.py                #   认证 & 权限依赖
│   │   └── ses.py                 #   AWS SES 客户端
│   └── domain/                    # 业务域（DDD）
│       ├── auth/                  #   认证域：用户登录、用户管理
│       ├── identity/              #   发送实体域：SES 邮箱/域名验证
│       ├── template/              #   邮件模版域：SES 模版 CRUD
│       ├── audience/              #   客群域：客群、联系人、Excel
│       └── sending/               #   发送域：测试邮件、批量发送
│
└── frontend/
    └── app/
        └── page.tsx               # 单页应用（登录 / 管理员面板 / 用户面板）
```

每个业务域包含：
- `models.py` — 数据库实体（如有）
- `schemas.py` — 请求/响应模型
- `service.py` — 业务逻辑
- `router.py` — API 路由

## 快速开始

### 1. 环境准备

- Docker & Docker Compose
- EC2 实例绑定具有 SES 权限的 IAM Role（无需配置 AK/SK）

### 2. 配置

```bash
cp .env.example .env
```

编辑 `.env` 按需修改：

```env
# AWS 区域
AWS_REGION=us-east-1

# 前端访问后端的地址（部署到服务器时改为公网 IP 或域名）
NEXT_PUBLIC_API_URL=http://localhost:8000

# MySQL 配置
MYSQL_ROOT_PASSWORD=ses_sender_root_123
MYSQL_DATABASE=ses_sender
MYSQL_USER=ses_sender
MYSQL_PASSWORD=ses_sender_123
```

### 3. 启动

```bash
docker-compose up -d --build
```

首次启动时，后端会自动执行数据库迁移（Alembic）并创建默认管理员账号。

### 4. 访问

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |

### 5. 默认管理员

```
用户名: admin
密码:   admin123
```

> 首次登录后建议立即修改密码。

## 数据库迁移

本项目使用 Alembic 管理数据库版本。服务启动时会自动检查并执行迁移。

```bash
# 生成新的迁移脚本（修改 models 后）
docker exec ses-sender-backend alembic revision --autogenerate -m "描述信息"

# 将迁移文件拷贝到本地
docker cp ses-sender-backend:/app/alembic/versions/ backend/alembic/versions

# 手动执行迁移
docker exec ses-sender-backend alembic upgrade head

# 查看当前版本
docker exec ses-sender-backend alembic current

# 查看迁移历史
docker exec ses-sender-backend alembic history
```

## 常用运维命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker logs ses-sender-backend
docker logs ses-sender-frontend
docker logs ses-sender-mysql

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 重建并启动
docker-compose up -d --build

# 进入 MySQL 命令行
docker exec -it ses-sender-mysql mysql -u ses_sender -pses_sender_123 ses_sender
```

## IAM 权限要求

EC2 实例的 IAM Role 需要以下 SES 权限：

```json
{
  "Effect": "Allow",
  "Action": [
    "ses:ListIdentities",
    "ses:GetIdentityVerificationAttributes",
    "ses:VerifyEmailIdentity",
    "ses:VerifyDomainIdentity",
    "ses:ListTemplates",
    "ses:CreateTemplate",
    "ses:DeleteTemplate",
    "ses:SendEmail",
    "ses:SendBulkTemplatedEmail"
  ],
  "Resource": "*"
}
```

## 注意事项

1. **SES 沙箱模式**：新账户默认在沙箱模式，只能向已验证邮箱发送。需在 AWS 控制台申请移出沙箱。
2. **模版名称**：SES 模版名称只能使用英文字母、数字、下划线 `_` 和连字符 `-`。
3. **批量发送限制**：SES 每次最多发送 50 封邮件，程序会自动分批处理。
4. **发送邮箱**：普通用户的发送邮箱由管理员配置，用户无法自行修改。域名验证后可配置任意 `user@yourdomain.com` 格式的邮箱。

## License

MIT
