# Zotcourse - Schedule Planner for UCI

by Tristan Jogminas

This was forked from [Antplanner2](https://github.com/gumho/antplanner2) by Ryan Hsu

Unfortunetly it seems that Antplanner2 is no longer being maintained so I have decided to maintain it here.
Please feel free to make a PR and contribute!

![Zotcourse Screenshot](https://i.imgur.com/JNpvHQX.jpg)

## Benefits over Antplanner

<ul>
<li>Resizable panes.</li>
<li>Calendar adjusts to screen size.</li>
<li>Import schedule from Antplanner.</li> 
<li>Popover for event with additional course information.</li>
<li>Change course event color.</li>
<li>RateMyProfessor links in calendar event and Websoc results.</li>
<li>Cleaner field inputs when saving/loading schedule.</li>
<li>Toastr notifications after saving/loading schedule.</li>
<li>Better print formatting. (Calendar fits entirely on one page!)</li>
<li>View your finals' schedule</li>
<li>Create a custom event</li>
<li>View all your courses' info using the List button</li>
<li>Enrolled unit counter</li>
<li>Complete redesign of search</li>
</ul>

## How to run locally for testing

1. Create a new Google Cloud Platform project and App Engine application using the GCP Console
2. Download and install the [Cloud SDK](https://cloud.google.com/appengine/docs/standard/python/download) (Make sure it is added to your PATH)
3. Run the following command to install the gcloud component that includes the App Engine extension for Python:
    ```
    gcloud components install app-engine-python
    ```
4. Make sure you have ```pip``` and ```virtualenv``` [installed](https://uoa-eresearch.github.io/eresearch-cookbook/recipe/2014/11/26/python-virtual-env/) and activate your virutal environment.
5. Navigate to the root of the zotcourse folder, and run the following:
    ```
    pip install -r requirements.txt
    ```
6. While still in the root of the zotcourse folder run the following to start the server locally:
    ```
    dev_appserver.py app.yaml
    ```
7. If you are using Windows and are having problems starting the server, try replacing `'lxml'` with `'html.parser'` in `zotcourse/websoc.py`
8. If you are looking to see how this project works, the main files of interest are:
    ```
    zotcourse/static/js/zotcourse.js
    zotcourse/views.py
    zotcourse/websoc.py
    ```

## License

GNU General Public License v3.0

See LICENSE for the full text.
