import pandas
import time
from fuzzywuzzy import fuzz, process
from zotcourse.models import Grade, CourseGradeDist, GradeDist, GradeCache
from zotcourse.config import Config as config
from zotcourse import util


class GradeData:
    def __init__(self, grade_cache=None):
        print("INIT DATAFRAME")
        self.grade_scores = {"A": 4, "B": 3, "C": 2, "D": 1, "F": 0}
        self.quarter_mapping = {"Fall": 0, "Winter": 1, "Spring": 2, "Summer": 3}
        self.r_quarter_mapping = {n: q for q, n in self.quarter_mapping.items()}
        self.curr_dept = None
        self.grade_cache = grade_cache if grade_cache else GradeCache()
        self.cache_updated = False

        self.original_df = pandas.read_csv(f"{config.GRADES_FILE_NAME}.csv")
        self.original_df.set_index("dept")
        self.dept_df = None
        self.dept_instructors = None
        self.df = None

        self.prof_time = 0
        self.recent_time = 0
        self.called = 0
        self.hit = 0
        self.missed = []

    def get_grades(self, raw_name, course_num):
        grade = None
        name = util.clean_name(raw_name) + "."
        start = time.time()
        self._filter_prof(name)
        self.prof_time += time.time() - start
        prof_grade_dist = self._get_grade_dist()
        if prof_grade_dist:
            grade = Grade(
                instr_g=prof_grade_dist.grade_percents,
                gpa=prof_grade_dist.gpa,
            )
            start = time.time()
            recent_course_grade_dist = self._get_recent_grade_dist(course_num)
            self.recent_time = time.time() - start
            if recent_course_grade_dist:
                grade.course_g = recent_course_grade_dist.course_dist.grade_percents
                grade.gpa = recent_course_grade_dist.course_dist.gpa
                grade.rec_y = recent_course_grade_dist.rec_y
                grade.rec_q = recent_course_grade_dist.rec_q
                # When most recent course is only p/np and so has no gpa/dist
                if recent_course_grade_dist.recent_dist:
                    grade.rec_g = recent_course_grade_dist.recent_dist.grade_percents
                    grade.gpa = recent_course_grade_dist.recent_dist.gpa
        return grade

    def filter_dept(self, dept):
        self.dept_df = self.original_df.copy()
        self.dept_df = self.dept_df[self.dept_df["dept"].values == dept]
        self.curr_dept = dept
        self.dept_instructors = self.dept_df["instructor"].unique()
        self.dept_df.set_index("instructor")

    def _filter_prof(self, prof):
        self.df = self.dept_df.copy()
        matched_prof = self._find_closest_match(prof)
        if matched_prof:
            self.df = self.df[self.df["instructor"].values == matched_prof]
        else:
            self.df = None

    def _find_closest_match(self, name):
        self.called += 1
        if name in self.dept_instructors:
            self.hit += 1
            return name
        if name in self.grade_cache.hit[self.curr_dept]:
            self.hit += 1
            return self.grade_cache.hit[self.curr_dept][name]
        if name in self.grade_cache.miss[self.curr_dept]:
            self.hit += 1
            return None
        self.missed.append(name)
        instructor = process.extractOne(
            name, self.dept_instructors, score_cutoff=90, scorer=fuzz.token_sort_ratio
        )
        if instructor:
            instructor = instructor[0]
            self.grade_cache.hit[self.curr_dept][name] = instructor
        else:
            self.grade_cache.miss[self.curr_dept].add(name)
        self.cache_updated = True
        return instructor

    def _get_recent_grade_dist(self, course_num):
        self.df = self.df[self.df["number"].values == course_num]
        if self.df.shape[0] == 0:
            return None
        course_grade_dist = self._get_grade_dist()
        if course_grade_dist is None:
            return None
        self.df["quarter"] = self.df["quarter"].map(self.quarter_mapping)
        self.df = self.df.sort_values(by=["year", "quarter"], ascending=False).iloc[0]
        return CourseGradeDist(
            course_dist=course_grade_dist,
            recent_dist=self._get_grade_dist(),
            rec_q=self.r_quarter_mapping[self.df["quarter"]],
            rec_y=self.df["year"],
        )

    def _get_grade_dist(self):
        if self.df is None:
            return None
        grade_counts = dict()
        total_enrolled = 0
        weighted_grade_sum = 0
        for letter, score in self.grade_scores.items():
            grade_counts[letter] = int(self.df[letter].sum())
            weighted_grade_sum += score * grade_counts[letter]
            total_enrolled += grade_counts[letter]
        if total_enrolled == 0:
            return None
        gpa = round(weighted_grade_sum / total_enrolled, 2)
        grade_percents = []
        for letter in self.grade_scores.keys():
            percent = (grade_counts[letter] / total_enrolled) * 100
            grade_percents.append(round(percent, 2))
        return GradeDist(gpa=gpa, grade_percents=grade_percents)
