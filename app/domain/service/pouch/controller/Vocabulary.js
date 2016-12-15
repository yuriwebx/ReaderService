define([
    '../dao/UserStudy'
], function(UserStudy) {
    "use strict";

    return {
        GET:{
            'vocabularyResults' : getStats
        }
    };


    /**
     * user statistics
     */
    function getStats() {
        return UserStudy.getStats();
    }

});
