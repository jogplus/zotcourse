"""Zotcourse Controller

Provides all of the endpoints.
Currently requires Redis and GCP Datastore account if
USE_MEMCACHE and USE_DATASTORE are enabled respectively
"""
from __future__ import absolute_import
from datetime import datetime, timedelta, timezone
import ast
import os
import re
import urllib
import flask
from google.cloud import datastore
from zotcourse import app, websoc

# Time (seconds) until cache will expire for form and listing
FORM_EXPIRE_TIME = 60 * 60 * 24
LISTING_EXPIRE_TIME = 60 * 60

USE_MEMCACHE = os.environ.get('USE_MEMCACHE', 'false').upper() == 'TRUE'
USE_DATASTORE = os.environ.get('USE_DATASTORE', 'false').upper() == 'TRUE'

if USE_DATASTORE or USE_MEMCACHE:
    DATASTORE_CLIENT = datastore.Client()

# If new event attribute is added, it must be added here as well
VALID_PARAMS = ('id', 'groupId', 'title', 'start', 'end', 'color', 'location', 'fullName', \
    'instructor', 'final', 'dow', 'daysOfTheWeek', 'units', 'courseTimes', 'eventType')

def listing_get(key, time):
    if USE_MEMCACHE:
        key = DATASTORE_CLIENT.key('Listing', key)
        result = DATASTORE_CLIENT.get(key)
        if result and isinstance(result['modified_at'], str):
            parsed_time = datetime.fromisoformat(result['modified_at'])
        # If cached listing has passed expiration, fetch new listing
        if not result or parsed_time + timedelta(seconds=time) < datetime.now(timezone.utc):
            return None
        return result

def listing_set(key, data):
    if USE_MEMCACHE:
        key = DATASTORE_CLIENT.key('Listing', key)
        # Must `exclude_from_indexes` in order to allow values > 150 characters
        entity = datastore.Entity(key=key, exclude_from_indexes=['data'])
        entity.update({
            'data': data,
            'modified_at': datetime.now(timezone.utc).isoformat(),
        })
        DATASTORE_CLIENT.put(entity)

def schedule_get(key):
    if USE_DATASTORE:
        key = DATASTORE_CLIENT.key('Schedule', key)
        result = DATASTORE_CLIENT.get(key)
        return result

def schedule_set(key, data):
    if USE_DATASTORE:
        key = DATASTORE_CLIENT.key('Schedule', key)
        # Must `exclude_from_indexes` in order to allow values > 150 characters
        entity = datastore.Entity(key=key, exclude_from_indexes=['data'])
        entity.update({
            'data': data,
            'modified_at': datetime.now(),
        })
        DATASTORE_CLIENT.put(entity)

@app.route('/')
def index():
    form_info = listing_get('form', FORM_EXPIRE_TIME)
    # Checks if valid cached search form, if not fetches new search form
    if form_info:
        form_info = websoc.FormInfo(ast.literal_eval(form_info['data']))
    if not form_info:
        form_info = websoc.FormInfo()
        listing_set('form', str(dict(form_info)))
    return flask.render_template('index.html', default_term=form_info.default_term)

@app.route('/websoc/search', methods=['GET'])
def websoc_search_form():
    form_info = listing_get('form', FORM_EXPIRE_TIME)
    # Checks if valid cached search form, if not fetches new search form
    if form_info:
        form_info = websoc.FormInfo(ast.literal_eval(form_info['data']))
    if not form_info:
        form_info = websoc.FormInfo()
        listing_set('form', str(dict(form_info)))
    return flask.render_template('websoc/search.html', terms=form_info.terms, \
    general_eds=form_info.general_eds, departments=form_info.departments)

@app.route('/websoc/listing', methods=['GET'])
def websoc_search():
    listing_html = str()
    # If query includes `CourseCodes`, break up request into groups of 10 `CourseCodes`
    # This is to bypass Websoc limitation of 10 `CourseCodes` per request
    # `CourseCodes` queries are not cached
    if flask.request.args.get('CourseCodes') and flask.request.args.get('CourseCodes') != '':
        args = flask.request.args.copy()
        course_codes = args.get('CourseCodes').strip(',').split(',')
        if len(course_codes) > 10:
            grouped_course_codes = [course_codes[n:n+10] for n in range(0, len(course_codes), 10)]
            for group in grouped_course_codes:
                seperator = ','
                args['CourseCodes'] = seperator.join(group)
                key = urllib.parse.urlencode(args)
                # Appends group of 10 `CourseCodes` to listing
                listing_html += websoc.get_listing(key)
        else:
            key = urllib.parse.urlencode(args)
            listing_html += websoc.get_listing(key)
    # Forces hard refresh for listing
    elif flask.request.args.get('Units') == '-1':
        args = flask.request.args.copy()
        args['Units'] = ''
        key = urllib.parse.urlencode(args)
        listing_html = websoc.get_listing(key)
        listing_set(key, listing_html)
    # Checks if valid cached listing, if not fetches new listing
    else:
        key = str(flask.request.query_string, 'utf-8')
        listing_html = listing_get(key, LISTING_EXPIRE_TIME)
        if not listing_html:
            listing_html = websoc.get_listing(key)
            listing_set(key, listing_html)
        else:
            listing_html = listing_html['data']
    return flask.render_template('websoc/listing.html', listing=listing_html)

@app.route('/schedules/add', methods=['POST'])
def save_schedule():
    username = flask.request.form.get('username')
    data = flask.request.form.get('data')
    try:
        parsed_data = ast.literal_eval(data)
        # Maximum of 50 courses can be assigned to one schedule
        if len(parsed_data) > 50:
            raise ValueError
        for c in parsed_data:
            # Ensures that no extra parameters are being added
            if list(filter(lambda p: p in VALID_PARAMS, c)) != list(c.keys()):
                raise AttributeError
            for value in [str(v) for v in c.values()]:
                # Ensures that each value is not too large
                if len(str(value)) > 500:
                    raise ValueError
                # Ensures that no malicious javascript is injected
                if 'javascript' in value or 'onclick' in value or re.search('<\s*script', value):
                    raise ValueError
                # Ensures that no malicious links are included
                links = re.findall('href\s*=\s*"\s*(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)', value)
                for match in links:
                    if match != 'classrooms.uci.edu':
                        raise ValueError
        schedule_set(username, data)
        return flask.jsonify(success=True)
    except Exception as error:
        return flask.jsonify(success=False, error=repr(error)), 400

@app.route('/schedule/load')
def load_schedule():
    username = flask.request.args.get('username')
    schedule = schedule_get(username)
    if schedule:
        return flask.jsonify(success=True, data=schedule['data'])
    return flask.jsonify(success=False, error='Schedule not found'), 400

@app.route('/schedule/loadap')
def load_ap_schedule():
    username = flask.request.args.get('username')
    schedule_json = websoc.get_backup_from_antplanner(username)
    if schedule_json:
        return flask.jsonify(schedule_json)
    return flask.jsonify(success=False, error='Schedule not found on Antplanner'), 400
