"use strict";
/* jshint -W106 */

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');

const taskDbPath = require('../../../config.js').db.local_url; //jshint ignore:line

const _users_prefix = 'org.couchdb.user:';
const users_db = nano.db.use('_users');


function remove_db(nano, name) {
    let uid = names.getUserId(name);
    let remove_user;

    if (uid) {
        console.log('Removing user: %s', uid);
        remove_user = users_db.get(_users_prefix + uid)
            .then(doc=> {
                //console.log(doc);
                return users_db.destroy(doc._id, doc._rev);
            }).catch(()=> {
                //console.log(err);
            });
    }
    else {
        remove_user = Promise.resolve();
    }

    // remove db
    return remove_user.then(()=> {
        console.log('Removing db: %s %s', nano.config.url, name);
        return nano.db.destroy(name);
    }).catch(()=> {
        //console.log(err);
    });
}


function remove_all_dbs(nano, dbs) {
    let name = dbs.pop();
    if (!name) {
        return Promise.resolve();
    }

    return remove_db(nano, name).then(()=> {
        return remove_all_dbs(nano, dbs);
    });
}

function cleanAll(nano) {
    return nano.db.list().then(dbs=> {
        return dbs.filter(x=>!names.isSystem(x));
    }).then(dbs=> {
        return remove_all_dbs(nano, dbs);
    });
}

module.exports = {
    clean: ()=> {
        console.log('Clean-up');

        return cleanAll(nano)
            .then(()=> {
                return cleanAll(nano.reinit(taskDbPath));
            });
    }
};
