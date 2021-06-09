from typing import Optional, DefaultDict, Dict, Set, Union
from collections import defaultdict
from pydantic import BaseModel


class Rating(BaseModel):
    id: str
    avg: Optional[float]
    cnt: int


class GradeCache(BaseModel):
    hit: DefaultDict[str, Dict[str, str]] = defaultdict(dict)
    miss: DefaultDict[str, Set[str]] = defaultdict(set)


class Caches(BaseModel):
    grade_cache: GradeCache
    rating_cache: Dict[str, Union[Rating, bool]]
