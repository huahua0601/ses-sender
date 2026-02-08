from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from core.database import Base


class SendingJob(Base):
    __tablename__ = "sending_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    batch_id = Column(String(64), unique=True, index=True)     # 唯一批次标识（用于 VDM Tag）
    template_name = Column(String(255))                         # 模版名称
    group_name = Column(String(255))                            # 客群名称
    source_email = Column(String(255))                          # 发送邮箱
    total_contacts = Column(Integer, default=0)                 # 联系人总数
    total_batches = Column(Integer, default=0)                  # SES 批次数
    status = Column(String(50), default="success")              # success / partial / failed
    error_message = Column(Text, nullable=True)
    configuration_set = Column(String(255), nullable=True)      # SES Configuration Set 名称
    created_at = Column(DateTime, default=datetime.utcnow)
