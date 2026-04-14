from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user, require_admin
from domain.auth.models import User
from domain.auth.schemas import LoginRequest, UserCreate, UserUpdate, UserOut
from domain.auth import service

router = APIRouter()


# ========== 登录 ==========
@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = service.authenticate_user(db, req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账户已被禁用")
    token = service.create_access_token({"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "email": user.email,
            "is_admin": user.is_admin,
            "daily_send_limit": user.daily_send_limit or 1000,
        },
    }


@router.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ========== 管理员：用户管理 ==========
@router.get("/admin/users", response_model=List[UserOut])
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).all()


@router.post("/admin/users", response_model=UserOut)
def create_user(data: UserCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    return service.create_user(db, data)


@router.put("/admin/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return service.update_user(db, user, data)
