import requests
import gzip
import flask
import string
import random
from zotcourse.config import Config as config
from google.cloud import datastore
from datetime import datetime, timedelta, timezone


datastore_client = datastore.Client()


class WebsocRateLimitError(Exception):
    pass


def clean_name(name):
    return name.translate(str.maketrans("", "", string.punctuation)).upper()


def find_and_get(element, attribute):
    return getattr(element.find(attribute), "text", None)


def flatten(saved_listing):
    section_dict = {}
    for departments in saved_listing.data:
        for courses in departments.courses:
            for section in courses.sections:
                section_dict[section.code] = section
    return section_dict


def get_websoc_request(req_args=None, full_request=False):
    headers = {
        "User-Agent": f"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.{random.randrange(99)} (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36"
    }
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

    result = requests.get(config.WEBSOC_BASE_URL, params=params, headers=headers)
    if not result.content:
        raise WebsocRateLimitError
    return result.content


def split_codes(req_args):
    codes = req_args.get("CourseCodes").split(",")
    return [
        ",".join(codes[i : i + config.COURSE_CODE_LIMIT])
        for i in range(0, len(codes), config.COURSE_CODE_LIMIT)
    ]


def datastore_get(kind, key, time=config.IGNORE_TIME):
    key = datastore_client.key(kind, key)
    result = datastore_client.get(key)
    parsed_time = datetime.now(timezone.utc)
    if result and isinstance(result["modified_at"], str):
        parsed_time = datetime.fromisoformat(result["modified_at"])
    # If cached listing has passed expiration, fetch new listing
    if (not result) or (
        parsed_time + timedelta(seconds=time) < datetime.now(timezone.utc)
        and time != config.IGNORE_TIME
    ):
        return None
    return result


def datastore_set(kind, key, data):
    if data:
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


def validate_enrollment(sec_enrollment, course):
    # Handles case where websoc uses course code as waitlist count
    waitlist_count = find_and_get(sec_enrollment, "sec_waitlist")
    if waitlist_count != course.code:
        course.wtlt = waitlist_count
        course.wt_cp = find_and_get(sec_enrollment, "sec_wait_cap")
    new_only_count = find_and_get(sec_enrollment, "sec_new_only_reserved")
    if new_only_count != course.code:
        course.nor = new_only_count


def create_compressed_response(data):
    compressed_data = gzip.compress(data.encode("utf8"))
    response = flask.make_response(compressed_data)
    response.headers["Content-length"] = len(compressed_data)
    response.headers["Content-Encoding"] = "gzip"
    return response
