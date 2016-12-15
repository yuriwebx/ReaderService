"use strict";
const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');

const publicDb = nano.use(names.public());

/**
 * Handle tasks by TaskHandler
 * @constructor
 */
function Publication() {
    const self = this;

    /**
     * set default study guide
     * @param input publication and studyGuide IDs
     * @returns {Promise}
     */
    self.guide = (input)=>{
        return publicDb.get(input.pub)
            .then((publication)=> {
                publication.content.defaultNotes = input.guide;

                return publicDb.insert(publication);
            });
    };
}

module.exports = Publication;



