"""Places/POI endpoints."""

from typing import List
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Depends
from fastapi import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, literal_column
from ..db import get_db, POI, CheckIn
from ..auth import get_current_user, User
from ..models import NormalizeOsmType, POIResponse, POINearbyRequest, APIResponse

# Prometheus metrics (optional import – if not available, code still runs)
try:
    from prometheus_client import Histogram
except Exception:  # pragma: no cover
    Histogram = None  # type: ignore

# Define histogram lazily to avoid import-time failures in environments without prometheus_client
_nearby_query_hist = None
if Histogram is not None:
    _nearby_query_hist = Histogram(
        "places_nearby_query_seconds",
        "Time spent executing spatial nearby query",
        labelnames=("has_class_filter",),
        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
    )

router = APIRouter(prefix="/places", tags=["places"])


@router.post("/nearby", response_model=List[POIResponse])
async def get_nearby_places(
    request: POINearbyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    response: Response = None,  # injected by FastAPI
):
    """Get POIs near a given location."""

    import logging

    logger = logging.getLogger(__name__)

    app_t0 = time.perf_counter()
    # KNN preselect using GiST index, then precise distance + radius filter
    has_class = bool(request.poi_class)
    db_t0 = time.perf_counter()

    candidate_cap = 500
    knn_order = POI.geom.op("<->")(
        func.ST_SetSRID(func.ST_MakePoint(request.lon, request.lat), 4326)
    )

    candidates = db.query(
        POI.osm_type,
        POI.osm_id,
        POI.name,
        POI.poi_class,
        POI.tags,
        POI.geom,
        POI.version,
        POI.timestamp,
    )
    # filter out highway=bus_stop for now
    candidates = candidates.filter(
        or_(
            POI.tags.op("->>")("highway") != "bus_stop",
            POI.tags.op("->>")("highway").is_(None),
        )
    )
    if request.poi_class:
        candidates = candidates.filter(POI.poi_class == request.poi_class)
    candidates = candidates.order_by(knn_order).limit(candidate_cap)

    c = candidates.subquery("c")

    distance_expr = func.ST_Distance(
        func.ST_GeogFromWKB(c.c.geom),
        func.ST_GeographyFromText(f"POINT({request.lon} {request.lat})"),
    ).label("distance")

    final_query = (
        db.query(
            c.c.osm_type,
            c.c.osm_id,
            c.c.name,
            c.c.poi_class,
            c.c.tags,
            func.ST_AsEWKB(c.c.geom).label("geom"),
            func.ST_Y(func.ST_AsText(c.c.geom)).label("lat"),
            func.ST_X(func.ST_AsText(c.c.geom)).label("lon"),
            c.c.version,
            c.c.timestamp,
            distance_expr,
        )
        .filter(
            func.ST_DWithin(
                func.ST_GeogFromWKB(c.c.geom),
                func.ST_GeographyFromText(f"POINT({request.lon} {request.lat})"),
                request.radius,
            )
        )
        .order_by(literal_column("distance"))
        .offset(request.offset)
        .limit(request.limit)
    )

    results = final_query.all()
    db_elapsed = time.perf_counter() - db_t0

    # Record Prometheus metric if available
    if _nearby_query_hist is not None:
        _nearby_query_hist.labels("true" if has_class else "false").observe(db_elapsed)

    # Get user's most recent check-in (current location)
    most_recent_checkin = (
        db.query(CheckIn.poi_osm_type, CheckIn.poi_osm_id)
        .filter(CheckIn.user_id == current_user.id)
        .order_by(CheckIn.created_at.desc())
        .first()
    )

    # Get the current checked-in POI (if any)
    current_checkin_poi = None
    if most_recent_checkin:
        current_checkin_poi = (
            most_recent_checkin.poi_osm_type,
            most_recent_checkin.poi_osm_id,
        )

    # Convert to response format
    pois = []
    for row in results:
        poi_data = POIResponse(
            osm_id=row.osm_id,
            osm_type=row.osm_type,
            name=row.name,
            **{"class": row.poi_class},
            lat=float(row.lat) if row.lat is not None else None,
            lon=float(row.lon) if row.lon is not None else None,
            tags=row.tags or {},
            version=row.version,
            timestamp=row.timestamp,
        )
        poi_data.distance = round(float(row.distance), 1)
        poi_data.is_checked_in = current_checkin_poi == (row.osm_type, row.osm_id)
        pois.append(poi_data)

    # Add basic Server-Timing header (db, app)
    total_elapsed = time.perf_counter() - app_t0
    app_elapsed = max(total_elapsed - db_elapsed, 0.0)
    if response is not None:
        # Server-Timing: db;dur=..., app;dur=...
        response.headers["Server-Timing"] = (
            f"db;dur={db_elapsed*1000:.1f}, app;dur={app_elapsed*1000:.1f}"
        )

    return pois


@router.get("/{osm_type}/{osm_id}", response_model=POIResponse)
async def get_place_details(
    osm_id: int,
    db: Session = Depends(get_db),
    osm_type: str = Depends(NormalizeOsmType),
):
    """Get detailed information about a specific POI."""
    poi = db.query(POI).filter(POI.osm_type == osm_type, POI.osm_id == osm_id).first()

    if not poi:
        raise HTTPException(status_code=404, detail="Place not found")

    return POIResponse.model_validate(poi)


@router.get("/classes/list")
async def get_classes(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get list of available POI classes."""
    classes = (
        db.query(POI.poi_class, func.count().label("count"))
        .group_by(POI.poi_class)
        .all()
    )

    return APIResponse(
        success=True,
        message="Classes retrieved successfully",
        data=[{"class": cls, "count": count} for cls, count in classes],
    )
