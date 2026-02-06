from typing import List
from core.ses import ses_client
from domain.identity.schemas import IdentityOut


def list_identities() -> List[IdentityOut]:
    response = ses_client.list_identities()
    identities = response.get("Identities", [])
    if not identities:
        return []

    status_response = ses_client.get_identity_verification_attributes(Identities=identities)
    result = []
    for identity in identities:
        status = status_response["VerificationAttributes"].get(identity, {}).get("VerificationStatus", "Unknown")
        type_str = "Domain" if "." in identity and "@" not in identity else "EmailAddress"
        result.append(IdentityOut(identity=identity, type=type_str, verification_status=status))
    return result


def verify_email(email: str) -> dict:
    ses_client.verify_email_identity(EmailAddress=email)
    return {"message": f"验证邮件已发送到 {email}"}


def verify_domain(domain: str) -> dict:
    response = ses_client.verify_domain_identity(Domain=domain)
    return {"message": "请添加 TXT 记录", "token": response.get("VerificationToken")}
