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
form_info_cache = None
app = flask.Flask(__name__)


@app.route("/")
def index():
    global form_info_cache
    if not form_info_cache:
        form_info = util.datastore_get("Form", "form", config.IGNORE_TIME)
        form_info_cache = models.SearchForm.parse_raw(form_info.get("data"))
    return flask.render_template(
        "index.html",
        terms=form_info_cache.terms,
        general_eds=form_info_cache.general_eds,
        departments=form_info_cache.departments,
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
    search_key = str(flask.request.query_string, "utf-8")
    if not search_key:
        return util.create_compressed_response(models.DataWrapper(data=[]).json())
    if search_key in local_search_cache:
        enrollment_data = enrollment.get_enrollment_info(
            flask.request.args.to_dict(), local_search_cache[search_key]
        )
        return util.create_compressed_response(enrollment_data.json())

    datastore_cache = util.datastore_get(
        "Listing_b", search_key, time=config.LISTING_EXPIRE_TIME
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
    util.datastore_set("Listing_b", search_key, data.json())
    return util.create_compressed_response(data.json())


@app.route("/catalogue")
def catalogue():
    query = flask.request.args.get("q")
    params = {"page": "getcourse.rjs", "code": query.upper()}
    data = requests.get(
        "http://catalogue.uci.edu/ribbit/index.cgi", params=params
    ).content
    tree = etree.XML(data)
    return util.create_compressed_response(tree.find("course").text.replace("\n", ""))
