let catalogue_cache = {};

const WEEKDAY_TO_STRING = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR" };
const COURSE_EVENT_TYPE = 0;
const CUSTOM_EVENT_TYPE = 1;
const ANTPLANNER_EVENT_TYPE = 2;
const COURSE_2_EVENT_TYPE = 3;
const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isiPad = navigator.userAgent.match(/Mac/) && navigator.maxTouchPoints && navigator.maxTouchPoints > 2;
const restrictions = {
    A: "Prerequisite required",
    B: "Authorization code required",
    C: "Fee required",
    D: "Pass/Not Pass option only",
    E: "Freshmen only",
    F: "Sophomores only",
    G: "Lower-division only",
    H: "Juniors only",
    I: "Seniors only",
    J: "Upper-division only",
    K: "Graduate only",
    L: "Major only",
    M: "Non-major only",
    N: "School major only",
    O: "Non-school major only",
    R: "Biomedical Pass/Fail course (School of Medicine only)",
    S: "Satisfactory/Unsatisfactory only",
    X: "Separate authorization codes required to add, drop, or change enrollment",
};
const colorPalette = [
    "#C4A883",
    "#A7A77D",
    "#85AAA5",
    "#94A2BE",
    "#8997A5",
    "#A992A9",
    "#A88383",
    "#E6804D",
    "#F2A640",
    "#E0C240",
    "#BFBF4D",
    "#8CBF40",
    "#4CB052",
    "#65AD89",
    "#59BFB3",
    "#668CD9",
    "#668CB3",
    "#8C66D9",
    "#B373B3",
    "#E67399",
    "#D96666",
];

function randomNum() {
    return Math.floor(Math.random() * 90000) + 10000;
}

// TODO: Remove
function FinalParsedCourseTime(timeString) {
    var MAX_DURATION = 5;
    var daySplit = timeString.split(",");
    var timeSplit = daySplit[2].split("-");

    var date = $.trim(daySplit[1]);
    var month = date.split(" ")[0];
    var day = parseInt(date.split(" ")[1]);
    var beginTime = $.trim(timeSplit[0]); // ex. "6:00"
    var endTime = $.trim(timeSplit[1]); // "6:50p"

    var beginHour = parseInt(beginTime.split(":")[0]);
    var beginMin = parseInt(beginTime.split(":")[1]);

    var endHour = parseInt(endTime.split(":")[0]);
    var endMin = parseInt(endTime.split(":")[1].replace("pm", ""));
    var isPm = endTime.indexOf("pm") != -1;

    var weekDay = -1;
    if (timeString.indexOf("Sun") != -1) {
        weekDay = 0;
    }
    if (timeString.indexOf("Mon") != -1) {
        weekDay = 1;
    }
    if (timeString.indexOf("Tue") != -1) {
        weekDay = 2;
    }
    if (timeString.indexOf("Wed") != -1) {
        weekDay = 3;
    }
    if (timeString.indexOf("Thu") != -1) {
        weekDay = 4;
    }
    if (timeString.indexOf("Fri") != -1) {
        weekDay = 5;
    }
    if (timeString.indexOf("Sat") != -1) {
        weekDay = 6;
    }

    if (isPm) {
        var military = endHour == 12 ? 12 : endHour + 12;
        if (military - beginHour > MAX_DURATION) {
            beginHour += 12;
        }
        if (endHour != 12) {
            endHour += 12;
        }
    }

    return {
        beginHour: beginHour,
        beginMin: beginMin,
        endHour: endHour,
        endMin: endMin,
        weekDay: weekDay,
        month: month,
        day: day,
        date: date,
    };
}

function getRandomColor() {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
}

function saveSchedule(username) {
    // Retrieves all events currently in the calendar
    var calRawData = $("#cal").fullCalendar("clientEvents");
    var calCleanData = [];
    var usedGroupIds = [];
    // Validation
    if (calRawData.length == 0) {
        toastr.warning("Must add at least one course.", "Empty Schedule");
        return;
    }
    if (username == null || username.length < 5) {
        toastr.warning("Must be at least 5 characters.", "Schedule Name Too Short");
        return;
    }
    for (var i in calRawData) {
        // Removes duplicate events based on groupId (which is the course code)
        // Duplicates are caused by a class occuring on multiple days
        if (!(usedGroupIds.indexOf(calRawData[i].groupId) >= 0)) {
            if (calRawData[i].eventType === COURSE_2_EVENT_TYPE) {
                var calEventData = {
                    color: calRawData[i].color,
                    eventType: COURSE_2_EVENT_TYPE,
                    course: calRawData[i].course,
                };
                calCleanData.push(calEventData);
                usedGroupIds.push(calRawData[i].groupId);
            } else if (calRawData[i].eventType === CUSTOM_EVENT_TYPE) {
                var calEventData = {
                    title: calRawData[i].title,
                    start: calRawData[i].start.format("HH:mm"),
                    end: calRawData[i].end.format("HH:mm"),
                    color: calRawData[i].color,
                    dow: calRawData[i].daysOfTheWeek,
                    eventType: CUSTOM_EVENT_TYPE,
                };
                calCleanData.push(calEventData);
                usedGroupIds.push(calRawData[i].groupId);
            } else {
                toastr.error("Please re-add your courses", "Unsupported Courses");
                return;
            }
        }
    }
    // Save to server
    $.ajax({
        url: "/schedules/add",
        type: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({
            username: username,
            data: calCleanData,
        }),
        success: function (data) {
            if (data.success) {
                toastr.success(username, "Schedule Saved!");
                localStorage.setItem("username", username);
                addToRecentSchedules(username);
            }
        },
        error: function (data) {
            toastr.error(username, "Schedule Not Saved");
        },
    });
}

function loadSchedule(username) {
    if (username == null || username == "") {
        toastr.error(username, "Schedule Not Found");
        return;
    }
    $.ajax({
        url: "/schedule/load",
        data: { username: username },
        success: function (data) {
            if (data.success) {
                let scheduleJSON = null;
                if (typeof data.data === "string") {
                    scheduleJSON = JSON.parse(data.data);
                } else {
                    scheduleJSON = data.data;
                }

                $("#cal").fullCalendar("removeEvents");
                $("#finals").fullCalendar("removeEvents");
                let unitCounter = 0;
                let datatable = $("#listing-datatable").DataTable();
                datatable.rows().deselect();
                for (let i = 0; i < scheduleJSON.length; i++) {
                    // If a single course has different meeting times (ie. Tu 5:00- 7:50p and Th 5:00- 6:20p)
                    if (scheduleJSON[i].eventType === COURSE_2_EVENT_TYPE) {
                        for (let j in scheduleJSON[i].course.mtng) {
                            datatable.row(`#${scheduleJSON[i].course.code}`).select();
                            let curr_mtng = scheduleJSON[i].course.mtng[j];
                            scheduleJSON[i].groupId = scheduleJSON[i].course.code;
                            scheduleJSON[i].title = renderName(scheduleJSON[i].course.c_type, scheduleJSON[i].course.dept, scheduleJSON[i].course.num);
                            scheduleJSON[i].start = curr_mtng.start;
                            scheduleJSON[i].end = curr_mtng.end;
                            scheduleJSON[i].dow = curr_mtng.days;
                            scheduleJSON[i].daysOfTheWeek = curr_mtng.day;
                        }
                        unitCounter += parseInt(scheduleJSON[i].course.unit);
                    } else if (scheduleJSON[i].eventType === CUSTOM_EVENT_TYPE) {
                        // scheduleJSON[i].groupId = randomNum()
                        scheduleJSON[i].daysOfTheWeek = scheduleJSON[i].dow;
                    } else {
                        // TODO: remove
                        if (scheduleJSON[i].courseTimes) {
                            for (let j = 0; j < scheduleJSON[i].courseTimes.length; j++) {
                                scheduleJSON[i].start = scheduleJSON[i].courseTimes[j].start;
                                scheduleJSON[i].end = scheduleJSON[i].courseTimes[j].end;
                                scheduleJSON[i].dow = scheduleJSON[i].courseTimes[j].days;
                                scheduleJSON[i].location = scheduleJSON[i].courseTimes[j].room;
                            }
                        }
                        if (scheduleJSON[i].units) {
                            unitCounter += parseInt(scheduleJSON[i].units);
                        }
                    }
                }
                $("#cal").fullCalendar("renderEvents", scheduleJSON);
                $("#unitCounter").text(unitCounter);
                toastr.success(username, "Schedule Loaded!");
                localStorage.setItem("username", username);
                addToRecentSchedules(username);
                switchToMainCalendar();
                switchToMobileMainCalendar();
            }
        },
        error: function (data) {
            toastr.error(username, "Schedule Not Found");
        },
    });
}

