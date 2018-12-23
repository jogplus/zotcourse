var today = new Date();

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

	return {
		'beginHour': beginHour,
		'beginMin': beginMin,
		'endHour': endHour,
		'endMin': endMin,
		'days': days
	}
}

function FinalParsedCourseTime(timeString) {
	var MAX_DURATION = 5;
	var daySplit = timeString.split(',');
	var timeSplit = daySplit[2].split('-');

	var date = $.trim( daySplit[1] );
	var beginTime = $.trim( timeSplit[0] ); // ex. "6:00"
	var endTime   = $.trim( timeSplit[1] ); // "6:50p"

	var beginHour = parseInt( beginTime.split(':')[0] );
	var beginMin  = parseInt( beginTime.split(':')[1] );
	
	var endHour = parseInt( endTime.split(':')[0] );
	var endMin = parseInt( endTime.split(':')[1].replace('pm', '') );
	var isPm = endTime.indexOf('pm') != -1;

	var day = -1;
	if(timeString.indexOf('Sun') != -1) {	day = 0; } 
	if(timeString.indexOf('Mon') != -1) {	day = 1; } 
	if(timeString.indexOf('Tue') != -1) { day = 2; } 
	if(timeString.indexOf('Wed') != -1) {	day = 3; }
	if(timeString.indexOf('Thu') != -1) { day = 4; }
	if(timeString.indexOf('Fri') != -1) {	day = 5; }
	if(timeString.indexOf('Sat') != -1) {	day = 6; } 

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
		'day': day,
		'date': date
	}
}

