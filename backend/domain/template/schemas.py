from pydantic import BaseModel


class TemplateCreate(BaseModel):
    TemplateName: str
    SubjectPart: str
    HtmlPart: str = ""
    TextPart: str = ""
