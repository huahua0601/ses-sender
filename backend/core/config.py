import os
from dotenv import load_dotenv

load_dotenv()

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "ses-sender-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://ses_sender:ses_sender_123@localhost:3306/ses_sender")

# AWS
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# SES Configuration Set (用于 VDM 追踪送达率/打开率)
# 需要在 AWS SES 控制台创建 Configuration Set 并启用 VDM
SES_CONFIGURATION_SET = os.getenv("SES_CONFIGURATION_SET", "")

# SQS Queue URL（用于接收 SES 事件通知，替代 Webhook）
# 架构：SES → SNS → SQS → 后端轮询
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "")
