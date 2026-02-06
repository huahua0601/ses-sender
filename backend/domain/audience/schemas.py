from pydantic import BaseModel
from typing import Optional


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    user_id: int

    class Config:
        from_attributes = True


class ContactCreate(BaseModel):
    email: str
    name: Optional[str] = None
    group_id: int


class ContactOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    group_id: int

    class Config:
        from_attributes = True
