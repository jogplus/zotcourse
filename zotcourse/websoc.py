"""Zotcourse Helper Functions

Provides helper functions for the Zotcourse controller
"""
from __future__ import absolute_import
import urllib
import json
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup

class FormInfo:
    """
    Stores form information from websoc
    Can be constructed from dict and converted into dict
    """
    def __init__(self, dictionary=None):
        if isinstance(dictionary, dict):
            for k, v in dictionary.items():
                setattr(self, k, v)
        else:
            s = requests.Session()
            headers = {
                'User-Agent': 'User-Agent'
            }
            html = s.get("http://websoc.reg.uci.edu1", headers=headers).content
            parsed_html = BeautifulSoup(html, 'lxml')
            # Parses for term info
            term = parsed_html.find('select', {"name":"YearTerm"}).find_all('option')
            # Fix to have default_term to be default selected item
            for t in term:
                if t.has_attr('selected'):
                    self.default_term = t['value']
                    break
            self.terms = [str(line).replace("\xa0", "") for line in term]
            # Parses for GE info
            general_ed = parsed_html.find('select', {"name":"Breadth"}).find_all('option')
            self.general_eds = [str(line).replace("\xa0", "") for line in general_ed]
            # Parses for department info
            dept = parsed_html.find('select', {"name":"Dept"}).find_all('option')
            self.departments = [str(line).replace("\xa0", "") for line in dept]

    def __iter__(self):
        yield 'default_term', self.default_term
        yield 'terms', self.terms
        yield 'general_eds', self.general_eds
        yield 'departments', self.departments

def get_listing(form_data):
    s = requests.Session()
    headers = {
        'User-Agent': 'User-Agent'
    }
    html = s.get("https://www.reg.uci.edu/perl/WebSoc?"+form_data, headers=headers).content
    listing = BeautifulSoup(html, 'lxml')
    course_list = listing.find('div', 'course-list')
    if course_list:
        return course_list.decode()
    return listing.decode()

def get_backup_from_antplanner(username):
    raw = requests.get("https://antplanner.appspot.com/schedule/load?username="+urllib.parse.quote(username)).content
    # Catch for when Antplanner returns 500
    try:
        clean = json.loads(raw)
    except ValueError:
        return {'success':False}
    # Stop parsing of schedule name not found
    if not clean['success']:
        return clean
    clean_data = json.loads(clean['data'])
    clean_without_duplicates = []
    added_group_ids = []
    for event_num, _value in enumerate(clean_data):
        if clean_data[event_num]['groupId'] not in added_group_ids:
            # Creates a list of unique Days of the Week a class meets
            seven_hour_diff = timedelta(seconds=25200)
            clean_data[event_num]['dow'] = [(datetime.strptime(course['start'], '%Y-%m-%dT%H:%M:%S.%fZ') - seven_hour_diff).weekday()+1 \
                                            for course in clean_data if course['groupId'] == clean_data[event_num]['groupId']]
            clean_data[event_num]['daysOfTheWeek'] = clean_data[event_num]['dow']

            # Converts UTC time to PDT
            start = datetime.strptime(clean_data[event_num]['start'], '%Y-%m-%dT%H:%M:%S.%fZ') - seven_hour_diff
            end = datetime.strptime(clean_data[event_num]['end'], '%Y-%m-%dT%H:%M:%S.%fZ') - seven_hour_diff
            clean_data[event_num]['start'] = start.strftime('%H:%M')
            clean_data[event_num]['end'] = end.strftime('%H:%M')

            # Note that information is not available due to import
            clean_data[event_num]['instructor'] = ['N/A (due to import)']
            clean_data[event_num]['final'] = 'N/A (due to import)'

            # Adds groupId (Course code) to list to prevent it from being readded
            added_group_ids.append(clean_data[event_num]['groupId'])
            clean_without_duplicates.append(clean_data[event_num])
    clean['data'] = clean_without_duplicates
    return clean
