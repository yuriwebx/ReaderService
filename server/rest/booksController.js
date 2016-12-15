/*jslint node: true */
'use strict';
var publicationSearch = require('./publicationSearch');


module.exports = {
   GET : {
      search : function (req, res) {
			var bookName = req.param("bookName");
			var category = ["Book"];
			var response = publicationSearch.search('originalFileName', bookName, category);
			res.send(response);
      }
  }
};