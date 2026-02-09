from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user, require_admin
from domain.auth.models import User
from domain.sending.schemas import BulkSendRequest, TestEmailRequest
from domain.sending import service

router = APIRouter(tags=["邮件发送"])


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
    # 验证该批次属于当前用户
    from domain.sending.models import SendingJob
    job = db.query(SendingJob).filter(SendingJob.batch_id == batch_id, SendingJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="批次不存在")
    return service.get_batch_metrics(batch_id)


@router.get("/sending-jobs")
def list_sending_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_sending_jobs(db, current_user.id, page, page_size)
