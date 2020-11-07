from typing import List, Optional
from pydantic import BaseModel, conint, constr, conlist


class Grade(BaseModel):
    instr_g: List[float]
    gpa: float
    course_g: Optional[List[float]]
    rec_g: Optional[List[float]]
    rec_y: Optional[str]
    rec_q: Optional[str]


class Rating(BaseModel):
    id: str
    avg: Optional[float]
    cnt: int


class Final(BaseModel):
    month: Optional[conint(ge=0, le=12)]
    day: Optional[conint(ge=0, le=8)]
    date: Optional[conint(ge=0, le=32)]
    start: Optional[constr(max_length=10)]
    end: Optional[constr(max_length=10)]
    f_time: constr(max_length=100)  # Can be 'TBA'


class Meeting(BaseModel):
    days: Optional[conlist(conint(ge=0, le=8), max_items=10)]
    start: Optional[constr(max_length=10)]
    end: Optional[constr(max_length=10)]
    f_time: constr(max_length=100)
    bldg: constr(max_length=100)  # Can be 'TBA'
    rm: Optional[constr(max_length=100)]
    rm_l: Optional[constr(max_length=200)]


class Instructor(BaseModel):
    name: str
    rating: Optional[Rating]
    grade: Optional[Grade]


class Section(BaseModel):
    code: str
    c_type: str
    s_num: str
    unit: str  # Can be '1-5'
    m_enrll: str
    enrll: str
    wtlt: Optional[str]
    wt_cp: Optional[str]
    nor: Optional[str]
    stat: Optional[str]
    rstrcn: Optional[str]
    mtng: List[Meeting]
    final: Optional[Final]
    instr: List[Instructor] = []


class Course(BaseModel):
    num: str
    title: str
    prereq: Optional[str]
    comm: Optional[str]
    sections: List[Section] = []


class Department(BaseModel):
    dept_n: str
    dept: str
    courses: List[Course] = []
