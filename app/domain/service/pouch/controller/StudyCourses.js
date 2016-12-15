define([
    '../dao/StudyCourse'
], function(StudyCourse) {
    "use strict";

    return {
        GET:{
            get: get
        }
    };

    function get(req) {
        return StudyCourse.get(req.id, req.collapseCourses);
    }

});