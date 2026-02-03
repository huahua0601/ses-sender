# SES Sender

一个前后端分离的 AWS SES 邮件发送服务，支持发送实体管理、邮件模版管理、客群管理和批量发送功能。

## 功能特性

- **发送实体管理**: 管理 SES 验证的邮箱和域名
- **邮件模版管理**: 创建和管理 SES 邮件模版，支持变量替换
- **客群管理**: 创建客群并管理联系人
- **批量发送**: 选择发送者、模版和客群，一键批量发送邮件

## 技术栈

- **后端**: Python FastAPI + Boto3 + SQLAlchemy
- **前端**: Next.js + React + Tailwind CSS
- **数据库**: SQLite
- **部署**: Docker + Docker Compose

## 快速开始

### 使用 Docker (推荐)

```bash
# 克隆仓库
git clone https://github.com/huahua0601/ses-sender.git
cd ses-sender

# 启动服务
docker-compose up -d --build

# 查看状态
docker ps
```

### 手动启动

**后端:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

## 访问地址

- 前端界面: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 配置

### AWS 凭证

本项目使用 EC2 IAM Role 进行 AWS 认证，无需配置 AK/SK。

如需手动配置，编辑 `backend/.env`:
```env
AWS_REGION=us-east-1
DATABASE_URL=sqlite:///./ses_sender.db
```

### IAM 权限要求

EC2 实例需要以下 SES 权限:
- `ses:ListIdentities`
- `ses:GetIdentityVerificationAttributes`
- `ses:VerifyEmailIdentity`
- `ses:ListTemplates`
- `ses:CreateTemplate`
- `ses:SendBulkTemplatedEmail`

## 注意事项

1. **SES 沙箱模式**: 新账户默认在沙箱模式，只能向已验证邮箱发送邮件
2. **模版名称**: 只能使用英文字母、数字、下划线和连字符
3. **批量发送限制**: SES 每次最多发送 50 封邮件，程序会自动分批处理

## License

MIT
