"use strict";
/* jshint -W098 */
/* jshint -W106 */
/**
  This file describe couch db schema.
  All methods named like '_couch_*' should be executed on couch!
    So, it can have unknown functions and arguments.
    More important is that it cannot use app scope (don't forget about it)
    Also you cannot define function in es6 style: '(arg)=>{}'

*/


let emit; // prevent jshint warning



/// VIEWS


let _couch_view__prefix = function(doc) {
  var m = doc._id.split('-', 1);
  emit(m && m[0] ? m[0] : null, doc);
};

let _couch_view__course_by_user = function (doc) {
  if(doc.type === 'StudyClass') {
    var ids = Object.keys(doc.teachers).concat(Object.keys(doc.students));
    ids.forEach(function(k) {
      emit(k, null);
    });
  }
};

let _couch_view__course_by_publication = function (doc) {
  if(doc.type === 'StudyClass') {
    emit(doc.publicationId, null);
  }
};





/// ACCESS

/**
 *
 */
let _couch_access__readonly = function(newDoc, oldDoc, userCtx/*, secObj*/) {
    // type field required (TODO: restrict possible values)
    if(!newDoc._deleted){

      if(!newDoc.type){
        throw({forbidden: '"type" field must be set'});
      }

      if(newDoc.type === "task" && !newDoc.name){
        throw({forbidden: '"name" field must be set for type="task"'});
      }
    }


    // only admin can change records
    if (userCtx.roles.indexOf('_admin') === -1 && userCtx.roles.indexOf('ffa-admin') === -1){
      throw({forbidden: 'Only admins may modify this database'});
    }
};

/**
 *
 */
let _couch_access__read_write = function(newDoc, oldDoc, userCtx/*, secObj*/) {
  // type field required (TODO: restrict possible values)
  if(!newDoc._deleted){

    if(!newDoc.type){
      throw({forbidden: '"type" field must be set'});
    }

    //
    if(newDoc.type === "task" && !newDoc.name){
      throw({forbidden: '"name" field must be set for type="task"'});
    }
  }


  if (userCtx.roles.indexOf('_admin') === -1 && userCtx.roles.indexOf('ffa-admin') === -1){

    // forbid owner changing
    if(oldDoc && oldDoc.owner && oldDoc.owner !== newDoc.owner){
      throw({forbidden: 'Only admins can change "owner" field'});
    }
    // forbid type changing
    if(oldDoc && oldDoc.type && oldDoc.type !== newDoc.type){
      throw({forbidden: 'Only admins can change "type" field'});
    }

  }
};


/**
 * read - ALL
 * write - self records only
 */
let _couch_access__read_write_self_records = function(newDoc, oldDoc, userCtx/*, secObj*/) {
  // type field required (TODO: restrict possible values)
  if(!newDoc._deleted){
    if(!newDoc.type){
      throw({forbidden: '"type" field must be set'});
    }
    if(!newDoc.owner){
      throw({forbidden: '"owner" field must be set'});
    }
  }


  if (userCtx.roles.indexOf('_admin') === -1 && userCtx.roles.indexOf('ffa-admin') === -1) {

    // forbid changing foreign records
    if (oldDoc && oldDoc.owner !== userCtx.name) {
      throw({forbidden: 'Only owner (' + oldDoc.owner + ') can change this record'});
    }

    if(!newDoc._deleted) {
      // forbid owner changing
      if (oldDoc && oldDoc.owner !== newDoc.owner) {
        throw({forbidden: 'Only admins can change "owner" field'});
      }

      // forbid type changing
      if (oldDoc && oldDoc.type && oldDoc.type !== newDoc.type) {
        throw({forbidden: 'Only admins can change "type" field'});
      }

      // create a new record

      // forbid to create wrong owner
      if (!oldDoc && newDoc.owner !== userCtx.name) {
        throw({forbidden: '"owner" field must be set to ' + userCtx.name});
      }

    }
  }
};





/**
 * filter: return only non-system ids.
 */
// return !doc.id.startsWith('_'); // couch has no startsWith()
// let _couch_filter__no_system = function(doc, req){
//   return (''+doc._id).substr(0,1) !== '_';
// };

/**
 *
 */
let _couch_filter__type = function(doc, req){
  return (doc.type === req.query.type);
};

// todo: may be we will remove query parameter
let _couch_filter__task = function(doc, req){
  return (doc.type === req.query.type && !doc.task_status);
};



////
// SCHEMAS
const view_common = {
  _id:"_design/schema",
  language:'javascript',
  views:{
    // "task"        : { "map": _couch_view__task.toString() }
  }/*,
  "filters": {
    //"no_system" : _couch_filter__no_system.toString(),
    //"docid"     : _couch_filter__docid.toString()
    "type"     : _couch_filter__type.toString()
    // "task"     : _couch_filter__task.toString()
  }*/
};

function getView(views/*, filters*/){
  let view = {};
  // clone basic fields
  for(let name in view_common){
    if(view_common.hasOwnProperty(name)){
      view[name] = JSON.parse(JSON.stringify(view_common[name]));
    }
  }

  // add extra views
  views = views || {};
  for(let name in views){
    if(views.hasOwnProperty(name)){
      view.views[name] = {map: views[name]};
    }
  }
  return view;
}


/**
 *
 * @param {Function} accessFn
 * @returns {{_id: string, language: string, validate_doc_update: (string|*)}}
 */
function get_access_doc( accessFn ){
  return {
    _id:"_design/_auth",
    language:'javascript',
    validate_doc_update: accessFn.toString()
  };
}


//////////////
module.exports = {
  view:{
    private   : getView(),
    public    : getView(),
    user      : getView(),
    user_rw   : getView(),
    course_r  : getView(),
    course_rw : getView({ prefix:_couch_view__prefix.toString()}),
    query     : getView({
      prefix:_couch_view__prefix.toString(),
      courseByUser: _couch_view__course_by_user.toString(),
      courseByPublication: _couch_view__course_by_publication.toString()
    })
  },
  access:{
    public    : get_access_doc(_couch_access__readonly),
    user      : get_access_doc(_couch_access__readonly),
    user_rw   : get_access_doc(_couch_access__read_write),
    course_rw : get_access_doc(_couch_access__read_write_self_records)
  }
};