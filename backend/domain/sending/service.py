import uuid
import math
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from core.ses import ses_client
from core.config import SES_CONFIGURATION_SET
from domain.audience.models import ContactGroup, Contact
from domain.template.models import EmailTemplate
from domain.template.service import get_ses_template_name
from domain.sending.models import SendingJob
from domain.sending.schemas import TestEmailRequest, SendingJobOut


def send_test_email(req: TestEmailRequest) -> dict:
    """管理员发送测试邮件"""
    params = {
        "Source": req.source,
        "Destination": {"ToAddresses": [req.to]},
        "Message": {
            "Subject": {"Data": req.subject, "Charset": "UTF-8"},
            "Body": {"Html": {"Data": req.html_body, "Charset": "UTF-8"}},
        },
    }
    # 如果配置了 Configuration Set，附加到测试邮件
    # if SES_CONFIGURATION_SET:
    #     params["ConfigurationSetName"] = SES_CONFIGURATION_SET
    #     params["Tags"] = [{"Name": "batch_id", "Value": "test"}]

    response = ses_client.send_email(**params)
    return {"message": "测试邮件发送成功", "message_id": response.get("MessageId")}


def send_bulk_email(
    db: Session,
    source_email: str,
    template_id: int,
    group_id: int,
    user_id: int,
) -> dict:
    """普通用户批量发送邮件（附加 VDM 追踪标签）"""
    if not source_email:
        raise HTTPException(status_code=400, detail="您尚未配置发送邮箱，请联系管理员")

    # 获取 SES 模版名称
    ses_template_name = get_ses_template_name(db, template_id, user_id)

    # 获取模版信息（用于记录）
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.user_id == user_id).first()

    # 校验客群归属
    group = db.query(ContactGroup).filter(
        ContactGroup.id == group_id, ContactGroup.user_id == user_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="客群不存在或无权操作")

    contacts = db.query(Contact).filter(Contact.group_id == group_id).all()
    if not contacts:
        raise HTTPException(status_code=404, detail="客群中没有联系人")

    # 生成唯一批次 ID
    batch_id = f"batch-{uuid.uuid4().hex[:12]}"

    # 构建发送列表
    destinations = [
        {
            "Destination": {"ToAddresses": [c.email]},
            "ReplacementTemplateData": f'{{"name": "{c.name or "Customer"}"}}',
        }
        for c in contacts
    ]

    # 构建发送参数
    send_params = {
        "Source": source_email,
        "Template": ses_template_name,
        "DefaultTemplateData": '{"name": "Customer"}',
    }

    # 附加 Configuration Set 和 Tags（用于 VDM 追踪）
    # 注意：SES Tag 值只允许 ASCII 字符，中文需过滤
    def _ascii_tag(val: str) -> str:
        return "".join(c if ord(c) < 128 and c not in ' "\'\\' else "_" for c in val)[:256] or "unknown"

    if SES_CONFIGURATION_SET:
        send_params["ConfigurationSetName"] = SES_CONFIGURATION_SET
        send_params["DefaultTags"] = [
            {"Name": "batch_id", "Value": batch_id},
            {"Name": "user_id", "Value": str(user_id)},
            {"Name": "group_name", "Value": _ascii_tag(group.name)},
            {"Name": "template_name", "Value": _ascii_tag(tpl.name if tpl else "unknown")},
        ]

    # 分批发送（SES 限制每批 50 封）
    results = []
    error_msg = None
    status = "success"
    try:
        for i in range(0, len(destinations), 50):
            batch = destinations[i: i + 50]
            response = ses_client.send_bulk_templated_email(
                Destinations=batch,
                **send_params,
            )
            results.append(response)
    except Exception as e:
        error_msg = str(e)
        status = "failed" if not results else "partial"

    # 记录发送历史
    job = SendingJob(
        user_id=user_id,
        batch_id=batch_id,
        template_name=tpl.name if tpl else "unknown",
        group_name=group.name,
        source_email=source_email,
        total_contacts=len(contacts),
        total_batches=len(results),
        status=status,
        error_message=error_msg,
        configuration_set=SES_CONFIGURATION_SET or None,
    )
    db.add(job)
    db.commit()

    if status == "failed":
        raise HTTPException(status_code=500, detail=error_msg)

    return {
        "status": status,
        "batch_id": batch_id,
        "source": source_email,
        "batches": len(results),
        "total_contacts": len(contacts),
        "configuration_set": SES_CONFIGURATION_SET or "未配置",
    }


