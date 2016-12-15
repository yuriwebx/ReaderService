/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
"use strict";
var unidecode = require('unidecode');

function wordProcessing(word) {
  word = unidecode(word);
  word = word.replace(/[\'\"[\](\),.:;!?]+/g, '');
  word = word.replace(/\s{2,}/g, '');
  return word;
}

exports.search = function(publications, fild, param, category){
  var result = [];
  var i;
  var find;
  for(i = 0; i < publications.length; i++){
    find = new RegExp(('^' + wordProcessing(param)), 'i');
    if (find.test(publications[i][fild]) && (category.indexOf(publications[i].type) !== -1 || category.length === 0)) {
      result.unshift(publications[i]);
    }
  }
  return result;
};