"""
SES Sender API - 应用入口

业务域划分:
  - auth      认证域: 用户登录、用户管理
  - identity  发送实体域: SES 邮箱/域名验证
  - template  邮件模版域: SES 模版 CRUD
  - audience  客群域: 客群管理、联系人管理、Excel 导入导出
  - sending   邮件发送域: 测试邮件、批量发送
"""

import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext

from core.database import engine, SessionLocal
from domain.auth.service import init_default_admin

# 导入所有 models，确保 Alembic 能发现它们
from domain.auth import models as _auth_models        # noqa: F401
from domain.audience import models as _audience_models  # noqa: F401

# 导入各域路由
from domain.auth.router import router as auth_router
from domain.identity.router import router as identity_router
from domain.template.router import router as template_router
from domain.audience.router import router as audience_router
from domain.sending.router import router as sending_router


# --- Alembic 迁移检查 & 自动升级 ---
def check_and_run_migrations():
    """启动时检查数据库迁移版本，若不是最新则自动执行 upgrade head"""
    alembic_cfg = AlembicConfig("alembic.ini")

    # 获取脚本目录中的最新版本
    script = ScriptDirectory.from_config(alembic_cfg)
    head_revision = script.get_current_head()

    # 获取数据库当前版本
    with engine.connect() as conn:
        migration_ctx = MigrationContext.configure(conn)
        current_revision = migration_ctx.get_current_revision()

    if current_revision == head_revision:
        print(f"[Alembic] 数据库版本已是最新: {current_revision}")
    else:
        print(f"[Alembic] 数据库版本: {current_revision} -> 目标版本: {head_revision}")
        print("[Alembic] 正在执行数据库迁移 (upgrade head)...")
        alembic_command.upgrade(alembic_cfg, "head")
        print("[Alembic] 迁移完成!")


try:
    check_and_run_migrations()
except Exception as e:
    print(f"[Alembic] 迁移检查失败: {e}")
    print("[Alembic] 请手动执行: alembic upgrade head")
    sys.exit(1)

# --- 初始化默认管理员 ---
db = SessionLocal()
try:
    init_default_admin(db)
finally:
    db.close()

# --- FastAPI App ---
app = FastAPI(
    title="SES Sender API",
    description="前后端分离的 AWS SES 邮件发送管理平台",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 注册各业务域路由 ---
app.include_router(auth_router)
app.include_router(identity_router)
app.include_router(template_router)
app.include_router(audience_router)
app.include_router(sending_router)


@app.get("/")
def root():
    return {"message": "SES Sender API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
