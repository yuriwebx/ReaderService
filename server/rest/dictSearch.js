/*jslint node: true */
/*jshint unused: vars*/
"use strict";
var errorMessegas = {
	readIndex: 'Problem with %s file "%s".',
	notFoundDefinition: 'Definition for "%s" hasn\'t been found.',
	notFoundDefinitionFile: 'File "%s" with definitions hasn\'t been found.',
};
var util = require('util');
var utils = require('../utils/utils.js');
var fs = require('fs');
var unidecode = require('unidecode');
var q = require('q');
var natural = require('natural');
var config = require(__dirname + '/../utils/configReader.js');
var publication = require('./publication.js');
var _ = require('underscore');

var indexLoad = false;
var indexProcessed = true;
var dictName = [];
var respons = {termNames: []};
var d;
var pth;
var words = [];
var localDict = [];
var res = {};
var numberTerm;
var serverDict;
var wordIndex = {};
var stemIndexLoad = false;
var usedStemSearch = false;

var respInNotFoundCase = {termNames: []};
var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);

function checkInArray(element, array) {
	array = array ? array : [];
	for (var i = 0; i < array.length; i++) {
		if (element === array[i]) {
			return true;
		}
	}
	return false;
}

function wordProcessing(word) {
	word = unidecode(word);
	word = word.replace(/[\d+\'\"\”\“[\](\),.:;!?]+/g, '');
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

function read(filename, rangesArray) {
	var defer = q.defer();
	var result = [];
	var i = rangesArray.length;

	function readFromArray(i, defer, rangesArray, result) {
		if (i !== 0) {
			fs.open(filename, 'r', function(err, fd) {
				if (!err) {
					var buf = new Buffer(100000);
					fs.read(fd, buf, 0, parseInt(rangesArray[i - 1][1]), parseInt(rangesArray[i - 1][0]), function(err, bytesRead, buffer) {
						if(!err){
							buffer = buffer.slice(0, parseInt(rangesArray[i - 1][1]));
							result.unshift(JSON.parse(buffer.toString('utf8')));
							fs.close(fd, function(err) {
								if (!err) {
									i--;
									readFromArray(i, defer, rangesArray, result);
								}
								else{
									defer.reject(utils.addSeverityResponse('Problem with close ' + filename, config.businessFunctionStatus.error));
								}
							});
						}
						else{
							defer.reject(utils.addSeverityResponse(err.message, config.businessFunctionStatus.error));
						}
					});
				}
				else{
					defer.reject(utils.addSeverityResponse(err.message, config.businessFunctionStatus.error));
				}
			});
		}
		else {
			defer.resolve(result);
		}
	}
	readFromArray(i, defer, rangesArray, result);
	return defer.promise;
}


var getLetterIndex = function(path, letter, prefix, callback) {
	var name = path[pth].match(/[^/]\w+$/)[0];
	var message = '';
	if (!(wordIndex.hasOwnProperty(name) && wordIndex[name].hasOwnProperty(prefix) && wordIndex[name][prefix].hasOwnProperty(letter))) {
		if(dictName.indexOf(name) === -1){
			dictName.push(name);
		}
		wordIndex[name] = {};
		if (indexProcessed) {
			indexProcessed = false;
			fs.open(path[pth] + '/index_' + prefix + '_' + letter + '.json', 'r', function(err, repFile) {
				if (err) {
					indexProcessed = true;
					message =  util.format(errorMessegas.readIndex, ' open', ' index_' + prefix + '_' + letter + '.json');
					logger.error(message);
					return callback(respInNotFoundCase, wordIndex);
				}
				fs.readFile(path[pth] + '/index_'  + prefix + '_' + letter + '.json', 'utf8', function(err, indexData) {
					indexProcessed = true;
					if (err) {
						indexProcessed = true;
						message =  util.format(errorMessegas.readIndex, ' read file', ' index_' + prefix + '_' + letter + '.json');
						logger.error(message);
						return callback(respInNotFoundCase, wordIndex);
					}
					else {
						fs.close(repFile, function(err) {
							if (err) {
								indexProcessed = true;
								message =  util.format(errorMessegas.readIndex, ' close file', ' index_' + prefix + '_' + letter + '.json');
								logger.error(message);
								return callback(respInNotFoundCase, wordIndex);
							}
							indexLoad = true;
							indexProcessed = true;
							wordIndex[name][prefix] = wordIndex[name].hasOwnProperty(prefix) ? wordIndex[name][prefix] : {};
							wordIndex[name][prefix][letter] = JSON.parse(indexData);
							pth++;
							if (path.length !== pth) {
								getLetterIndex(path, letter, prefix, callback);
							}
							else {
								pth = 0;
								callback({loaded: true});
							}
						});
					}
				});
			});
		}
		else{
			callback(false);
		}
	}
	else{
		pth++;
		if (path.length !== pth) {
			getLetterIndex(path, letter, prefix, callback);
		}
		else {
			pth = 0;
			callback({loaded: true});
		}
	}
};

var stemming = function(token, lang) {
	var stem;
	lang = (lang !== ("fa" || "en")) ? "en" : lang;

	if (lang === 'en') {
		stem = natural.PorterStemmer.stem(token);
	}
	else if (lang === 'fa') {
		stem = natural.PorterStemmerFa.stem(token);
	}
	return stem;
};

function getWords(dictPath, word, prefix, callback) {
	var emptyRespons = {termNames: []};
	if (serverDict.length === 0) {
		callback(emptyRespons);
	}
	else {
		var i,dataLen,find, key, letter;
		word = wordProcessing(word);
		letter = word[0];
		var data = wordIndex[serverDict[d]][prefix][letter];
		var request = new RegExp(('^' + word), 'gi');
		var index = binarySearch(word, data, request, true);
		var currWord;
		var stem = '';
		dataLen = data.length;
		if (index !== -1 && word.length !== 0) {
			res.termNames = [];
			//find first
			i = index;
			while (i >= 0) {
				find = new RegExp(('^' + wordProcessing(word)), 'gi');
				key = wordProcessing(Object.keys(data[i])[0]);
				if (find.test(key)) {
					currWord = Object.keys(data[i])[0];
					if(!checkInArray(currWord, res.termNames)){
						words.unshift(currWord);
					}
				}
				else {
					break;
				}
				i--;
			}
			//find last
			i = index + 1;
			while (i <= dataLen - 1) {
				find = new RegExp(('^' + wordProcessing(word)), 'gi');
				key = wordProcessing(Object.keys(data[i])[0]);
				if (find.test(key)) {
					currWord = Object.keys(data[i])[0];
					if(!checkInArray(currWord, res.termNames)){
						words.push(currWord);
					}
				}
				else {
					break;
				}
				i++;
			}
			for(i = 0; i < words.length; i++){
				if(!checkInArray(words[i], res.termNames)){
					res.termNames.push(words[i]);
				}
			}
			res.termNames = res.termNames.slice(0,numberTerm);
			d++;
			if (d === serverDict.length) {
				callback(res);
			}
			else {
				getWords(dictPath, word, prefix, callback);
			}
		}
		else {
			stem = stemming(word,'en').toUpperCase();
			prefix = 'stem';
			if(stem.length !== 0 && word !== stem){
				prefix = '';
				getWords(dictPath, stem, prefix, callback);
			}
			else if(stem.length !== 0 && !usedStemSearch){
				usedStemSearch = true;
				getLetterIndex(dictPath, stem[0], prefix, function(load, stemIndex){
					if(load.loaded){
						getWords(dictPath, stem, prefix, callback);
					}
					else{
						callback(respInNotFoundCase);
					}
				});
			}
			else{
				callback(respInNotFoundCase);
			}
		}
	}
}


function getDifinition(query, dictPath, prefix, defer) {
	var word = query.dictionaryTermName;
	var currenDictName = serverDict[d];
	var letter = word[0];
	var data = wordIndex[currenDictName][prefix][letter];
	if (serverDict.length === 0 || !data) {
		defer.resolve({definition: respons,term: word});
	}
	else {
		var request = new RegExp(('^' + word + '$'), 'gi');
		var index = binarySearch(word, data, request, false);
		var find, dataLen, i, dirContent, words = [], key, stem, definitionFileName = 'definition.txt', severityResp;
		dataLen = data.length;
		if (index !== -1) {
			//find first
			i = index;
			while (i >= 0) {
				find = new RegExp(('^' + word + '$'), 'gi');
				key = Object.keys(data[i])[0];
				if (find.test(key)) {
					words.unshift(data[i]);
				}
				else {
					break;
				}
				i--;
			}
			//find last
			i = index + 1;
			while (i <= dataLen - 1) {
				find = new RegExp(('^' + word + '$'), 'gi');
				key = Object.keys(data[i])[0];
				if (find.test(key)) {
					words.push(data[i]);
				}
				else {
					break;
				}
				i++;
			}
			var rangesArray = [];
         words.map(function (_w) {
            key = Object.keys(_w)[0];
            rangesArray.push(_w[key]);
         });
			dirContent = fs.readdirSync(config.libraryDir + '/' + currenDictName);
			if (dirContent.indexOf(definitionFileName) !== -1) {
				var resp = [];
				var partOfspeech = query.partOfspeech || '';
				var dictionaryId = query.dictionaryId || '';
				read(config.libraryDir + '/' + currenDictName + '/' + definitionFileName, rangesArray).then(function(difinition) {
					for (i = 0; i < words.length; i++) {
						var obj = {};
						key = Object.keys(words[i])[0];
						obj[key] = difinition[i];
						difinition[i].dictionaryId = currenDictName;
						difinition[i].grammar.partOfspeech = difinition[i].grammar.partOfspeech.length === 0 ? 'none' : difinition[i].grammar.partOfspeech;
						if(difinition[i].grammar.partOfspeech.indexOf(partOfspeech) === 0 && currenDictName.indexOf(dictionaryId) === 0){
							resp.push(obj);
						}
					}
					respons[currenDictName] = resp;
					d++;
					if (d === serverDict.length) {
						defer.resolve({definition: respons,term: word});
					}
					else {
						getDifinition(query, dictPath, prefix, defer);
					}
				}, defer.reject);
			}
			else {
				var message = util.format(errorMessegas.notFoundDefinitionFile, definitionFileName);
				severityResp = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
				defer.reject(severityResp);
			}
		}
		else {
			stem = stemming(word,'en').toUpperCase();
			prefix = 'stem';
			query.dictionaryTermName = stem;
			var indexExpresion = !(wordIndex.hasOwnProperty(currenDictName) && wordIndex[currenDictName].hasOwnProperty(prefix) && wordIndex[currenDictName][prefix].hasOwnProperty(stem[0]));
			if(stem.length !== 0 && word !== stem){
				prefix = '';
				getDifinition(query, dictPath, prefix, defer);
			}
			else if(stem.length !== 0 && indexExpresion){
				getLetterIndex(dictPath, stem[0], prefix, function(load){
					if(load.loaded){
						getDifinition(query, dictPath, prefix, defer);
					}
					else{
						defer.resolve({definition: respons, term: word});
					}
				});
			}
			else{
				defer.resolve({definition: respons,term: word});
			}
		}
	}
}

function selectLocalDicts(useDicts) {
	localDict = [];
	serverDict = [];
	var l;
	for (l = 0; l < useDicts.length; l++) {
		localDict.push(useDicts[l].fileName);
	}
	for(l = 0; l < dictName.length; l++){
		if(!checkInArray(dictName[l], localDict)){
			serverDict.push(dictName[l]);
		}
	}
}

function cleaner() {
	respons = {};
	d = 0;
	words = [];
	localDict = [];
	serverDict = [];
	pth = 0;
	res = {};
	stemIndexLoad = false;
	usedStemSearch = false;
}


exports.loadLetterIndexs = function(path, letter, prefix, callback) {
	cleaner();
	getLetterIndex(path, letter, prefix, callback);
};

exports.searchDictionaryTerms = function(word, useDicts, numberTerms, path, prefix, callback) {
	cleaner();
	numberTerm = numberTerms;
	selectLocalDicts(useDicts);
	res = {};
	word = unidecode(word);
	getWords(path, word, prefix, callback);
};

exports.getDictionaryDefinition = function(query, path, useDicts, prefix) {
	var defer = q.defer();
	cleaner();
	selectLocalDicts(useDicts);
	query.dictionaryTermName = unidecode(query.dictionaryTermName);
	getDifinition(query, path, prefix, defer);
	return defer.promise;
};


exports.getDictConfig = function(){
  var defer = q.defer();
  var language = 'en';
  var contentType = config.contentTypeEnum.dictionary;
  var categories = 'Dictionary';
  var filter;
  var itemsCount;
  var path = [];
  var dictName = {};
  var userId;
  publication.searchPublications(userId, filter, itemsCount, language, contentType, categories).then(function(response){
    if(response.status === config.businessFunctionStatus.ok){
      _.each(response.data ,function(element){
        var dictPath = config.libraryDir + element.id;
        if(fs.existsSync(dictPath)){
          dictName[element._id] = element.name;
          path.push(dictPath);
        }
      });

      if(path.length !== 0){
         defer.resolve({
           data: {path: path, dictName: dictName},
           status: config.businessFunctionStatus.ok
         });
      }
      else{
         defer.resolve({
           status: config.businessFunctionStatus.error
         });
      }
    }
    else{
      defer.resolve(response);
    }
  },defer.reject);
  return defer.promise;
};