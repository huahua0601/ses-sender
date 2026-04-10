from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BulkSendRequest(BaseModel):
    TemplateId: int
    GroupId: int


class TestEmailRequest(BaseModel):
    source: str
    to: str
    subject: str
    html_body: str


class SendingJobOut(BaseModel):
    id: int
    batch_id: str
    template_name: str
    group_name: str
    source_email: str
    total_contacts: int
    sent_count: int = 0
    total_batches: int
    status: str
    error_message: Optional[str] = None
    configuration_set: Optional[str] = None
    created_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SendingJobDetailOut(BaseModel):
    id: int
    batch_id: Optional[str] = None
    message_id: Optional[str] = None
    recipient: str
    send_status: str
    send_error: Optional[str] = None
    delivery_status: Optional[str] = None
    delivery_time: Optional[datetime] = None
    bounce_type: Optional[str] = None
    bounce_subtype: Optional[str] = None
    bounce_message: Optional[str] = None
    open_count: int = 0
    first_open_time: Optional[datetime] = None
    click_count: int = 0
    first_click_time: Optional[datetime] = None
    complaint_time: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
