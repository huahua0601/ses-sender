from typing import List
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user, get_user_from_query_token
from domain.auth.models import User
from domain.audience.schemas import GroupCreate, GroupOut, ContactCreate, ContactOut
from domain.audience import service

router = APIRouter(tags=["客群管理"])


# ========== 客群 ==========
@router.get("/groups", response_model=List[GroupOut])
def list_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.list_groups(db, current_user.id)


@router.post("/groups", response_model=GroupOut)
def create_group(data: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_group(db, data, current_user.id)


@router.delete("/groups/{group_id}")
def delete_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.delete_group(db, group_id, current_user.id)


# ========== 联系人 ==========
@router.get("/groups/{group_id}/contacts", response_model=List[ContactOut])
def list_contacts(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.list_contacts(db, group_id, current_user.id)


@router.post("/contacts", response_model=ContactOut)
def create_contact(data: ContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_contact(db, data, current_user.id)


@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.delete_contact(db, contact_id, current_user.id)


# ========== Excel 导入/导出 ==========
@router.get("/groups/{group_id}/contacts/download")
def download_contacts(group_id: int, token: str = "", db: Session = Depends(get_db)):
    current_user = get_user_from_query_token(token, db)
    return service.download_contacts_excel(db, group_id, current_user.id)


@router.get("/contacts/template/download")
def download_template(token: str = "", db: Session = Depends(get_db)):
    get_user_from_query_token(token, db)  # 验证登录
    return service.download_template_excel()


@router.post("/groups/{group_id}/contacts/upload")
def upload_contacts(group_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.upload_contacts_excel(db, group_id, current_user.id, file)
