# Zotcourse - Schedule Planner for UCI

by Tristan Jogminas

Quickly plan and create your next quarter's schedule using Zotcourse!

Home Page            |  Listing Page
:-------------------------:|:-------------------------:
![Home Screenshot](https://i.imgur.com/vbosvLz.png) |  ![Listing Screenshot](https://i.imgur.com/l5SUQys.png)

## Features

* ### Powerful Search Results
    * Integrated instructor's RMP rating
    * Integrated instructor's grade distributions
        * Average grade distribution over all courses with this instructor
        * Average grade distribution over all courses with this instructor and course (if instructor has taught this course before)
        * Most recent grade distribution from this instructor and course (if instructor has taught this course before)
    * Sort search results by any column
        * Can also sort by two columns (ie. Clicking Status first and then Rating finds the highest rating for courses that are still open)
    * Direct links to the instructor's RMP page
    * Direct links to the instructor's EaterEvals
    * View all your added courses' info using the List button
    * Integrated course description, prerequisites, and restrictions
    * Hide/show columns (Useful on mobile to reduce horizontal scrolling)
    * Click course code to quickly copy to clipboard
    * Live enrollment information
* ### Customizable Calendar
    * Click on an event for additional course information
    * Quickly view your finals calendar
    * Load and backup different versions of your schedule
    * Create custom calendar events
    * Change course event color
    * Keeps track of how many units you have added
    * Resize size the size of your calendar and search results
    * Export your calendar to .ics for easy import into Google Calendar
    * Easily print your calendar


## How to run locally for testing

1. Create and activate your python virtual env
    ```
    $ python3 -m venv env
    $ source env/bin/activate
    ```
2. Navigate to the root of the zotcourse folder, and install the project dependencies:
    ```
    $ cd zotcourse
    $ pip3 install -r requirements.txt
    ```
3. Create a duplicate of the sample config and fill in the values:
    ```
    $ cp config.sample.py config.py
    ```
3. [Setup a GCP service account that has access to Datastore.](https://cloud.google.com/docs/authentication/getting-started)
3. While still in the root of the zotcourse folder run the following to start the server locally:
    ```
    $ export FLASK_APP=main.py
    $ export GOOGLE_APPLICATION_CREDENTIALS={your GCP service account key json}
    $ flask run
    ```
5. If deploying to App Engine on GCP:
    * Create a new Google Cloud Platform project and App Engine application using the GCP Console
    * Download and install the [Cloud SDK](https://cloud.google.com/appengine/docs/standard/python/download) (Make sure it is added to your PATH)
    * Rename `sample.app.yaml` to `app.yaml`
    * Deploy Cloud Functions under `/cloud_functions` and set them to run automatically using Cloud Scheduler
6. If you are looking to see how this project works, the main files of interest are:
    ```
    zotcourse/static/js/zotcourse.js
    zotcourse/views.py
    zotcourse/course.py
    ```

## License

GNU General Public License v3.0

See LICENSE for the full text.
