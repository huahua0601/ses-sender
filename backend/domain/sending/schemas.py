from pydantic import BaseModel


class BulkSendRequest(BaseModel):
    Template: str
    GroupId: int


class TestEmailRequest(BaseModel):
    source: str
    to: str
    subject: str
    html_body: str
