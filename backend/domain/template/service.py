from typing import List
from core.ses import ses_client
from domain.template.schemas import TemplateCreate


def list_templates() -> List[dict]:
    response = ses_client.list_templates()
    return response.get("TemplatesMetadata", [])


def create_template(data: TemplateCreate) -> dict:
    template_data = {
        "TemplateName": str(data.TemplateName),
        "SubjectPart": str(data.SubjectPart),
        "HtmlPart": str(data.HtmlPart or ""),
        "TextPart": str(data.TextPart or data.HtmlPart or " "),
    }
    ses_client.create_template(Template=template_data)
    return {"message": f"模版 {data.TemplateName} 创建成功"}


def delete_template(template_name: str) -> dict:
    ses_client.delete_template(TemplateName=template_name)
    return {"message": f"模版 {template_name} 已删除"}
