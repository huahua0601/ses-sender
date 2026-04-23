from sqlalchemy.orm import Session
from domain.auth.models import SystemSetting
from core.config import BEDROCK_MODEL_ID, BEDROCK_REGION

SETTING_KEYS = [
    "ai_provider",           # bedrock
    "bedrock_model_id",      # 模型 ID
    "bedrock_region",        # 区域
    "bedrock_auth_mode",     # iam_role / ak_sk / api_key
    "bedrock_access_key",    # AK/SK 模式: Access Key ID
    "bedrock_secret_key",    # AK/SK 模式: Secret Access Key
    "bedrock_api_key",       # API Key 模式: Bedrock API Key (Bearer Token)
]

_SECRET_KEYS = {"bedrock_secret_key", "bedrock_api_key"}


def get_all_settings(db: Session) -> dict:
    rows = db.query(SystemSetting).filter(SystemSetting.key.in_(SETTING_KEYS)).all()
    result = {k: "" for k in SETTING_KEYS}
    for r in rows:
        result[r.key] = r.value or ""
    if not result.get("ai_provider"):
        result["ai_provider"] = "bedrock"
    if not result.get("bedrock_model_id"):
        result["bedrock_model_id"] = BEDROCK_MODEL_ID
    if not result.get("bedrock_region"):
        result["bedrock_region"] = BEDROCK_REGION
    if not result.get("bedrock_auth_mode"):
        result["bedrock_auth_mode"] = "iam_role"
    has_ak_sk = bool(result.get("bedrock_secret_key"))
    has_api_key = bool(result.get("bedrock_api_key"))
    for k in _SECRET_KEYS:
        result.pop(k, None)
    result["bedrock_has_ak_sk"] = has_ak_sk
    result["bedrock_has_api_key"] = has_api_key
    return result


def save_settings(db: Session, data: dict):
    for key in SETTING_KEYS:
        if key not in data:
            continue
        val = data[key]
        if key in _SECRET_KEYS and val == "":
            continue
        if val == "__CLEAR__":
            val = ""
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row:
            row.value = val
        else:
            db.add(SystemSetting(key=key, value=val))
    db.commit()


def get_bedrock_config(db: Session) -> dict:
    """获取 Bedrock 调用配置"""
    rows = db.query(SystemSetting).filter(SystemSetting.key.in_(SETTING_KEYS)).all()
    cfg = {r.key: r.value for r in rows if r.value}
    return {
        "model_id": cfg.get("bedrock_model_id") or BEDROCK_MODEL_ID,
        "region": cfg.get("bedrock_region") or BEDROCK_REGION,
        "auth_mode": cfg.get("bedrock_auth_mode") or "iam_role",
        "access_key": cfg.get("bedrock_access_key") or None,
        "secret_key": cfg.get("bedrock_secret_key") or None,
        "api_key": cfg.get("bedrock_api_key") or None,
    }


def test_bedrock_connection(db: Session, override: dict = None) -> dict:
    """测试 Bedrock 连通性，优先使用传入的参数（未保存的表单值）"""
    cfg = get_bedrock_config(db)

    if override:
        if override.get("bedrock_auth_mode"):
            cfg["auth_mode"] = override["bedrock_auth_mode"]
        if override.get("bedrock_model_id"):
            cfg["model_id"] = override["bedrock_model_id"]
        if override.get("bedrock_region"):
            cfg["region"] = override["bedrock_region"]
        if override.get("bedrock_access_key"):
            cfg["access_key"] = override["bedrock_access_key"]
        if override.get("bedrock_secret_key"):
            cfg["secret_key"] = override["bedrock_secret_key"]
        if override.get("bedrock_api_key"):
            cfg["api_key"] = override["bedrock_api_key"]

    mode = cfg["auth_mode"]

    if mode == "api_key":
        if not cfg["api_key"]:
            return {"success": False, "auth_mode": "Bedrock API Key", "error": "未配置 Bedrock API Key"}
        return _test_with_api_key(cfg)
    elif mode == "ak_sk":
        if not cfg["access_key"] or not cfg["secret_key"]:
            return {"success": False, "auth_mode": "AK/SK", "error": "未配置 Access Key 或 Secret Key"}
        return _test_with_boto3(cfg, "AK/SK")
    else:
        return _test_with_boto3(cfg, "IAM Role")


def _test_with_api_key(cfg: dict) -> dict:
    """使用 Bedrock API Key (Bearer Token) 测试"""
    import json
    import urllib.request
    import urllib.error

    url = f"https://bedrock-runtime.{cfg['region']}.amazonaws.com/model/{cfg['model_id']}/converse"
    payload = json.dumps({
        "messages": [{"role": "user", "content": [{"text": "Say OK"}]}],
    }).encode()

    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {cfg['api_key']}")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            reply = ""
            for block in data.get("output", {}).get("message", {}).get("content", []):
                if "text" in block:
                    reply += block["text"]
            return {"success": True, "auth_mode": "Bedrock API Key", "model_id": cfg["model_id"], "region": cfg["region"], "reply": reply.strip()}
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return {"success": False, "auth_mode": "Bedrock API Key", "model_id": cfg["model_id"], "region": cfg["region"], "error": f"HTTP {e.code}: {body[:300]}"}
    except Exception as e:
        return {"success": False, "auth_mode": "Bedrock API Key", "model_id": cfg["model_id"], "region": cfg["region"], "error": str(e)}


def _test_with_boto3(cfg: dict, auth_label: str) -> dict:
    """使用 boto3 (IAM Role 或 AK/SK) 测试"""
    import boto3
    import json

    kwargs = {"region_name": cfg["region"]}
    if auth_label == "AK/SK" and cfg["access_key"] and cfg["secret_key"]:
        kwargs["aws_access_key_id"] = cfg["access_key"]
        kwargs["aws_secret_access_key"] = cfg["secret_key"]

    try:
        client = boto3.client("bedrock-runtime", **kwargs)
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 32,
            "messages": [{"role": "user", "content": "Say OK"}],
            "temperature": 0,
        })
        response = client.invoke_model(modelId=cfg["model_id"], contentType="application/json", accept="application/json", body=body)
        result = json.loads(response["body"].read())
        reply = result.get("content", [{}])[0].get("text", "")
        return {"success": True, "auth_mode": auth_label, "model_id": cfg["model_id"], "region": cfg["region"], "reply": reply.strip()}
    except Exception as e:
        return {"success": False, "auth_mode": auth_label, "model_id": cfg["model_id"], "region": cfg["region"], "error": str(e)}
