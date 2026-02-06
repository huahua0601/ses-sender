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
