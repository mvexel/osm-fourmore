"""OpenStreetMap API client for editing operations."""

import httpx
from datetime import datetime
from typing import Dict, Optional, Any
from fastapi import HTTPException, status
import xml.etree.ElementTree as ET


OSM_API_BASE = "https://api.openstreetmap.org/api/0.6"


class OSMAPIClient:
    """Client for OSM API editing operations."""

    def __init__(self, access_token: str):
        """Initialize with user's OSM access token."""
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "text/xml"
        }

    async def get_element(self, osm_id: str, osm_type: str) -> Dict[str, Any]:
        """Fetch current element (node/way) data from OSM API."""
        if osm_type not in ['node', 'way']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OSM type: {osm_type}. Only node and way are supported."
            )

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OSM_API_BASE}/{osm_type}/{osm_id}",
                headers={"Authorization": f"Bearer {self.access_token}"}
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
        changeset_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <changeset>
    <tag k="created_by" v="{created_by}"/>
    <tag k="comment" v="{comment}"/>
  </changeset>
</osm>"""

        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{OSM_API_BASE}/changeset/create",
                headers=self.headers,
                content=changeset_xml
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
        tags_xml = "\n".join([
            f'    <tag k="{k}" v="{v}"/>'
            for k, v in tags.items()
        ])

        node_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <node id="{node_id}" changeset="{changeset_id}" version="{version}" lat="{lat}" lon="{lon}">
{tags_xml}
  </node>
</osm>"""

        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{OSM_API_BASE}/node/{node_id}",
                headers=self.headers,
                content=node_xml
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
        tags_xml = "\n".join([
            f'    <tag k="{k}" v="{v}"/>'
            for k, v in tags.items()
        ])

        nodes_xml = "\n".join([
            f'    <nd ref="{node_ref}"/>'
            for node_ref in nodes
        ])

        way_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <way id="{way_id}" changeset="{changeset_id}" version="{version}">
{nodes_xml}
{tags_xml}
  </way>
</osm>"""

        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{OSM_API_BASE}/way/{way_id}",
                headers=self.headers,
                content=way_xml
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to update way: {response.text}"
                )

            return int(response.text.strip())

    async def close_changeset(self, changeset_id: str):
        """Close a changeset."""
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{OSM_API_BASE}/changeset/{changeset_id}/close",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to close changeset: {response.text}"
                )

    async def add_check_date(self, osm_id: str, osm_type: str) -> Dict[str, Any]:
        """Add or update check_date tag on an element."""
        element_data = await self.get_element(osm_id, osm_type)

        tags = element_data['tags'].copy()
        tags['check_date'] = datetime.now().strftime('%Y-%m-%d')

        changeset_id = await self.create_changeset(
            comment=f"Confirmed POI information via FourMore check-in"
        )

        try:
            if osm_type == 'node':
                new_version = await self.update_node(
                    node_id=osm_id,
                    version=element_data['version'],
                    lat=element_data['lat'],
                    lon=element_data['lon'],
                    tags=tags,
                    changeset_id=changeset_id
                )
            elif osm_type == 'way':
                new_version = await self.update_way(
                    way_id=osm_id,
                    version=element_data['version'],
                    nodes=element_data['nodes'],
                    tags=tags,
                    changeset_id=changeset_id
                )

            await self.close_changeset(changeset_id)

            return {
                'osm_id': osm_id,
                'osm_type': osm_type,
                'new_version': new_version,
                'changeset_id': changeset_id,
                'check_date': tags['check_date']
            }
        except Exception as e:
            await self.close_changeset(changeset_id)
            raise e

