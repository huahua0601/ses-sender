from sqlalchemy.orm import Session
from fastapi import HTTPException

from core.ses import ses_client
from domain.audience.models import ContactGroup, Contact
from domain.template.service import get_ses_template_name
from domain.sending.schemas import TestEmailRequest


def send_test_email(req: TestEmailRequest) -> dict:
    """管理员发送测试邮件"""
    response = ses_client.send_email(
        Source=req.source,
        Destination={"ToAddresses": [req.to]},
        Message={
            "Subject": {"Data": req.subject, "Charset": "UTF-8"},
            "Body": {"Html": {"Data": req.html_body, "Charset": "UTF-8"}},
        },
    )
    return {"message": "测试邮件发送成功", "message_id": response.get("MessageId")}


def send_bulk_email(
    db: Session,
    source_email: str,
    template_id: int,
    group_id: int,
    user_id: int,
) -> dict:
    """普通用户批量发送邮件"""
    if not source_email:
        raise HTTPException(status_code=400, detail="您尚未配置发送邮箱，请联系管理员")

    # 获取 SES 模版名称（按用户隔离）
    ses_template_name = get_ses_template_name(db, template_id, user_id)

    # 校验客群归属
    group = db.query(ContactGroup).filter(
        ContactGroup.id == group_id, ContactGroup.user_id == user_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="客群不存在或无权操作")

    contacts = db.query(Contact).filter(Contact.group_id == group_id).all()
    if not contacts:
        raise HTTPException(status_code=404, detail="客群中没有联系人")

    # 构建发送列表
    destinations = [
        {
            "Destination": {"ToAddresses": [c.email]},
            "ReplacementTemplateData": f'{{"name": "{c.name or "Customer"}"}}',
        }
        for c in contacts
    ]

    # 分批发送（SES 限制每批 50 封）
    results = []
    for i in range(0, len(destinations), 50):
        batch = destinations[i : i + 50]
        response = ses_client.send_bulk_templated_email(
            Source=source_email,
            Template=ses_template_name,
            DefaultTemplateData='{"name": "Customer"}',
            Destinations=batch,
        )
        results.append(response)

    return {
        "status": "success",
        "source": source_email,
        "batches": len(results),
        "total_contacts": len(contacts),
    }
