"""Zotcourse Update Listing Cache

The following function is used as a GCP Cloud Function to update the
listings that are saved in the cache.

It is triggered by a Cloud Scheduler.
"""
import requests
from google.cloud import datastore
from datetime import datetime, timedelta, timezone
from bs4 import BeautifulSoup
from models import SearchForm


ZOTCOURSE_BASE_URL = "http://127.0.0.1:5000"
WEBSOC_BASE_URL = "https://www.reg.uci.edu/perl/WebSoc/"
FORM_EXPIRE_TIME = 60 * 60 * 6
IGNORE_TIME = -1


def get_websoc_request(req_args=None, full_request=False):
    headers = {"User-Agent": "Mozilla/5.0"}
    params = dict()
    if req_args:
        params["YearTerm"] = req_args.get("YearTerm")
        params["Breadth"] = req_args.get("Breadth")
        params["Dept"] = req_args.get("Dept")
        params["CourseCodes"] = req_args.get("CourseCodes")
        params["CourseNum"] = req_args.get("CourseNum")
        params["Division"] = req_args.get("Division")
        params["InstrName"] = req_args.get("InstrName")
        params["CourseTitle"] = req_args.get("CourseTitle")
        params["ClassType"] = req_args.get("ClassType")
        params["Units"] = req_args.get("Units")
        params["Days"] = req_args.get("Days")
        params["StartTime"] = req_args.get("StartTime")
        params["EndTime"] = req_args.get("EndTime")
        params["FullCourses"] = req_args.get("FullCourses")
        params["Submit"] = "XML"
    if full_request:
        params["ShowFinals"] = "on"
        params["ShowComments"] = "on"

    return requests.get(WEBSOC_BASE_URL, params=params, headers=headers).content


def get_search_form():
    request_content = get_websoc_request()
    parsed_html = BeautifulSoup(request_content, "lxml")
    # Parses for term info
    raw_terms = parsed_html.find("select", {"name": "YearTerm"}).find_all("option")
    clean_terms = [line["value"] for line in raw_terms]
    terms = [str(line).replace("\xa0", "") for line in raw_terms]
    # Parses for GE info
    raw_general_ed = parsed_html.find("select", {"name": "Breadth"}).find_all("option")
    clean_general_eds = [line["value"] for line in raw_general_ed]
    general_eds = [str(line).replace("\xa0", "") for line in raw_general_ed]
    # Parses for department info
    raw_departments = parsed_html.find("select", {"name": "Dept"}).find_all("option")
    clean_departments = [line["value"] for line in raw_departments]
    departments = [str(line).replace("\xa0", "") for line in raw_departments]
    return SearchForm(
        terms=terms,
        clean_terms=clean_terms,
        general_eds=general_eds,
        clean_general_eds=clean_general_eds,
        departments=departments,
        clean_departments=clean_departments
    )


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


def update_listing_cache(request):
    form_info = datastore_get("Form", "form", FORM_EXPIRE_TIME)
    if not form_info:
        form_info = get_search_form()
        datastore_set("Form", "form", form_info.json())
    form_info_cache = SearchForm.parse_raw(form_info.get('data'))

    # Splits hour into 10 possible indexes
    mn_idx = datetime.now(timezone.utc).minute // 6
    # Multiply by the total possible indexes of mn_idx
    hr_idx = datetime.now(timezone.utc).hour * 10
    hash_index = ((mn_idx + hr_idx) % len(form_info_cache.clean_departments))
    # Skip over ALL department
    if hash_index == 0:
        return
    params = {
        'YearTerm': form_info_cache.clean_terms[0],
        'Dept': form_info_cache.clean_departments[hash_index],
        'force': True
    }
    try:
        requests.get(f'{ZOTCOURSE_BASE_URL}/search', params=params, timeout=0.001)
    except Exception:
        return


def update_listing_cache_alt(request):
    form_info = datastore_get("Form", "form", FORM_EXPIRE_TIME)
    if not form_info:
        form_info = get_search_form()
        datastore_set("Form", "form", form_info.json())
    form_info_cache = SearchForm.parse_raw(form_info.get('data'))

    for department in form_info_cache.clean_departments:
        if department.strip() == 'ALL':
            continue
        params = {
            'YearTerm': form_info_cache.clean_terms[0],
            'Dept': department,
            'force': True
        }
        try:
            requests.get(f'{ZOTCOURSE_BASE_URL}/search', params=params, timeout=0.001)
        except Exception:
            continue
