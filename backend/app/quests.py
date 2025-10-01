"""Quest system logic for FourMore."""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from .database_models import QuestResponse

logger = logging.getLogger(__name__)

# Path to quests directory
QUESTS_DIR = Path(__file__).parent / "quests"


class QuestDefinition:
    """Represents a quest definition loaded from a JSON file."""

    def __init__(self, quest_id: str, data: Dict[str, Any]):
        self.id: str = quest_id  # Derived from filename
        self.question: str = data["question"]
        self.applies_to: Dict[str, Any] = data["applies_to"]
        self.condition: Dict[str, Any] = data.get("condition", {})
        self.answers: Dict[str, Dict[str, str]] = data["answers"]

    def matches_poi_class(self, poi_class: str) -> bool:
        """Check if quest applies to the given POI class."""
        poi_classes = self.applies_to.get("poi_classes", [])
        return poi_class in poi_classes

    def matches_required_tags(self, tags: Dict[str, Any]) -> bool:
        """Check if POI has all required tags with correct values."""
        required_tags = self.applies_to.get("required_tags", {})
        # If no required tags specified, match all
        if not required_tags:
            return True
        # Check all required tags match
        for key, value in required_tags.items():
            if tags.get(key) != value:
                return False
        return True

    def meets_condition(self, tags: Dict[str, Any]) -> bool:
        """Check if POI meets the quest condition."""
        if not self.condition:
            return True

        # Handle tag_must_not_exist condition
        if "tag_must_not_exist" in self.condition:
            tag_key = self.condition["tag_must_not_exist"]
            return tag_key not in tags

        # Add more condition types here as needed
        return True

    def get_tags_for_answer(self, answer: str) -> Dict[str, str]:
        """Get the OSM tags to apply for a given answer."""
        return self.answers.get(answer, {})


def load_quest_definitions() -> List[QuestDefinition]:
    """Load all quest definitions from JSON files in quests directory."""
    quests = []

    try:
        if not QUESTS_DIR.exists():
            logger.warning(f"Quests directory not found: {QUESTS_DIR}")
            return []

        # Load all .json files from quests directory
        for quest_file in QUESTS_DIR.glob("*.json"):
            try:
                # Use filename (without .json) as quest ID
                quest_id = quest_file.stem

                with open(quest_file, "r") as f:
                    data = json.load(f)
                    quest = QuestDefinition(quest_id, data)
                    quests.append(quest)
                    logger.debug(f"Loaded quest: {quest_id}")
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing quest file {quest_file}: {e}")
            except KeyError as e:
                logger.error(f"Missing required field in quest file {quest_file}: {e}")
            except Exception as e:
                logger.error(f"Error loading quest file {quest_file}: {e}")

        logger.info(f"Loaded {len(quests)} quest definitions")
        return quests

    except Exception as e:
        logger.error(f"Error loading quest definitions: {e}")
        return []


def get_quest_by_id(quest_id: str) -> Optional[QuestDefinition]:
    """Get a specific quest definition by ID."""
    all_quests = load_quest_definitions()
    for quest in all_quests:
        if quest.id == quest_id:
            return quest
    return None


def get_applicable_quests(
    poi_osm_type: str,
    poi_osm_id: int,
    poi_class: str,
    osm_tags: Dict[str, Any],
    db: Session,
    max_quests: int = 3
) -> List[QuestDefinition]:
    """
    Get up to max_quests applicable quests for a POI.

    Args:
        poi_osm_type: OSM type ('N' or 'W')
        poi_osm_id: OSM ID
        poi_class: POI class from database (e.g., 'transport')
        osm_tags: Current OSM tags from OSM API (fresh data)
        db: Database session
        max_quests: Maximum number of quests to return (default 3)

    Returns:
        List of applicable QuestDefinition objects
    """
    # Load all quest definitions
    all_quests = load_quest_definitions()

    # Filter quests
    applicable_quests = []

    for quest in all_quests:
        # Check if quest applies to POI class
        if not quest.matches_poi_class(poi_class):
            continue

        # Check if POI has required tags
        if not quest.matches_required_tags(osm_tags):
            continue

        # Check if condition is met
        if not quest.meets_condition(osm_tags):
            continue

        # Check if quest was already answered for this POI
        existing_response = db.query(QuestResponse).filter(
            QuestResponse.poi_osm_type == poi_osm_type,
            QuestResponse.poi_osm_id == poi_osm_id,
            QuestResponse.quest_id == quest.id
        ).first()

        if existing_response:
            continue

        # Quest is applicable
        applicable_quests.append(quest)

        # Stop if we have enough quests
        if len(applicable_quests) >= max_quests:
            break

    return applicable_quests
