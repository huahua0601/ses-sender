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


@router.post("/admin/sql")
def execute_sql(data: dict, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """管理员执行 SQL 查询（仅支持 SELECT）"""
    from sqlalchemy import text
    sql = (data.get("sql") or "").strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL 不能为空")

    sql_upper = sql.upper().lstrip()
    is_select = sql_upper.startswith("SELECT") or sql_upper.startswith("SHOW") or sql_upper.startswith("DESCRIBE") or sql_upper.startswith("EXPLAIN")

    allow_write = data.get("allow_write", False)
    if not is_select and not allow_write:
        raise HTTPException(status_code=400, detail="仅支持 SELECT/SHOW/DESCRIBE 查询。如需执行写操作请勾选「允许写操作」")

    try:
        result = db.execute(text(sql))
        if is_select or sql_upper.startswith("SHOW") or sql_upper.startswith("DESCRIBE") or sql_upper.startswith("EXPLAIN"):
            columns = list(result.keys()) if result.returns_rows else []
            rows = [dict(zip(columns, row)) for row in result.fetchall()] if columns else []
            return {"columns": columns, "rows": rows, "row_count": len(rows)}
        else:
            db.commit()
            return {"columns": [], "rows": [], "row_count": result.rowcount, "message": f"执行成功，影响 {result.rowcount} 行"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"SQL 执行错误: {str(e)}")
