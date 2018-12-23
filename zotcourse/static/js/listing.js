$(document).ready(function() {
    if ($(document).find('tr').length == 0) {
        $('.course-list').text('No courses matched your search criteria for this term.');
    }
    $("a").each(function() {
        // "same as class" link open within the iframe
        if ($(this).attr("href").indexOf("reg.uci.edu") !== -1) {
            var query = $(this).attr("href").split("?")[1];
            $(this).attr("href", "/websoc/listing?" + query);
        }
        else {
            $(this).attr("target", "_blank");
        }
    });
    $("tr").each(function() {
        // To delete the useless 'textbooks' column and title
        $("th:eq(13)", this).remove();
        $("td:eq(13)", this).remove();
        // After textbooks column is deleted, deletes the 'web' column and title
        $("th:eq(13)", this).remove();
        $("td:eq(13)", this).remove();
        // Reduces the column width after deleting the two columns
        if ($("td", this).attr('colspan')) {
            $("td", this).attr('colspan', 14);
        }
        // Removes the indentions for the "same as class" and "enrollment" info
        if ($("td:eq(0)", this).html() == "&nbsp;") {
            $("td:eq(0)", this).remove();
            if ($("td:eq(0)", this).html() == "&nbsp;") {
                $("td:eq(0)", this).remove();
            }
            if ($("td:eq(2)", this).html() == "&nbsp;" && $(this).attr('bgcolor') == '#fff0ff') {
                $("td:eq(2)", this).remove();
            }
        }
        
        // Used to add registrar restrictions link for each row
        // If only the header needs the link, use th instead of td
        if ($("td:eq(12)", this).html() != "&nbsp;") {
            $("td:eq(12)", this).html("<a href='https://www.reg.uci.edu/enrollment/restrict_codes.html' target='_blank'>"+$("td:eq(12)", this).text()+"</a>")
        }

        // The 4th child is typically the instructor column
        var element = $("td:eq(4)", this);
        var elementText = element.text();

        // Check to see if it's similar to an instructor's name:
        //     LASTNAME, F.
        //     SMITH, J.
        if (elementText.indexOf(',') !== -1 && elementText.indexOf('.') !== -1) {
            var instructorNames = element.html().split('<br>');
            var instructorLinks = [];
            for (var i = 0; i < instructorNames.length; i++) {
                var instructorName = instructorNames[i].trim();
                // Ignore STAFF instructors
                if (instructorName == 'STAFF') {
                    instructorLinks.push('STAFF');
                    continue;
                }

                if (instructorName == '') {
                    continue;
                }

                // Build the link to RateMyProfessors
                var instructorLastName = instructorName.split(',')[0];
                if (instructorLastName.indexOf('-') !== -1) {
                    instructorLastName = instructorName.split('-')[0]
                }
                var link = "https://www.ratemyprofessors.com/search.jsp?queryoption=HEADER&queryBy=teacherName&schoolName=University+of+California+Irvine&schoolID=1074&query="+instructorLastName;
                instructorLinks.push('<a class="instructor-link" href="'+link+'" target="_blank">'+instructorName+'</a>');
            }
            element.html(instructorLinks.join('<br />'));
        }
    });

    // Stop propagation from reaching the parent (the click handler for the course row)
    $(".course-list td a").click(function(e) {
        e.stopPropagation();
    });
});
