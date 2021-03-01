"""Zotcourse Update Form Cache

The following function is used as a GCP Cloud Function to update the
Websoc form that is saved in the cache.

It is triggered by a Cloud Scheduler.
"""
import requests
from google.cloud import datastore
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from models import SearchForm


WEBSOC_BASE_URL = "https://www.reg.uci.edu/perl/WebSoc/"


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
    # Remove default selected quarter
    selected_quarter = parsed_html.find("select", {"name": "YearTerm"}).find_all(attrs={"selected": "selected"})[0]
    # Parses for term info
    raw_terms = parsed_html.find("select", {"name": "YearTerm"}).find_all("option")
    # Pick the first quarter if it's not Summer, otherwise use default selection
    if "Summer" not in raw_terms[0].text:
        if selected_quarter:
            del selected_quarter.attrs["selected"]
        raw_terms[0].attrs["selected"] = "selected"
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
        clean_departments=clean_departments,
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


def update_form_cache(request):
    form_info = get_search_form()
    datastore_set("Form", "form", form_info.json())
