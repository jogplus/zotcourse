from zotcourse import app, websoc
import flask
# from google.appengine.api import memcache
# from google.appengine.ext import db
# import logging
import ast
import os

# LOG = logging.getLogger(__name__)
# dev_mode = env.get('SERVER_SOFTWARE', '').startswith('Development')
use_memcache = os.environ.get('USE_MEMCACHE', 'false') == 'true'
# If new event attribute is added, it must be added here as well
valid_params = ('id', 'groupId', 'title', 'start', 'end','color','location', 'fullName', 'instructor', 'final','dow', 'daysOfTheWeek', 'units', 'courseTimes', 'eventType')

@app.route('/')
def index():
    # index_html = memcache.get('index')
    # if not index_html:
    #     form_info = memcache.get('search')
    #     if form_info:
    #         form_info = eval(form_info)
    #     if not form_info:
    form_info = websoc.get_form_info()
    #         memcache.add('search', str(form_info), 60 * 60 * 24)
    #     index_html = render_template('index.html', term=form_info['default_term'])
    #     memcache.add('index', index_html, 60 * 60 * 24)
    index_html = flask.render_template('index.html', term=form_info['default_term'])
    return index_html


@app.route('/websoc/search', methods=['GET'])
def websoc_search_form():
    # form_info = memcache.get('search')
    # if form_info:
    #     form_info = eval(form_info)
    # if not form_info:
    form_info = websoc.get_form_info()
        # memcache.add('search', str(form_info), 60 * 60 * 24)
    return flask.render_template('websoc/search.html', term=form_info['term'], general_ed=form_info['general_ed'], department=form_info['department'])


@app.route('/websoc/listing', methods=['GET'])
def websoc_search():
    key = str(flask.request.query_string)
    # listing_html = memcache.get(key)
    # if not listing_html:
    listing_html = websoc.get_listing(flask.request.query_string)
        # if use_memcache:
        #     memcache.add(key, listing_html, 60 * 60)
    return flask.render_template('websoc/listing.html', listing=listing_html)


@app.route('/schedules/add', methods=['POST'])
def save_schedule():
    username = flask.request.form.get('username')
    data = flask.request.form.get('data')
    try:
        parsed_data = ast.literal_eval(data)
        for c in parsed_data:
            # Ensures that no extra parameters are being added
            if filter(lambda p: p in valid_params, c) != c.keys():
                raise AttributeError
            # Ensures that each value is not too large
            for v in c.values():
                if len(str(v)) > 500:
                    raise ValueError
        # Schedule(key_name=username, data=data).put()
        return flask.jsonify(success=True)
    except Exception as e:
        return flask.jsonify(success=False)


@app.route('/schedule/load')
def load_schedule():
    username = flask.request.args.get('username')
    # schedule = Schedule.get_by_key_name(username)
    # if schedule:
    #     return jsonify(success=True, data=schedule.data)
    return flask.jsonify(success=False)

@app.route('/schedule/loadap')
def load_ap_schedule():
    username = flask.request.args.get('username')
    schedule_json = websoc.get_backup_from_antplanner(username)
    if schedule_json:
        return flask.jsonify(schedule_json)
    return flask.jsonify(success=False)


# @app.route('/test')
# def qunit():
#     return render_template('test.html')

#
# Jinja2 globals
#
# app.jinja_env.globals['dev_mode'] = dev_mode


#
# Models
#
# class Schedule(db.Model):
#     data = db.TextProperty(required=True)
#     modified_at = db.DateProperty(required=True, auto_now=True)
