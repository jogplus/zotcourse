import requests
from bs4 import BeautifulSoup
import urllib
# import logging
import json
import re
from datetime import datetime, timedelta

# LOG = logging.getLogger(__name__)

def get_form_info():
    form_info = dict()
    html = requests.get("http://websoc.reg.uci.edu").content
    parsed_html = BeautifulSoup(html, 'html.parser')
    # Parses for term info
    term = parsed_html.find('select', {"name":"YearTerm"}).find_all('option')
    form_info['default_term'] = term[0]['value']
    # Temporary hotfix to have default_term to be default selected item
    for t in term:
        if t.has_attr('selected'):
            form_info['default_term'] = t['value']
    form_info['term'] = term
    # Parses for GE info
    general_ed = parsed_html.find('select', {"name":"Breadth"}).find_all('option')
    form_info['general_ed'] = general_ed
    # Parses for department info
    dept = parsed_html.find('select', {"name":"Dept"}).find_all('option')
    form_info['department'] = dept
    return form_info

def get_listing(form_data):
    html = requests.get("https://www.reg.uci.edu/perl/WebSoc?"+str(form_data, 'utf-8')).content
    listing = BeautifulSoup(html, 'html.parser')
    course_list = listing.find('div', 'course-list')
    if course_list:
        return course_list.decode()
    else:
        # We come here if course-list was not found
        return listing.decode()

def get_backup_from_antplanner(username):
    raw = requests.get("https://antplanner.appspot.com/schedule/load?username="+urllib.parse.quote(username)).content
    # Catch for when Antplanner returns 500
    try:
        clean = json.loads(raw)
    except ValueError:
        return {'success':False}
    # Stop parsing of schedule name not found
    if (clean['success'] == False):
        return clean
    clean_data = json.loads(clean['data'])
    clean_without_duplicates = []
    added_groupIds = []
    for event_num in range(len(clean_data)):
        if clean_data[event_num]['groupId'] not in added_groupIds:
            # Creates a list of unique Days of the Week a class meets
            sevenHourDiff = timedelta(seconds=25200)
            clean_data[event_num]['dow'] = [(datetime.strptime(course['start'], '%Y-%m-%dT%H:%M:%S.%fZ') - sevenHourDiff).weekday()+1 \
                                            for course in clean_data if course['groupId'] == clean_data[event_num]['groupId']]
            clean_data[event_num]['daysOfTheWeek'] = clean_data[event_num]['dow']

            # Converts UTC time to PDT
            start = datetime.strptime(clean_data[event_num]['start'], '%Y-%m-%dT%H:%M:%S.%fZ') - sevenHourDiff
            end = datetime.strptime(clean_data[event_num]['end'], '%Y-%m-%dT%H:%M:%S.%fZ') - sevenHourDiff
            clean_data[event_num]['start'] = start.strftime('%H:%M')
            clean_data[event_num]['end'] = end.strftime('%H:%M')

            # Note that information is not available due to import
            clean_data[event_num]['instructor'] = ['N/A (due to import)']
            clean_data[event_num]['final'] = 'N/A (due to import)'

            # Adds groupId (Course code) to list to prevent it from being readded
            added_groupIds.append(clean_data[event_num]['groupId'])
            clean_without_duplicates.append(clean_data[event_num])
    clean['data'] = clean_without_duplicates
    return clean
