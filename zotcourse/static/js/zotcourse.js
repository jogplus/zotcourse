var today = new Date();
var monthToInt = {'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11}
var weekDayToString = {'1': 'MO','2': 'TU','3': 'WE','4': 'TH','5': 'FR'}

var COURSE_EVENT_TYPE = 0
var CUSTOM_EVENT_TYPE = 1
var ANTPLANNER_EVENT_TYPE = 2

window.APP_YEAR  = today.getFullYear();
window.APP_MONTH = today.getMonth();
window.APP_DAY   = today.getDate();

window.MON = 1;
window.TUE = 2;
window.WED = 3;
window.THU = 4;
window.FRI = 5;

window.LISTING_CODE_INDEX = 0;
window.LISTING_TYPE_INDEX = 1;
window.LISTING_UNITS_INDEX = 3;
window.LISTING_INSTRUCTOR_INDEX = 4;
window.LISTING_TIME_INDEX = 5;
window.LISTING_ROOM_INDEX = 6;
window.LISTING_FINAL_INDEX = 7;

function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

function ParsedCourseTime(timeString) {
	/*
	Used to parse the horribly inconsistent time string formats
	
	Assumptions:
	1. earliest possible course time is 6am
	2. latest possible course time is 9pm
	3. course durations never exceed 5 hours

	Acceptable Inputs:
	valid start hours        6,7,8,9,10,11,12,1,2,3,4,5,6,7,8,9
	valid start am hours     6,7,8,9,10,11
	valid start pm hours                   12,1,2,3,4,5,6,7,8,9

	valid end hours            7,8,9,10,11,12,1,2,3,4,5,6,7,8,9,10
	valid end am hours         7,8,9,10,11
	valid end pm hours                     12,1,2,3,4,5,6,7,8,9,10
	
	no +12h                                12
	
	Input: "Th &nbsp; 12:30-12:50p "
	*/
	var MAX_DURATION = 5;

	var dashedSplit = timeString.split('-'); // ex. ["Th &nbsp; 12:30", "12:50p "]
	var dayBeginSplit = dashedSplit[0].split('&nbsp;'); // ex. ["Th ", " 12:30"]

	var beginTime = $.trim( dayBeginSplit[dayBeginSplit.length - 1] ); // ex. "6:00"
	var endTime   = $.trim( dashedSplit[1] ); // "6:50p"

	var beginHour = parseInt( beginTime.split(':')[0] );
	var beginMin  = parseInt( beginTime.split(':')[1] );
	
	var endHour = parseInt( endTime.split(':')[0] );
	var endMin = parseInt( endTime.split(':')[1].replace('p', '') );
	var isPm = endTime.indexOf('p') != -1;

	var days = []
	if(timeString.indexOf('M') != -1) {	days.push(window.MON); } 
	if(timeString.indexOf('Tu') != -1) { days.push(window.TUE); } 
	if(timeString.indexOf('W') != -1) {	days.push(window.WED); }
	if(timeString.indexOf('Th') != -1) { days.push(window.THU); }
	if(timeString.indexOf('F') != -1) {	days.push(window.FRI); }

	if(isPm) {
		var military = endHour == 12 ? 12 : endHour + 12
		if(military - beginHour > MAX_DURATION) {
			beginHour += 12;
		} 
		if(endHour != 12) {
			endHour += 12;
		}
	}

	// Ensures that minutes is always two digits
	return {
		'start': beginHour + ':' + ("0" + beginMin).slice(-2),
		'end': endHour + ':' + ("0" + endMin).slice(-2),
		'days': days
	}
}

function FinalParsedCourseTime(timeString) {
	var MAX_DURATION = 5;
	var daySplit = timeString.split(',');
	var timeSplit = daySplit[2].split('-');

	var date = $.trim( daySplit[1] );
	var month = date.split(' ')[0];
	var day = parseInt(date.split(' ')[1]);
	var beginTime = $.trim( timeSplit[0] ); // ex. "6:00"
	var endTime   = $.trim( timeSplit[1] ); // "6:50p"

	var beginHour = parseInt( beginTime.split(':')[0] );
	var beginMin  = parseInt( beginTime.split(':')[1] );
	
	var endHour = parseInt( endTime.split(':')[0] );
	var endMin = parseInt( endTime.split(':')[1].replace('pm', '') );
	var isPm = endTime.indexOf('pm') != -1;

	var weekDay = -1;
	if(timeString.indexOf('Sun') != -1) {	weekDay = 0; } 
	if(timeString.indexOf('Mon') != -1) {	weekDay = 1; } 
	if(timeString.indexOf('Tue') != -1) { weekDay = 2; } 
	if(timeString.indexOf('Wed') != -1) {	weekDay = 3; }
	if(timeString.indexOf('Thu') != -1) { weekDay = 4; }
	if(timeString.indexOf('Fri') != -1) {	weekDay = 5; }
	if(timeString.indexOf('Sat') != -1) {	weekDay = 6; } 

	if(isPm) {
		var military = endHour == 12 ? 12 : endHour + 12
		if(military - beginHour > MAX_DURATION) {
			beginHour += 12;
		} 
		if(endHour != 12) {
			endHour += 12;
		}
	}

	return {
		'beginHour': beginHour,
		'beginMin': beginMin,
		'endHour': endHour,
		'endMin': endMin,
		'weekDay': weekDay,
		'month': month,
		'day': day,
		'date': date
	}
}

function parseRoomString(roomString) {
    // Accepts an html room string (there may or may not be an a tag for any room)
    // Example: <a href="http://www.classrooms.uci.edu/GAC/HH112.html" target="_blank">HH 112</a><br>HH 112
    // Returns an array of rooms. If there are no matches, an empty array is returned.
    roomString = roomString.trim();

    // This will match non-markup text that is followed by the opening of a tag,
    // or with the ending of the string
    var regex = /(\w|\s)+(?=<|$)/g;
    var info = roomString.match(regex) || [];

    return info;
}

function CourseTimeStringParser(courseString, roomString) {
	/* 
	Accepts:
	
	"M &nbsp;  6:30- 8:50p<br>Th &nbsp;  9:00-10:50p"
	MW &nbsp;  6:00- 6:20p 
	Th &nbsp; 12:30-12:50p 
	*/
	var courseTimes = []
	var splitTimes = courseString.split('<br>');
	var rooms = parseRoomString(roomString);
	for(var i in splitTimes) {
		var room = "TBA";
		if (i in rooms && rooms[i].length > 0) {
			room = rooms[i];
		}
		if (splitTimes[i].indexOf('TBA') == -1) {
			var parsedCourse = ParsedCourseTime(splitTimes[i])
			parsedCourse['room'] = room
			courseTimes.push(parsedCourse)
		}
	}
	return courseTimes;
}

function getRandomColorPair() {
	var palette = [
		{color: '#C4A883', borderColor: '#B08B59'},
		{color: '#A7A77D', borderColor: '#898951'},
		{color: '#85AAA5', borderColor: '#5C8D87'},
		{color: '#94A2BE', borderColor: '#5C8D87'},
		{color: '#8997A5', borderColor: '#627487'},
		{color: '#A992A9', borderColor: '#8C6D8C'},
		{color: '#A88383', borderColor: '#A87070'},
		{color: '#E6804D', borderColor: '#DD5511'},
		{color: '#F2A640', borderColor: '#EE8800'},
		{color: '#E0C240', borderColor: '#D6AE00'},
		{color: '#BFBF4D', borderColor: '#AAAA11'},
		{color: '#8CBF40', borderColor: '#66AA00'},
		{color: '#4CB052', borderColor: '#109618'},
		{color: '#65AD89', borderColor: '#329262'},
		{color: '#59BFB3', borderColor: '#22AA99'},
		{color: '#668CD9', borderColor: '#3366CC'},
		{color: '#668CB3', borderColor: '#336699'},
		{color: '#8C66D9', borderColor: '#6633CC'},
		{color: '#B373B3', borderColor: '#994499'},
		{color: '#E67399', borderColor: '#DD4477'},
		{color: '#D96666', borderColor: '#CC3333'}
	];
	return palette[Math.floor(Math.random() * palette.length)];
}

function isCourseAdded(courseCode) {
	var calEvents  = $('#cal').fullCalendar('clientEvents');
	for (var i in calEvents){
		if (calEvents[i].groupId === courseCode)
			return true;
	}
	return false;
}

// Parses the Websoc html to create an array of professor names
// for the createInstructorLinks function
function getInstructorArray(html) {
	var rawInstructorArray = html.split('<br>');
	var cleanInstructorArray = [];
	for (var i=0; i<rawInstructorArray.length; i++) {
		if (rawInstructorArray[i] === '')
			continue;
		else if (rawInstructorArray[i] === 'STAFF')
			cleanInstructorArray.push('STAFF');
		else 
			cleanInstructorArray.push($(rawInstructorArray[i]).html());
	}
	return cleanInstructorArray;
}

// Creates an array of html link elements that direct to RateMyProfessor
function createInstructorLinks(instructorNames) {
	var instructorLinks = [];
	for (var i = 0; i < instructorNames.length; i++) {
		var instructorName = instructorNames[i].trim();
		// Links are not created for STAFF
		if (instructorName == 'STAFF' || instructorName == 'N/A (due to import)') {
			instructorLinks.push(instructorName);
			continue;
		}
		// Splits by ',' to retrieve professor's first name
		var instructorLastName = instructorName.split(',')[0];
		// Splits in case professors have a '-' in their name which causes the RateMyProfessor query to fail
		if (instructorLastName.indexOf('-') !== -1) {
			instructorLastName = instructorName.split('-')[0];
		}
		var link = "https://www.ratemyprofessors.com/search.jsp?queryoption=HEADER&queryBy=teacherName&schoolName=University+of+California+Irvine&schoolID=1074&query="+instructorLastName;
		instructorLinks.push('<a class="instructor-link" href="'+link+'" target="_blank">'+instructorName+'</a>');
	}
	return instructorLinks.join('<br>');
}

function saveSchedule(username) {
	// Retrieves all events currently in the calendar
	var calRawData  = $('#cal').fullCalendar('clientEvents');
	var calCleanData = []
	var usedGroupIds = []
	// Validation
	if (calRawData.length == 0) {
		toastr.warning('Must add at least one course.', 'Empty Schedule');
		return;
	}
	if (username == null || username.length < 5) {
		toastr.warning('Must be at least 5 characters.', 'Schedule Name Too Short');
		return;
	}		
	for (var i in calRawData){
		// Removes duplicate events based on groupId (which is the course code)
		// Duplicates are caused by a class occuring on multiple days
		if (!(usedGroupIds.indexOf(calRawData[i].groupId) >= 0)) {
			var calEventData = {
				id: calRawData[i].id,
				groupId: calRawData[i].groupId,
				title: calRawData[i].title,
				start: calRawData[i].start.format('HH:mm'),
				end: calRawData[i].end.format('HH:mm'),
				color: calRawData[i].color,
				location: calRawData[i].location,
				fullName: calRawData[i].fullName,
				instructor: calRawData[i].instructor,
				final: calRawData[i].final,
				dow: calRawData[i].daysOfTheWeek,
				daysOfTheWeek: calRawData[i].daysOfTheWeek,
				units: calRawData[i].units,
				courseTimes: calRawData[i].courseTimes,
				eventType: calRawData[i].eventType,
			}
			calCleanData.push(calEventData)
			usedGroupIds.push(calRawData[i].groupId)
		}
	}
	// Save to server
	$.ajax({
		url: "/schedules/add",
		type: 'POST',
		data: {
			username: username,
			data: JSON.stringify(calCleanData)
		},
		success: function(data) {
			if (data.success) {
				toastr.success(username, 'Schedule Saved!');
				localStorage.username = username;
				$('#scheduleNameForPrint').html('Zotcourse schedule name: '+username);
			}
			else {
				toastr.error(username, 'Schedule Not Saved');
			}
		}
	});
}

function loadSchedule(username) {
	if (username == null || username == '') {
		toastr.error(username, 'Schedule Not Found');
		return;
	}
	$.ajax({
		url: '/schedule/load',
		data: { username: username },
		success: function(data) {
			if(data.success) {
				var scheduleJSON = JSON.parse(data.data)
				$('#cal').fullCalendar('removeEvents');
				$('#finals').fullCalendar('removeEvents');
				var unitCounter = 0;
				for (var i = 0; i < scheduleJSON.length; i++) {
					// If a single course has different meeting times (ie. Tu 5:00- 7:50p and Th 5:00- 6:20p)
					if (scheduleJSON[i].courseTimes) {
						for (var j = 0; j < scheduleJSON[i].courseTimes.length; j++) {
							scheduleJSON[i].start = scheduleJSON[i].courseTimes[j].start;
							scheduleJSON[i].end = scheduleJSON[i].courseTimes[j].end;
							scheduleJSON[i].dow = scheduleJSON[i].courseTimes[j].days;
							scheduleJSON[i].location = scheduleJSON[i].courseTimes[j].room;
							$('#cal').fullCalendar('renderEvent', scheduleJSON[i]);
						}
					}
					else {
						$('#cal').fullCalendar('renderEvent', scheduleJSON[i]);
					}
					if (scheduleJSON[i].units) {
						unitCounter += parseInt(scheduleJSON[i].units);
					}
				}
				$('#unitCounter').text(unitCounter);
				$('#scheduleNameForPrint').html('Zotcourse schedule name: '+username);
				toastr.success(username, 'Schedule Loaded!');
				localStorage.username = username;
				switchToMainCalendar();
			}
			else {
				toastr.error(username, 'Schedule Not Found');
			}
		}
	});
}

function loadAPSchedule(username) {
	if (username == '') {
		return;
	}
	$.ajax({
		url: '/schedule/loadap',
		data: { username: username },
		success: function(data) {
			if (data.success) {
				$('#cal').fullCalendar('removeEvents');
				for (var i=0; i< data.data.length; i++) {
					data.data[i]['color'] = getRandomColorPair().color;
					var courseCodeSplit = data.data[i]['title'].split('<br>')[0];
					var locationSplit = courseCodeSplit.split(' at ');
					data.data[i]['location'] = locationSplit[1];
					data.data[i]['eventType'] = ANTPLANNER_EVENT_TYPE;
					data.data[i]['title'] = locationSplit[0].replace('&amp;', '&');
				}
				$('#cal').fullCalendar('renderEvents',data.data);
				$('#scheduleNameForPrint').html(username);
				toastr.success(username, 'Schedule Loaded!');
				switchToMainCalendar();
				$('#unitCounter').text(0);
			}
			else {
				toastr.error(username, 'Schedule Not Found');
			}
		}
	});
}

function switchToMainCalendar() {
	if ($('#finals-btn').hasClass('active')) {
		$('#finals').hide();
		$('#cal').show();
		$('#finals-btn').removeClass('active');
		$('#cal').fullCalendar( 'rerenderEvents' );
	}
}

function daysOfTheWeekToStr(dow) {
	var dowStr = [];
	for (var i in dow) {
		dowStr.push(weekDayToString[dow[i]]);
	}
	return dowStr;
}

// JQuery listeners
$(document).ready(function() {
	// Creates a resizable panels using Split.Js
	window.Split(['#left', '#right'], {
		sizes: [50, 50],
		gutterSize: 10,
		minSize: 20,
		elementStyle: function(dim, size, gutterSize){
			return {
				'width': 'calc(' + size + '% - ' + gutterSize*2 + 'px)',
			};
		},
		// Workaround for when iframe can't scroll after dragging on Safari
		onDragEnd: function() {
			$('iframe').css('display', 'none').height();
			$('iframe').css('display', 'block');
		}
	});
	// Adds the ellipsis icon within the gutter
	$('.gutter').append('<i class="fas fa-ellipsis-v"></i>');

	//#region Button Creation
	// Triggers before popover has been shown and hides the other toolbar popovers
	$('.btn').on('show.bs.popover', function () {
		$('.popover').each(function () {
			$(this).popover('hide');
		});
	});

	// Used to close popovers when clicking outside of popover or button
	// Does not work when clicking in iframe
	$('body').on('click', function (e) {
		if (($(e.target).parents('.fc-event-container').length === 0) && 
		$(e.target).parents('.popover').length === 0 &&
		$(e.target).parents('.btn').length === 0 &&
		!($(e.target).hasClass('btn'))) { 
			$('.popover').each(function () {
				$(this).popover('hide');
			});
		}
	});

	$('#whatsnew').popover({
		html: true,
		title: "What's New! 🎉",
		content:'<ul style="list-style-type:disc;">\
				<li>Click on a calendar event for more course info</li>\
				<li>Change course event color</li>\
				<li>RateMyProfessor links</li>\
				<li>View your finals\' schedule</li>\
				<li>View all your courses\' info using the List button</li>\
				<li>Create a custom event</li>\
				<li>Enrolled unit counter</li>\
				<li>Import schedule from Antplanner</li> \
				<li>Resizable panes</li>\
				</ul>\
				<a href="https://goo.gl/forms/YdeevICkr4Ei6HHg1" target="_blank">Bugs or Suggestions?</a>',
		placement: 'bottom',
		container: 'body',
		boundary: 'window',
	});

	$('#save-btn').popover({
		html: true,
		title: "Save Schedule",
		content:'<div class="input-group input-group-sm mb-3">\
					<input id="save-input" value="'+(localStorage.username ? localStorage.username : '')+'" type="text" class="form-control save-input" placeholder="ex. Student Id" aria-label="Schedule\'s save name" aria-describedby="basic-addon2">\
					<div class="input-group-append">\
						<button id="save-button" class="btn btn-outline-primary" type="button">Submit</button>\
					</div>\
				</div>',
		placement: 'bottom',
		container: 'body',
		boundary: 'window',
	});

	// Triggers once popover is shown and awaits for the user to press the enter key or submit button
	$('#save-btn').on('shown.bs.popover', function () {
		// Workaround for popover disappearing on mobile devices
		if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
			var defaultName = localStorage.username ? localStorage.username : '';
			var username = prompt('Please enter your username', defaultName);
			saveSchedule(username);
			$('#save-btn').popover('hide');
		}
		$('#save-input').val(localStorage.username);
		$('#save-input').focus();
		$("#save-input").keypress(function(e){
			if (!e) 
				e = window.event;
			var keyCode = e.keyCode || e.which;
			if (keyCode == '13'){
				saveSchedule($('#save-input').val());
				$('#save-btn').popover('hide');
			}
		});
		$('#save-button').click(function() {
			saveSchedule($('#save-input').val());
			$('#save-btn').popover('hide');
		});
	});

	$('#load-btn').popover({
		html: true,
		title: "Load Schedule",
		content:'<div class="input-group input-group-sm mb-3">\
					<input id="load-input" value="'+(localStorage.username ? localStorage.username : '')+'" type="text" class="form-control" placeholder="ex. Student Id" aria-label="Schedule\'s load name" aria-describedby="basic-addon2">\
					<div class="input-group-append">\
						<button id="load-button" class="btn btn-outline-primary" type="button">Submit</button>\
					</div>\
				</div>',
		placement: 'bottom',
		container: 'body',
		boundary: 'window',
	});

	// Triggers once popover is shown and awaits for the user to press the enter key or submit button
	$('#load-btn').on('shown.bs.popover', function () {
		// Workaround for popover disappearing on mobile devices
		if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
			var defaultName = localStorage.username ? localStorage.username : '';
			var username = prompt('Please enter your username', defaultName);
			loadSchedule(username);
			$('#load-btn').popover('hide');
		}
		$('#load-input').val(localStorage.username);
		$('#load-input').focus();
		$("#load-input").keypress(function(e){
			if (!e) 
				e = window.event;
			var keyCode = e.keyCode || e.which;
			if (keyCode == '13'){
				loadSchedule($('#load-input').val());
				$('#load-btn').popover('hide');
			}
		});
		$('#load-button').click(function() {
			loadSchedule($('#load-input').val());
			$('#load-btn').popover('hide');
		});
	});

	$('#load-ap-btn').popover({
		html: true,
		title: "Import from Antplanner",
		content:'<div class="input-group input-group-sm mb-3">\
					<div style="padding-bottom: 8px">Note: Not all course info will be available in event popup.</div>\
					<input id="load-ap-input" type="text" class="form-control" placeholder="ex. Student Id" aria-label="Schedule\'s AP load name" aria-describedby="basic-addon2">\
					<div class="input-group-append">\
						<button id="load-ap-button" class="btn btn-outline-primary" type="button">Submit</button>\
					</div>\
				</div>',
		placement: 'bottom',
		container: 'body',
		boundary: 'window',
	});

	// Triggers once popover is shown and awaits for the user to press the enter key or submit button
	$('#load-ap-btn').on('shown.bs.popover', function () {
		// Workaround for popover disappearing on mobile devices
		if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
			var defaultName = localStorage.username ? localStorage.username : '';
			var username = prompt('Please enter your Antplanner username', defaultName);
			loadAPSchedule(username);
			$('#load-ap-btn').popover('hide');
		}
		$('#load-ap-input').focus();
		$("#load-ap-input").keypress(function(e){
			if (!e) 
				e = window.event;
			var keyCode = e.keyCode || e.which;
			if (keyCode == '13'){
				loadAPSchedule($('#load-ap-input').val());
				$('#load-ap-btn').popover('hide');
			}
		});
		$('#load-ap-button').click(function() {
			loadAPSchedule($('#load-ap-input').val());
			$('#load-ap-btn').popover('hide');
		});
	});

	// Temporarily changes size of calendar for printing.
	// This must be done with JS instead of just styling because
	// fullCalendar must rescale all of the events for the bigger event sizes
	$('#print-btn').click(function() {
		if (navigator.userAgent.indexOf("Chrome") != -1) {
			switchToMainCalendar();
			var tempLeftSize = $("#left").outerWidth();
			$("#right").hide();
			// Not 100% or else it will not fit on letter paper
			$("#left").outerWidth('99.5%');
			$('#cal').css('width', '100%');
			$('th, td, tr').css('border', '2px solid #bfbfbf');
			$('.fc-minor').css('border-top', '3px dotted #bfbfbf')
			$('#soc').show();
			$('#resize-btn').removeClass('active');
			// Sets the name of the schedule as the header for the page
			document.title = ($('#scheduleNameForPrint').html() ? $('#scheduleNameForPrint').html() : 'Zotcourse - Schedule Planner for UCI' );
			// Sets the rows to have a larger height for printing
			$('.fc-time-grid .fc-slats td').css('height', '46');
			// This triggers fullCalendar to rescale
			$('#cal').fullCalendar('option', 'height', $('#left').outerHeight() - $('#upper').outerHeight());
			$('.popover').each(function () {
				$(this).popover('hide');
			});

			window.print();
			// Resets page back to original size
			$("#right").show();
			$('.gutter').show();
			$("#left").outerWidth(tempLeftSize-20);
			$('th, td, tr').css('border', '');
			$('.fc-time-grid .fc-slats td').css({
				'height': ($('#left').outerHeight() - $('#upper').outerHeight()) / 31,
			});
			document.title = 'Zotcourse - Schedule Planner for UCI';
		}
		else {
			toastr.error('Printing is currently only supported in Chrome', 'Unsupported Browser');
		}
	});

	$('#clear-cal-btn').on('click', function() {
		$('.popover').each(function () {
			$(this).popover('hide');
		});
		$('#cal').fullCalendar('removeEvents');
		$('#finals').fullCalendar('removeEvents');
		switchToMainCalendar();
		$('#unitCounter').text(0);
	});

	$('#resize-btn').click(function() {
		$('.popover').each(function () {
			$(this).popover('hide');
		});
		if ($(this).hasClass('active')) {
			$('#finals').animate({width: '100%'});
			$('#cal').animate({width: '100%'});
			$('#soc').show();
			$('.gutter').show();
			$(this).removeClass('active');
		}
		else {
			$(this).addClass('active');
			$('#soc').hide();
			$('.gutter').hide();
			$('#cal').animate({width: $(document).width()});
			$('#finals').animate({width: $(document).width()});
		}
	});

	$('#finals-btn').click(function() {
		$('.popover').each(function () {
			$(this).popover('hide');
		});
		if ($(this).hasClass('active')) {
			$('#finals').hide();
			$('#cal').show();
			$(this).removeClass('active');
			$('#cal').fullCalendar( 'rerenderEvents' );
		}
		else {
			$('#finals').show();
			$('#cal').hide();
			$(this).addClass('active');
			$('#finals').fullCalendar('removeEvents');
			var calRawData  = $('#cal').fullCalendar('clientEvents');
			var usedGroupIds = []
			for (var i in calRawData) {
				// Checks to make sure that finals attribute is not empty, TBA, or from import
				if (calRawData[i].eventType == COURSE_EVENT_TYPE &&
					$.trim(calRawData[i].final.replace(/&nbsp;/g, '')) != '' &&
					$.trim(calRawData[i].final.replace(/&nbsp;/g, '')) != 'TBA' &&
					$.trim(calRawData[i].final.replace(/&nbsp;/g, '')) != 'N/A (due to import)' &&
					!(usedGroupIds.indexOf(calRawData[i].groupId) >= 0)) {
					var finalParsed = FinalParsedCourseTime(calRawData[i].final);
					$('#finals').fullCalendar("renderEvent",{
						id:	calRawData[i].id,
						groupId: calRawData[i].groupId,
						start: finalParsed.beginHour + ':' + finalParsed.beginMin,
						end: finalParsed.endHour + ':' + finalParsed.endMin,
						// Title is parsed from after the type of class (ie. Lec, Lab, Dis)
						title: calRawData[i].title.split(/\s(.+)/)[1],
						dow: [finalParsed.weekDay],
						color: calRawData[i].color,
						fullName: calRawData[i].fullName,
						instructor: calRawData[i].instructor,
						date: finalParsed.date
					});
					usedGroupIds.push(calRawData[i].groupId);
				}
			}
			$('#finals').fullCalendar('rerenderEvents');
		}
		$(window).trigger('resize');
	});

	$('#list-btn').click(function() {
		$('.popover').each(function () {
			$(this).popover('hide');
		});
		var courseCodes = '';
		var calRawData  = $('#cal').fullCalendar('clientEvents');
		var added = [];
		for (var i in calRawData) {
			// If valid eventType and not already added
			if (calRawData[i].eventType != CUSTOM_EVENT_TYPE &&
			 	added.indexOf(calRawData[i].groupId) == -1) {
				courseCodes += calRawData[i].groupId + ',';
				added.push(calRawData[i].groupId);
			}
		}
		if (courseCodes == '') {
			toastr.warning('Must have at least 1 course added.', 'Cannot List Courses');
		}
		else {
			// 'data-term' attribute is rendered from index template and defaults to latest term
			document.getElementById('soc').src = '/websoc/listing?YearTerm='+$('#list-btn').attr('data-term')+'&\
			Breadth=ANY&Dept=&CourseCodes='+courseCodes+'&CourseNum=&Division=ANY&\
			InstrName=&CourseTitle=&ClassType=ALL&Units=&Days=&StartTime=&EndTime=&\
			FullCourses=ANY&ShowComments=on&ShowFinals=on';
		}
	});

	$('#export-btn').popover({
		html: true,
		title: "Export to iCal",
		content:'<div class="input-group input-group-sm mb-3">\
					<div style="padding-bottom: 8px">Downloads an .ics file which can import your courses into Google Calendar. \
					<a target="_blank" href="https://support.google.com/calendar/answer/37118#import_to_gcal">Click here to learn how.</a></div>\
					<div style="margin:auto;"><button id="export-button" class="btn btn-primary" type="button">Download</button></div>\
				</div>',
		placement: 'bottom',
		container: 'body',
		boundary: 'window',
	});
	$('#export-btn').on('shown.bs.popover', function () {
		$('#export-button').click(function() {
			$('.popover').each(function () {
				$(this).popover('hide');
			});
			var calRawData  = $('#cal').fullCalendar('clientEvents');
			// Year is extracted from most recent term in Schedule of Classes search
			var year = parseInt($('#list-btn').attr('data-term').substring(0,4));
			var firstMonday;
			for (var i in calRawData) {
				// Prevents courses with no final or imported from Antplanner from being parsed
				if (calRawData[i].eventType == COURSE_EVENT_TYPE &&
					calRawData[i].final.replace(/&nbsp;/g, '').trim() != '' && 
					calRawData[i].final != 'N/A (due to import)' &&
					calRawData[i].final != 'TBA') {
					// At least one class with a final is necessary since the final is the
					// only way to determine when the first week of class is
					var finalParsed = FinalParsedCourseTime(calRawData[i].final);
					firstMonday = new Date(year, monthToInt[finalParsed.month], finalParsed.day, finalParsed.beginHour);
					// Gets the Monday AFTER finals week is over
					// If Sat,Sun,Mon (6,0,1) add 7 to get Monday AFTER finals week
					var shift = (1 + 7 - firstMonday.getDay()) % 7;
					if ([6,0,1].includes(firstMonday.getDay())) {
						shift += 7;
					}
					firstMonday.setDate(firstMonday.getDate() + shift)
					// Move backwards 10 weeks during quarter + 1 week of finals = 77 days
					firstMonday.setDate(firstMonday.getDate()-77);
					break;
				}
			}
			if (firstMonday != null) {
				var added = [];
				var cal = ics();
				for (i in calRawData) {
					if (added.indexOf(calRawData[i].groupId) == -1) {
						var startDate = new Date(firstMonday);
						var daysOfTheWeek = calRawData[i].daysOfTheWeek.sort();
						// Add the number of days until first meeting starting from Monday (0)
						// Only the first meeting of the week is needed since byday handles repeats
						// daysOfTheWeek - 1 because Monday has an index of 1 instead if 0
						startDate.setDate(startDate.getDate()+(daysOfTheWeek[0]-1));
						var endDate = new Date(startDate);
						startDate.setHours(calRawData[i].start.hours());
						startDate.setMinutes(calRawData[i].start.minutes());
						endDate.setHours(calRawData[i].end.hours());
						endDate.setMinutes(calRawData[i].end.minutes());
						var rrule = {
							'freq': 'WEEKLY',
							// Count is (# of weeks in quarter) * (# of times class occurs in a week)
							'count': 10*calRawData[i].daysOfTheWeek.length,
							'byday': daysOfTheWeekToStr(daysOfTheWeek)
						};
						// Use \\n instead of \n due to ics.js issue #26 
						if (calRawData[i].eventType == CUSTOM_EVENT_TYPE) {
							// No location or description for custom events
							cal.addEvent(calRawData[i].title, '', '', startDate, endDate, rrule);
						}
						else {
							cal.addEvent(calRawData[i].title, 
								'Course Title: '+calRawData[i].fullName+
								'\\nInstructor: '+calRawData[i].instructor+
								'\\nCode: '+calRawData[i].groupId+
								'\\nFinal: '+calRawData[i].final,
								calRawData[i].location, startDate, endDate, rrule);
						}
						if (calRawData[i].eventType == COURSE_EVENT_TYPE &&
							calRawData[i].final.replace(/&nbsp;/g, '').trim() != '' && 
							calRawData[i].final != 'N/A (due to import)' &&
							calRawData[i].final != 'TBA') {
							var finalTime = FinalParsedCourseTime(calRawData[i].final);
							var startTime = new Date(year, monthToInt[finalTime.month], finalTime.day, finalTime.beginHour, finalTime.beginMin);
							var endTime = new Date(year, monthToInt[finalTime.month], finalTime.day, finalTime.endHour, finalTime.endMin);
							// Title is parsed from after the type of class (ie. Lec, Lab, Dis)
							cal.addEvent('Final '+calRawData[i].title.split(/\s(.+)/)[1], 
								'Course Title: '+calRawData[i].fullName+
								'\\nInstructor: '+calRawData[i].instructor+
								'\\nCode: '+calRawData[i].groupId,
								'Check portal.uci.edu', startTime, endTime);
						}
						added.push(calRawData[i].groupId);
					}
				}
				cal.download();
			}
			else {
				toastr.warning('Must have at least 1 course with a final added.', 'Cannot Export Courses');
			}
		});
	});

	$('#event-btn').popover({
		html: true,
		title: "Add a Custom Event",
		content:'<div>\
					<input id="event-name" type="text" placeholder="Event Name" class="form-control form-control-lg">\
					<div style="display: flex; justify-content: space-between; width:100%">\
					<select id="event-start" class="time custom-select">\
					<option value="07:00">7:00am</option>\
					<option value="07:30">7:30am</option>\
					<option value="08:00">8:00am</option>\
					<option value="08:30">8:30am</option>\
					<option value="09:00">9:00am</option>\
					<option value="09:30">9:30am</option>\
					<option value="10:00">10:00am</option>\
					<option value="10:30">10:30am</option>\
					<option value="11:00">11:00am</option>\
					<option value="11:30">11:30am</option>\
					<option value="12:00" selected>12:00pm</option>\
					<option value="12:30">12:30pm</option>\
					<option value="13:00">1:00pm</option>\
					<option value="13:30">1:30pm</option>\
					<option value="14:00">2:00pm</option>\
					<option value="14:30">2:30pm</option>\
					<option value="15:00">3:00pm</option>\
					<option value="15:30">3:30pm</option>\
					<option value="16:00">4:00pm</option>\
					<option value="16:30">4:30pm</option>\
					<option value="17:00">5:00pm</option>\
					<option value="17:30">5:30pm</option>\
					<option value="18:00">6:00pm</option>\
					<option value="18:30">6:30pm</option>\
					<option value="19:00">7:00pm</option>\
					<option value="19:30">7:30pm</option>\
					<option value="20:00">8:00pm</option>\
					<option value="20:30">8:30pm</option>\
					<option value="21:00">9:00pm</option>\
					<option value="21:30">9:30pm</option>\
					</select>\
					<span style="padding-top: 10px; margin-left:10px; margin-right:10px">to</span>\
					<select id="event-end" class="time custom-select">\
					<option value="07:30">7:30am</option>\
					<option value="08:00">8:00am</option>\
					<option value="08:30">8:30am</option>\
					<option value="09:00">9:00am</option>\
					<option value="09:30">9:30am</option>\
					<option value="10:00">10:00am</option>\
					<option value="10:30">10:30am</option>\
					<option value="11:00">11:00am</option>\
					<option value="11:30">11:30am</option>\
					<option value="12:00">12:00pm</option>\
					<option value="12:30">12:30pm</option>\
					<option value="13:00" selected>1:00pm</option>\
					<option value="13:30">1:30pm</option>\
					<option value="14:00">2:00pm</option>\
					<option value="14:30">2:30pm</option>\
					<option value="15:00">3:00pm</option>\
					<option value="15:30">3:30pm</option>\
					<option value="16:00">4:00pm</option>\
					<option value="16:30">4:30pm</option>\
					<option value="17:00">5:00pm</option>\
					<option value="17:30">5:30pm</option>\
					<option value="18:00">6:00pm</option>\
					<option value="18:30">6:30pm</option>\
					<option value="19:00">7:00pm</option>\
					<option value="19:30">7:30pm</option>\
					<option value="20:00">8:00pm</option>\
					<option value="20:30">8:30pm</option>\
					<option value="21:00">9:00pm</option>\
					<option value="21:30">9:30pm</option>\
					<option value="22:00">10:00pm</option>\
					</select>\
					</div>\
					<div style="display: flex; justify-content: space-between; width:100%; margin-top: 10px" class="weekDays-selector">\
					<input type="checkbox" name="weekday-check" data="1" id="weekday-mon" class="weekday" />\
					<label for="weekday-mon">M</label>\
					<input type="checkbox" name="weekday-check" data="2" id="weekday-tue" class="weekday" />\
					<label for="weekday-tue">T</label>\
					<input type="checkbox" name="weekday-check" data="3" id="weekday-wed" class="weekday" />\
					<label for="weekday-wed">W</label>\
					<input type="checkbox" name="weekday-check" data="4" id="weekday-thu" class="weekday" />\
					<label for="weekday-thu">T</label>\
					<input type="checkbox" name="weekday-check" data="5" id="weekday-fri" class="weekday" />\
					<label for="weekday-fri">F</label>\
					</div>\
					<div style="display: flex;  justify-content: center;"><button id="event-button" class="btn btn-primary" type="button">Add Event</button></div>\
				</div>',
		placement: 'bottom',
		container: 'body',
		boundary: 'window',
	});
	$('#event-btn').on('shown.bs.popover', function () {
		$('#event-button').click(function() {
			var days = $('input[name=weekday-check]:checked');
			weekDays = []
			for (var i = 0; i < days.length; i++) {
				weekDays.push(parseInt($(days[i]).attr("data")))
			}
			if ($("#event-name").val().length <= 0 || $("#event-name").val().length > 25) {
				toastr.warning('Name must be between 1 and 25 characters.', 'Event Name');
			}
			else if ($("#event-start").val() >= $("#event-end").val()) {
				toastr.warning('Start time must come before end time.', 'Event Time');
			}
			else if (weekDays.length == 0) {
				toastr.warning('Must have at least 1 weekday selected.', 'Event Weekday');
			}
			else {
				$('#cal').fullCalendar("renderEvent",{
					id:	S4(),
					groupId: S4(),
					start: $("#event-start").val(),
					end: $("#event-end").val(),
					title: $("#event-name").val(),
					dow: weekDays,
					color: getRandomColorPair().color,
					daysOfTheWeek: weekDays,
					fullName: $("#event-name").val(),
					eventType: CUSTOM_EVENT_TYPE
				});
				switchToMainCalendar();
			}
		});
	});
	//#endregion

	// Whenever the left panel changes sizes, resizes the right panel.
	// Also accounts for when the user zooms in/out
	$(window).resize(function() {
		// Resizes the gutter bar to match the height of the left panel
		$('.gutter').height($('#left').height()+'px');
		// Resizes the rows to fit on the screen
		// 31 comes from the 30 table cells + 1 for table column headers
		$('.fc-time-grid .fc-slats td').css({
			'height': ($('body').outerHeight() - $('#upper').outerHeight()) / 31,
		});
		// Triggers fullCalendar to rescale
		$('#cal').fullCalendar('option', 'height', $('#left').outerHeight());
		$('#finals').fullCalendar('option', 'height', $('#left').outerHeight());
		// Hides all open popovers to prevent them from drifting while resize is occuring
		$('.popover').each(function () {
			$(this).popover('hide');
		});
	});

	//#region Calendar Creation
	$('#cal').fullCalendar({
		weekends: false,
		header: false,
		themeSystem: 'bootstrap4',
		defaultView: 'agendaWeek',
		allDaySlot: false,
		slotEventOverlap: false,
		minTime: '07:00:00',
		maxTime: '22:00:00',
		columnHeaderFormat: 'ddd',
		height: $('#left').outerHeight(),
		eventRender: function(event, element) {
			var colorpickerId = S4();
			// Hides all open popovers when adding a new event since it was causing
			// currently opened popovers to freeze.
			$('.popover').each(function () {
				$(this).popover('hide');
			});
			if (event.eventType == CUSTOM_EVENT_TYPE) {
				element.popover({
					html:true,
					title: (event.fullName) ? event.fullName : '',
					content:'<table style="width:100%; margin-bottom:3%">\
							<tr>\
								<td>Color</td>\
								<td></td>\
								<td align="right"><input id="colorpicker-'+colorpickerId+'" type="text"/></td>\
							</tr>\
							</table>\
							<button style="width:100%" class="btn btn-sm btn-outline-primary delete-event">Remove <i class="fas fa-trash-alt"></i></button>',
					trigger:'focus',
					placement:'right',
					container:'body',
				});
			}
			else {
				element.popover({
					html:true,
					title: (event.fullName) ? event.fullName : '',
					content:'<table style="width:100%; margin-bottom:3%">\
							<tr>\
								<td>Code</td>\
								<td></td>\
								<td align="right">'+event.groupId+'</td>\
							</tr>\
							<tr>\
								<td>Location</td>\
								<td></td>\
								<td align="right">'+((event.location) ? event.location : '')+'</td>\
							</tr>\
							<tr>\
								<td>Instructor</td>\
								<td>&nbsp;&nbsp;</td>\
								<td align="right">'+((event.instructor) ? createInstructorLinks(event.instructor) : 'N/A')+'</td>\
							</tr>\
							<tr>\
								<td>Final</td>\
								<td></td>\
								<td align="right">'+ ((event.final !== '&nbsp;' ) ? ((event.final) ? event.final : 'N/A') : 'See Lecture')+'</td>\
							</tr>\
							<tr>\
								<td>Color</td>\
								<td></td>\
								<td align="right"><input id="colorpicker-'+colorpickerId+'" type="text"/></td>\
							</tr>\
							</table>\
							<button style="width:100%" class="btn btn-sm btn-outline-primary delete-event">Remove <i class="fas fa-trash-alt"></i></button>',
					trigger:'focus',
					placement:'right',
					container:'body',
				});
			}
			element.on('inserted.bs.popover', function() {
				$('#colorpicker-'+colorpickerId).spectrum({
					color: event.color,
					showPaletteOnly: true,
					togglePaletteOnly: true,
					togglePaletteMoreText: 'more',
					togglePaletteLessText: 'less',
					hideAfterPaletteSelect: true,
					preferredFormat: "hex",
					showInput: true,
					palette: [["#C4A883", "#A7A77D", "#85AAA5", "#94A2BE", "#8997A5",
								"#A992A9", "#A88383", "#E6804D", "#F2A640", "#E0C240",
								"#BFBF4D", "#8CBF40", "#4CB052", "#65AD89", "#59BFB3",
								"#668CD9", "#668CB3", "#8C66D9", "#B373B3", "#E67399",
								"#D96666"]],
					change: function(color) {
						$('#colorpicker-'+colorpickerId).spectrum('destroy');
						$('#colorpicker-'+colorpickerId).hide();
						// Must remove and rerender the event manually since updateEvent is not working
						$('#cal').fullCalendar('removeEvents', event._id);
						$('#cal').fullCalendar('renderEvent', {
							_id: event._id,
							id:	event.id,
							groupId: event.groupId,
							start: event.start.format('HH:mm'),
							end: event.end.format('HH:mm'),
							title: event.title,
							dow: event.daysOfTheWeek,
							color: color.toHexString(),
							daysOfTheWeek: event.daysOfTheWeek,
							location: event.location,
							fullName: event.fullName,
							instructor: event.instructor,
							final: event.final,
							units: event.units,
							courseTimes: event.courseTimes,
							eventType: event.eventType
						});
					}
				});
			});
			// Must manually destroy colorpicker or else it never gets deleted.
			// Also hides the colorpicker input element so it does not appear briefly
			// after being destroyed.
			element.on('hide.bs.popover', function() {
				$('#colorpicker-'+colorpickerId).spectrum('destroy');
				$('#colorpicker-'+colorpickerId).hide();
			});
			// Only allows for one popover to be open at a time
			element.on('show.bs.popover', function() {
				$('.popover').each(function () {
					$(this).popover('hide');
				});
			});
		},
		eventClick: function(event) {
			// Necessary to keep the $(this) of eventClick in $(".delete-event").click
			var $this = $(this);
			$this.popover('toggle');
			$(".delete-event").click(function() {
				$this.popover('dispose');
				$('#cal').fullCalendar('removeEvents', event._id);
				if (event.units && parseInt($('#unitCounter').text())-parseInt(event.units) >= 0) {
					$('#unitCounter').text(parseInt($('#unitCounter').text())-parseInt(event.units));
				}
			});
		}
	});
	$('#finals').fullCalendar({
		header: false,
		firstDay: 6,
		themeSystem: 'bootstrap4',
		defaultView: 'agendaWeek',
		allDaySlot: false,
		slotEventOverlap: false,
		minTime: '07:00:00',
		maxTime: '22:00:00',
		columnHeaderFormat: 'ddd',
		height: $('#left').outerHeight(),
		eventRender: function(event, element) {
			// Hides all open popovers when adding a new event since it was causing
			// currently opened popovers to freeze.
			$('.popover').each(function () {
				$(this).popover('hide');
			});
			element.popover({
				html:true,
				title: (event.fullName) ? event.fullName : '',
				content:'<table style="width:100%">\
						<tr>\
							<td>Code</td>\
							<td></td>\
							<td align="right">'+event.groupId+'</td>\
						</tr>\
						<tr>\
							<td>Date</td>\
							<td></td>\
							<td align="right">'+event.date+'</td>\
						</tr>\
						<tr>\
							<td>Instructor</td>\
							<td>&nbsp;&nbsp;</td>\
							<td align="right">'+((event.instructor) ? createInstructorLinks(event.instructor) : 'N/A')+'</td>\
						</tr>\
						</table>',
				trigger:'focus',
				placement:'right',
				container:'body',
			});

			// Only allows for one popover to be open at a time
			element.on('show.bs.popover', function() {
				$('.popover').each(function () {
					$(this).popover('hide');
				});
			});
		},
		eventClick: function() {
			// Necessary to keep the $(this) of eventClick in $(".delete-event").click
			var $this = $(this);
			$this.popover('toggle');
		}
	});
	//#endregion

	// The left div height divided by the number of calendar rows
	// 31 comes from the 30 table cells + 1 for table column headers
	$('.fc-time-grid .fc-slats td').css({
		'height': ($('#left').outerHeight()) / 31,
	})

	// Causes fullCalendar to resize after row height was adjusted.
	$(window).trigger('resize');

	$('#soc').bind('load', function(){
		var $listingContext = $('.course-list', $('#soc').contents());
		var $courseRow = $("tr[valign*='top']:not([bgcolor='#fff0ff'])", $listingContext);

		$courseRow.hover(
			function() {
				$(this).css({'color': '#ff0000', 'cursor': 'pointer'});
			},
			function() {
				$(this).css({'color': '#000000', 'cursor': 'default'});
			}
		);

		$courseRow.on('click', function() {
			var timeString = $(this).find('td').eq(window.LISTING_TIME_INDEX).html();
			var roomString = $(this).find('td').eq(window.LISTING_ROOM_INDEX).html();
			var courseTimes = CourseTimeStringParser(timeString, roomString)

			// Ignore if course is "TBA"
			if(courseTimes.length == 0) {
				toastr.warning('Course is TBA');
				return;
			}

			var courseCode = $(this).find('td').eq(window.LISTING_CODE_INDEX).text();

			// Ignore if course already added
			if(isCourseAdded(courseCode)) {
				toastr.warning('Course Already Added');
				return;
			}

			// Parses Websoc result to find course elements in the row
			var courseName = $.trim( $(this).prevAll().find('.CourseTitle').last().html().split('<font')[0].replace(/&nbsp;/g, '').replace(/&amp;/g, '&') )
			var fullCourseName = $(this).prevAll().find('.CourseTitle').last().find('b').html();
			var classType = $(this).find('td').eq(window.LISTING_TYPE_INDEX).html();
			var instructor = getInstructorArray($(this).find('td').eq(window.LISTING_INSTRUCTOR_INDEX).html());
			var final = $(this).find('td').eq(window.LISTING_FINAL_INDEX).html();
			var units = $(this).find('td').eq(window.LISTING_UNITS_INDEX).html();
			var colorPair = getRandomColorPair();
			$('#unitCounter').text(parseInt($('#unitCounter').text())+parseInt(units));

			// Iterate through course times (a course may have different meeting times)
			var courseID = S4()
			for(var i in courseTimes) {
				var parsed = courseTimes[i];
				$('#cal').fullCalendar("renderEvent",{
					id:	courseID,
					groupId: courseCode,
					start: parsed.start,
					end: parsed.end,
					title: classType + ' ' + courseName,
					dow: parsed.days,
					color: colorPair.color,
					daysOfTheWeek: parsed.days,
					location: parsed.room,
					fullName: fullCourseName,
					instructor: instructor,
					final: final,
					units: units,
					courseTimes: courseTimes,
					eventType: COURSE_EVENT_TYPE
				});
			}
			switchToMainCalendar();
		});
	});
});