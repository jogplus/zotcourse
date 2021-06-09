from typing import List
from pydantic import BaseModel


class SearchForm(BaseModel):
    terms: List[str]
    clean_terms: List[str]
    general_eds: List[str]
    clean_general_eds: List[str]
    departments: List[str]
    clean_departments: List[str]
