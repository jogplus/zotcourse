$(document).ready(function() {
    $("tr").each(function() {
        // To delete the useless 'textbooks' column and title
        $("th:eq(13)", this).remove();
        $("td:eq(13)", this).remove();
        // After textbooks column is deleted, deletes the 'web' column and title
        $("th:eq(13)", this).remove();
        $("td:eq(13)", this).remove();

        // The 4th child is typically the instructor column
        var element = $("td:eq(4)", this);
        var elementText = element.text();

        // Check to see if it's similar to an instructor's name:
        //     LASTNAME, F.
        //     SMITH, J.
        if (elementText.indexOf(',') !== -1 && elementText.indexOf('.') !== -1) {
            var instructorNames = element.html().split('<br>');
            var instructorLinks = [];
            for (i = 0; i < instructorNames.length; i++) {
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
