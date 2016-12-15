"use strict";
/* jshint -W098 */
/* jshint -W030 */
/* jshint -W106 */

const crypto = require('crypto');
const cfg_db = require('../../config.js').db;
const nano = require('../util/nano-promise');
const logger = require('../util/log').getLogger(__filename);

/**
 *
 */
function get_access_option(dbName) {
    return {
        db: dbName,
        method: 'GET',
        path: '_security'
    };
}

/**
 *
 */
function set_access_option(dbName, options) {
    return {
        db: dbName,
        method: 'PUT',
        path: '_security',
        body: options
    };
}


/**
 *
 */
var connect_db = function (cfg_db) {

  let nano_cfg = {
    url: cfg_db.url,
    defaultHeaders: {
      'Accept': 'application/json'
    }
  };
  let nano_instance = nano(nano_cfg);
  const isCloudant = nano_instance.config.url.indexOf('cloudant') > -1;


  /**
   * return promise
   */
    let _get_access = (db_name)=> {
    return nano_instance.request(get_access_option(db_name))
            .then(data=> {
        data = data || {};
        data.members = data.members || {};
        data.members.names = data.members.names || [];
        data.members.roles = data.members.roles || [];
        return data;
      })
            .then(data=> {
        // array to set
        data.members.names = new Set(data.members.names);
        data.members.roles = new Set(data.members.roles);

        // don't manage admins yet
        delete data.admins;
        return data;
      });
  };

  /**
   * @return Promise<nano.request>
   */
    let _save_access = (db_name, access_data)=> {
    // set to array
    access_data.members.names = Array.from(access_data.members.names);
    access_data.members.roles = Array.from(access_data.members.roles);

    if (isCloudant) {
        access_data.couchdb_auth_only = true;
    }

    return nano_instance.request(set_access_option(db_name, access_data));
  };


  // deny access for everyone
    let restrict_access = (db_name)=> {
    return _get_access(db_name)
            .then(data=> {
                data.members.names = new Set([cfg_db.nobody]);
        return _save_access(db_name, data);
      });
  };

   // make db public accessable
    let free_access = (db_name)=> {
     return _get_access(db_name)
            .then(data=> {
           data.members.names = [];
           return _save_access(db_name, data);
       });
    };

  // append access for a user
    let grant_access = (db_name, username)=> {
    logger.log('grant_access', db_name, username);
    return _get_access(db_name)
      .then(data=>{
          data.members.names.add(username);
          data.members.names.delete(cfg_db.nobody);
          return _save_access(db_name, data);
      });
  };

  /**
   * Explicitly set access for listed users
   * @param db_name
   * @param users - Array|Set of username
   */
    let set_access = (db_name, users)=> {
      //logger.log('set_access', db_name, Array.from(users));
      return _get_access(db_name)
            .then(data=> {

              // check whether it's same set
              let intersection = new Set([Array.from(data.members.names), Array.from(users)]);
                if (intersection.size === data.members.names.size) {
                  return Promise.resolve();
              }

              // set new items
              data.members.names = Array.from(users);
                if (data.members.names.length === 0) {
                  data.members.names.add(cfg_db.nobody);
              }
              logger.log('update db access [%s]:', db_name, Array.from(users).join(',') );
              return _save_access(db_name, data);
          });

  };

  // remove access for a user (both admin and member)
    let revoke_access = (db_name, username)=> {
    return _get_access(db_name)
      .then(data=>{
          data.members.names.delete(username);
          data.members.names.size === 0 && data.members.names.add(cfg_db.nobody); // prevent become public-accessible
          return _save_access(db_name, data);
      });
  };


  let add_user = (data) => {
    data._id = 'org.couchdb.user:' + data.name;


    if (isCloudant) {
        const salt = (crypto.randomBytes(16)).toString("hex");
        let hash = crypto.createHash("sha1");
        hash.update(data.password + salt);

        delete data.password;
        data.password_sha = hash.digest("hex");
        data.password_scheme = 'simple';
        data.salt = salt;
        data.roles.push('_replicator');//This is required Cloudant role to work with Pouch
    }

    return nano_instance.use('_users').insert(data);
  };

  let get_user = (user_id) => {
    return nano_instance.use('_users').get('org.couchdb.user:' + user_id);
  };

  let update_user = (data) => {
    return nano_instance.use('_users').insert(data);
  };

    // custom user operations (will be better include into nano)
  nano_instance.user = {
    restrict_access : restrict_access,
    free_access     : free_access,
    grant_access    : grant_access,
    set_access      : set_access,
    revoke_access   : revoke_access,

    get_access      : _get_access, // TODO: reconsider data format
    add             : add_user,
    get             : get_user,
    update          : update_user
  };

  nano_instance.reinit = function(url) {
      const newCfg = JSON.parse(JSON.stringify(cfg_db));
      newCfg.url = url;
      return connect_db(newCfg);
  };


    return nano_instance;
};


//////////////
module.exports = connect_db(cfg_db);