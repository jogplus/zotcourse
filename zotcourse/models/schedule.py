from .listing import Meeting, Final
from typing import List, Optional, Union
from enum import IntEnum
from pydantic import BaseModel, validator, constr, conlist, conint


def _clean_strings(cls, v):
    if isinstance(v, str):
        v = v.replace("javascript", "...")
        v = v.replace("<", "&lt;")
        v = v.replace(">", "&gt;")
        return v
    return v


class CourseData(BaseModel):
    dept: constr(max_length=50)
    code: constr(max_length=10)
    c_type: constr(max_length=10)
    num: constr(max_length=10)
    title: constr(max_length=50)
    unit: constr(max_length=5)  # Can be '1-5'
    mtng: List[Meeting]
    final: Optional[Final]
    instr: conlist(constr(max_length=50), max_items=5)

    @validator("*", pre=True)
    def course_validation(cls, v):
        return _clean_strings(cls, v)


class EventType(IntEnum):
    COURSE_EVENT_TYPE = 0
    CUSTOM_EVENT_TYPE = 1
    ANTPLANNER_EVENT_TYPE = 2
    COURSE_2_EVENT_TYPE = 3


class CourseMeta(BaseModel):
    color: constr(max_length=15)
    eventType: EventType
    course: CourseData


class CustomEvent(BaseModel):
    color: constr(max_length=15)
    dow: conlist(conint(ge=0, le=8), max_items=7)
    end: constr(max_length=10)
    eventType: EventType
    start: constr(max_length=10)
    title: constr(max_length=50)

    @validator("*", pre=True)
    def custom_event_validation(cls, v):
        return _clean_strings(cls, v)


class Schedule(BaseModel):
    username: constr(min_length=5, max_length=100)
    data: conlist(Union[CourseMeta, CustomEvent], min_items=1, max_items=50)