def get_batch_metrics(batch_id: str) -> dict:
    """从 CloudWatch 获取指定批次的送达指标"""
    import boto3
    from datetime import datetime, timedelta
    from core.config import AWS_REGION
    cw = boto3.client("cloudwatch", region_name=AWS_REGION)

    now = datetime.utcnow()
    start = now - timedelta(days=14)  # 查最近14天

    metrics_to_fetch = ["Send", "Delivery", "Bounce", "Complaint", "Open", "Click", "Reject"]
    result = {}

    for metric_name in metrics_to_fetch:
        try:
            resp = cw.get_metric_statistics(
                Namespace="AWS/SES",
                MetricName=metric_name,
                Dimensions=[{"Name": "batch_id", "Value": batch_id}],
                StartTime=start,
                EndTime=now,
                Period=86400 * 14,  # 整个时间段汇总
                Statistics=["Sum"],
            )
            datapoints = resp.get("Datapoints", [])
            total = sum(dp.get("Sum", 0) for dp in datapoints)
            result[metric_name.lower()] = int(total)
        except Exception:
            result[metric_name.lower()] = 0

    # 计算比率
    send = result.get("send", 0)
    delivery = result.get("delivery", 0)
    opens = result.get("open", 0)
    result["delivery_rate"] = round(delivery / send * 100, 1) if send > 0 else 0
    result["open_rate"] = round(opens / delivery * 100, 1) if delivery > 0 else 0
    result["bounce_rate"] = round(result.get("bounce", 0) / send * 100, 1) if send > 0 else 0

    return result


def list_sending_jobs(db: Session, user_id: int, page: int = 1, page_size: int = 15) -> dict:
    """查询用户的发送历史"""
    query = db.query(SendingJob).filter(SendingJob.user_id == user_id)
    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    rows = query.order_by(SendingJob.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [SendingJobOut(
        id=r.id, batch_id=r.batch_id, template_name=r.template_name,
        group_name=r.group_name, source_email=r.source_email,
        total_contacts=r.total_contacts, total_batches=r.total_batches,
        status=r.status, error_message=r.error_message,
        configuration_set=r.configuration_set, created_at=r.created_at,
    ) for r in rows]

    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


def get_admin_stats(db: Session) -> dict:
    """管理员：获取所有用户的发送统计"""
    from domain.auth.models import User as UserModel
    from sqlalchemy import func, case

    # 按用户汇总
    user_stats = db.query(
        SendingJob.user_id,
        func.count(SendingJob.id).label("total_jobs"),
        func.sum(SendingJob.total_contacts).label("total_contacts"),
        func.sum(case((SendingJob.status == "success", 1), else_=0)).label("success_count"),
        func.sum(case((SendingJob.status == "failed", 1), else_=0)).label("failed_count"),
        func.min(SendingJob.created_at).label("first_send"),
        func.max(SendingJob.created_at).label("last_send"),
    ).group_by(SendingJob.user_id).all()

    # 查用户信息
    user_map = {}
    user_ids = [s.user_id for s in user_stats]
    if user_ids:
        users = db.query(UserModel).filter(UserModel.id.in_(user_ids)).all()
        user_map = {u.id: u for u in users}

    items = []
    for s in user_stats:
        u = user_map.get(s.user_id)
        items.append({
            "user_id": s.user_id,
            "username": u.username if u else "unknown",
            "display_name": u.display_name if u else "unknown",
            "email": u.email if u else "",
            "total_jobs": s.total_jobs,
            "total_contacts": s.total_contacts or 0,
            "success_count": s.success_count or 0,
            "failed_count": s.failed_count or 0,
            "first_send": s.first_send.isoformat() if s.first_send else None,
            "last_send": s.last_send.isoformat() if s.last_send else None,
        })

    # 全局汇总
    total_jobs = sum(i["total_jobs"] for i in items)
    total_contacts = sum(i["total_contacts"] for i in items)
    total_success = sum(i["success_count"] for i in items)

    return {
        "summary": {
            "total_users": len(items),
            "total_jobs": total_jobs,
            "total_contacts": total_contacts,
            "success_rate": round(total_success / total_jobs * 100, 1) if total_jobs > 0 else 0,
        },
        "users": sorted(items, key=lambda x: x["total_contacts"], reverse=True),
    }


def get_admin_all_jobs(db: Session, page: int = 1, page_size: int = 15) -> dict:
    """管理员：查看所有用户的发送历史"""
    from domain.auth.models import User as UserModel

    query = db.query(SendingJob)
    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    rows = query.order_by(SendingJob.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    # 查用户信息
    user_ids = list(set(r.user_id for r in rows))
    user_map = {}
    if user_ids:
        users = db.query(UserModel).filter(UserModel.id.in_(user_ids)).all()
        user_map = {u.id: u for u in users}

    items = []
    for r in rows:
        u = user_map.get(r.user_id)
        items.append({
            "id": r.id,
            "batch_id": r.batch_id,
            "username": u.username if u else "unknown",
            "display_name": u.display_name if u else "unknown",
            "template_name": r.template_name,
            "group_name": r.group_name,
            "source_email": r.source_email,
            "total_contacts": r.total_contacts,
            "status": r.status,
            "configuration_set": r.configuration_set,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}
