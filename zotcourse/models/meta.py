from .listing import Rating, Department
from .schedule import CourseMeta, CustomEvent
from typing import List, Union, Dict, Set, DefaultDict, Optional
from collections import defaultdict
from pydantic import BaseModel, validator


class GradeCache(BaseModel):
    hit: DefaultDict[str, Dict[str, str]] = defaultdict(dict)
    miss: DefaultDict[str, Set[str]] = defaultdict(set)

    @validator("hit")
    def convert_hit_to_defaultdict(cls, v):
        return defaultdict(dict, v)

    @validator("miss")
    def convert_miss_to_defaultdict(cls, v):
        return defaultdict(set, v)


class GradeDist(BaseModel):
    gpa: float
    grade_percents: List[float]


class CourseGradeDist(BaseModel):
    course_dist: GradeDist
    recent_dist: Optional[GradeDist]
    rec_q: str
    rec_y: str


class Caches(BaseModel):
    grade_cache: GradeCache
    rating_cache: Dict[str, Union[Rating, bool]]


class SearchForm(BaseModel):
    terms: List[str]
    clean_terms: List[str]
    general_eds: List[str]
    clean_general_eds: List[str]
    departments: List[str]
    clean_departments: List[str]


class DataWrapper(BaseModel):
    data: List[Union[List, Department, CourseMeta, CustomEvent]]
