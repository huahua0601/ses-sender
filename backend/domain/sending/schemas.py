from pydantic import BaseModel
from typing import Optional
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
    total_batches: int
    status: str
    error_message: Optional[str] = None
    configuration_set: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
