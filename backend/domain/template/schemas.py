from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TemplateCreate(BaseModel):
    name: str
    subject: str
    html_body: str = ""


class TemplateUpdate(BaseModel):
    subject: Optional[str] = None
    html_body: Optional[str] = None


class TemplateOut(BaseModel):
    id: int
    name: str
    subject: str
    html_body: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OptimizeRequest(BaseModel):
    subject: str
    html_body: str
    user_feedback: Optional[str] = None
    images: Optional[list[str]] = None
