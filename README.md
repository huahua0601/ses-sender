# SES Sender

基于 AWS SES 的邮件批量发送管理平台，前后端分离架构，支持多用户、权限管理、客群管理、批量发送和送达率追踪。

## 界面预览

**管理员面板**

![管理员面板](img/admin.png)

**用户面板**

![用户面板](img/user.png)

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

#### Step 6: 配置 SNS + SQS Event Destination（用于每封邮件的送达/打开/退信追踪）

本系统使用 **SNS → SQS → 后端轮询** 架构接收 SES 事件，无需后端暴露公网端口。

**一键执行：**

```bash
# 参数1: AWS 区域（必填）  参数2: Configuration Set 名称（可选，默认 ses-sender-tracking）
./setup-ses-events.sh us-east-1
# 或
./setup-ses-events.sh ap-northeast-1 my-config-set
```

脚本会自动完成以下操作：
1. 获取你的 AWS 账户 ID
2. 创建 SNS Topic (`ses-sender-events`)
3. 创建 SQS 队列 (`ses-sender-events-queue`)，配置长轮询和消息保留
4. 设置 SQS 队列策略，允许 SNS 向其发送消息
5. 创建 SNS → SQS 订阅
6. 在 SES Configuration Set 上添加 SNS Event Destination（追踪 SEND/DELIVERY/BOUNCE/COMPLAINT/OPEN/CLICK/REJECT）

执行完成后，脚本会输出需要添加到 `.env` 的变量。

<details>
<summary>如需手动执行，点击展开各步骤命令</summary>

```bash
# 6.1 创建 SNS Topic
aws sns create-topic \
  --name ses-sender-events \
  --region <REGION>

# 6.2 创建 SQS 队列
aws sqs create-queue \
  --queue-name ses-sender-events-queue \
  --attributes '{
    "ReceiveMessageWaitTimeSeconds": "20",
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "1209600"
  }' \
  --region <REGION>

# 6.3 获取 SQS 队列 ARN
aws sqs get-queue-attributes \
  --queue-url <QUEUE_URL> \
  --attribute-names QueueArn \
  --region <REGION>

# 6.4 设置 SQS 队列策略（允许 SNS 向 SQS 发送消息）
# 参考 setup-ses-events.sh 中的策略 JSON

# 6.5 订阅 SNS Topic → SQS
aws sns subscribe \
  --topic-arn <TOPIC_ARN> \
  --protocol sqs \
  --notification-endpoint <QUEUE_ARN> \
  --attributes '{"RawMessageDelivery": "false"}' \
  --region <REGION>

# 6.6 添加 SNS Event Destination 到 Configuration Set
aws sesv2 create-configuration-set-event-destination \
  --configuration-set-name <CONFIG_SET> \
  --event-destination-name sns-events \
  --event-destination '{
    "Enabled": true,
    "MatchingEventTypes": ["SEND", "DELIVERY", "BOUNCE", "COMPLAINT", "OPEN", "CLICK", "REJECT"],
    "SnsDestination": {
      "TopicArn": "<TOPIC_ARN>"
    }
  }' \
  --region <REGION>
```

</details>

#### Step 7: 配置环境变量并重启

```bash
# 编辑 .env 文件，添加 SQS_QUEUE_URL
SES_CONFIGURATION_SET=ses-sender-tracking
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/ses-sender-events-queue

# 重新创建容器（restart 不会读取新的环境变量）
docker-compose down && docker-compose up -d
```

启动后查看后端日志确认 SQS Worker 是否正常启动：

```bash
docker-compose logs -f backend | grep "SQS Worker"
# 应看到: [SQS Worker] 启动，队列: https://sqs.us-east-1.amazonaws.com/...
```

#### Step 8: 验证配置

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
2. **等待 15 分钟**（CloudWatch 指标有延迟，最短 5 分钟，建议等 15 分钟）
3. 在"发送历史"页面点击 **"查看指标"** 按钮
4. 弹框中会展示该批次的送达率、打开率、退信率等指标

> **注意**：只有在发送邮件时 `SES_CONFIGURATION_SET` 已生效的批次，才会有指标数据。之前未配置 Configuration Set 时发送的邮件不会有监控数据。

### 指标全部为 0 的排查清单

如果发送邮件成功但"查看指标"弹窗中所有数据为 0，请按以下步骤逐项排查：

