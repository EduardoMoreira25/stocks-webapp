#!/usr/bin/env python3
"""
Script to refresh materialized views in the database.
This should be run daily after market close (e.g., 6 PM ET) via cron job.

Usage:
    python api/utils/refresh_views.py

Cron job example (run at 6 PM weekdays):
    0 18 * * 1-5 cd /home/miendes/testes && python api/utils/refresh_views.py
"""

from connectors.db_connector import DBConnectorFinancials as DBConnector
from datetime import datetime


def refresh_ttm_view():
    """Refresh the TTM metrics materialized view"""
    try:
        print(f"[{datetime.now()}] Starting refresh of vw_company_ttm_metrics...")
        DBConnector.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY vw_company_ttm_metrics")
        print(f"[{datetime.now()}] Successfully refreshed vw_company_ttm_metrics")
        return True
    except Exception as e:
        print(f"[{datetime.now()}] Error refreshing view: {e}")
        return False


def get_view_stats():
    """Get statistics about the refreshed view"""
    try:
        query = """
            SELECT
                COUNT(*) as total_companies,
                MIN(quarters_available) as min_quarters,
                MAX(quarters_available) as max_quarters,
                AVG(quarters_available)::numeric(10,2) as avg_quarters,
                MAX(ttm_end_date) as latest_data_date
            FROM vw_company_ttm_metrics
        """
        result = DBConnector.query(query)
        if result:
            stats = result[0]
            print(f"\nView Statistics:")
            print(f"  Total Companies: {stats[0]}")
            print(f"  Quarters Range: {stats[1]} - {stats[2]}")
            print(f"  Average Quarters: {stats[3]}")
            print(f"  Latest Data Date: {stats[4]}")
    except Exception as e:
        print(f"Error getting view stats: {e}")


def main():
    """Main function to refresh all views"""
    print("=" * 60)
    print("Financial Data API - Materialized View Refresh")
    print("=" * 60)

    success = refresh_ttm_view()

    if success:
        get_view_stats()
        print(f"\n[{datetime.now()}] All views refreshed successfully!")
        return 0
    else:
        print(f"\n[{datetime.now()}] View refresh failed!")
        return 1


if __name__ == "__main__":
    exit(main())
