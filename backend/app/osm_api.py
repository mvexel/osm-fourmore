"""OpenStreetMap API client for editing operations."""

import logging
import httpx
from datetime import datetime
from typing import Dict, Any
from fastapi import HTTPException, status
import xml.etree.ElementTree as ET

from .models import POIResponse, osm_type_validator_to_full

logger = logging.getLogger(__name__)


OSM_API_BASE = "https://api.openstreetmap.org/api/0.6"
MAX_LOG_SNIPPET = 800


def _log_snippet(payload: str, limit: int = MAX_LOG_SNIPPET) -> str:
    """Return a log-safe snippet of payload content."""
    if payload is None:
        return ""
    stripped = payload.strip()
    if len(stripped) <= limit:
        return stripped
    return f"{stripped[:limit]}...<truncated>"


def _xml_declaration(xml_body: str) -> str:
    """Prepend XML declaration to serialized body."""
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xml_body


def _serialize_osm_element(element: ET.Element) -> str:
    """Serialize an OSM XML element with declaration."""
    return _xml_declaration(ET.tostring(element, encoding='unicode'))


class OSMAPIClient:
    """Client for OSM API editing operations."""

    def __init__(self, access_token: str):
        """Initialize with user's OSM access token."""
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "text/xml"
        }

    async def get_element(self, osm_id: int, osm_type: str) -> Dict[str, Any]:
        """Fetch current element (node/way) data from OSM API."""

        osm_type = osm_type_validator_to_full(osm_type)
        
        if osm_type not in ['node', 'way']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OSM type: {osm_type}. Only node and way are supported."
            )

        url = f"{OSM_API_BASE}/{osm_type}/{osm_id}"
        async with httpx.AsyncClient() as client:
            logger.info("OSM request: GET %s", url)
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            logger.info(
                "OSM response: GET %s -> status=%s body=%s",
                url,
                response.status_code,
                _log_snippet(response.text)
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{osm_type.capitalize()} {osm_id} not found on OSM"
                )

            root = ET.fromstring(response.text)
            element = root.find(osm_type)

            if element is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Invalid {osm_type} data"
                )

            tags = {tag.get('k'): tag.get('v') for tag in element.findall('tag')}

            result = {
                'id': element.get('id'),
                'version': int(element.get('version')),
                'changeset': element.get('changeset'),
                'tags': tags,
                'type': osm_type
            }

            if osm_type == 'node':
                result['lat'] = float(element.get('lat'))
                result['lon'] = float(element.get('lon'))
            elif osm_type == 'way':
                result['nodes'] = [nd.get('ref') for nd in element.findall('nd')]

            return result

    async def create_changeset(self, comment: str, created_by: str = "FourMore") -> str:
        """Create a new changeset."""
        root = ET.Element('osm', attrib={'version': '0.6', 'generator': 'FourMore'})
        changeset_el = ET.SubElement(root, 'changeset')
        ET.SubElement(changeset_el, 'tag', attrib={'k': 'created_by', 'v': created_by})
        ET.SubElement(changeset_el, 'tag', attrib={'k': 'comment', 'v': comment})

        changeset_xml = _serialize_osm_element(root)
        _log_snippet(changeset_xml)

        url = f"{OSM_API_BASE}/changeset/create"
        async with httpx.AsyncClient() as client:
            logger.info(
                "OSM request: PUT %s body=%s",
                url,
                _log_snippet(changeset_xml)
            )
            response = await client.put(
                url,
                headers=self.headers,
                content=changeset_xml
            )
            logger.info(
                "OSM response: PUT %s -> status=%s body=%s",
                url,
                response.status_code,
                _log_snippet(response.text)
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to create changeset: {response.text}"
                )

            return response.text.strip()

    async def update_node(
        self,
        node_id: str,
        version: int,
        lat: float,
        lon: float,
        tags: Dict[str, str],
        changeset_id: str
    ) -> int:
        """Update a node's tags."""
        root = ET.Element('osm', attrib={'version': '0.6', 'generator': 'FourMore'})
        node_el = ET.SubElement(root, 'node', attrib={
            'id': str(node_id),
            'changeset': str(changeset_id),
            'version': str(version),
            'lat': f"{lat:.7f}",
            'lon': f"{lon:.7f}"
        })
        for key, value in tags.items():
            ET.SubElement(node_el, 'tag', attrib={'k': str(key), 'v': str(value)})

        node_xml = _serialize_osm_element(root)

        url = f"{OSM_API_BASE}/node/{node_id}"
        async with httpx.AsyncClient() as client:
            logger.info(
                "OSM request: PUT %s body=%s",
                url,
                _log_snippet(node_xml)
            )
            response = await client.put(
                url,
                headers=self.headers,
                content=node_xml
            )
            logger.info(
                "OSM response: PUT %s -> status=%s body=%s",
                url,
                response.status_code,
                _log_snippet(response.text)
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to update node: {response.text}"
                )

            return int(response.text.strip())

    async def update_way(
        self,
        way_id: str,
        version: int,
        nodes: list,
        tags: Dict[str, str],
        changeset_id: str
    ) -> int:
        """Update a way's tags."""
        root = ET.Element('osm', attrib={'version': '0.6', 'generator': 'FourMore'})
        way_el = ET.SubElement(root, 'way', attrib={
            'id': str(way_id),
            'changeset': str(changeset_id),
            'version': str(version)
        })
        for node_ref in nodes:
            ET.SubElement(way_el, 'nd', attrib={'ref': str(node_ref)})
        for key, value in tags.items():
            ET.SubElement(way_el, 'tag', attrib={'k': str(key), 'v': str(value)})

        way_xml = _serialize_osm_element(root)

        url = f"{OSM_API_BASE}/way/{way_id}"
        async with httpx.AsyncClient() as client:
            logger.info(
                "OSM request: PUT %s body=%s",
                url,
                _log_snippet(way_xml)
            )
            response = await client.put(
                url,
                headers=self.headers,
                content=way_xml
            )
            logger.info(
                "OSM response: PUT %s -> status=%s body=%s",
                url,
                response.status_code,
                _log_snippet(response.text)
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to update way: {response.text}"
                )

            return int(response.text.strip())

    async def close_changeset(self, changeset_id: str):
        """Close a changeset."""
        url = f"{OSM_API_BASE}/changeset/{changeset_id}/close"
        async with httpx.AsyncClient() as client:
            logger.info("OSM request: PUT %s", url)
            response = await client.put(
                url,
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            logger.info(
                "OSM response: PUT %s -> status=%s body=%s",
                url,
                response.status_code,
                _log_snippet(response.text)
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to close changeset: {response.text}"
                )

    async def add_check_date(self, poi: POIResponse) -> Dict[str, Any]:
        """Add or update check_date tag on an element."""
        element_data = await self.get_element(poi.osm_id, poi.osm_type)

        logger.info(f"Retrieved OSM element data: {element_data}")

        tags = element_data['tags'].copy()
        tags['check_date'] = datetime.now().strftime('%Y-%m-%d')

        changeset_id = await self.create_changeset(
            comment=f"Confirmed POI information via FourMore check-in"
        )

        new_version = None

        try:
            if poi.osm_type == 'node':
                new_version = await self.update_node(
                    node_id=str(poi.osm_id),
                    version=element_data['version'],
                    lat=poi.lat,
                    lon=poi.lon,
                    tags=tags,
                    changeset_id=changeset_id
                )
            elif poi.osm_type == 'way':
                new_version = await self.update_way(
                    way_id=str(poi.osm_id),
                    version=element_data['version'],
                    nodes=element_data['nodes'],
                    tags=tags,
                    changeset_id=changeset_id
                )

            logger.info(f"Updated {poi.osm_type} {poi.osm_id} to version {new_version} with check_date tag")

            await self.close_changeset(changeset_id)

            return {
                'osm_id': poi.osm_id,
                'osm_type': poi.osm_type,
                'new_version': new_version,
                'changeset_id': changeset_id,
                'check_date': tags['check_date']
            }
        except Exception as e:
            await self.close_changeset(changeset_id)
            raise e
    
    async def create_note(self, lat: float, lon: float, text: str) -> int:
        """Create a new note."""
        logger = logging.getLogger(__name__)

        # OSM Notes API expects form data, not URL params
        data = {
            'lat': str(lat),
            'lon': str(lon),
            'text': text
        }

        async with httpx.AsyncClient() as client:
            logger.info(f"Creating OSM note with data: {data}")
            response = await client.post(
                f"{OSM_API_BASE}/notes",
                headers={"Authorization": f"Bearer {self.access_token}"},
                data=data  # Use data instead of params
            )

            logger.info(f"OSM API response: status={response.status_code}, content={response.text[:500]}")

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to create note: {response.text}"
                )

            # The response is XML, we need to parse it to get the note id
            root = ET.fromstring(response.text)
            note_element = root.find('note')
            if note_element is not None:
                note_id_element = note_element.find('id')
                if note_id_element is not None and note_id_element.text:
                    return int(note_id_element.text)

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse note creation response: {response.text}"
            )
