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

1. Create and activate your python virtual env
    ```
    $ python3 -m venv env
    $ source env/bin/activate
    ```
2. Navigate to the root of the zotcourse folder, and run the following:
    ```
    $ pip3 install -r requirements.txt
    ```
3. While still in the root of the zotcourse folder run the following to start the server locally:
    ```
    $ export FLASK_APP=main.py
    $ flask run
    ```
4. If debugging using VS Code:
    * Copy `launch.json` into your `.vscode` folder
    * Fill in `env_variables`
5. If deploying to App Engine on GCP:
    * Create a new Google Cloud Platform project and App Engine application using the GCP Console
    * Download and install the [Cloud SDK](https://cloud.google.com/appengine/docs/standard/python/download) (Make sure it is added to your PATH)
    * Rename `sample.app.yaml` to `app.yaml`
    * Fill in `env_variables`
6. If you are looking to see how this project works, the main files of interest are:
    ```
    zotcourse/static/js/zotcourse.js
    zotcourse/controller.py
    zotcourse/websoc.py
    ```

## License

GNU General Public License v3.0

See LICENSE for the full text.
