"""Zotcourse Controller

Provides all of the endpoints.
Currently requires GCP Datastore
"""
import flask
import requests
from lxml import etree
from zotcourse import course, enrollment, models, util
from zotcourse.config import Config as config

local_search_cache = dict()
local_catalogue_cache = dict()
local_form_cache = None
app = flask.Flask(__name__)


@app.route("/")
def index():
    global local_form_cache
    if not local_form_cache:
        form_info = util.datastore_get("Form", "form", config.IGNORE_TIME)
        local_form_cache = models.SearchForm.parse_raw(form_info.get("data"))
    return flask.render_template(
        "index.html",
        terms=local_form_cache.terms,
        general_eds=local_form_cache.general_eds,
        departments=local_form_cache.departments,
    )


@app.route("/schedules/add", methods=["POST"])
def save_schedule():
    try:
        schedule = models.Schedule.parse_obj(flask.request.json)
        data = models.DataWrapper(data=schedule.data).dict()
        util.datastore_set("Schedule", schedule.username, data)
        return flask.jsonify(success=True)
    except Exception:
        return flask.jsonify(success=False, error="Schedule not saved"), 400


@app.route("/schedule/load")
def load_schedule():
    username = flask.request.args.get("username")
    schedule = util.datastore_get("Schedule", username)
    if schedule:
        data = schedule["data"]
        # Handle old format of saved schedules
        if isinstance(data, str):
            return flask.jsonify(success=True, data=data)
        # Handle new format of saved schedules
        else:
            return flask.jsonify(success=True, data=data.get("data"))
    return flask.jsonify(success=False, error="Schedule not found"), 400


@app.route("/search")
def search():
    global local_search_cache
    try:
        search_key = str(flask.request.query_string, "utf-8")
        if not search_key:
            return util.create_compressed_response(models.DataWrapper(data=[]).json())
        if search_key in local_search_cache:
            enrollment_data = enrollment.get_enrollment_info(
                flask.request.args.to_dict(), local_search_cache[search_key]
            )
            return util.create_compressed_response(enrollment_data.json())

        datastore_cache = util.datastore_get(
            "Listing", search_key, time=config.LISTING_EXPIRE_TIME
        )
        if datastore_cache:
            print("USING SAVED")
            saved_listing = models.DataWrapper.parse_raw(datastore_cache.get("data"))
            local_search_cache[search_key] = saved_listing
            enrollment_data = enrollment.get_enrollment_info(
                flask.request.args.to_dict(), saved_listing
            )
            return util.create_compressed_response(enrollment_data.json())

        course_data = course.CourseData()
        data = course_data.get_all_courses(flask.request.args.to_dict())
        local_search_cache[search_key] = data
        util.datastore_set("Listing", search_key, data.json())
        return util.create_compressed_response(data.json())
    except util.WebsocRateLimitError:
        # Try again with cached results
        datastore_cache = util.datastore_get(
            "Listing", search_key, time=config.IGNORE_TIME
        )
        if datastore_cache:
            print("BLOCKED, USING SAVED")
            saved_listing = models.DataWrapper.parse_raw(datastore_cache.get("data"))
            local_search_cache[search_key] = saved_listing
            return util.create_compressed_response(saved_listing.json())
        return flask.jsonify(success=False, error="Websoc Rate Limit Error"), 429


@app.route("/catalogue")
def catalogue():
    query = flask.request.args.get("q")
    if query not in local_catalogue_cache:
        params = {"page": "getcourse.rjs", "code": query.upper()}
        data = requests.get(
            "http://catalogue.uci.edu/ribbit/index.cgi", params=params
        ).content
        course_info = etree.XML(data).find("course")
        local_catalogue_cache[query] = course_info
    else:
        course_info = local_catalogue_cache[query]
    if course_info is not None:
        return util.create_compressed_response(course_info.text.replace("\n", ""))
    else:
        return flask.jsonify(success=False, error="Catalogue not found"), 404
