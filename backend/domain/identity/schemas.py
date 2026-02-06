from pydantic import BaseModel


class IdentityOut(BaseModel):
    identity: str
    type: str
    verification_status: str
