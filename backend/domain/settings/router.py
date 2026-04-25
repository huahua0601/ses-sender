from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.deps import require_admin, get_current_user
from domain.auth.models import User
from domain.settings import service

router = APIRouter(tags=["系统设置"])


@router.get("/admin/settings")
def get_settings(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.get_all_settings(db)


@router.put("/admin/settings")
def save_settings(data: dict, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    service.save_settings(db, data)
    return {"message": "配置已保存"}


@router.get("/admin/ai-models")
def list_ai_models(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.get_ai_models(db)


@router.put("/admin/ai-models")
def save_ai_models(data: dict, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    service.save_ai_models(db, data.get("models", []))
    return {"message": "模型列表已保存"}


@router.post("/admin/ai-models/test")
def test_ai_model(data: dict, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.test_ai_model(db, data)


@router.get("/ai-models/available")
def available_models(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """普通用户获取可用模型列表（按 Provider 分组）"""
    return service.get_available_models(db)


@router.post("/admin/settings/test-bedrock")
def test_ai_connection(data: dict = None, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    provider = (data or {}).get("ai_provider") or service.get_ai_provider(db)
    if provider == "openai_compatible":
        return service.test_openai_connection(db, data)
    return service.test_bedrock_connection(db, data)
