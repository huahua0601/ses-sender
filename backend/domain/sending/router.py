from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse, HTMLResponse
from sqlalchemy.orm import Session
import json
import logging

from core.database import get_db
from core.deps import get_current_user, require_admin
from domain.auth.models import User
from domain.sending.schemas import BulkSendRequest, TestEmailRequest
from domain.sending import service

router = APIRouter(tags=["邮件发送"])
logger = logging.getLogger("ses-sender.webhook")


# ========== 退订端点（无需鉴权） ==========
@router.post("/unsubscribe", response_class=PlainTextResponse)
async def unsubscribe_post(request: Request, db: Session = Depends(get_db)):
    """RFC 8058 one-click unsubscribe POST handler (called by email clients)"""
    from core.unsubscribe import verify_unsubscribe_token
    from domain.sending.models import UnsubscribeRecord

    # token 可能在 query params 或 form body 中
    token = request.query_params.get("token", "")
    if not token:
        try:
            form = await request.form()
            token = form.get("token", "") or form.get("List-Unsubscribe", "")
        except Exception:
            pass
    if not token:
        return PlainTextResponse("missing token", status_code=400)

    result = verify_unsubscribe_token(token)
    if not result:
        return PlainTextResponse("invalid token", status_code=400)

    email, source_email = result

    existing = db.query(UnsubscribeRecord).filter(
        UnsubscribeRecord.email == email,
        UnsubscribeRecord.source_email == source_email,
    ).first()
    if not existing:
        db.add(UnsubscribeRecord(email=email, source_email=source_email, reason="one-click"))
        db.commit()
        logger.info(f"[Unsubscribe] {email} unsubscribed from {source_email}")

    return PlainTextResponse("ok", status_code=200)


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_page(token: str = Query(""), db: Session = Depends(get_db)):
    """退订确认页面 (GET) — Gmail 'Go to website' 跳转到此"""
    from core.unsubscribe import verify_unsubscribe_token
    from domain.sending.models import UnsubscribeRecord

    if not token:
        return HTMLResponse("<h2>Invalid link</h2>", status_code=400)

    result = verify_unsubscribe_token(token)
    if not result:
        return HTMLResponse("<h2>Invalid or expired link</h2>", status_code=400)

    email, source_email = result

    existing = db.query(UnsubscribeRecord).filter(
        UnsubscribeRecord.email == email,
        UnsubscribeRecord.source_email == source_email,
    ).first()
    if not existing:
        db.add(UnsubscribeRecord(email=email, source_email=source_email, reason="one-click"))
        db.commit()

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed</title>
<style>body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa}}
.card{{background:#fff;border-radius:12px;padding:48px;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}}
h1{{color:#10b981;font-size:28px;margin-bottom:12px}} p{{color:#6b7280;line-height:1.6}} .email{{color:#111827;font-weight:600}}</style>
</head><body><div class="card">
<h1>Successfully Unsubscribed</h1>
<p>The email address <span class="email">{email}</span> has been unsubscribed from emails sent by <span class="email">{source_email}</span>.</p>
<p style="margin-top:24px;font-size:14px;color:#9ca3af">You will no longer receive emails from this sender.</p>
</div></body></html>"""
    return HTMLResponse(html)


# ========== SES 配额信息 ==========
@router.get("/ses-quota")
def get_ses_quota(current_user: User = Depends(get_current_user)):
    """获取当前 SES 账户的发送配额（实时）"""
    from core.ses import get_send_quota
    return get_send_quota()


# ========== 管理员：测试邮件 ==========
@router.post("/admin/test-email")
def send_test_email(req: TestEmailRequest, admin: User = Depends(require_admin)):
    try:
        return service.send_test_email(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== 管理员：发送统计 ==========
@router.get("/admin/sending-stats")
def admin_sending_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.get_admin_stats(db)


@router.get("/admin/sending-jobs")
def admin_all_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return service.get_admin_all_jobs(db, page, page_size)


# ========== 普通用户：批量发送 ==========
@router.post("/send-bulk")
def send_bulk_email(
    request: BulkSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return service.send_bulk_email(
            db=db,
            source_email=current_user.email,
            template_id=request.TemplateId,
            group_id=request.GroupId,
            user_id=current_user.id,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== 发送历史 ==========
@router.get("/sending-jobs/{batch_id}/metrics")
def get_batch_metrics(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取指定批次的 CloudWatch 指标"""
    from domain.sending.models import SendingJob
    if current_user.is_admin:
        job = db.query(SendingJob).filter(SendingJob.batch_id == batch_id).first()
    else:
        job = db.query(SendingJob).filter(SendingJob.batch_id == batch_id, SendingJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="批次不存在")
    return service.get_batch_metrics(batch_id)


@router.get("/sending-jobs/{batch_id}/details")
def get_batch_details(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取指定批次的每封邮件发送明细"""
    from domain.sending.models import SendingJob
    if current_user.is_admin:
        job = db.query(SendingJob).filter(SendingJob.batch_id == batch_id).first()
    else:
        job = db.query(SendingJob).filter(SendingJob.batch_id == batch_id, SendingJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="批次不存在")
    return service.get_batch_details(db, batch_id)


@router.get("/sending-jobs")
def list_sending_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_sending_jobs(db, current_user.id, page, page_size)


@router.get("/email-details")
def list_email_details(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    recipient: str = Query("", description="收件人搜索"),
    batch_id: str = Query("", description="批次ID搜索"),
    send_status: str = Query("", description="发送状态筛选"),
    delivery_status: str = Query("", description="送达状态筛选"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全局邮件明细查询（支持搜索、筛选、分页）"""
    return service.list_email_details(
        db=db,
        user_id=current_user.id,
        is_admin=current_user.is_admin,
        page=page,
        page_size=page_size,
        recipient=recipient.strip(),
        batch_id=batch_id.strip(),
        send_status=send_status.strip(),
        delivery_status=delivery_status.strip(),
    )


@router.get("/sending-jobs/{batch_id}/progress")
def get_job_progress(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询发送任务的实时进度"""
    from domain.sending.models import SendingJob
    if current_user.is_admin:
        job = db.query(SendingJob).filter(SendingJob.batch_id == batch_id).first()
    else:
        job = db.query(SendingJob).filter(SendingJob.batch_id == batch_id, SendingJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="批次不存在")
    return {
        "batch_id": job.batch_id,
        "status": job.status,
        "total_contacts": job.total_contacts,
        "sent_count": job.sent_count or 0,
        "total_batches": job.total_batches or 0,
        "progress": round((job.sent_count or 0) / max(job.total_contacts, 1) * 100, 1),
        "error_message": job.error_message,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }
