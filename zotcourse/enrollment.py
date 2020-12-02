import zotcourse.util as util
import time
from lxml import etree


def update_enrollment_info(req_args, saved_listing):
    request_content = util.get_websoc_request(req_args=req_args)
    tree = etree.XML(request_content)
    section_dict = util.flatten(saved_listing)
    for _section in tree.findall(".//section"):
        sec_enrollment = _section.find("sec_enrollment")
        section = section_dict.get(util.find_and_get(_section, "course_code"))
        if not section:
            continue
        section.m_enrll = util.find_and_get(sec_enrollment, "sec_max_enroll")
        section.enrll = util.find_and_get(sec_enrollment, "sec_enrolled")
        section.stat = util.find_and_get(_section, "sec_status")
        util.validate_enrollment(sec_enrollment, section)


def get_enrollment_info(req_args, saved_listing):
    if req_args.get("CourseCodes"):
        first_chunk = True
        for code_chunk in util.split_codes(req_args):
            if not first_chunk:
                time.sleep(2)
            req_args["CourseCodes"] = code_chunk
            update_enrollment_info(req_args, saved_listing)
            first_chunk = False
    else:
        update_enrollment_info(req_args, saved_listing)
    return saved_listing