function switchToMainCalendar() {
    if ($("#finals-btn").hasClass("active")) {
        $("#finals").hide();
        $("#cal").show();
        $("#finals-btn").removeClass("active");
        $("#cal").fullCalendar("rerenderEvents");
    }
}

function switchToMobileListing() {
    if (isMobile) {
        $("#search-btn").click();
    }
}

function switchToMobileMainCalendar() {
    if (isMobile) {
        $("#calendar-btn").click();
    }
}

function setupCourseInfoListners() {
    $(".course-info").click(async function () {
        let self = this;
        let key = encodeURIComponent(`${$(this).data("dept")} ${$(this).data("num")}`);
        let data = null;
        if (!sessionStorage.getItem("courseInfo")) {
            sessionStorage.setItem("courseInfo", JSON.stringify({}));
        }
        let courseInfoCache = JSON.parse(sessionStorage.getItem("courseInfo"));
        if (key in courseInfoCache) {
            await sleep(1);
            data = courseInfoCache[key];
        } else {
            data = await $.get(`/catalogue?q=${key}`);
            courseInfoCache[key] = data;
            sessionStorage.setItem("courseInfo", JSON.stringify(courseInfoCache));
        }
        $(self).popover({
            html: true,
            content: data,
            trigger: "manual",
            placement: "right",
            container: ".dataTables_scrollBody",
        });
        $(self).popover("toggle");
    });
    // Fixes links in course info popover
    $(".course-info").on("shown.bs.popover", function () {
        $(".bubblelink").attr("href", `http://catalogue.uci.edu${$(".bubblelink").attr("href")}`);
        $(".bubblelink").attr("target", "_blank");
    });
}

function handleListing(data, courseCodes) {
    $(".dataTables_scrollHead").css("visibility", "visible");
    let datatable = $("#listing-datatable").DataTable();
    if (data.data.length && !isMobile && !isiPad) {
        let wtltSelector = "wtlt:name";
        let norSelector = "nor:name";
        let isWtltVisible = datatable.column(wtltSelector).visible();
        let isNorVisible = datatable.column(norSelector).visible();
        let addedCol = false;
        if (data.data[0].courses[0].sections[0].wtlt && !isWtltVisible) datatable.column(wtltSelector).visible(true, false);
        addedCol = true;
        if (!data.data[0].courses[0].sections[0].wtlt && isWtltVisible) datatable.column(wtltSelector).visible(false, false);
        if (data.data[0].courses[0].sections[0].nor && !isNorVisible) datatable.column(norSelector).visible(true, false);
        addedCol = true;
        if (!data.data[0].courses[0].sections[0].nor && isNorVisible) datatable.column(norSelector).visible(false, false);
        if (addedCol) datatable.draw(false);
    }

    for (let i in courseCodes) {
        datatable.row(`#${courseCodes[i]}`).select();
    }

    setupCourseInfoListners();

    $("td.code-cell").click(function (event) {
        event.stopPropagation();
        var aux = document.createElement("input");
        aux.setAttribute("value", $(this).text());
        document.body.appendChild(aux);
        aux.select();
        document.execCommand("copy");
        document.body.removeChild(aux);
        toastr.success("Copied Course Code");
    });

    if (isMobile || isiPad) {
        $("#listing-datatable").css("table-layout", "fixed");
    }
}

function setupListing() {
    $(".dataTables_scrollHead").css("visibility", "hidden");
    $("#search").hide();
    $("#soc").show();
    if (isMobile || isiPad) {
        $(".btn-colvis").click(function () {
            $(".dt-button-collection").css("overflow", "auto");
            $(".dt-button-collection").css("height", "400px");
        });
        $(".dataTables_filter input").css("width", "125px");
    }
}

