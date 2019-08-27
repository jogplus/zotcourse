"""Zotcourse Controller

Provides all of the endpoints.
Currently requires Redis and GCP Datastore account if
USE_MEMCACHE and USE_DATASTORE are enabled respectively
"""
from __future__ import absolute_import
from datetime import datetime
import ast
import os
import flask
import redis
from google.cloud import datastore
from zotcourse import app, websoc

# Time (seconds) until cache will expire for form and listing
FORM_EXPIRE_TIME = 60 * 60 * 24
LISTING_EXPIRE_TIME = 60 * 60

USE_MEMCACHE = os.environ.get('USE_MEMCACHE', 'false') == 'true'
USE_DATASTORE = os.environ.get('USE_DATASTORE', 'false') == 'true'
if USE_MEMCACHE:
    REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
    REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', None)
    REDIS_CLIENT = redis.StrictRedis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD)
if USE_DATASTORE:
    DATASTORE_CLIENT = datastore.Client()

# If new event attribute is added, it must be added here as well
VALID_PARAMS = ('id', 'groupId', 'title', 'start', 'end', 'color', 'location', 'fullName', \
    'instructor', 'final', 'dow', 'daysOfTheWeek', 'units', 'courseTimes', 'eventType')

def redis_wrapper_get(key):
    if USE_MEMCACHE:
        return REDIS_CLIENT.get(key)

def redis_wrapper_set(key, value, time):
    if USE_MEMCACHE:
        REDIS_CLIENT.set(key, value)
        REDIS_CLIENT.expire(key, time)

def datastore_get(key):
    if USE_DATASTORE:
        key = DATASTORE_CLIENT.key('Schedule', key)
        result = DATASTORE_CLIENT.get(key)
        return result

def datastore_set(key, data):
    if USE_DATASTORE:
        key = DATASTORE_CLIENT.key('Schedule', key)
        entity = datastore.Entity(key=key)
        entity.update({
            'data': data,
            'modified_at': datetime.now(),
        })
        DATASTORE_CLIENT.put(entity)

@app.route('/')
def index():
    form_info = redis_wrapper_get('form')
    if form_info:
        form_info = websoc.FormInfo(ast.literal_eval(form_info.decode('utf-8')))
    if not form_info:
        form_info = websoc.FormInfo()
        redis_wrapper_set('form', str(dict(form_info)), FORM_EXPIRE_TIME)
    return flask.render_template('index.html', default_term=form_info.default_term)

@app.route('/websoc/search', methods=['GET'])
def websoc_search_form():
    form_info = redis_wrapper_get('form')
    if form_info:
        form_info = websoc.FormInfo(ast.literal_eval(form_info.decode('utf-8')))
    if not form_info:
        form_info = websoc.FormInfo()
        redis_wrapper_set('form', str(dict(form_info)), FORM_EXPIRE_TIME)
    return flask.render_template('websoc/search.html', terms=form_info.terms, \
    general_eds=form_info.general_eds, departments=form_info.departments)

@app.route('/websoc/listing', methods=['GET'])
def websoc_search():
    key = str(flask.request.query_string, 'utf-8')
    listing_html = redis_wrapper_get(key)
    if not listing_html:
        listing_html = websoc.get_listing(key)
        redis_wrapper_set(key, listing_html, LISTING_EXPIRE_TIME)
    else:
        listing_html = listing_html.decode()
    return flask.render_template('websoc/listing.html', listing=listing_html)

@app.route('/schedules/add', methods=['POST'])
def save_schedule():
    username = flask.request.form.get('username')
    data = flask.request.form.get('data')
    try:
        parsed_data = ast.literal_eval(data)
        for c in parsed_data:
            # Ensures that no extra parameters are being added
            if list(filter(lambda p: p in VALID_PARAMS, c)) != list(c.keys()):
                raise AttributeError
            # Ensures that each value is not too large
            for v in c.values():
                if len(str(v)) > 500:
                    raise ValueError
        datastore_set(username, data)
        return flask.jsonify(success=True)
    except Exception as error:
        return flask.jsonify(success=False, error=error)

@app.route('/schedule/load')
def load_schedule():
    username = flask.request.args.get('username')
    schedule = datastore_get(username)
    if schedule:
        return flask.jsonify(success=True, data=schedule['data'])
    return flask.jsonify(success=False)

@app.route('/schedule/loadap')
def load_ap_schedule():
    username = flask.request.args.get('username')
    schedule_json = websoc.get_backup_from_antplanner(username)
    if schedule_json:
        return flask.jsonify(schedule_json)
    return flask.jsonify(success=False)
