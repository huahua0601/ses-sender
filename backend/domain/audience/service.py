import io
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse
import openpyxl

from domain.audience.models import ContactGroup, Contact
from domain.audience.schemas import GroupCreate, ContactCreate


# ========== 客群操作 ==========
def list_groups(db: Session, user_id: int) -> List[ContactGroup]:
    return db.query(ContactGroup).filter(ContactGroup.user_id == user_id).all()


def create_group(db: Session, data: GroupCreate, user_id: int) -> ContactGroup:
    group = ContactGroup(name=data.name, description=data.description, user_id=user_id)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def delete_group(db: Session, group_id: int, user_id: int) -> dict:
    group = _get_user_group(db, group_id, user_id)
    db.delete(group)
    db.commit()
    return {"message": "客群已删除"}


# ========== 联系人操作 ==========
def list_contacts(db: Session, group_id: int, user_id: int) -> List[Contact]:
    _get_user_group(db, group_id, user_id)
    return db.query(Contact).filter(Contact.group_id == group_id).all()


def create_contact(db: Session, data: ContactCreate, user_id: int) -> Contact:
    _get_user_group(db, data.group_id, user_id)
    contact = Contact(email=data.email, name=data.name, group_id=data.group_id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: int, user_id: int) -> dict:
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="联系人不存在")
    _get_user_group(db, contact.group_id, user_id)
    db.delete(contact)
    db.commit()
    return {"message": "联系人已删除"}


# ========== Excel 操作 ==========
def download_contacts_excel(db: Session, group_id: int, user_id: int) -> StreamingResponse:
    group = _get_user_group(db, group_id, user_id)
    contacts = db.query(Contact).filter(Contact.group_id == group_id).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "联系人"
    ws.append(["姓名", "邮箱"])
    for c in contacts:
        ws.append([c.name or "", c.email])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={group.name}_contacts.xlsx"},
    )


def download_template_excel() -> StreamingResponse:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "联系人模版"
    ws.append(["姓名", "邮箱"])
    ws.append(["张三", "zhangsan@example.com"])
    ws.append(["李四", "lisi@example.com"])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=contact_template.xlsx"},
    )


def upload_contacts_excel(db: Session, group_id: int, user_id: int, file: UploadFile) -> dict:
    _get_user_group(db, group_id, user_id)

    try:
        wb = openpyxl.load_workbook(file.file)
        ws = wb.active
        count = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            name = str(row[0] or "").strip() if row[0] else ""
            email = str(row[1] or "").strip() if len(row) > 1 and row[1] else ""
            if email:
                db.add(Contact(name=name, email=email, group_id=group_id))
                count += 1
        db.commit()
        return {"message": f"成功导入 {count} 个联系人"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")


# ========== 内部工具 ==========
def _get_user_group(db: Session, group_id: int, user_id: int) -> ContactGroup:
    """获取属于指定用户的客群，不存在则抛异常"""
    group = db.query(ContactGroup).filter(
        ContactGroup.id == group_id, ContactGroup.user_id == user_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="客群不存在或无权操作")
    return group
