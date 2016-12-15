/*jshint unused: vars*/
/*jslint node: true */
(function () {
   'use strict';
   var _       = require('underscore');
   var q       = require('q');
   var fs      = require('fs');
   var path    = require('path');
   var config  = require(__dirname + '/../utils/configReader.js');

   var indexFile = 'content/$/index.json';
   var contentFile = 'content/$/content.html';
   var audioIndexFile = 'audio/index.json';

   module.exports = {
      fetch       : fetch,
      fetchAll    : fetchAll,
      fetchAudio  : fetchAudio
   };

   function fetchAll (bookId, version) {
      return fetch(bookId, version);
   }

   function fetch (bookId, version, start, end) {
      var contentFilePath = path.join(config.libraryDir, bookId, contentFile.replace('$', version));
      var fileDescriptor = null;
      var indexList = [];
      var indexListLength = 0;

      return q.nfcall(fs.open, contentFilePath, 'r')
         .then(function saveFileDescriptor (_fd) {
            fileDescriptor = _fd;
            return createIndex(bookId, version);
         })
         .then(function readBuffer (_index) {
            if (start && end) {
               start = _index.map[start];
               end = _index.map[end] + 1;
               indexList = _index.list.slice(start, end);
            }
            else {
               indexList = _index.list;
            }

            indexListLength = indexList.length;

            var bytesToRead = indexList[indexListLength - 1].start + indexList[indexListLength - 1].offset;
            var startReadFrom = 0; // index.list[0].start
            var bufferToWrite = new Buffer(bytesToRead);
            var startWriteFrom = 0;

            return q.nfcall(fs.read, fileDescriptor, bufferToWrite, startWriteFrom, bytesToRead, startReadFrom);
         })
         .spread(function splitBuffer (bytesRead, buffer) {
            var result = [];
            for (var i = 0; i < indexListLength; i++) {
               result.push(buffer.toString('utf8', indexList[i].start, indexList[i].start + indexList[i].offset));
            }
            return result;
         })
         .catch(function (err) {
            console.log('err', err);
            throw err;
         })
         .finally(function closeFileDesccriptor() {
            if (fileDescriptor) {
               fs.closeSync(fileDescriptor);
            }
         });
   }

   function createIndex (bookId, version) {
      var indexFilePath = path.join(config.libraryDir, bookId, indexFile.replace('$', version));
      return q.nfcall(fs.readFile, indexFilePath, 'utf8')
         .then(JSON.parse)
         .then(function create (contentIndex) {
            var list = [];
            var map  = {};
            _.each(contentIndex, function (metaData, paragraphId) {
               map[paragraphId] = metaData.index;
               list[metaData.index] = _.pick(metaData, ['start', 'offset']);
            });
            return {
               map   : map,
               list  : list
            };
         })
         .catch(function (err) {
            console.log('err', err);
            throw err;
         });
   }


   function fetchAudio (bookId) {
      var audioIndexFilePath = path.join(config.libraryDir, bookId, audioIndexFile);

      return q.nfcall(fs.readFile, audioIndexFilePath, 'utf8')
         .then(JSON.parse)
         .catch(function (err) {
            var dummyAudioMeta = [[],[]];
            var result = dummyAudioMeta;

            if (err.code !== 'ENOENT' ) {
               result = q.reject(err.message);
            }
            return result; //to do this
         });
   }
}());
