'use strict';
/* jshint -W106 */

const names = require('../../config').db.name;
const dbPrefix = names.environment_name + '_' + names.database_name + '_';

function name(db, id){
  return names.template[db] ? dbPrefix + names.template[db].replace('%1', id) : dbPrefix + db;
}

let user_regexp = [
	// element order is make sense
	new RegExp( name('user_rw', '([\\w-]+)'), 'i'),
	new RegExp( name('user',  '([\\w-]+)'), 'i')
];

// remove valuable info from url
function noCred(dbName){
  return dbName.replace(/:[^:]*@/, "@");
}


function parseDbName(dbname){
  var temp = dbname;
  if(temp.startsWith(dbPrefix)){
    temp = temp.substr(dbPrefix.length);
  }

  if( temp.startsWith('user_') ){
    if(temp.endsWith('_rw')) {
      return 'user_rw';
    }
    else{
      return 'user';
    }
  }

  if( temp.startsWith('course_') ) {
    return 'course';
  }

  switch (temp){
    case 'public':
    case 'private':
    case 'discussion':
    case 'quiz':
    case 'query':
      return temp;
  }
  return null;
}

module.exports = {

  public    : ()  =>name('public'),
  private   : ()  =>name('private'),
  user      : (id)=>name('user', id),
  user_rw   : (id)=>name('user_rw', id),
  course    : (id)=>name('course', id),
  quiz      : ()=>name('quiz'),
  query     : ()=>name('query'),
  agent     : ()=>name('agent'),

  // used to separate our database and system databases
  isSystem  : (name)=>!( name && name.toString().startsWith(dbPrefix) && name !== dbPrefix + 'db'), // db = app database
  noCred : noCred,

  get : name,

  // Extract user id from db name
  getUserId : (db_name)=>{
    // we can save tasks either in user_r or user_rw dbs
    // element order is make sense
    for (var i = 0; i <= user_regexp.length - 1; i++){
      let m = db_name.match(user_regexp[i]);
      if( m && m[1]){
        return m[1];
      }
    }
    return null;
  },

  prefix: dbPrefix,
  parseDbName: parseDbName
};