function daysOfTheWeekToStr(dow) {
    var dowStr = [];
    for (var i in dow) {
        dowStr.push(WEEKDAY_TO_STRING[dow[i]]);
    }
    return dowStr;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function addToRecentSchedules(scheduleName) {
    var recents = JSON.parse(localStorage.getItem("recentSchedules"));
    indexOfScheduleName = recents.indexOf(scheduleName);
    if (indexOfScheduleName === -1) {
        recents.unshift(scheduleName);
        if (recents.length > 5) {
            recents.pop();
        }
    } else {
        recents.splice(indexOfScheduleName, 1);
        recents.unshift(scheduleName);
    }
    localStorage.setItem("recentSchedules", JSON.stringify(recents));
}

// Creates html table from a string array
function arrToTable(str) {
    var recents = '<tr><td style="color:rgb(206, 212, 218)">Empty</tr></td>';
    if (str !== "[]") {
        recents = str
            .replace(/",/g, "</a></td></tr><tr><td><a class='recentSchedule' href='#'>")
            .replace('["', "<tr><td><a class='recentSchedule' href='#'>")
            .replace('"]', "</a></td></tr>")
            .replace(/"/g, "");
    }
    return `<table class="w-100">
				<tr style="border-bottom:solid 1px"><th>Recent Schedules</th><th><a id="clearRecents" href="#">Clear All<a></th></tr>
				${recents}
			</table>`;
}

function toggleOptions() {
    var div = document.getElementById("moreOptions");
    var button = document.getElementById("moreOptionsButton");
    if (div.style.display === "none") {
        div.style.display = "block";
        button.innerText = "Show Less Options";
    } else {
        div.style.display = "none";
        button.innerText = "Show More Options";
    }
}

function renderInstructor(instructors, withLink = true) {
    var innerHtml = "";
    for (var i in instructors) {
        if (instructors[i] !== "STAFF" && withLink) {
            innerHtml += `<div><a href="javascript:void(0)">${instructors[i]}</a></div>`;
        } else {
            innerHtml += `<div>${instructors[i]}</div>`;
        }
    }
    return innerHtml;
}

function renderLocation(locations, asString = false) {
    var innerHtml = "";
    var locationString = "";
    for (var i in locations) {
        if (locations[i].rm) {
            if (locations[i].rm_l) {
                innerHtml += `<div><a href="${locations[i].rm_l}" target="_blank">${locations[i].bldg} ${locations[i].rm}</a></div>`;
            } else {
                innerHtml += `<div>${locations[i].bldg} ${locations[i].rm}</div>`;
            }
            locationString += `${locations[i].bldg} ${locations[i].rm} `;
        } else {
            innerHtml += `<div>${locations[i].bldg}</div>`;
            locationString += `${locations[i].bldg} `;
        }
    }
    if (asString) {
        return locationString;
    }
    return innerHtml;
}

function renderName(type, dept, num) {
    return `${type} ${dept} ${num}`;
}

function setupColorPicker(element, event, colorpickerId) {
    element.on("inserted.bs.popover", function () {
        $(`#colorpicker-${colorpickerId}`).spectrum({
            color: event.color,
            showPaletteOnly: true,
            togglePaletteOnly: true,
            togglePaletteMoreText: "more colors",
            togglePaletteLessText: "less colors",
            hideAfterPaletteSelect: true,
            preferredFormat: "hex",
            showInput: true,
            palette: [colorPalette],
            change: function (color) {
                $(`#colorpicker-${colorpickerId}`).spectrum("destroy");
                $(`#colorpicker-${colorpickerId}`).hide();
                // Must remove and rerender the event manually since updateEvent is not working
                $("#cal").fullCalendar("removeEvents", event._id);
                if (event.eventType == COURSE_2_EVENT_TYPE) {
                    for (var i in event.course.mtng) {
                        event.start = event.course.mtng[i].start;
                        event.end = event.course.mtng[i].end;
                        event.dow = event.course.mtng[i].days;
                        event.color = color.toHexString();
                        $("#cal").fullCalendar("renderEvent", event);
                    }
                } else {
                    event.start = event.start.format("HH:mm");
                    event.end = event.end.format("HH:mm");
                    event.dow = event.daysOfTheWeek;
                    event.color = color.toHexString();
                    $("#cal").fullCalendar("renderEvent", event);
                }
            },
        });
    });
    // Must manually destroy colorpicker or else it never gets deleted.
    // Also hides the colorpicker input element so it does not appear briefly
    // after being destroyed.
    element.on("hide.bs.popover", function () {
        $(`#colorpicker-${colorpickerId}`).spectrum("destroy");
        $(`#colorpicker-${colorpickerId}`).hide();
    });
}

function renderCoursePopover(element, event, isFinal = false) {
    let popoverTitle = "";
    let popoverContent = "";
    let colorpickerId = randomNum();
    if (event.eventType == COURSE_2_EVENT_TYPE) {
        popoverTitle = event.course.title;
        popoverContent = `<table>
							<tr class="border-bottom">
								<td class="pr-2 pb-1">Name</td>
								<td align="right">${renderName(event.course.c_type, event.course.dept, event.course.num)}</td>
							</tr>
							<tr class="border-bottom">
								<td class="pr-2 pb-1">Code</td>
								<td align="right">${event.course.code}</td>
							</tr>`;
        if (isFinal) {
            popoverContent += `<tr class="border-bottom">
									<td class="pr-2 pb-1">Time</td>
									<td align="right">${event.course.final.f_time}</td>
								</tr>
								<tr>
									<td class="pr-2 pb-1">Instructor</td>
									<td align="right">${renderInstructor(event.course.instr, false)}</td>
								</tr>
								</table>`;
        } else {
            setupColorPicker(element, event, colorpickerId);
            popoverContent += `<tr class="border-bottom">
								<td class="pr-2 pb-1">Location</td>
								<td align="right">${renderLocation(event.course.mtng)}</td>
							</tr>
							<tr class="border-bottom">
								<td class="pr-2 pb-1">Instructor</td>
								<td align="right">${renderInstructor(event.course.instr, false)}</td>
							</tr>
							<tr>
								<td class="pr-2 pb-1">Color</td>
								<td align="right"><input id="colorpicker-${colorpickerId}" type="text"/></td>
							</tr>
							<tr>
								<td colspan="2"><button class="btn btn-sm btn-primary mt-1 w-100 delete-event">Remove <i class="fas fa-trash-alt"></i></button></td>
							</tr>
							</table>`;
        }
    } else if (event.eventType == CUSTOM_EVENT_TYPE) {
        popoverTitle = event.title;
        setupColorPicker(element, event, colorpickerId);
        popoverContent = `<table>
							<tr>
								<td class="pr-1">Color</td>
								<td align="right"><input id="colorpicker-${colorpickerId}" type="text"/></td>
							</tr>
							<tr>
								<td colspan="2"><button class="btn btn-sm btn-primary w-100 delete-event">Remove <i class="fas fa-trash-alt"></i></button></td>
							</tr>
							</table>`;
    } else {
        // TODO: Remove
        if (isFinal) {
            popoverTitle = event.fullName ? event.fullName : "";
            popoverContent =
                '<table style="width:100%">\
							<tr>\
								<td>Name</td>\
								<td></td>\
								<td align="right">' +
                event.title +
                '</td>\
							</tr>\
							<tr>\
								<td>Code</td>\
								<td></td>\
								<td align="right">' +
                event.groupId +
                '</td>\
							</tr>\
							<tr>\
								<td>Date</td>\
								<td></td>\
								<td align="right">' +
                event.date +
                '</td>\
							</tr>\
							<tr>\
								<td>Instructor</td>\
								<td>&nbsp;&nbsp;</td>\
								<td align="right">' +
                (event.instructor ? event.instructor : "N/A") +
                "</td>\
							</tr>\
							</table>";
        } else {
            // TODO: Remove
            popoverTitle = event.fullName ? event.fullName : "";
            setupColorPicker(element, event, colorpickerId);
            popoverContent =
                '<table style="width:100%; margin-bottom:3%;">\
								<tr>\
									<td>Name</td>\
									<td></td>\
									<td align="right">' +
                event.title +
                '</td>\
								</tr>\
								<tr>\
									<td>Code</td>\
									<td></td>\
									<td align="right">' +
                event.groupId +
                '</td>\
								</tr>\
								<tr>\
									<td>Location</td>\
									<td></td>\
									<td align="right">' +
                (event.location ? event.location : "") +
                '</td>\
								</tr>\
								<tr>\
									<td>Instructor</td>\
									<td>&nbsp;&nbsp;</td>\
									<td align="right">' +
                (event.instructor ? event.instructor : "N/A") +
                '</td>\
								</tr>\
								<tr>\
									<td>Color</td>\
									<td></td>\
									<td align="right"><input id="colorpicker-' +
                colorpickerId +
                '" type="text"/></td>\
								</tr>\
								</table>\
								<button style="width:100%" class="btn btn-sm btn-primary delete-event">Remove <i class="fas fa-trash-alt"></i></button>';
        }
    }
    // Hides all open popovers when adding a new event since it was causing
    // currently opened popovers to freeze.
    $(".popover").each(function () {
        $(this).popover("hide");
    });
    element.popover({
        html: true,
        title: popoverTitle,
        content: popoverContent,
        trigger: "focus",
        placement: "right",
        container: "body",
    });
    // Only allows for one popover to be open at a time
    element.on("show.bs.popover", function () {
        $(".popover").each(function () {
            $(this).popover("hide");
        });
    });
}

function setPopoverTrigger(popover) {
    popover.on("mouseenter", function () {
        var _this = this;
        $(this).popover("show");
        $(".popover").on("mouseleave", function () {
            $(_this).popover("hide");
        });
    });
    popover.on("mouseleave", function () {
        var _this = this;
        if (!$(".popover:hover").length) {
            $(_this).popover("hide");
        }
    });
}

// JQuery listeners
$(document).ready(function () {
    const defaultYearTerm = $("#year-term").val();
    $("#department-select").select2({
        theme: "bootstrap4",
        sorter: function (data) {
            let query = $(".select2-search__field").val().toLowerCase();
            return data.sort(function (a, b) {
                return a.text.replace(/[\W]/gi, "").toLowerCase().indexOf(query) - b.text.replace(/[\W]/gi, "").toLowerCase().indexOf(query);
            });
        },
    });
    // Manually reset select2 value
    $("#reset-btn").click(function () {
        $("#department-select").val(" ALL").trigger("change");
    });
    // Creates a resizable panels using Split.Js
    window.Split(["#left", "#right"], {
        sizes: [45, 55],
        gutterSize: 10,
        minSize: 20,
        elementStyle: function (dim, size, gutterSize) {
            return {
                width: `calc(${size}% - ${gutterSize}px)`,
            };
        },
        onDragEnd: async function (sizes) {
            if (isiPad) {
                await sleep(500);
                $("#listing-datatable").DataTable().draw();
                $("#listing-datatable").css("table-layout", "fixed");
            } else {
                $("#listing-datatable").DataTable().columns.adjust().draw();
            }
            setupCourseInfoListners();
        },
    });
    // Adds the ellipsis icon within the gutter
    $(".gutter").append(`<i class="fas fa-ellipsis-v"></i>`);

    var datatable = $("#listing-datatable").DataTable({
        paging: false,
        scrollResize: true,
        scrollY: 100,
        scrollX: true,
        scrollCollapse: true,
        autoWidth: false,
        rowId: "code",
        stateSave: true,
        stateDuration: 0,
        searchDelay: 500,
        // Disable since can't search by group title unless invisible column is added (but hurts performance)
        searching: false,
        processing: true,
        language: {
            search: "",
            searchPlaceholder: "Search...",
            processing: '<div id="loading" class="lds-ring"><div></div><div></div><div></div><div></div></div>',
            zeroRecords: "No courses matched your search criteria for this term.",
        },
        select: {
            style: "multi",
        },
        preDrawCallback: function (settings) {
            if (isMobile || isiPad) $("#listing-datatable").css("table-layout", "auto");
        },
        dom: "Bftr",
        buttons: [
            {
                text: '<i class="fas fa-chevron-left"></i> Back',
                action: function (e, dt, node, config) {
                    $("#soc").hide();
                    $("#search").show();
                    dt.search("");
                },
                className: "btn btn-secondary",
            },
            {
                extend: "colvis",
                className: "btn btn-link btn-colvis",
                text: "Hide columns",
            },
        ],
        rowGroup: {
            dataSrc: ["dept_n", "num"],
            startClassName: "row-group",
            startRender: function (rows, group, level) {
                if (level == 0) return group;
                else {
                    let currRow = rows.data()[0];
                    let title = `${currRow.dept} ${currRow.num} ${currRow.title} <i class="fas fa-info-circle course-info cursor-pointer" data-dept="${currRow.dept}" data-num="${currRow.num}"></i>`;
                    let comment = "";
                    if (currRow.comm) {
                        comment = `<div class="m-1 p-1 comment">${currRow.comm}</div>`;
                    }
                    if (currRow.prereq) {
                        comment = `<a href="${currRow.prereq}" class="ml-3" target="_blank">(Prereqs)</a>${comment}`;
                    }
                    return title + comment;
                }
            },
            endRender: function (rows, group, level) {
                if (level == 1) return " ";
            },
        },
        ajax: {
            url: `/search`,
            dataSrc: function (data) {
                let flatData = [];
                for (let i in data.data) {
                    let department = data.data[i];
                    for (let j in department.courses) {
                        let course = department.courses[j];
                        for (let k in course.sections) {
                            let section = course.sections[k];
                            flatData.push({
                                dept_n: department.dept_n,
                                num: course.num,
                                dept: department.dept,
                                title: course.title,
                                prereq: course.prereq,
                                comm: course.comm,
                                code: section.code,
                                c_type: section.c_type,
                                s_num: section.s_num,
                                unit: section.unit,
                                m_enrll: section.m_enrll,
                                enrll: section.enrll,
                                wtlt: section.wtlt,
                                wt_cp: section.wt_cp,
                                nor: section.nor,
                                stat: section.stat,
                                rstrcn: section.rstrcn,
                                mtng: section.mtng,
                                final: section.final,
                                instr: section.instr,
                            });
                        }
                    }
                }
                return flatData;
            },
            cache: true,
            beforeSend: function () {
                // Manually add the loading message.
                $("#listing-datatable > tbody").html("<tr></tr>");
            },
        },
        columns: [
            {
                title: "Code",
                name: "code",
                data: "code",
                className: "code-cell",
            },
            {
                title: "Type",
                name: "type",
                data: "c_type",
            },
            {
                title: "Sec",
                name: "sec",
                data: "s_num",
            },
            {
                title: "Units",
                name: "unit",
                data: "unit",
            },
            {
                title: "Instructor",
                name: "instr",
                data: "instr",
                defaultContent: "",
                render: function (data, type, row, meta) {
                    if (type === "display") {
                        return renderInstructor(data.map((e) => e.name));
                    }
                    return data.map((e) => e.name).join(" ");
                },
                createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                    let i = 0;
                    $(cell)
                        .find("a")
                        .each(function () {
                            let popoverContent = "";
                            let instructor = cellData[i];
                            if (instructor.name === "STAFF") {
                                i += 1;
                                instructor = cellData[i];
                            }
                            let lastname = instructor.name.split(",")[0];
                            if (instructor.rating) {
                                popoverContent += `<div><a href="https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${instructor.rating.id}" target="_blank">View on RMP</a></div>`;
                            } else {
                                popoverContent += `<div><a href="https://www.ratemyprofessors.com/search.jsp?queryoption=HEADER&queryBy=teacherName&schoolName=University+of+California+Irvine&schoolID=1074&query=${lastname}" target="_blank">Search on RMP</a></div>`;
                            }
                            let short_lastname = lastname.split(" ")[0].split("-")[0];
                            popoverContent += `<div><a href="https://eaterevals.eee.uci.edu/browse/instructor#${short_lastname}" target="_blank">Search on EaterEvals</a></div>`;
                            let popover = $(this).popover({
                                html: true,
                                container: ".dataTables_scrollBody",
                                content: popoverContent,
                                animation: false,
                                trigger: "manual",
                            });
                            setPopoverTrigger(popover);
                            i += 1;
                        });
                },
            },
            {
                title: "Rating",
                name: "rating",
                data: "instr",
                defaultContent: "",
                render: function (data, type, row, meta) {
                    if (type === "display") {
                        if (data[0] && data[0].rating && data[0].rating.avg) {
                            return `<a data-id="${randomNum()}" href="javascript:void(0)">${data[0].rating.avg.toFixed(2)}</a>`;
                        }
                        if (data[0] && data[0].name !== "STAFF") {
                            return "N/A";
                        }
                    } else {
                        if (data[0] && data[0].rating && data[0].rating.avg) {
                            return data[0].rating.avg;
                        }
                        return 0;
                    }
                },
                createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                    $(cell)
                        .find("a")
                        .each(function () {
                            let popoverContent = `<div class="container p-0">
												<h6>${cellData[0].name}</h6>
												<div class="row no-gutters">
												<div class="col-8">
												<div><a href="https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${cellData[0].rating.id}" target="_blank">View on RMP</a></div>
												<div>Average: ${cellData[0].rating.avg.toFixed(2)}</div>
												</div>
												<div class="col-4" style="height:3rem; width:3rem"><canvas id="${$(this).attr("data-id")}-chart"></canvas></div>
												</div>
												<div>Number of Reviews: ${cellData[0].rating.cnt}</div>
											 </div>`;
                            let popover = $(this).popover({
                                html: true,
                                container: ".dataTables_scrollBody",
                                content: popoverContent,
                                trigger: "manual",
                                sanitize: false,
                                animation: false,
                            });
                            setPopoverTrigger(popover);
                            popover.on("inserted.bs.popover", function () {
                                let datasets = [];
                                if (cellData[0].rating) {
                                    let chartColor = "rgba(254, 107, 100, 1)";
                                    // (blue)rgb(1,123,255), (yellow)rgb(255,193,7) (red)rgb(220,53,69) green rgb(40,167,68)
                                    if (cellData[0].rating.avg >= 3) chartColor = "rgb(255,193,7,1)";
                                    if (cellData[0].rating.avg >= 4) chartColor = "rgb(40,167,68,1)";
                                    datasets.push({
                                        label: "Instructor",
                                        // borderColor: '#eff0f1',
                                        backgroundColor: [chartColor, "rgba(255, 255, 255, 1)"],
                                        data: [cellData[0].rating.avg.toFixed(2), 5 - cellData[0].rating.avg.toFixed(2)],
                                    });
                                }
                                let barChartData = {
                                    labels: [],
                                    datasets: datasets,
                                };
                                new Chart(`${$(this).attr("data-id")}-chart`, {
                                    type: "doughnut",
                                    data: barChartData,
                                    options: {
                                        legend: {
                                            display: false,
                                        },
                                        tooltips: {
                                            enabled: false,
                                        },
                                        maintainAspectRatio: false,
                                    },
                                });
                            });
                        });
                },
            },
            {
                title: "GPA",
                name: "gpa",
                data: "instr",
                defaultContent: "",
                render: function (data, type, row, meta) {
                    if (type === "display") {
                        if (data[0] && data[0].grade && data[0].grade.gpa) {
                            return `<a data-id="${randomNum()}" href="javascript:void(0)">${data[0].grade.gpa.toFixed(2)}</a>`;
                        }
                        if (data[0] && data[0].name !== "STAFF") {
                            return "N/A";
                        }
                    } else {
                        if (data[0] && data[0].grade && data[0].grade.gpa) {
                            return data[0].grade.gpa;
                        }
                        return 0;
                    }
                },
                createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                    $(cell)
                        .find("a")
                        .each(function () {
                            let popoverContent = `<h6 class="center-text">Grade Distribution <i id="${$(this).attr("data-id")}-info" class="fas fa-question-circle"></i></h6>`;
                            let popoverHeight = "320px";
                            if (cellData[0] && cellData[0].grade && cellData[0].grade.rec_g) {
                                popoverContent += `<div class="mb-1 center-text">(Most Recently Taught: ${cellData[0].grade.rec_q}, ${cellData[0].grade.rec_y})</div>`;
                                popoverHeight = "340px";
                            }
                            popoverContent += `<canvas id="${$(this).attr("data-id")}-chart" width="400" height="400" ></canvas>`;
                            let popover = $(this).popover({
                                container: ".dataTables_scrollBody",
                                html: true,
                                content: popoverContent,
                                trigger: "click",
                                sanitize: false,
                                animation: false,
                            });
                            setPopoverTrigger(popover);
                            popover.on("show.bs.popover", function () {
                                $($(this).data("bs.popover").getTipElement()).css("height", popoverHeight);
                                $($(this).data("bs.popover").getTipElement()).css("min-width", "300px");
                            });
                            popover.on("inserted.bs.popover", function () {
                                let infoPopover = $(`#${$(this).attr("data-id")}-info`).popover({
                                    container: ".popover",
                                    html: true,
                                    content: $("#chart-info").html(),
                                    trigger: "manual",
                                    animation: false,
                                });
                                setPopoverTrigger(infoPopover);

                                var labels = ["A", "B", "C", "D", "F"];
                                var datasets = [];
                                if (cellData[0] && cellData[0].grade && cellData[0].grade.instr_g) {
                                    datasets.push({
                                        label: "Instructor",
                                        backgroundColor: "rgba(254, 107, 100, 1)",
                                        data: cellData[0].grade.instr_g,
                                    });
                                    if (cellData[0].grade.course_g) {
                                        datasets.push({
                                            label: "Course",
                                            backgroundColor: "rgba(119, 158, 203, 1)",
                                            data: cellData[0].grade.course_g,
                                        });
                                        datasets.push({
                                            label: "Recent",
                                            backgroundColor: "rgba(119, 221, 119, 1)",
                                            data: cellData[0].grade.rec_g,
                                        });
                                    }
                                }
                                var barChartData = {
                                    labels: labels,
                                    datasets: datasets,
                                };
                                new Chart(`${$(this).attr("data-id")}-chart`, {
                                    type: "bar",
                                    data: barChartData,
                                    options: {},
                                });
                            });
                        });
                },
            },
            {
                title: "Time",
                name: "time",
                data: "mtng",
                render: function (data, type, row, meta) {
                    if (type === "display") {
                        let innerHtml = "";
                        for (let i = 0; i < data.length; i++) {
                            innerHtml += `<div>${data[i].f_time}</div>`;
                        }
                        return innerHtml;
                    }
                    return data.map((e) => e.f_time).join(" ");
                },
            },
            {
                title: "Place",
                name: "place",
                data: "mtng",
                render: function (data, type, row, meta) {
                    return renderLocation(data);
                },
            },
            {
                title: "Final",
                name: "final",
                data: "final",
                render: function (data, type, row, meta) {
                    if (data) {
                        return data.f_time;
                    }
                    return data;
                },
            },
            {
                title: "Enr",
                name: "enrll",
                data: "enrll",
                defaultContent: "...",
                render: function (data, type, row, meta) {
                    if (type === "display" && data) {
                        return `${data}/${row.m_enrll}`;
                    }
                    return data;
                },
            },
            {
                title: "WL",
                name: "wtlt",
                data: "wtlt",
                defaultContent: "...",
                render: function (data, type, row, meta) {
                    if (type === "display" && data && data != "n/a") {
                        return `${data}/${row.wt_cp}`;
                    }
                    return data;
                },
            },
            {
                title: "Nor",
                name: "nor",
                data: "nor",
                defaultContent: "...",
            },
            {
                title: "Rstr",
                name: "rstrcn",
                data: "rstrcn",
                render: function (data, type, row, meta) {
                    if (type === "display" && data) {
                        return `<a href="javascript:void(0)">${data}</a>`;
                    }
                    return data;
                },
                createdCell: function (cell, cellData, rowData, rowIndex, colIndex) {
                    $(cell)
                        .find("a")
                        .each(function () {
                            let popoverContent = '<a href="https://www.reg.uci.edu/enrollment/restrict_codes.html" target="_blank">Course Restriction Codes</a>';
                            let innerHtml = $(this).text();
                            for (let i = 0; i < innerHtml.length; i++) {
                                if (restrictions[innerHtml[i]]) {
                                    popoverContent += `<div><b>${innerHtml[i]}</b>: ${restrictions[innerHtml[i]]}</div>`;
                                }
                            }

                            let popover = $(this).popover({
                                html: true,
                                container: ".dataTables_scrollBody",
                                content: popoverContent,
                                trigger: "manual",
                                animation: false,
                            });
                            setPopoverTrigger(popover);
                        });
                },
            },
            {
                title: "Status",
                name: "stat",
                data: "stat",
                defaultContent: "...",
                render: function (data, type, row, meta) {
                    if (data === "OPEN") {
                        if (type === "display") {
                            return `<div class="text-success font-weight-bold">${data}</div>`;
                        } else if (type === "sort") {
                            return 0;
                        }
                    } else if (data === "Waitl") {
                        if (type === "display") {
                            return `<div class="text-danger">${data}</div>`;
                        } else if (type === "sort") {
                            return 1;
                        }
                    } else if (data === "NewOnly") {
                        if (type === "display") {
                            return `<div class="text-primary font-weight-bold">${data}</div>`;
                        } else if (type === "sort") {
                            return 2;
                        }
                    } else if (data === "FULL") {
                        if (type === "sort") {
                            return 3;
                        }
                    }
                    return data;
                },
            },
        ],
    });

    $("#search-form").submit(function (event) {
        event.preventDefault();
        let form = {};
        $.each($(this).serializeArray(), function (_, kv) {
            form[kv.name] = kv.value;
        });
        if (form.Breadth === "ANY" && form.InstrName === "" && form.CourseCodes === "" && form.Dept.trim() === "ALL") {
            toastr.error("Please specify a Department, General Ed, Course Code, or Instructor");
            return;
        }
        setupListing();
        let courseCodes = $("#cal")
            .fullCalendar("clientEvents")
            .map(({ groupId }) => groupId);
        datatable.ajax.url(`/search?${$(this).serialize()}`).load(function (data) {
            handleListing(data, courseCodes);
        });
    });

    $("#listing-datatable").on("column-visibility.dt", async function (e, settings, column, state) {
        if (isMobile || isiPad) {
            await sleep(50);
            datatable.columns.adjust().draw();
            $("#listing-datatable").css("table-layout", "fixed");
        }
    });

    $("#list-btn").click(function () {
        $(".popover").each(function () {
            $(this).popover("hide");
        });
        var courseCodes = "";
        var calRawData = $("#cal").fullCalendar("clientEvents");
        var added = [];
        for (var i in calRawData) {
            // If valid eventType and not already added
            if (calRawData[i].eventType != CUSTOM_EVENT_TYPE && added.indexOf(calRawData[i].groupId) == -1) {
                added.push(calRawData[i].groupId);
            }
        }
        courseCodes = added.join(",");
        if (courseCodes == "") {
            toastr.warning("Must have at least 1 course added.", "Cannot List Courses");
        } else {
            setupListing();
            switchToMobileListing();
            // 'data-term' attribute is rendered from index template and defaults to latest term
            datatable.ajax.url(`/search?YearTerm=${defaultYearTerm}&CourseCodes=${courseCodes}`).load(function (data) {
                handleListing(data, added);
            });
        }
    });

    $("#clear-cal-btn").on("click", function () {
        $(".popover").each(function () {
            $(this).popover("hide");
        });
        $("#cal").fullCalendar("removeEvents");
        $("#finals").fullCalendar("removeEvents");
        datatable.rows().deselect();
        switchToMainCalendar();
        $("#unitCounter").text(0);
    });

    // Prevent row selection when clicking on link
    datatable.on("click", "a", function (e) {
        e.stopPropagation();
    });
    datatable.on("deselect", function (e, dt, type, indexes) {
        if (type === "row") {
            var data = datatable.rows(indexes).data()[0];
            if (data.unit && parseInt($("#unitCounter").text()) - parseInt(data.unit) >= 0) {
                $("#unitCounter").text(parseInt($("#unitCounter").text()) - parseInt(data.unit));
            }
            var calRawData = $("#cal").fullCalendar("clientEvents");
            for (var i in calRawData) {
                if (calRawData[i].groupId === data.code) $("#cal").fullCalendar("removeEvents", calRawData[i]._id);
            }
        }
    });
    datatable.on("user-select", function (e, dt, type, cell, originalEvent) {
        if (type === "row") {
            switchToMainCalendar();
            let rawData = datatable.rows(cell.index().row).data()[0];
            let data = {
                dept: rawData.dept,
                code: rawData.code,
                c_type: rawData.c_type,
                num: rawData.num,
                title: rawData.title,
                unit: rawData.unit,
                mtng: rawData.mtng,
                final: rawData.final,
                instr: rawData.instr.map((e) => e.name),
            };
            if (data.mtng[0].f_time === "TBA") {
                e.preventDefault();
                toastr.warning("Cannot add to schedule", "Course has TBA Time");
                return;
            }
            // Since user-select is also called on deselect, must make sure not to re-add the same course
            let calRawData = $("#cal").fullCalendar("clientEvents");
            for (let i in calRawData) {
                if (calRawData[i].groupId === data.code) return;
            }
            let randomColor = getRandomColor();
            $("#unitCounter").text(parseInt($("#unitCounter").text()) + parseInt(data.unit));
            for (let i in data.mtng) {
                let curr_mtng = data.mtng[i];
                $("#cal").fullCalendar("renderEvent", {
                    groupId: data.code,
                    start: curr_mtng.start,
                    end: curr_mtng.end,
                    dow: curr_mtng.days,
                    daysOfTheWeek: curr_mtng.days,
                    color: randomColor,
                    title: renderName(data.c_type, data.dept, data.num),
                    course: data,
                    eventType: COURSE_2_EVENT_TYPE,
                });
            }
        }
    });

    $("#moreOptionsButton").on("click", function () {
        toggleOptions();
    });

    //#region Button Creation
    // Triggers before popover has been shown and hides the other toolbar popovers
    $(".btn").on("show.bs.popover", function () {
        $(".popover").each(function () {
            $(this).popover("hide");
        });
    });

    // Used to close popovers when clicking outside of popover or button
    // Does not work when clicking in iframe
    $("body").on("click", function (e) {
        if (
            $(e.target).parents(".fc-event-container").length === 0 &&
            $(e.target).parents(".popover").length === 0 &&
            $(e.target).parents(".btn").length === 0 &&
            !$(e.target).hasClass("btn") &&
            !$(e.target).is("a")
        ) {
            $(".popover").each(function () {
                $(this).popover("hide");
            });
        }
    });

    // Re-build popover on click so that contents update
    $("#save-btn").click(function () {
        if (!localStorage.getItem("recentSchedules")) localStorage.setItem("recentSchedules", JSON.stringify([]));
        $("#save-btn").popover({
            trigger: "manual",
            html: true,
            title: "Save Schedule",
            content: function () {
                return `<div class="input-group mb-3">
								<input id="save-input" value="${localStorage.getItem("username") ? localStorage.getItem("username") : ""}" type="text" class="form-control save-input" placeholder="Schedule Name">
								<div class="input-group-append">
									<button id="save-button" class="btn btn-primary" type="button">Submit</button>
								</div>
							</div>
							<div>${arrToTable(localStorage.getItem("recentSchedules"))}</div>`;
            },
            placement: "bottom",
            container: "body",
            boundary: "window",
        });
        $("#save-btn").popover("toggle");
    });

    // Triggers once popover is shown and awaits for the user to press the enter key or submit button
    $("#save-btn").on("shown.bs.popover", function () {
        $("#save-input").focus();
        $("#save-input").keypress(function (e) {
            if (!e) e = window.event;
            var keyCode = e.keyCode || e.which;
            if (keyCode == "13") {
                saveSchedule($("#save-input").val());
                $("#save-btn").popover("hide");
            }
        });
        $(".recentSchedule").on("click", function () {
            $("#save-input").val($(this).text());
            $("#save-input").focus();
        });
        $("#clearRecents").click(function () {
            localStorage.removeItem("recentSchedules");
            localStorage.removeItem("username");
            $("#save-btn").popover("hide");
        });
        $("#save-button").click(function () {
            saveSchedule($("#save-input").val());
            $("#save-btn").popover("hide");
        });
    });

    // Re-build popover on click so that contents update
    $("#load-btn").click(function () {
        if (!localStorage.getItem("recentSchedules")) localStorage.setItem("recentSchedules", JSON.stringify([]));
        $("#load-btn").popover({
            trigger: "manual",
            html: true,
            title: "Load Schedule",
            content: function () {
                return `<div class="input-group mb-3">
								<input id="load-input" value="${localStorage.getItem("username") ? localStorage.getItem("username") : ""}" type="text" class="form-control" placeholder="Schedule Name">
								<div class="input-group-append">
									<button id="load-button" class="btn btn-primary" type="button">Submit</button>
								</div>
							</div>
							<div>${arrToTable(localStorage.getItem("recentSchedules"))}</div>`;
            },
            placement: "bottom",
            container: "body",
            boundary: "window",
        });
        $("#load-btn").popover("toggle");
    });

    // Triggers once popover is shown and awaits for the user to press the enter key or submit button
    $("#load-btn").on("shown.bs.popover", function () {
        $("#load-input").focus();
        $("#load-input").keypress(function (e) {
            if (!e) e = window.event;
            var keyCode = e.keyCode || e.which;
            if (keyCode == "13") {
                loadSchedule($("#load-input").val());
                $("#load-btn").popover("hide");
            }
        });
        $(".recentSchedule").on("click", function () {
            $("#load-input").val($(this).text());
            $("#load-input").focus();
        });
        $("#clearRecents").click(function () {
            localStorage.removeItem("recentSchedules");
            localStorage.removeItem("username");
            $("#load-btn").popover("hide");
        });
        $("#load-button").click(function () {
            loadSchedule($("#load-input").val());
            $("#load-btn").popover("hide");
        });
    });

    // Temporarily changes size of calendar for printing.
    // This must be done with JS instead of just styling because
    // fullCalendar must rescale all of the events for the bigger event sizes
    $("#print-btn").click(function () {
        if (navigator.userAgent.indexOf("Chrome") === -1) {
            toastr.error("Printing is currently only supported in Chrome", "Unsupported Browser");
            return;
        }
        switchToMainCalendar();
        var tempLeftSize = $("#left").outerWidth();
        $("#right").hide();
        // Not 100% or else it will not fit on letter paper
        $("#left").outerWidth("100%");
        $("#cal").css("width", "100%");
        $("th, td, tr").css("border", "2px solid #bfbfbf");
        $(".fc-minor").css("border-top", "3px dotted #bfbfbf");
        // Sets the rows to have a larger height for printing
        $(".fc-time-grid .fc-slats td").css("height", "46");
        // This triggers fullCalendar to rescale
        $("#cal").fullCalendar("option", "height", $("#left").outerHeight() - $("#upper").outerHeight());
        $(".popover").each(function () {
            $(this).popover("hide");
        });

        window.print();
        // Resets page back to original size
        $("th, td, tr").css("border", "");
        $("#left").outerWidth(tempLeftSize);
        $("#right").width($("#right").width() - 15);
        $("#right").show();
    });

    $("#search-btn").click(async function () {
        $(".popover").each(function () {
            $(this).popover("hide");
        });
        $(this).addClass("active");
        $("#calendar-btn").removeClass("active");
        $("#finals").animate({ width: 0 }, 200, "swing");
        $("#cal").animate({ width: 0 }, 200, "swing");
        await sleep(200);
        $("#left").width("0px");
        $("#right").show();
    });

    $("#calendar-btn").click(function () {
        $(".popover").each(function () {
            $(this).popover("hide");
        });
        $(this).addClass("active");
        $("#search-btn").removeClass("active");
        $("#right").hide();
        $("#left").width($(window).width());
        $("#cal").animate({ width: $(window).width() }, 200, "swing");
        $("#finals").animate({ width: $(window).width() }, 200, "swing");
    });

    $("#finals-btn").click(function () {
        $(".popover").each(function () {
            $(this).popover("hide");
        });
        switchToMobileMainCalendar();
        if ($(this).hasClass("active")) {
            $("#finals").hide();
            $("#cal").show();
            $(this).removeClass("active");
            $("#cal").fullCalendar("rerenderEvents");
        } else {
            $("#finals").show();
            $("#cal").hide();
            $(this).addClass("active");
            $("#finals").fullCalendar("removeEvents");
            var calRawData = $("#cal").fullCalendar("clientEvents");
            var usedGroupIds = [];
            var hasTBACourse = false;
            for (var i in calRawData) {
                if (calRawData[i].eventType === COURSE_2_EVENT_TYPE) {
                    if (calRawData[i].course.final && calRawData[i].course.final.date === "TBA") {
                        hasTBACourse = true;
                    } else if (calRawData[i].course.final && !(usedGroupIds.indexOf(calRawData[i].groupId) >= 0)) {
                        $("#finals").fullCalendar("renderEvent", {
                            groupId: calRawData[i].groupId,
                            start: calRawData[i].course.final.start,
                            end: calRawData[i].course.final.end,
                            // Title is parsed from after the type of class (ie. Lec, Lab, Dis)
                            title: calRawData[i].title.split(/\s(.+)/)[1],
                            dow: [calRawData[i].course.final.day],
                            color: calRawData[i].color,
                            course: calRawData[i].course,
                            eventType: COURSE_2_EVENT_TYPE,
                        });
                        usedGroupIds.push(calRawData[i].groupId);
                    }
                } else {
                    // TODO: remove
                    // Checks if any course has TBA final so that user can update it
                    if (calRawData[i].eventType != CUSTOM_EVENT_TYPE && $.trim(calRawData[i].final.replace(/&nbsp;/g, "")) == "TBA") {
                        hasTBACourse = true;
                    }
                    // Checks to make sure that finals attribute is not empty, TBA, or from import
                    if (
                        calRawData[i].eventType != CUSTOM_EVENT_TYPE &&
                        $.trim(calRawData[i].final.replace(/&nbsp;/g, "")) != "" &&
                        $.trim(calRawData[i].final.replace(/&nbsp;/g, "")) != "TBA" &&
                        $.trim(calRawData[i].final.replace(/&nbsp;/g, "")) != "N/A (due to import)" &&
                        !(usedGroupIds.indexOf(calRawData[i].groupId) >= 0)
                    ) {
                        var finalParsed = FinalParsedCourseTime(calRawData[i].final);
                        $("#finals").fullCalendar("renderEvent", {
                            id: calRawData[i].id,
                            groupId: calRawData[i].groupId,
                            start: finalParsed.beginHour + ":" + finalParsed.beginMin,
                            end: finalParsed.endHour + ":" + finalParsed.endMin,
                            // Title is parsed from after the type of class (ie. Lec, Lab, Dis)
                            title: calRawData[i].title.split(/\s(.+)/)[1],
                            dow: [finalParsed.weekDay],
                            color: calRawData[i].color,
                            fullName: calRawData[i].fullName,
                            instructor: calRawData[i].instructor,
                            date: finalParsed.date,
                        });
                        usedGroupIds.push(calRawData[i].groupId);
                    }
                }
            }
            if (hasTBACourse) toastr.warning("One of your courses have TBA finals. Please use the List buttton to re-add and update the course.", "TBA Finals");
            $("#finals").fullCalendar("rerenderEvents");
        }
        $(window).trigger("resize");
    });

    $("#export-btn").popover({
        html: true,
        title: "Export to iCal",
        content: $("#export-btn-content").html(),
        placement: "bottom",
        container: "body",
        boundary: "window",
    });
    $("#export-btn").on("shown.bs.popover", function () {
        $("#export-button").click(function () {
            $(".popover").each(function () {
                $(this).popover("hide");
            });
            var calRawData = $("#cal").fullCalendar("clientEvents");
            // Year is extracted from most recent term in Schedule of Classes search
            var year = parseInt(defaultYearTerm.substring(0, 4));
            var firstMonday = null;
            for (var i in calRawData) {
                let curr = calRawData[i];
                // Prevents courses with no final or imported from Antplanner from being parsed
                if (curr.eventType === COURSE_2_EVENT_TYPE && curr.course.final && curr.course.final.f_time !== "TBA") {
                    let currFinal = curr.course.final;
                    // At least one class with a final is necessary since the final is the
                    // only way to determine when the first week of class is
                    let startHour, startMin;
                    [startHour, startMin] = currFinal.start.split(":");
                    firstMonday = new Date(year, currFinal.month, currFinal.date, startHour, startMin);
                    // Gets the Monday AFTER finals week is over
                    // If Sat,Sun,Mon (6,0,1) add 7 to get Monday AFTER finals week
                    var shift = (1 + 7 - firstMonday.getDay()) % 7;
                    if ([6, 0, 1].includes(firstMonday.getDay())) {
                        shift += 7;
                    }
                    firstMonday.setDate(firstMonday.getDate() + shift);
                    // Move backwards 10 weeks during quarter + 1 week of finals = 77 days
                    firstMonday.setDate(firstMonday.getDate() - 77);
                    break;
                }
            }
            if (firstMonday === null) {
                toastr.warning("Must add at least 1 course with a final in order to generate calendar export.", "Cannot Export Courses");
                return;
            }
            let added = [];
            let cal = ics();
            for (i in calRawData) {
                let curr = calRawData[i];
                if (curr.eventType !== COURSE_2_EVENT_TYPE && curr.eventType !== CUSTOM_EVENT_TYPE) {
                    toastr.error("Please re-add your courses", "Unsupported Courses");
                }
                if (added.indexOf([curr.groupId, curr.daysOfTheWeek].toString()) == -1) {
                    let startDate = new Date(firstMonday);
                    // Add the number of days until first meeting starting from Monday (0)
                    // Only the first meeting of the week is needed since byday handles repeats
                    // daysOfTheWeek - 1 because Monday has an index of 1 instead if 0
                    startDate.setDate(startDate.getDate() + (curr.daysOfTheWeek[0] - 1));
                    let endDate = new Date(startDate);
                    startDate.setHours(curr.start.hours());
                    startDate.setMinutes(curr.start.minutes());
                    endDate.setHours(curr.end.hours());
                    endDate.setMinutes(curr.end.minutes());
                    let rrule = {
                        freq: "WEEKLY",
                        // Count is (# of weeks in quarter) * (# of times class occurs in a week)
                        count: 10 * curr.daysOfTheWeek.length,
                        byday: daysOfTheWeekToStr(curr.daysOfTheWeek),
                    };
                    // Use \\n instead of \n due to ics.js issue #26
                    if (curr.eventType == CUSTOM_EVENT_TYPE) {
                        // No location or description for custom events
                        cal.addEvent(curr.title, "", "", startDate, endDate, rrule);
                    } else {
                        let location = renderLocation(curr.course.mtng, (asString = true));
                        cal.addEvent(
                            curr.title,
                            `Course Title: ${curr.course.dept} ${curr.course.num} ${curr.course.title}
							\\nInstructor: ${curr.course.instr.map((e) => e.name).join(" ")}
							\\nCode: ${curr.groupId}`,
                            location,
                            startDate,
                            endDate,
                            rrule
                        );
                    }
                    if (curr.eventType === COURSE_2_EVENT_TYPE && curr.course.final && curr.course.final.f_time !== "TBA") {
                        let currFinal = curr.course.final;
                        let hour, min;
                        [hour, min] = currFinal.start.split(":");
                        let startTime = new Date(year, currFinal.month, currFinal.date, hour, min);
                        [hour, min] = currFinal.end.split(":");
                        let endTime = new Date(year, currFinal.month, currFinal.date, hour, min);
                        // Title is parsed from after the type of class (ie. Lec, Lab, Dis)
                        cal.addEvent(
                            `Final ${curr.title.split(/\s(.+)/)[1]}`,
                            `Course Title: ${curr.course.dept} ${curr.course.num} ${curr.course.title}
							\\nInstructor: ${curr.course.instr.map((e) => e.name).join(" ")}
							\\nCode: ${curr.groupId}`,
                            "Check portal.uci.edu",
                            startTime,
                            endTime
                        );
                    }
                    added.push([curr.groupId, curr.daysOfTheWeek].toString());
                }
            }
            cal.download();
        });
    });

    $("#event-btn").popover({
        html: true,
        title: "Add a Custom Event",
        content: $("#event-btn-content").html(),
        placement: "bottom",
        container: "body",
        boundary: "window",
    });
    $("#event-btn").on("shown.bs.popover", function () {
        $("#event-button").click(function () {
            var days = $("input[name=weekday-check]:checked");
            weekDays = [];
            for (var i = 0; i < days.length; i++) {
                weekDays.push(parseInt($(days[i]).attr("data")));
            }
            if ($("#event-name").val().length <= 0 || $("#event-name").val().length > 25) {
                toastr.warning("Name must be between 1 and 25 characters.", "Event Name");
            } else if ($("#event-start").val() >= $("#event-end").val()) {
                toastr.warning("Start time must come before end time.", "Event Time");
            } else if (weekDays.length == 0) {
                toastr.warning("Must have at least 1 weekday selected.", "Event Weekday");
            } else {
                $("#cal").fullCalendar("renderEvent", {
                    groupId: randomNum(),
                    start: $("#event-start").val(),
                    end: $("#event-end").val(),
                    title: $("#event-name").val(),
                    dow: weekDays,
                    color: getRandomColor(),
                    daysOfTheWeek: weekDays,
                    eventType: CUSTOM_EVENT_TYPE,
                });
                switchToMainCalendar();
            }
        });
    });
    //#endregion

    if (isMobile) {
        $("#mobile-btns").removeClass("d-none");
        // $('body').css('position', 'fixed');
        $("#right").hide();
        $(".gutter").hide();
        $("#print-btn").hide();
        $("#export-btn").hide();
        $("#clear-cal-btn").hide();
        $("#event-btn").hide();
    }
    if (isiPad) {
        $("#print-btn").hide();
        $("#export-btn").hide();
    }

    // Whenever the left panel changes sizes, resizes the right panel.
    // Also accounts for when the user zooms in/out
    $(window).resize(function () {
        $("#left").height(`calc(100% - ${$("#upper").outerHeight()}px)`);
        $("#right").height(`calc(100% - ${$("#upper").outerHeight()}px)`);
        $("#search").outerHeight(`${$("#right").height()}px`);
        // Resizes the gutter bar to match the height of the left panel
        $(".gutter").height(`${$("#left").height()}px`);
        // Resizes the rows to fit on the screen
        // 31 comes from the 30 table cells + 1 for table column headers
        $(".fc-time-grid .fc-slats td").css({
            height: ($("body").outerHeight() - $("#upper").outerHeight()) / 31,
        });
        // Triggers fullCalendar to rescale
        $("#cal").fullCalendar("option", "height", $("#left").outerHeight());
        $("#finals").fullCalendar("option", "height", $("#left").outerHeight());

        // If on a mobile device, show fullscreen calendar
        if (isMobile) {
            if ($("#calendar-btn").hasClass("active")) {
                $("#left").width($(window).width());
                $("#cal").width($(window).width());
                $("#finals").width($(window).width());
            }
            $("#right").width($(window).width());
        }

        // Prevent when on iPad since it hides load/save popovers when clicked
        if (!isiPad) {
            $(".popover").each(function () {
                $(this).popover("hide");
            });
        }
    });

    //#region Calendar Creation
    $("#cal").fullCalendar({
        weekends: false,
        header: false,
        themeSystem: "bootstrap4",
        defaultView: "agendaWeek",
        allDaySlot: false,
        slotEventOverlap: false,
        minTime: "07:00:00",
        maxTime: "22:00:00",
        columnHeaderFormat: "ddd",
        eventRender: function (event, element) {
            renderCoursePopover(element, event);
        },
        eventClick: function (event) {
            // Necessary to keep the $(this) of eventClick in $(".delete-event").click
            let self = $(this);
            self.popover("toggle");
            $(".delete-event").click(function () {
                self.popover("dispose");
                $("#cal").fullCalendar("removeEvents", event._id);
                datatable.row(`#${event.groupId}`).deselect();
                if (event.units && parseInt($("#unitCounter").text()) - parseInt(event.units) >= 0) {
                    $("#unitCounter").text(parseInt($("#unitCounter").text()) - parseInt(event.units));
                }
            });
        },
    });
    $("#finals").fullCalendar({
        header: false,
        firstDay: 6,
        themeSystem: "bootstrap4",
        defaultView: "agendaWeek",
        allDaySlot: false,
        slotEventOverlap: false,
        minTime: "07:00:00",
        maxTime: "22:00:00",
        columnHeaderFormat: "ddd",
        eventRender: function (event, element) {
            renderCoursePopover(element, event, true);
        },
        eventClick: function () {
            $(this).popover("toggle");
        },
    });
    //#endregion

    // Causes fullCalendar to resize after row height was adjusted.
    $(window).trigger("resize");
});
