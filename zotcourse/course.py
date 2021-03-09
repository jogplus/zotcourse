from lxml import etree
import time
import re
from zotcourse import util, grade, rating
from zotcourse.models import (
    Final,
    Meeting,
    Instructor,
    Department,
    Section,
    Course,
    DataWrapper,
    Caches,
)
from bs4 import BeautifulSoup


class CourseData:
    def __init__(self):
        self.time_reg = re.compile(r"(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})(p|pm)?")
        caches = util.datastore_get("Cache", "caches")
        if caches:
            caches = Caches.parse_raw(caches["data"])
            self.grade_data = grade.GradeData(caches.grade_cache)
            self.rating_data = rating.RatingData(caches.rating_cache)
        else:
            self.grade_data = grade.GradeData()
            self.rating_data = rating.RatingData()

    def save_caches(self):
        if (self.grade_data.cache_updated or self.rating_data.cache_updated) and self.rating_data.ratings:
            print(
                f"SAVING grade:{self.grade_data.cache_updated},"
                f"rating:{self.rating_data.cache_updated}"
            )
            caches = Caches(
                grade_cache=self.grade_data.grade_cache,
                rating_cache=self.rating_data.ratings,
            )
            util.datastore_set("Cache", "caches", caches.json())

    def parse_time(self, raw_time, is_final=False):
        time_match = self.time_reg.search(raw_time)
        start_hour = int(time_match.group(1))
        start_min = int(time_match.group(2))
        end_hour = int(time_match.group(3))
        end_min = int(time_match.group(4))
        period = time_match.group(5)
        is_pm = True if period else False

        noon = 12
        max_time = 5
        if is_pm:
            military_time_increase = end_hour + noon
            if end_hour == noon:
                military_time_increase = noon
            if military_time_increase - start_hour > max_time:
                start_hour += noon
            if end_hour != noon:
                end_hour += noon
        return f"{start_hour}:{start_min:02d}", f"{end_hour}:{end_min:02d}"

    def parse_days(self, raw_days):
        days = ["Su", "M", "Tu", "W", "Th", "F", "Sa"]
        parsed_days = []
        for num, day in enumerate(days):
            if day in raw_days:
                parsed_days.append(num)
        return parsed_days

    def to_meeting(self, section):
        room_link = util.find_and_get(section, "sec_room_link")
        if room_link and not room_link.startswith("http"):
            room_link = None
        days = util.find_and_get(section, "sec_days")
        time = util.find_and_get(section, "sec_time")
        full_time = time
        if days:
            full_time = f"{days} {time}"
            days = self.parse_days(days)
        start_time = None
        end_time = None
        if time and time != "TBA":
            start_time, end_time = self.parse_time(time)
        return Meeting(
            days=days,
            start=start_time,
            end=end_time,
            f_time=full_time,
            bldg=util.find_and_get(section, "sec_bldg"),
            rm=util.find_and_get(section, "sec_room"),
            rm_l=room_link,
        )

    def get_course_comment(self, course):
        course_comment = util.find_and_get(course, "course_comment")
        if course_comment is not None:
            # Use BeautifulSoup since its less strict than lxml
            # and can handle malformed course comments.
            course_comment = BeautifulSoup(course_comment, "lxml").text
        return course_comment

    def get_final(self, section):
        final = section.find("sec_final")
        if final is None:
            return None
        date = util.find_and_get(final, "sec_final_date")
        if date == "TBA":
            return Final(f_time=date)
        day_to_int = {
            "Sun": 0,
            "Mon": 1,
            "Tue": 2,
            "Wed": 3,
            "Thu": 4,
            "Fri": 5,
            "Sat": 6,
        }
        month_to_int = {
            "Jan": 0,
            "Feb": 1,
            "Mar": 2,
            "Apr": 3,
            "May": 4,
            "Jun": 5,
            "Jul": 6,
            "Aug": 7,
            "Sep": 8,
            "Oct": 9,
            "Nov": 10,
            "Dec": 11,
        }

        month = None
        start_time = None
        end_time = None
        time = util.find_and_get(final, "sec_final_time")
        day = util.find_and_get(final, "sec_final_day")

        full_time = f"{day}, {date}, {time}"
        if date:
            split_date = date.split(" ")
            month = month_to_int[split_date[0]]
            date = split_date[1]
        if day:
            day = day_to_int[day]
        if time:
            start_time, end_time = self.parse_time(time, is_final=True)
        return Final(
            month=month,
            date=date,
            day=day,
            start=start_time,
            end=end_time,
            f_time=full_time,
        )

    def get_instructors(self, course, section, instructors):
        for instructor in instructors:
            section.instr.append(Instructor(name=instructor.text))
        # Only retrieve rating and grade info for first instructor
        if section.instr and section.instr[0].name != "STAFF":
            start = time.time()
            section.instr[0].rating = self.rating_data.get_rating(section.instr[0].name)
            self.rating_time += time.time() - start
            start = time.time()
            section.instr[0].grade = self.grade_data.get_grades(
                section.instr[0].name, course.num
            )
            self.grades_time += time.time() - start

    def get_courses(self, req_args):
        request_content = util.get_websoc_request(req_args=req_args, full_request=True)
        tree = etree.XML(request_content)
        departments = []
        for _department in tree.findall(".//department"):
            department = Department(
                dept_n=_department.get("dept_name"),
                dept=_department.get("dept_case"),
            )
            self.grade_data.filter_dept(department.dept_n)
            for _course in _department.findall("course"):
                course = Course(
                    num=_course.get("course_number"),
                    title=_course.get("course_title"),
                    prereq=util.find_and_get(_course, "course_prereq_link"),
                    comm=self.get_course_comment(_course),
                )
                for _section in _course.findall(".//section"):
                    start = time.time()
                    sec_enrollment = _section.find("sec_enrollment")
                    section = Section(
                        code=util.find_and_get(_section, "course_code"),
                        c_type=util.find_and_get(_section, "sec_type"),
                        s_num=util.find_and_get(_section, "sec_num"),
                        unit=util.find_and_get(_section, "sec_units"),
                        m_enrll=util.find_and_get(sec_enrollment, "sec_max_enroll"),
                        enrll=util.find_and_get(sec_enrollment, "sec_enrolled"),
                        stat=util.find_and_get(_section, "sec_status"),
                        rstrcn=util.find_and_get(_section, "sec_restrictions"),
                        mtng=list(
                            map(self.to_meeting, _section.findall(".//sec_meet"))
                        ),
                        final=self.get_final(_section),
                    )
                    util.validate_enrollment(sec_enrollment, section)
                    self.parse_timed += time.time() - start
                    self.get_instructors(
                        course, section, _section.findall(".//instructor")
                    )
                    course.sections.append(section)
                department.courses.append(course)
            departments.append(department)
        return departments

    def get_all_courses(self, req_args):
        self.setup_time = 0
        self.parse_timed = 0
        self.rating_time = 0
        self.grades_time = 0
        courses = []
        if req_args.get("CourseCodes"):
            for code_chunk in util.split_codes(req_args):
                req_args["CourseCodes"] = code_chunk
                courses += self.get_courses(req_args)
        else:
            courses = self.get_courses(req_args)
        self.save_caches()
        print(
            f"setup:{self.setup_time},"
            f"parse:{self.parse_timed},"
            f"rating:{self.rating_time},"
            f"grades:{self.grades_time},"
            f"prof_grades:{self.grade_data.prof_time},"
            f"recent_grades:{self.grade_data.recent_time},"
        )
        return DataWrapper(data=courses)
