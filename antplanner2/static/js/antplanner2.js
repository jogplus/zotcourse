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
window.LISTING_INSTRUCTOR_INDEX = 4;
window.LISTING_TIME_INDEX = 5;
window.LISTING_ROOM_INDEX = 6;

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
	var isPm = endTime.indexOf('p') != -1;;

	var days = []
	if(timeString.indexOf('M') != -1) {	days.push(MON); } 
	if(timeString.indexOf('Tu') != -1) { days.push(TUE); } 
	if(timeString.indexOf('W') != -1) {	days.push(WED); }
	if(timeString.indexOf('Th') != -1) { days.push(THU); }
	if(timeString.indexOf('F') != -1) {	days.push(FRI); }

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

function colorEvent(el, colorPair) {
	$(el).css({
		'background-color': colorPair.color,
		'border': '1px solid ' + colorPair.borderColor
	});

	$('.wc-time', el).css({
		'background-color': colorPair.color,
		'border-left': 'none',
		'border-right': 'none',
		'border-top': 'none',
		'border-bottom': '1px solid ' + colorPair.borderColor
	});
}
function groupColorize() {
	var tracking = {};
	$('.wc-cal-event').each(function(index, el) {
	  var c = $(el).data().calEvent;
	  if( !(c.groupId in tracking) ) {
	    tracking[c.groupId] = getRandomColorPair();
	  } 
	  colorEvent(this, tracking[c.groupId])
	});
}

function isCourseAdded(courseCode, callback) {
	var isAdded = false;
	$('.wc-cal-event').each(function(index, el) {
		var c = $(el).data().calEvent;
		if(c.groupId == courseCode) {
			isAdded = true;
			return false; //break out of loop
		}
	});
	return isAdded;
}

