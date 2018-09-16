from google.appengine.api import urlfetch
from bs4 import BeautifulSoup
import urllib
import logging
import json
import re
from datetime import datetime, timedelta

LOG = logging.getLogger(__name__)


def get_search():
    html = urlfetch.fetch("http://websoc.reg.uci.edu").content
    inner = BeautifulSoup(html, 'lxml').find(
        'form',
        action='https://www.reg.uci.edu/perl/WebSoc/').renderContents()
    return unicode(inner, errors='ignore')


def get_listing(form_data):
    encoded = urllib.urlencode(form_data)
    html = urlfetch.fetch(
        "https://www.reg.uci.edu/perl/WebSoc/",
        payload=encoded,
        method=urlfetch.POST,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}).content
    listing = BeautifulSoup(html, 'lxml').find('div', 'course-list')
    if listing:
        return unicode(listing.encode(formatter='html'))
    else:
        # We come here if course-list was not found
        return unicode(BeautifulSoup(html).encode(formatter='html'))

def get_backup_from_antplanner(username):
    raw = urlfetch.fetch("https://antplanner.appspot.com/schedule/load?username="+username).content
    clean = json.loads(raw)
    clean_data = json.loads(clean['data'])
    super_clean = []
    added_groupIds = []
    for event_num in range(len(clean_data)):
        if clean_data[event_num]['groupId'] not in added_groupIds:
            clean_data[event_num]['dow'] = [datetime.strptime(course['start'], '%Y-%m-%dT%H:%M:%S.%fZ').weekday()+1 \
                                            for course in clean_data if course['groupId'] == clean_data[event_num]['groupId']]
            clean_data[event_num]['daysOfTheWeek'] = clean_data[event_num]['dow']
            sevenHourDiff = timedelta(seconds=25200)
            start = datetime.strptime(clean_data[event_num]['start'], '%Y-%m-%dT%H:%M:%S.%fZ') - sevenHourDiff
            end = datetime.strptime(clean_data[event_num]['end'], '%Y-%m-%dT%H:%M:%S.%fZ') - sevenHourDiff
            clean_data[event_num]['start'] = start.strftime('%H:%M')
            clean_data[event_num]['end'] = end.strftime('%H:%M')
            #clean_data[event_num]['title'] = clean_data[event_num]['title'].split(' at ')[0].replace('&amp;', '&')
            added_groupIds.append(clean_data[event_num]['groupId'])
            super_clean.append(clean_data[event_num])
    clean['data'] = super_clean
    return clean
