from fastapi import APIRouter, Depends, HTTPException

from core.deps import require_admin, get_current_user
from domain.auth.models import User
from domain.template.schemas import TemplateCreate
from domain.template import service

router = APIRouter(tags=["邮件模版管理"])


# ========== 管理员：模版 CRUD ==========
@router.get("/admin/templates")
def admin_list_templates(admin: User = Depends(require_admin)):
    try:
        return service.list_templates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/templates")
def admin_create_template(template: TemplateCreate, admin: User = Depends(require_admin)):
    try:
        return service.create_template(template)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/templates/{template_name}")
def admin_delete_template(template_name: str, admin: User = Depends(require_admin)):
    try:
        return service.delete_template(template_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== 普通用户：只读模版列表 ==========
@router.get("/user/templates")
def user_list_templates(current_user: User = Depends(get_current_user)):
    try:
        return service.list_templates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
