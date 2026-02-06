from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user, require_admin
from domain.auth.models import User
from domain.template.schemas import TemplateCreate, TemplateUpdate, TemplateOut
from domain.template import service

router = APIRouter(tags=["邮件模版管理"])


# ========== 通用：按用户隔离的模版管理 ==========
@router.get("/user/templates", response_model=List[TemplateOut])
def list_templates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.list_templates(db, current_user.id)


@router.post("/user/templates")
def create_template(data: TemplateCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_template(db, data, current_user.id)


@router.put("/user/templates/{template_id}")
def update_template(template_id: int, data: TemplateUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.update_template(db, template_id, data, current_user.id)


@router.delete("/user/templates/{template_id}")
def delete_template(template_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.delete_template(db, template_id, current_user.id)


# ========== 管理员：可以查看所有用户的模版（保留兼容） ==========
@router.get("/admin/templates", response_model=List[TemplateOut])
def admin_list_templates(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return service.list_templates(db, admin.id)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/templates")
def admin_create_template(data: TemplateCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.create_template(db, data, admin.id)


@router.put("/admin/templates/{template_id}")
def admin_update_template(template_id: int, data: TemplateUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.update_template(db, template_id, data, admin.id)


@router.delete("/admin/templates/{template_id}")
def admin_delete_template(template_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.delete_template(db, template_id, admin.id)