function CourseTimeStringParser(courseString) {
	/* 
	Accepts:
	
	"M &nbsp;  6:30- 8:50p<br>Th &nbsp;  9:00-10:50p"
	MW &nbsp;  6:00- 6:20p 
	Th &nbsp; 12:30-12:50p 
	*/
	var courseTimes = []
	var splitTimes = courseString.split('<br>');
	for(var i in splitTimes) {
		courseTimes.push( ParsedCourseTime(splitTimes[i]) )
	}
	return courseTimes;
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
				units: calRawData[i].units
			}
			calCleanData.push(calEventData)
			usedGroupIds.push(calRawData[i].groupId)
		}
	}
	// Validation
	if (username == null) {
		return;
	}
	if (username.length < 5) {
		toastr.warning('Must be at least 5 characters.', 'Schedule Name Too Short');
		return;
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
	if (username == '') {
		return;
	}
	$.ajax({
		url: '/schedule/load',
		data: { username: username },
		success: function(data) {
			if(data.success) {
				$('#cal').fullCalendar('removeEvents');
				$('#finals').fullCalendar('removeEvents');
				$('#cal').fullCalendar('renderEvents', JSON.parse(data.data));
				var unitData = JSON.parse(data.data);
				var unitCounter = 0;
				for (var i = 0; i < unitData.length; i++) {
					if (unitData[i].units) {
						unitCounter += parseInt(unitData[i].units);
					}
				}
				$('#unitCounter').text(unitCounter);
				$('#scheduleNameForPrint').html('Zotcourse schedule name: '+username);
				toastr.success(username, 'Schedule Loaded!');
				localStorage.username = username;
				if ($('#finals-btn').hasClass('active')) {
					$('#finals').hide();
					$('#cal').show();
					$('#finals-btn').removeClass('active');
					$('#cal').fullCalendar( 'rerenderEvents' );
				}
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
					data.data[i]['title'] = locationSplit[0].replace('&amp;', '&');
				}
				$('#cal').fullCalendar('renderEvents',data.data);
				$('#scheduleNameForPrint').html(username);
				toastr.success(username, 'Schedule Loaded!');
				if ($('#finals-btn').hasClass('active')) {
					$('#finals').hide();
					$('#cal').show();
					$('#finals-btn').removeClass('active');
					$('#cal').fullCalendar( 'rerenderEvents' );
				}
				$('#unitCounter').text(0);
			}
			else {
				toastr.error(username, 'Schedule Not Found');
			}
		}
	});
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
		content:'<ul style="list-style-type:disc; margin-left:15px">\
				<li>Click on a calendar event for more course info</li>\
				<li>Change course event color</li>\
				<li>RateMyProfessor links in calendar event and Websoc results</li>\
				<li>Course event title shows if it is Lec, Dis, Lab, etc.</li>\
				<li>Import schedule from Antplanner</li> \
				<li>Calendar adjusts to screen size</li>\
				<li>Resizable panes</li>\
				<li>Better print formatting. (Calendar fits entirely on one page!)</li>\
				</ul>',
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
	});

	$('#clear-cal-btn').on('click', function() {
		$('.popover').each(function () {
			$(this).popover('hide');
		});
		$('#cal').fullCalendar('removeEvents');
		$('#finals').fullCalendar('removeEvents');
		if ($('#finals-btn').hasClass('active')) {
			$('#finals').hide();
			$('#cal').show();
			$('#finals-btn').removeClass('active');
			$('#cal').fullCalendar( 'rerenderEvents' );
		}
		$('#unitCounter').text(0);
	});

	$('#resize-btn').click(function() {
		$('.popover').each(function () {
			$(this).popover('hide');
		});
		if ($(this).hasClass('active')) {
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
				if ($.trim(calRawData[i].final.replace(/&nbsp;/g, '')) != '' &&
					$.trim(calRawData[i].final.replace(/&nbsp;/g, '')) != 'TBA' &&
					$.trim(calRawData[i].final.replace(/&nbsp;/g, '')) != 'N/A (due to import)' &&
					!(usedGroupIds.indexOf(calRawData[i].groupId) >= 0)) {
					var finalParsed = FinalParsedCourseTime(calRawData[i].final);
					$('#finals').fullCalendar("renderEvent",{
						id:	calRawData[i].id,
						groupId: calRawData[i].groupId,
						start: finalParsed.beginHour + ':' + finalParsed.beginMin,
						end: finalParsed.endHour + ':' + finalParsed.endMin,
						title: calRawData[i].title.split(/\s(.+)/)[1],
						dow: [finalParsed.day],
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
		for (var i in calRawData) {
			courseCodes += calRawData[i].groupId + ','
		}
		if (courseCodes == '') {
			toastr.warning('Must have at least 1 course added.', 'Cannot List Courses');
		}
		else {
			console.log($('#list-btn').attr('data-term'))
			document.getElementById('soc').src = '/websoc/listing?YearTerm='+$('#list-btn').attr('data-term')+'&\
			Breadth=ANY&Dept=&CourseCodes='+courseCodes+'&CourseNum=&Division=ANY&\
			InstrName=&CourseTitle=&ClassType=ALL&Units=&Days=&StartTime=&EndTime=&\
			FullCourses=ANY&ShowComments=on&ShowFinals=on';
		}
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
			element.popover({
				html:true,
				title: (event.fullName) ? event.fullName : '',
				content:'<table style="width:100%">\
									<tr>\
										<td>Code</td>\
										<td align="right">'+event.groupId+'</td>\
									</tr>\
									<tr>\
										<td>Location</td>\
										<td align="right">'+((event.location) ? event.location : '')+'</td>\
									</tr>\
									<tr>\
										<td>Instructor</td>\
										<td align="right">'+((event.instructor) ? createInstructorLinks(event.instructor) : 'N/A')+'</td>\
									</tr>\
									<tr>\
										<td>Final</td>\
										<td align="right">'+ ((event.final !== '&nbsp;' ) ? ((event.final) ? event.final : 'N/A') : 'See Lecture')+'</td>\
									</tr>\
									<tr>\
										<td>Color</td>\
										<td align="right"><input id="colorpicker-'+colorpickerId+'" type="text"/></td>\
									</tr>\
									</table>\
									<button class="btn btn-sm btn-outline-primary delete-event"><i class="fas fa-trash-alt"></i></button>',
				trigger:'focus',
				placement:'right',
				container:'body',
			});
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
							final: event.final
						});
					}
				});
			});
			// Must manually destroy colorpicker or else it never gets deleted
			element.on('hide.bs.popover', function() {
				$('#colorpicker-'+colorpickerId).spectrum('destroy');
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
				$('#unitCounter').text(parseInt($('#unitCounter').text())-parseInt(event.units));
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
										<td align="right">'+event.groupId+'</td>\
									</tr>\
									<tr>\
										<td>Date</td>\
										<td align="right">'+event.date+'</td>\
									</tr>\
									<tr>\
										<td>Instructor</td>\
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

			// Ignore if course is "TBA"
			if(timeString.indexOf('TBA') != -1) {
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
			var courseTimes = CourseTimeStringParser(timeString)
			var roomString = $(this).find('td').eq(window.LISTING_ROOM_INDEX).html();
			var final = $(this).find('td').eq(window.LISTING_FINAL_INDEX).html();
			var rooms = parseRoomString(roomString);
			var units = $(this).find('td').eq(window.LISTING_UNITS_INDEX).html();
			$('#unitCounter').text(parseInt($('#unitCounter').text())+parseInt(units));

			// Iterate through course times (a course may have different meeting times)
			for(var i in courseTimes) {
				var parsed = courseTimes[i];
				var room = "TBA";
				if (i in rooms && rooms[i].length > 0) {
					room = rooms[i];
				}
				var colorPair = getRandomColorPair();
				$('#cal').fullCalendar("renderEvent",{
					id:	S4(),
					groupId: courseCode,
					start: parsed.beginHour + ':' + parsed.beginMin,
					end: parsed.endHour + ':' + parsed.endMin,
					title: classType + ' ' + courseName,
					dow: parsed.days,
					color: colorPair.color,
					daysOfTheWeek: parsed.days,
					location: room,
					fullName: fullCourseName,
					instructor: instructor,
					final: final,
					units: units
				});
			}

			if ($('#finals-btn').hasClass('active')) {
				$('#finals').hide();
				$('#cal').show();
				$('#finals-btn').removeClass('active');
				$('#cal').fullCalendar( 'rerenderEvents' );
			}
		});
	});
});