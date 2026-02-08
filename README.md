# SES Sender

基于 AWS SES 的邮件批量发送管理平台，前后端分离架构，支持多用户、权限管理、客群管理、批量发送和送达率追踪。

## 功能概览

### 管理员

| 功能 | 说明 |
|------|------|
| 用户管理 | 创建/编辑/禁用用户，为每个用户配置专属发送邮箱，重置密码 |
| 发送实体 | 验证邮箱地址和域名（SES Identity） |
| 邮件模版 | 创建/编辑/删除邮件模版（按用户隔离），支持 `{{name}}` 等变量 |
| 测试邮件 | 选择已验证的发送实体或手动输入，自定义内容发送测试邮件 |

### 普通用户

| 功能 | 说明 |
|------|------|
| 客群管理 | 创建/编辑/删除客群，搜索和分页 |
| 联系人管理 | 批量添加联系人，Excel 导入/导出/模版下载，搜索和分页 |
| 邮件模版 | 每个用户独立维护自己的邮件模版（创建/编辑/删除） |
| 批量发送 | 选择模版和目标客群，使用自己的邮箱批量发送 |
| 发送历史 | 查看历史发送记录，点击查看每个批次的送达率、打开率等指标 |

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python / FastAPI / SQLAlchemy / Alembic / Boto3 |
| 前端 | Next.js 16 / React / Tailwind CSS / TypeScript |
| 数据库 | MySQL 8 |
| 认证 | JWT (python-jose) + bcrypt |
| 监控 | AWS CloudWatch + SES VDM（Virtual Deliverability Manager） |
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
│       ├── template/              #   邮件模版域：按用户隔离的模版 CRUD
│       ├── audience/              #   客群域：客群、联系人、Excel
│       └── sending/               #   发送域：批量发送、发送历史、指标查询
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
- EC2 实例绑定具有 SES 和 CloudWatch 权限的 IAM Role（无需配置 AK/SK）

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

# SES Configuration Set（用于 VDM 追踪送达率/打开率，留空则不追踪）
SES_CONFIGURATION_SET=ses-sender-tracking

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

## 配置 VDM 送达率追踪

### 工作原理

```
批量发送邮件
  ↓
SES send_bulk_templated_email()
  ├── ConfigurationSetName: "ses-sender-tracking"    ← 关联 VDM
  └── DefaultTags:
        ├── batch_id: "batch-a1b2c3d4e5f6"           ← 唯一批次标识
        ├── user_id: "2"                              ← 发送用户
        ├── group_name: "VIP_customers"               ← 客群名称
        └── template_name: "welcome_email"            ← 模版名称
  ↓
CloudWatch Metrics（按 batch_id 维度）
  → Send / Delivery / Open / Bounce / Complaint / Click
  ↓
发送历史页面 → 点击"查看指标" → 实时展示送达率、打开率等
```

### 配置步骤

#### Step 1: 创建 Configuration Set

```bash
aws sesv2 create-configuration-set \
  --configuration-set-name ses-sender-tracking \
  --delivery-options TlsPolicy=OPTIONAL \
  --sending-options SendingEnabled=true \
  --reputation-options ReputationMetricsEnabled=true \
  --region us-east-1
```

#### Step 2: 关闭 Suppression List（避免邮件被抑制）

```bash
aws sesv2 put-configuration-set-suppression-options \
  --configuration-set-name ses-sender-tracking \
  --suppressed-reasons \
  --region us-east-1
```

#### Step 3: 配置 VDM 选项（关闭 Optimized Shared Delivery）

```bash
aws sesv2 put-configuration-set-vdm-options \
  --configuration-set-name ses-sender-tracking \
  --vdm-options '{
    "DashboardOptions": {"EngagementMetrics": "ENABLED"},
    "GuardianOptions": {"OptimizedSharedDelivery": "DISABLED"}
  }' \
  --region us-east-1
```

> **重要**：`OptimizedSharedDelivery` 必须设为 `DISABLED`，否则沙箱模式下邮件可能被延迟或不送达。

#### Step 4: 添加 CloudWatch Event Destination

