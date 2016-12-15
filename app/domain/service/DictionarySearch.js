/* global FileReader: false */
define([
   'module',
   'swServiceFactory',
   'Config'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swPublicationsService',
         function (swPublicationsService) {
			var index = {};
			var lengParam;
			var dicts = {};
			var numDict = 0;
			var readDiffNum = 0;
			var bi = 0;
         var lengDictsNum = 0;
			var dictTerms = {};
			var resultDifinition = {};
         var loadingIndex = true;
         var response = {};

         this.getIndexLetter = function(lengDicts,letter, callback) {
            cleaner();
            if(loadingIndex){
               loadingIndex = false;
               getIndexLetter(lengDicts,letter, callback);
            }
         };

            var getIndexLetter = function(lengDicts,letter, callback) {
               var url = lengDicts[lengDictsNum]._id + '/index_' + letter + '.json';
               //debugger;//service client - NOT TESTED   
               swPublicationsService.loadFilePartial(url, 'local', 0, -1, function(data) {
                     var fr = new FileReader();
                     fr.onloadend = function() {
                        try {
                           var res = this.result + ']';
                           res = JSON.parse(res);
                           var getDictName = lengDicts[lengDictsNum]._id;
                           index[getDictName] = res;
                           lengDictsNum++;
                           if (lengDicts.length !== lengDictsNum) {
                              getIndexLetter(lengDicts, letter, callback);
                           }
                           else {
                              loadingIndex = true;
                              callback(true);
                           }
                        }catch (e) {
                           loadingIndex = true;
                           callback(false);
                        }
                     };
                     fr.readAsBinaryString(data);
                  });
            };

            function checkInArray(element, array) {
               var arraylen = array.length;
               for (var i = 0; i < arraylen; i++) {
                  if (element === array[i]) {
                     return true;
                  }
               }
               return false;
            }


            function wordProcessing(word) {
               word = word.replace(/[\d+\'\"[\](\),.:;!?]+/g, '');
               word = word.replace(/\s{2,}/g, '');
               return word;
            }

            function binarySearch(t, A, request, processing) {
               var i = 0,
                  j = A.length - 1,
                  k;
               var key;
               while (i <= j) {
                  k = Math.floor((i + j) / 2);
                  if (processing) {
                     key = wordProcessing(Object.keys(A[k])[0]);
                  }
                  else {
                  key = Object.keys(A[k])[0];
                  }
                  if (request.test(key)) {
                     return k;
                  }
                  else if (t < key) {
                     j = k - 1;
                  }
                  else {
                     i = k + 1;
                  }
               }
               return -1;
            }

			this.findLocalDict = function(leng, callback) {
				findLocalDict(leng, callback);
			};

			var findLocalDict = function(leng, callback) {
				lengParam = leng;
            dicts = {};
				swPublicationsService.getFileListByType('local').then(function(local) {
					for (var i = 0; i < local.length; i++) {
                     if(local[i].type === 'dictionary' && dicts.hasOwnProperty(local[i].language)){
                        dicts[local[i].language].push({_id : local[i]._id,
                                                      title : local[i].title});
                     }
                     else if(local[i].type === 'dictionary'){
                        dicts[local[i].language] = [{_id : local[i]._id,
                                                     title : local[i].title}];
                     }
					}
					callback(dicts[lengParam]);
				});
			};

            function getTerm(term, lengDicts, numberTerms, callback){
               var dictName = lengDicts[numDict]._id;
               var dictIndex = index[dictName];
               var request = new RegExp(('^' + wordProcessing(term)), 'gi');
               var indexTerm = binarySearch(term, dictIndex, request, true);
               var ind;
               var i;
               var find;
               var key;
               var terms = [];
               var currentTerm;
               var dictIndexlen = dictIndex.length;
               var termLen;
               var lengDictslen = lengDicts.length;
                if (indexTerm !== -1) {
                  //find first
                  ind = indexTerm;
                  while (ind >= 0) {
                     find = new RegExp(('^' + wordProcessing(term)), 'gi');
                     key = wordProcessing(Object.keys(dictIndex[ind])[0]);
                     if (find.test(key)) {
                        currentTerm = Object.keys(dictIndex[ind])[0];
                        if(!checkInArray(currentTerm, response[term])){
                           terms.unshift(currentTerm);
                        }

                     }
                     else {
                        break;
                     }
                     ind--;
                  }
                  //find last
                  ind = indexTerm + 1;
                  while (ind <= dictIndexlen - 1) {
                     find = new RegExp(('^' + wordProcessing(term)), 'gi');
                     key = wordProcessing(Object.keys(dictIndex[ind])[0]);
                     if (find.test(key)) {
                        currentTerm = Object.keys(dictIndex[ind])[0];
                        if(!checkInArray(currentTerm, response[term])){
                           terms.push(currentTerm);
                        }
                     }
                     else {
                        break;
                     }
                     ind++;
                  }
                  numDict++;
                  dictTerms[dictName] = terms;
                  termLen = terms.length;
                  for (i = 0; i < termLen; i++) {
                     if (!checkInArray(terms[i], response[term])) {
                        response[term].push(terms[i]);
                     }
                  }
                  if(numDict === lengDictslen){
                     response[term] = response[term].slice(0,numberTerms);
                     callback(response);
                     return;
                  }
                  else{
                     getTerm(term, lengDicts, numberTerms, callback);
                  }
               }
               else{
                  numDict++;
                  if (numDict === lengDictslen) {
                     callback(response);
                     return;
                  }
                  else {
                     getTerm(term, lengDicts, numberTerms, callback);
                  }
				}
			}

            function getDefinition(term, lengDicts, callback) {
               var dictName = lengDicts[numDict]._id;
               var dictIndex = index[dictName];
				// term = term.replace(/-/g, '');
				// term = term.replace(/\s{2,}/, '');
               var request = new RegExp(('^' + term + '$'), 'gi');
               var indexTerm = binarySearch(term, dictIndex, request, false);
               var ind;
               var find;
               var key;
               var terms = [];
               var dictIndexlen = dictIndex.length;
               var lengDictslen = lengDicts.length;
               if (indexTerm !== -1) {
                  //find first
                  ind = indexTerm;
                  while (ind >= 0) {
                    find = new RegExp(('^' + term + '$'), 'gi');
                    key = Object.keys(dictIndex[ind])[0];
                  // key = key.replace(/-/g, '');
                  // key = key.replace(/\s{2,}/, '');
                     if (find.test(key)) {
                        terms.unshift(dictIndex[ind]);
                     }
                     else {
                        break;
                     }
                     ind--;
                  }
                  //find last
                  ind = indexTerm + 1;
                  while (ind <= dictIndexlen - 1) {
                     find = new RegExp(('^' + term + '$'), 'gi');
                     key = Object.keys(dictIndex[ind])[0];
                  // key = key.replace(/-/g, '');
                  // key = key.replace(/\s{2,}/, '');
                     if (find.test(key)) {
                        terms.push(dictIndex[ind]);
                     }
                     else {
                        break;
                     }
                     ind++;
                  }
                  numDict++;
                  dictTerms[dictName] = terms;
                  if (numDict === lengDictslen) {
                     readDiffNum = 0;
                     readDefinition(lengDicts,dictTerms,callback);
                  }
                  else {
                     getDefinition(term, lengDicts, callback);
                  }
               }
               else {
                  numDict++;
                  if (numDict === lengDictslen) {
                     readDiffNum = 0;
                     readDefinition(lengDicts, dictTerms, callback);
                  }
                  else {
                     getDefinition(term, lengDicts, callback);
                  }
               }
            }


            function readBinaryDifinition(readIndex,lengDicts,callback){
               var dictName = lengDicts[readDiffNum]._id;
               var termKey = Object.keys(readIndex[bi])[0];
               var binaryIndex = readIndex[bi][termKey];
               var url =  dictName + '/definition.txt';
               //debugger;//service client - NOT TESTED
               swPublicationsService.loadFilePartial(url, 'local', binaryIndex[0],binaryIndex[0] + binaryIndex[1], function(data) {
                  var fr = new FileReader();
                  fr.onloadend = function() {
                     bi++;
                     resultDifinition[lengDicts[readDiffNum].title].push(this.result);
                     if(readIndex.length === bi){
                        callback();
                     }
                     else{
                        readBinaryDifinition(readIndex,lengDicts,callback);
                     }
                  };
                  fr.readAsText(data);
               });
            }

         function readDefinition(lengDicts, dictTerms, callback) {
            var dictName = lengDicts[readDiffNum]._id;
            var readIndex = dictTerms[dictName];
            var lengDictslen = lengDicts.length;
            if (readIndex) {
               resultDifinition.termName = Object.keys(readIndex[0])[0];
               resultDifinition[lengDicts[readDiffNum].title] = [];
               readBinaryDifinition(readIndex, lengDicts, function() {
                  bi = 0;
                  readDiffNum++;
                  if (readDiffNum === lengDictslen) {
                     callback();
                  }
                  else {
                     readDefinition(lengDicts, dictTerms, callback);
                  }
               });
            }
            else {
               readDiffNum++;
               if (readDiffNum === lengDictslen) {
                  callback();
               }
               else {
                  readDefinition(lengDicts, dictTerms, callback);
               }
            }
         }

         function cleaner(){
            numDict = 0;
            lengDictsNum = 0;
            readDiffNum = 0;
            bi = 0;
            dictTerms = {};
            resultDifinition = {};
            response = {};
         }

			this.findTerm = function(term, indexUpload, numberTerms, callback) {
            cleaner();
            response[term] = [];
				term = term.toUpperCase();
				if (indexUpload) {
					findLocalDict(lengParam, function(lengDicts) {
						var wordsAfterProcessing = wordProcessing(term);
						if (wordsAfterProcessing !== 0 && lengDicts.length !== 0) {
							getTerm(term, lengDicts, numberTerms, function(respons) {
								callback(respons);
							});
						}
						else {
							callback({});
						}
					});
				}
				/*else {
					// console.log('index of words not uploaded');
				}*/
			};

            this.findDefinition = function(term,indexUpload,callback){
               cleaner();
               term = term.toUpperCase();
               if(indexUpload){
                  findLocalDict(lengParam, function(lengDicts) {
                     getDefinition(term,lengDicts,function(){
                        callback(resultDifinition);
                     });
                  });
               }
              /* else{
                 // console.log('index of words not uploaded');
               }*/
            };
         }]
   });
});