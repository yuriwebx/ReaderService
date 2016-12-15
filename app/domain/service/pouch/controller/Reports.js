define([
    '../dao/DB'
], function(DB) {
    "use strict";

    return {
        POST:{
            '': saveReport
        }
    };

    /**
     *
     */
    function saveReport(input) {
        return DB.userRW().createTask(input, 'external-send');
    }
});
