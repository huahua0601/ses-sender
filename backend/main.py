import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import boto3
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

load_dotenv()

# --- Database Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ses_sender.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ContactGroup(Base):
    __tablename__ = "contact_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    contacts = relationship("Contact", back_populates="group")

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    name = Column(String)
    group_id = Column(Integer, ForeignKey("contact_groups.id"))
    group = relationship("ContactGroup", back_populates="contacts")

Base.metadata.create_all(bind=engine)

# --- FastAPI App ---
app = FastAPI(title="SES Sender API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS SES Client
# Using IAM Role (no explicit AK/SK required)
ses_client = boto3.client(
    'ses',
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Schemas ---
class ContactBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class ContactCreate(ContactBase):
    group_id: int

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class Group(GroupBase):
    id: int
    class Config:
        from_attributes = True

# --- API Endpoints ---

@app.get("/")
async def root():
    return {"message": "SES Sender API is running"}

# --- Contact Groups ---
@app.post("/groups", response_model=Group)
def create_group(group: GroupCreate, db: Session = Depends(get_db)):
    db_group = ContactGroup(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@app.get("/groups", response_model=List[Group])
def list_groups(db: Session = Depends(get_db)):
    return db.query(ContactGroup).all()

# --- Contacts ---
@app.post("/contacts")
def create_contact(contact: ContactCreate, db: Session = Depends(get_db)):
    db_contact = Contact(**contact.dict())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@app.get("/groups/{group_id}/contacts")
def list_group_contacts(group_id: int, db: Session = Depends(get_db)):
    return db.query(Contact).filter(Contact.group_id == group_id).all()

# --- SES Identity Management ---
class Identity(BaseModel):
    identity: str
    type: str
    verification_status: str

@app.get("/identities", response_model=List[Identity])
async def list_identities():
    try:
        response = ses_client.list_identities()
        identities = response.get('Identities', [])
        if not identities: return []
        status_response = ses_client.get_identity_verification_attributes(Identities=identities)
        result = []
        for identity in identities:
            status = status_response['VerificationAttributes'].get(identity, {}).get('VerificationStatus', 'Unknown')
            type_str = 'Domain' if '.' in identity and '@' not in identity else 'EmailAddress'
            result.append(Identity(identity=identity, type=type_str, verification_status=status))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/identities/verify-email")
async def verify_email(email: str):
    try:
        ses_client.verify_email_identity(EmailAddress=email)
        return {"message": f"Verification email sent to {email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SES Template Management ---
class Template(BaseModel):
    TemplateName: str
    SubjectPart: str
    HtmlPart: str = ""
    TextPart: str = ""

@app.get("/templates")
async def list_templates():
    try:
        response = ses_client.list_templates()
        return response.get('TemplatesMetadata', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/templates")
async def create_template(template: Template):
    try:
        # 强制确保所有字段都是字符串，且不为 None
        template_name = str(template.TemplateName)
        subject_part = str(template.SubjectPart)
        html_part = str(template.HtmlPart or "")
        text_part = str(template.TextPart or html_part or " ") # SES 要求至少有一个非空

        template_data = {
            'TemplateName': template_name,
            'SubjectPart': subject_part,
            'HtmlPart': html_part,
            'TextPart': text_part
        }

        print(f"Sending to SES: {template_data}") # 添加日志方便调试

        ses_client.create_template(Template=template_data)
        return {"message": f"Template {template_name} created"}
    except Exception as e:
        print(f"SES Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Bulk Sending ---
class BulkSendRequest(BaseModel):
    Source: str
    Template: str
    GroupId: int

@app.post("/send-bulk")
async def send_bulk_email(request: BulkSendRequest, db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.group_id == request.GroupId).all()
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found in group")
    
    destinations = []
    for contact in contacts:
        destinations.append({
            'Destination': {'ToAddresses': [contact.email]},
            'ReplacementTemplateData': f'{{"name": "{contact.name or "Customer"}"}}'
        })
    
    try:
        results = []
        for i in range(0, len(destinations), 50):
            batch = destinations[i:i+50]
            response = ses_client.send_bulk_templated_email(
                Source=request.Source,
                Template=request.Template,
                DefaultTemplateData='{"name": "Customer"}',
                Destinations=batch
            )
            results.append(response)
        return {"status": "success", "batches": len(results), "details": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
