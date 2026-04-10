import uuid
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from core.ses import sesv2_client
from domain.template.models import EmailTemplate
from domain.template.schemas import TemplateCreate, TemplateUpdate, TemplateOut


def _generate_ses_name(user_id: int) -> str:
    """生成唯一的 SES 模版名称"""
    short_id = uuid.uuid4().hex[:8]
    return f"u{user_id}_{short_id}"


def list_templates(db: Session, user_id: int) -> List[TemplateOut]:
    """列出用户的模版"""
    rows = db.query(EmailTemplate).filter(EmailTemplate.user_id == user_id).order_by(EmailTemplate.id.desc()).all()
    return [TemplateOut(id=r.id, name=r.name, subject=r.subject, html_body=r.html_body, created_at=r.created_at) for r in rows]


def create_template(db: Session, data: TemplateCreate, user_id: int) -> dict:
    """创建模版（同时写入 DB 和 SES v2）"""
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="模版名称不能为空")

    ses_name = _generate_ses_name(user_id)
    html = str(data.html_body or "")
    text = html or " "

    try:
        sesv2_client.create_email_template(
            TemplateName=ses_name,
            TemplateContent={
                "Subject": str(data.subject),
                "Html": html,
                "Text": text,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SES 模版创建失败: {str(e)}")

    tpl = EmailTemplate(
        name=data.name,
        ses_name=ses_name,
        subject=data.subject,
        html_body=html,
        text_body=text,
        user_id=user_id,
    )
    db.add(tpl)
    db.commit()
    return {"message": f"模版「{data.name}」创建成功"}


def update_template(db: Session, template_id: int, data: TemplateUpdate, user_id: int) -> dict:
    """更新模版（同时更新 DB 和 SES v2）"""
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.user_id == user_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模版不存在")

    if data.subject is not None:
        tpl.subject = data.subject
    if data.html_body is not None:
        tpl.html_body = data.html_body
        tpl.text_body = data.html_body or " "

    try:
        sesv2_client.update_email_template(
            TemplateName=tpl.ses_name,
            TemplateContent={
                "Subject": tpl.subject,
                "Html": tpl.html_body,
                "Text": tpl.text_body,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SES 模版更新失败: {str(e)}")

    db.commit()
    return {"message": f"模版「{tpl.name}」已更新"}


def delete_template(db: Session, template_id: int, user_id: int) -> dict:
    """删除模版（同时从 DB 和 SES v2 删除）"""
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.user_id == user_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模版不存在")

    try:
        sesv2_client.delete_email_template(TemplateName=tpl.ses_name)
    except Exception:
        pass

    db.delete(tpl)
    db.commit()
    return {"message": f"模版「{tpl.name}」已删除"}


def get_ses_template_name(db: Session, template_id: int, user_id: int) -> str:
    """获取模版对应的 SES 模版名称（用于发送邮件）"""
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.user_id == user_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模版不存在")
    return tpl.ses_name


def _parse_ai_json(text: str) -> dict:
    """Robustly extract JSON from AI response that may contain markdown fences or malformed output."""
    import json, re, logging

    logger = logging.getLogger("ses-sender.ai")
    text = text.strip()

    for prefix in ("```json", "```"):
        if text.startswith(prefix):
            text = text[len(prefix):]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.debug(f"[_parse_ai_json] Direct parse failed: {e}")

    keys = ["suggestions", "optimized_subject", "optimized_html"]
    parsed = {}

    suggestions_match = re.search(r'"suggestions"\s*:\s*\[', text)
    if suggestions_match:
        bracket_start = text.index('[', suggestions_match.start())
        depth = 0
        end = bracket_start
        in_str = False
        esc = False
        for i in range(bracket_start, len(text)):
            ch = text[i]
            if esc:
                esc = False
                continue
            if ch == '\\':
                esc = True
                continue
            if ch == '"':
                in_str = not in_str
                continue
            if in_str:
                continue
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        try:
            parsed["suggestions"] = json.loads(text[bracket_start:end + 1])
        except json.JSONDecodeError:
            parsed["suggestions"] = []

    for key in ["optimized_subject", "optimized_html"]:
        pattern = f'"{key}"\\s*:\\s*"'
        match = re.search(pattern, text)
        if not match:
            continue
        value_start = match.end()
        esc = False
        value_end = value_start
        for i in range(value_start, len(text)):
            ch = text[i]
            if esc:
                esc = False
                continue
            if ch == '\\':
                esc = True
                continue
            if ch == '"':
                value_end = i
                break
        raw_val = text[value_start:value_end]
        parsed[key] = raw_val.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')

    if parsed.get("optimized_html") or parsed.get("optimized_subject"):
        return {
            "suggestions": parsed.get("suggestions", []),
            "optimized_subject": parsed.get("optimized_subject", ""),
            "optimized_html": parsed.get("optimized_html", ""),
        }

    raise HTTPException(status_code=500, detail="AI 返回格式异常，请重试")


def optimize_template_with_ai(subject: str, html_body: str, user_feedback: str = None) -> dict:
    """调用 AWS Bedrock 优化邮件模板"""
    import json
    import logging
    import boto3
    from core.config import BEDROCK_MODEL_ID, BEDROCK_REGION

    logger = logging.getLogger("ses-sender.ai")

    if not BEDROCK_MODEL_ID:
        raise HTTPException(status_code=400, detail="未配置 BEDROCK_MODEL_ID")

    base_instructions = """You are an expert email marketing consultant specializing in AWS SES best practices and email deliverability.

Analyze the following email template and provide optimization suggestions. Focus on:
1. **Deliverability** - Avoid spam trigger words, ensure proper HTML structure
2. **Open Rate** - Optimize subject line to be compelling and concise
3. **Click Rate** - Improve CTA (Call-to-Action) buttons and links
4. **Mobile Responsiveness** - Ensure the email renders well on mobile devices
5. **Compliance** - Check for unsubscribe link, proper sender identification
6. **HTML Quality** - Clean HTML, inline CSS, proper encoding"""

    feedback_section = ""
    if user_feedback and user_feedback.strip():
        feedback_section = f"""

**User's additional modification request:**
{user_feedback}

Please incorporate the user's feedback into your optimization. Prioritize the user's specific requests."""

    prompt = f"""{base_instructions}

Current email:
- Subject: {subject}
- HTML Body:
```html
{html_body}
```
{feedback_section}
Respond in Chinese. Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{{
  "suggestions": ["建议1", "建议2", "建议3"],
  "optimized_subject": "优化后的邮件主题",
  "optimized_html": "优化后的完整HTML内容"
}}

Important:
- Keep all {{{{variable}}}} template variables (like {{{{name}}}}, {{{{email}}}}, {{{{unsubscribe_url}}}}) unchanged
- Keep the original language of the email content
- Make the HTML more professional and mobile-friendly
- Add inline CSS for better email client compatibility
- Your entire response must be a single valid JSON object, nothing else
- Do NOT wrap in markdown code fences
- Make sure all strings in JSON are properly escaped (especially quotes and newlines in HTML)"""

    try:
        client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 8192,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
        })

        response = client.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=body,
        )

        result = json.loads(response["body"].read())
        ai_text = result.get("content", [{}])[0].get("text", "{}")
        logger.debug(f"[AI Optimize] Raw response length: {len(ai_text)}")
        logger.debug(f"[AI Optimize] Raw response first 500 chars: {ai_text[:500]}")
        logger.debug(f"[AI Optimize] Raw response last 500 chars: {ai_text[-500:]}")

        ai_json = _parse_ai_json(ai_text)

        return {
            "suggestions": ai_json.get("suggestions", []),
            "optimized_subject": ai_json.get("optimized_subject", subject),
            "optimized_html": ai_json.get("optimized_html", html_body),
        }

    except client.exceptions.AccessDeniedException:
        raise HTTPException(status_code=403, detail="无权访问 Bedrock，请检查 IAM 权限（需要 bedrock:InvokeModel）")
    except Exception as e:
        logger.error(f"[AI Optimize] Bedrock 调用失败: {e}")
        raise HTTPException(status_code=500, detail=f"AI 优化失败: {str(e)}")