```bash
aws sesv2 create-configuration-set-event-destination \
  --configuration-set-name ses-sender-tracking \
  --event-destination-name cloudwatch \
  --event-destination '{
    "Enabled": true,
    "MatchingEventTypes": ["SEND", "DELIVERY", "BOUNCE", "COMPLAINT", "OPEN", "CLICK"],
    "CloudWatchDestination": {
      "DimensionConfigurations": [
        {
          "DimensionName": "batch_id",
          "DimensionValueSource": "MESSAGE_TAG",
          "DefaultDimensionValue": "no_tag"
        }
      ]
    }
  }' \
  --region us-east-1
```

#### Step 5: 确保账户级别 VDM 设置正确

```bash
# 启用 VDM，但关闭 Optimized Shared Delivery
aws sesv2 put-account-vdm-attributes \
  --vdm-attributes '{
    "VdmEnabled": "ENABLED",
    "DashboardAttributes": {"EngagementMetrics": "ENABLED"},
    "GuardianAttributes": {"OptimizedSharedDelivery": "DISABLED"}
  }' \
  --region us-east-1
```

#### Step 6: 配置环境变量并重启

```bash
# 编辑 docker-compose.yml 或 .env
SES_CONFIGURATION_SET=ses-sender-tracking

# 重新创建容器（restart 不会读取新的环境变量）
docker-compose down && docker-compose up -d
```

#### Step 7: 验证配置

```bash
# 检查 Configuration Set 配置
aws sesv2 get-configuration-set \
  --configuration-set-name ses-sender-tracking \
  --region us-east-1

# 检查 Event Destination
aws sesv2 get-configuration-set-event-destinations \
  --configuration-set-name ses-sender-tracking \
  --region us-east-1

# 检查后端环境变量
docker exec ses-sender-backend env | grep SES_CONFIGURATION
```

### 查看指标

配置完成后：
1. 通过平台发送一批邮件
2. 等待 5-15 分钟（CloudWatch 指标有延迟）
3. 在"发送历史"页面点击 **"查看指标"** 按钮
4. 弹框中会展示该批次的送达率、打开率、退信率等指标

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 配置 Configuration Set 后收不到邮件 | Suppression List 抑制了收件邮箱 | 关闭 Configuration Set 的 Suppression List |
| 配置 Configuration Set 后收不到邮件 | Optimized Shared Delivery 延迟投递 | 关闭账户和 Configuration Set 级别的 OptimizedSharedDelivery |
| 配置 Configuration Set 后收不到邮件 | TLS Policy 设为 REQUIRE | 改为 OPTIONAL |
| SES 返回 Success 但邮件未送达 | Tag 值包含中文等非 ASCII 字符 | 系统已自动过滤，确保使用最新版本 |
| 指标数据为空 | 数据延迟或未配置 Event Destination | 等待 5-15 分钟，检查 Event Destination 配置 |
| 环境变量修改后不生效 | `docker-compose restart` 不读取新环境变量 | 使用 `docker-compose down && docker-compose up -d` |

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

# 重新创建容器（应用环境变量修改）
docker-compose down && docker-compose up -d

# 进入 MySQL 命令行
docker exec -it ses-sender-mysql mysql -u ses_sender -pses_sender_123 ses_sender
```

## IAM 权限要求

EC2 实例的 IAM Role 需要以下权限：

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
    "ses:UpdateTemplate",
    "ses:DeleteTemplate",
    "ses:SendEmail",
    "ses:SendBulkTemplatedEmail",
    "cloudwatch:GetMetricStatistics",
    "cloudwatch:ListMetrics"
  ],
  "Resource": "*"
}
```

## 注意事项

1. **SES 沙箱模式**：新账户默认在沙箱模式，只能向已验证邮箱发送。需在 AWS 控制台申请移出沙箱。
2. **批量发送限制**：SES 每次最多发送 50 封邮件，程序会自动分批处理。
3. **发送邮箱**：普通用户的发送邮箱由管理员配置，用户无法自行修改。域名验证后可配置任意 `user@yourdomain.com` 格式的邮箱。
4. **模版隔离**：每个用户独立维护自己的邮件模版，SES 中的模版名会自动加用户前缀避免冲突。
5. **VDM Tag 限制**：SES Message Tag 值只允许 ASCII 字符，系统会自动将中文等非 ASCII 字符替换为下划线。
6. **Configuration Set 注意事项**：
   - 必须关闭 Suppression List 和 Optimized Shared Delivery
   - TLS Policy 建议设为 OPTIONAL
   - 修改环境变量后需要 `docker-compose down && docker-compose up -d`，`restart` 不会生效

## License

MIT