$(document).ready(function() {
	//Workaround to implementing a resizable iframe
	//Wraps a div around the iframe and then removes it once it is done moving. 
	$( "#left" ).resizable({
		start: function(){
			$("#right").each(function (index, element) {
				var d = $('<div class="iframeCover" style="zindex:99;position:absolute;width:100%;top:0px;left:0px;height:' +
					$(element).height() + 'px"></div>');
				$(element).append(d);
			});
		},
		stop: function () {
			$('.iframeCover').remove();
		},
		maxWidth:$(document).width()-30,
		minWidth:30,
		height: $(document).height(),
		handles: "e"
	});

	//Whenever the left panel changes sizes, resizes the right panel.
	//Also accounts for when the user zooms in/out
	//Subtracts 20 from total right width to account for when scroll bar is present
	$(window).resize(function() {
		$("#right").outerWidth($(document).width() - $("#left").outerWidth()-20);
		$('.fc-time-grid .fc-slats td').css({
			'height': ($('#left').outerHeight() - $('#upper').outerHeight()) / 31,
		})
		$('#cal').fullCalendar('option', 'height', $('#left').outerHeight() - $('#upper').outerHeight());
		$('.popover').each(function () {
			$(this).popover('hide');
		});
	});

	$('#cal').fullCalendar({
		weekends: false,
		header: false,
		themeSystem: 'bootstrap4',
		defaultView: 'agendaWeek',
		allDaySlot: false,
		minTime: '07:00:00',
		maxTime: '22:00:00',
		columnHeaderFormat: 'ddd',
		height: $('#left').outerHeight() - $('#upper').outerHeight(),
		eventRender: function(event, element, view) {
			$('.popover').each(function () {
				$(this).popover('hide');
			});
			element.popover({
				html:true,
				title: (event.fullName) ? event.fullName : '',
				content:'<table style="width:200px">\
									<tr>\
										<td>Course Code</td>\
										<td>'+event.groupId+'</td>\
									</tr>\
									<tr>\
										<td>Location</td>\
										<td>'+((event.location) ? event.location : '')+'</td>\
									</tr>\
									<tr>\
										<td>Instructor</td>\
										<td>'+((event.instructor) ? event.instructor : '')+'</td>\
									</tr>\
									<tr>\
										<td>Final</td>\
										<td></td>\
									</tr>\
									<tr>\
										<td>Color</td>\
										<td>'+((event.color) ? event.color : '')+'</td>\
									</tr>\
									</table>\
									<input type="button" class="delete-event" value="Delete">',
				trigger:'focus',
				placement:'right',
				container:'body',
			})
		},
		eventClick: function(event, jsEvent, view) {
			// Necessary to keep the $(this) of eventClick in $(".delete-event").click
			$this = $(this);
			$this.popover('toggle');
			$(".delete-event").click(function() {
				$this.popover('dispose');
				$('#cal').fullCalendar('removeEvents', event._id);
			});
		}
	})



	//The left div height subtracted by the upper header
	//31 comes from the 30 cells + 1 for column headers
	$('.fc-time-grid .fc-slats td').css({
		'height': ($('#left').outerHeight() - $('#upper').outerHeight()) / 31,
	})

	// $('#cal').weekCalendar('gotoWeek', new Date(APP_YEAR, APP_MONTH, APP_DAY));

	$('#soc').bind('load', function(){
	  var $listingContext = $('.course-list', $('#soc').contents());
	  var $courseRow = $("tr[valign*='top']:not([bgcolor='#fff0ff'])", $listingContext);

		// FIXME: hover() deprecated
		$courseRow.hover(
		  function() {
			$(this).css({'color': '#ff0000', 'cursor': 'pointer'});
		  },
		  function() {
			$(this).css({'color': '#000000', 'cursor': 'default'});
		  }
		);

		$courseRow.on('click', function() {
		  var timeString = $(this).find('td').eq(LISTING_TIME_INDEX).html();

		  // Ignore if course is "TBA"
		  if(timeString.indexOf('TBA') != -1) {
				alert('Course is TBA');
				return;
		  }

		  var courseCode = $(this).find('td').eq(LISTING_CODE_INDEX).text();

		  // Ignore if course already added
		  if(isCourseAdded(courseCode)) {
				alert('You have already added that course!');
				return;
		  }
			console.log($(this));
			var courseName = $.trim( $(this).prevAll().find('.CourseTitle:last').html().split('<font')[0].replace(/&nbsp;/g, '').replace(/&amp;/g, '&') )
			var fullCourseName = $(this).prevAll().find('.CourseTitle:last').find('b').html();
			var classType = $(this).find('td').eq(LISTING_TYPE_INDEX).html();
			var instructor = $(this).find('td').eq(LISTING_INSTRUCTOR_INDEX).html();
		  var courseTimes = new CourseTimeStringParser(timeString)
		  var roomString = $(this).find('td').eq(LISTING_ROOM_INDEX).html();
		  var rooms = parseRoomString(roomString);
		  // Iterate through course times (a course may have different meeting times)
		  for(var i in courseTimes) {
				var parsed = courseTimes[i];

				if (i in rooms && rooms[i].length > 0) {
					var room = rooms[i];
				} else {
					// Is there a possibility that there is only one room listed for all times (in the case of multiple times)?
					var room = "TBA";
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
					instructor: instructor
				})
		  }
		});
	});

	$('#save-btn').on('click', function() {
		var calRawData  = $('#cal').fullCalendar('clientEvents');
		var calCleanData = []
		var usedGroupIds = []
		for (var i in calRawData){
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
					dow: calRawData[i].daysOfTheWeek
				}
				calCleanData.push(calEventData)
				usedGroupIds.push(calRawData[i].groupId)
			}
		}
	  var defaultName = localStorage.username ? localStorage.username : '';
	  var username = prompt('Please enter a unique username (e.g. Student ID): ', defaultName);

	  // Validation
	  if(username == null) {
			return;
	  }

	  if(username.length < 5) {
			alert('Username must be at least 5 characters.')
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
				if(data.success) {
					alert('Schedule successfully saved!');
					localStorage.username = username;
				}
				else {
					alert('Problem saving schedule');
				}
			}
	  });
	});

	$('#load-btn').on('click', function() {
	  var defaultName = localStorage.username ? localStorage.username : '';
	  var username = prompt('Please enter your username', defaultName);

	  if(username == '') {
			return;
	  }

	  $.ajax({
			url: '/schedule/load',
			data: { username: username },
			success: function(data) {
				console.log(data)
				if(data.success) {
					$('#cal').fullCalendar('removeEvents');
					$('#cal').fullCalendar('renderEvents', JSON.parse(data.data));
					alert('Schedule successfully loaded!');
				}
				else {
					alert('Problem loading schedule');
				}
			}
	  });
	});

	$('#load-ap-btn').on('click', function() {
	  var defaultName = localStorage.username ? localStorage.username : '';
	  var username = prompt('Please enter your Antplanner username', defaultName);

	  if(username == '') {
			return;
	  }

	  $.ajax({
			url: '/schedule/loadap',
			data: { username: username },
			success: function(data) {
				console.log(data)
				if(data.success) {
					$('#cal').fullCalendar('removeEvents');
					$('#cal').fullCalendar('renderEvents',data.data);
					alert('Schedule successfully loaded!');
				}
				else {
					alert('Problem loading schedule');
				}
			}
	  });
	});

	$('#clear-cal-btn').on('click', function() {
	  $('#cal').fullCalendar('removeEvents');
	});

	$('#resize-btn').click(function() {
		if ($(this).hasClass('active')) {
			$('#cal').animate({width: '100%'});
			$('#soc').show();
			$('.ui-resizable-e').show();
			$(this).removeClass('active');
		}
		else {
			$(this).addClass('active');
			$('#soc').hide();
			$('.ui-resizable-e').hide();
			$('#cal').animate({width: $(document).width()});
		}
	});
	

});