#### 排查 1：确认 SES_CONFIGURATION_SET 环境变量已生效

```bash
# 检查后端容器内的环境变量
docker exec ses-sender-backend env | grep SES_CONFIGURATION

# 应输出类似：SES_CONFIGURATION_SET=ses-sender-tracking
# 如果为空，说明未配置或未生效
```

> 如果为空，编辑 `.env` 或 `docker-compose.yml` 设置 `SES_CONFIGURATION_SET`，然后执行 `docker-compose down && docker-compose up -d`（注意：`restart` 不会读取新的环境变量）。

#### 排查 2：确认 Configuration Set 已创建

```bash
aws sesv2 get-configuration-set \
  --configuration-set-name <你的ConfigurationSet名称> \
  --region <你的AWS区域>
```

如果返回 `NotFoundException`，说明还没创建，请回到上面的 Step 1 执行创建命令。

#### 排查 3：确认 CloudWatch Event Destination 已配置（最常见遗漏）

```bash
aws sesv2 get-configuration-set-event-destinations \
  --configuration-set-name <你的ConfigurationSet名称> \
  --region <你的AWS区域>
```

检查输出中是否有 `CloudWatchDestination`，且 `DimensionConfigurations` 包含 `batch_id` 维度。**如果没有 Event Destination，SES 事件不会写入 CloudWatch，指标永远为 0。** 请执行上面的 Step 4 添加 Event Destination。

#### 排查 4：确认 AWS_REGION 配置一致

后端的 `AWS_REGION` 环境变量必须与 SES/CloudWatch 所在区域一致。例如如果 SES 在 `ap-southeast-1`，则：

```bash
# 检查后端配置的区域
docker exec ses-sender-backend env | grep AWS_REGION

# 应与你创建 Configuration Set 的区域一致
```

#### 排查 5：确认 VDM 已启用（影响 Open/Click 指标）

```bash
aws sesv2 get-account \
  --region <你的AWS区域> \
  | grep -A5 VdmAttributes
```

如果 `VdmEnabled` 不是 `ENABLED`，Open 和 Click 指标不会被追踪。请执行上面的 Step 5。

#### 排查 6：确认等待了足够时间

CloudWatch 指标从 SES 事件产生到可查询，通常需要 **5-15 分钟**延迟。建议发送邮件后等待 15 分钟再查看。

#### 排查 7：直接在 CloudWatch 控制台验证

1. 登录 AWS 控制台 → CloudWatch → Metrics → All metrics
2. 搜索命名空间 `AWS/SES`
3. 查看是否有 `batch_id` 维度的数据
4. 如果 CloudWatch 控制台也没有 `batch_id` 维度的指标，说明 Event Destination 配置有问题

#### 排查 8：IAM 权限

确保 EC2 的 IAM Role 包含以下 CloudWatch 权限：

```json
{
  "Effect": "Allow",
  "Action": [
    "cloudwatch:GetMetricStatistics",
    "cloudwatch:ListMetrics"
  ],
  "Resource": "*"
}
```

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| **指标全部为 0** | 未配置 CloudWatch Event Destination | 执行 Step 4 添加 Event Destination（最常见原因） |
| **指标全部为 0** | AWS_REGION 不匹配 | 确保 `AWS_REGION` 与 SES/CloudWatch 所在区域一致 |
| **指标全部为 0** | SES_CONFIGURATION_SET 未生效 | 使用 `docker-compose down && up -d` 而非 `restart` |
| **指标全部为 0** | 数据延迟 | 等待 15 分钟后再查看 |
| **Open/Click 为 0，其他有数据** | VDM 未启用 | 执行 Step 5 启用账户级别 VDM |
| 配置 Configuration Set 后收不到邮件 | Suppression List 抑制了收件邮箱 | 关闭 Configuration Set 的 Suppression List |
| 配置 Configuration Set 后收不到邮件 | Optimized Shared Delivery 延迟投递 | 关闭账户和 Configuration Set 级别的 OptimizedSharedDelivery |
| 配置 Configuration Set 后收不到邮件 | TLS Policy 设为 REQUIRE | 改为 OPTIONAL |
| SES 返回 Success 但邮件未送达 | Tag 值包含中文等非 ASCII 字符 | 系统已自动过滤，确保使用最新版本 |
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
    "cloudwatch:ListMetrics",
    "sns:CreateTopic",
    "sns:Subscribe",
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
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
