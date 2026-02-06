import boto3
from core.config import AWS_REGION

ses_client = boto3.client("ses", region_name=AWS_REGION)
