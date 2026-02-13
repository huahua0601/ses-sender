from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
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
    sent_count = Column(Integer, default=0)                     # 已发送数量（实时更新）
    total_batches = Column(Integer, default=0)                  # SES 批次数
    status = Column(String(50), default="queued")               # queued / sending / success / partial / failed
    error_message = Column(Text, nullable=True)
    configuration_set = Column(String(255), nullable=True)      # SES Configuration Set 名称
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)               # 完成时间


class SendingJobDetail(Base):
    """每封邮件的发送明细 + 事件追踪"""
    __tablename__ = "sending_job_details"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, index=True)                        # 关联 sending_jobs.id
    batch_id = Column(String(64), index=True)                   # 批次 ID
    message_id = Column(String(128), index=True, nullable=True) # SES MessageId
    recipient = Column(String(256), index=True)                 # 收件人邮箱
    send_status = Column(String(32), default="Pending")         # Success / MessageRejected / Failed
    send_error = Column(Text, nullable=True)                    # 发送失败原因

    # SES 事件追踪（通过 SNS Webhook 更新）
    delivery_status = Column(String(32), nullable=True)         # Delivery / Bounce / Reject
    delivery_time = Column(DateTime, nullable=True)
    bounce_type = Column(String(64), nullable=True)             # Permanent / Transient
    bounce_subtype = Column(String(64), nullable=True)          # General / NoEmail / Suppressed ...
    bounce_message = Column(Text, nullable=True)
    open_count = Column(Integer, default=0)                     # 打开次数
    first_open_time = Column(DateTime, nullable=True)
    click_count = Column(Integer, default=0)                    # 点击次数
    first_click_time = Column(DateTime, nullable=True)
    complaint_time = Column(DateTime, nullable=True)            # 投诉时间    created_at = Column(DateTime, default=datetime.utcnow)
