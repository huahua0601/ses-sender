import uuid
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from core.ses import sesv2_client
from domain.template.models import EmailTemplate
from domain.template.schemas import TemplateCreate, TemplateUpdate, TemplateOut


def _generate_ses_name(user_id: int) -> str:
    """生成唯一的 SES 模版名称"""
    short_id = uuid.uuid4().hex[:8]
    return f"u{user_id}_{short_id}"


def list_templates(db: Session, user_id: int) -> List[TemplateOut]:
    """列出用户的模版"""
    rows = db.query(EmailTemplate).filter(EmailTemplate.user_id == user_id).order_by(EmailTemplate.id.desc()).all()
    return [TemplateOut(id=r.id, name=r.name, subject=r.subject, html_body=r.html_body, created_at=r.created_at) for r in rows]


def create_template(db: Session, data: TemplateCreate, user_id: int) -> dict:
    """创建模版（同时写入 DB 和 SES v2）"""
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="模版名称不能为空")

    ses_name = _generate_ses_name(user_id)
    html = str(data.html_body or "")
    text = html or " "

    try:
        sesv2_client.create_email_template(
            TemplateName=ses_name,
            TemplateContent={
                "Subject": str(data.subject),
                "Html": html,
                "Text": text,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SES 模版创建失败: {str(e)}")

    tpl = EmailTemplate(
        name=data.name,
        ses_name=ses_name,
        subject=data.subject,
        html_body=html,
        text_body=text,
        user_id=user_id,
    )
    db.add(tpl)
    db.commit()
    return {"message": f"模版「{data.name}」创建成功"}


def update_template(db: Session, template_id: int, data: TemplateUpdate, user_id: int) -> dict:
    """更新模版（同时更新 DB 和 SES v2）"""
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.user_id == user_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模版不存在")

    if data.subject is not None:
        tpl.subject = data.subject
    if data.html_body is not None:
        tpl.html_body = data.html_body
        tpl.text_body = data.html_body or " "

    try:
        sesv2_client.update_email_template(
            TemplateName=tpl.ses_name,
            TemplateContent={
                "Subject": tpl.subject,
                "Html": tpl.html_body,
                "Text": tpl.text_body,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SES 模版更新失败: {str(e)}")

    db.commit()
    return {"message": f"模版「{tpl.name}」已更新"}


def delete_template(db: Session, template_id: int, user_id: int) -> dict:
    """删除模版（同时从 DB 和 SES v2 删除）"""
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.user_id == user_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模版不存在")

    try:
        sesv2_client.delete_email_template(TemplateName=tpl.ses_name)
    except Exception:
        pass

    db.delete(tpl)
    db.commit()
    return {"message": f"模版「{tpl.name}」已删除"}


def get_ses_template_name(db: Session, template_id: int, user_id: int) -> str:
    """获取模版对应的 SES 模版名称（用于发送邮件）"""
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.user_id == user_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模版不存在")
    return tpl.ses_name
