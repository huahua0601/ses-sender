from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.deps import require_admin
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


@router.post("/admin/settings/test-bedrock")
def test_bedrock(data: dict = None, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return service.test_bedrock_connection(db, data)
