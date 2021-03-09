"""Zotcourse Update Rating Cache

The following function is used as a GCP Cloud Function to update the
ratings that are saved in the cache.

It is triggered by a Cloud Scheduler.
"""
import config
from google.cloud import datastore
from datetime import datetime, timedelta, timezone
from models import Caches, GradeCache

IGNORE_TIME = -1


def datastore_set(kind, key, data):
    if data:
        datastore_client = datastore.Client()
        key = datastore_client.key(kind, key)
        # Must `exclude_from_indexes` in order to allow values > 150 characters
        entity = datastore.Entity(key=key, exclude_from_indexes=["data"])
        entity.update(
            {
                "data": data,
                "modified_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        datastore_client.put(entity)


def datastore_get(kind, key, time=IGNORE_TIME):
    datastore_client = datastore.Client()
    key = datastore_client.key(kind, key)
    result = datastore_client.get(key)
    parsed_time = datetime.now(timezone.utc)
    if result and isinstance(result["modified_at"], str):
        parsed_time = datetime.fromisoformat(result["modified_at"])
    # If cached listing has passed expiration, fetch new listing
    if (not result) or (
        parsed_time + timedelta(seconds=time) < datetime.now(timezone.utc)
        and time != IGNORE_TIME
    ):
        return None
    return result


def update_rating_cache(request):
    caches = datastore_get("Cache", "caches")
    caches = Caches.parse_raw(caches["data"])

    ratings = config.get_ratings()

    # Check to make sure not overwriting with bad data
    if len(ratings) > 100:
        new_caches = Caches(
            grade_cache=GradeCache(),
            rating_cache=ratings,
        )
        datastore_set("Cache", "caches", new_caches.json())
