from fastapi import APIRouter, Depends, HTTPException
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
