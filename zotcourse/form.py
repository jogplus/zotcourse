from bs4 import BeautifulSoup
from zotcourse.models import SearchForm
from zotcourse import util


def get_search_form():
    request_content = util.get_websoc_request()
    parsed_html = BeautifulSoup(request_content, "lxml")
    # Parses for term info
    raw_terms = parsed_html.find("select", {"name": "YearTerm"}).find_all("option")
    terms = [str(line).replace("\xa0", "") for line in raw_terms]
    # Parses for GE info
    raw_general_ed = parsed_html.find("select", {"name": "Breadth"}).find_all("option")
    general_eds = [str(line).replace("\xa0", "") for line in raw_general_ed]
    # Parses for department info
    raw_departments = parsed_html.find("select", {"name": "Dept"}).find_all("option")
    departments = [str(line).replace("\xa0", "") for line in raw_departments]
    return SearchForm(
        terms=terms,
        general_eds=general_eds,
        departments=departments,
    )
