from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.services.glossary import get_kpi_content, upsert_kpi_content

router = APIRouter(prefix="/api/v1/glossary", tags=["Glossary"])


class KpiContentUpdate(BaseModel):
    title: str
    content_md: str


@router.get("/kpis/{slug}")
def get_kpi(slug: str):
    content = get_kpi_content(slug)
    if not content:
        raise HTTPException(status_code=404, detail=f"No content found for '{slug}'")
    return content


@router.put("/kpis/{slug}")
def save_kpi(slug: str, data: KpiContentUpdate):
    try:
        return upsert_kpi_content(slug, data.title, data.content_md)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))