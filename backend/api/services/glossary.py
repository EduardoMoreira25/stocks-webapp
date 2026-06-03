from typing import Optional, Dict
from connectors.db_connector import DBConnectorAPP


def get_kpi_content(slug: str) -> Optional[Dict]:
    rows = DBConnectorAPP.query(
        "SELECT slug, title, content_md, updated_at FROM glossary_kpis WHERE slug = %s",
        [slug]
    )
    if not rows:
        return None
    r = rows[0]
    return {
        "slug": r[0],
        "title": r[1],
        "content_md": r[2],
        "updated_at": str(r[3]) if r[3] else None,
    }


def upsert_kpi_content(slug: str, title: str, content_md: str) -> Dict:
    row = DBConnectorAPP.execute_returning("""
        INSERT INTO glossary_kpis (slug, title, content_md)
        VALUES (%s, %s, %s)
        ON CONFLICT (slug) DO UPDATE
            SET title = EXCLUDED.title,
                content_md = EXCLUDED.content_md,
                updated_at = NOW()
        RETURNING slug, title, content_md, updated_at
    """, [slug, title, content_md])
    return {
        "slug": row[0],
        "title": row[1],
        "content_md": row[2],
        "updated_at": str(row[3]) if row[3] else None,
    }