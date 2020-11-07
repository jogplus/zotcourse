"""Zotcourse Listing Cache Clear

The following function is used as a GCP Cloud Function to clear past
listings that are saved in the cache from previous quarters or niche
queries in order to prevent build-up over time.

It is triggered by a Cloud Scheduler job everyday at 4:00AM.
"""
from google.cloud import datastore


def clear_listings_cache(request):
    datastore_client = datastore.Client()
    query = datastore_client.query(kind="Listing")
    results = list(query.fetch())
    for listing in results:
        datastore_client.delete(listing.key)
