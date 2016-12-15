/*jslint node: true */
"use strict";
var errorMessegas = {
  readFromFile : 'File couldn\'t be closed %s.',
  json : 'Not validate json is in file "%s".',
  readIndex : 'Problem with %s file "%s".',
  loadIndex : 'File "%s" is being loaded.'
};
var util = require('util');
var config = require(__dirname + '/../utils/configReader.js');
var fs = require('fs');
var q = require('q');
var _ = require('underscore');
var unidecode = require('unidecode');
var utils = require('../utils/utils.js');
var dictSearch = require('./dictSearch');
var vocabulary = require('./vocabulary.js');

var indexProcessed = true;
var wordIndexProcessed = true;
var settingsClone;
var vacIndex;
var wordIndex;
var dirPath;
var currentVacIndex = [];
var currentWordIndex = [];
var groupIndexs = {};
var emptyResponse = {};
var groupMax = {};
emptyResponse.questions = [];
emptyResponse.groupLen = 0;
emptyResponse.totalNumberOfWords = 0;
var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);

function read(filename, rangesArray) {
	var defer = q.defer();
	var result = [];
	var i = rangesArray.length;
	var json, response, message;

	function readFromArray(i, defer, rangesArray, result) {
		if (i !== 0) {
			fs.open(filename, 'r', function(err, fd) {
				if (!err) {
					var buf = new Buffer(100000);
					fs.read(fd, buf, 0, parseInt(rangesArray[i - 1][1]), parseInt(rangesArray[i - 1][0]), function(err, bytesRead, buffer) {
						if(err){
							response = utils.addSeverityResponse(err.message, config.businessFunctionStatus.error);
							defer.reject(response);
						}
						else if(bytesRead){
							buffer = buffer.slice(0, parseInt(rangesArray[i - 1][1]));
							json = JSON.parse(buffer.toString('utf8'));
							if(json.length !== 0){
								result.unshift(json);
								fs.close(fd, function(err) {
									if (err) {
										message =  util.format(errorMessegas.readFromFile, filename);
										response = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
										defer.reject(response);
									}
									i--;
									readFromArray(i, defer, rangesArray, result);
								});
							}
							else{
								message =  util.format(errorMessegas.json, filename);
								response = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
								defer.reject(response);
							}
						}
					});
				}
				else{
					message = err.message;
					response = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
					defer.reject(response);
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

function sendResponse(data, message, status, callback){
	var response = {};
	if (message){
		logger.log(message);
		response.text = message;
	}
	if(data){
		response.data = data;
	}
	response.status = status;
	callback(response);
}

function compareWordsByPosition(a, b) {
	var wordOne = Object.keys(a)[0];
	var wordTwo = Object.keys(b)[0];
	var keyOne = parseInt(a[wordOne].groupNum, 10);
	var keyTwo = parseInt(b[wordTwo].groupNum, 10);
	return ((keyOne === keyTwo) ? 0 : ((keyOne > keyTwo) ? 1 : -1));
}

function createGroupIndexs(settings){
	var word, partOfSpeech, maxElement;
	if (!_.isEqual(settingsClone, settings)) {
		settingsClone = JSON.parse(JSON.stringify(settings));
		groupIndexs = {};
		groupMax = {};
		for(var i = 0; i < wordIndex.length; i++){
			word = Object.keys(wordIndex[i])[0];
			partOfSpeech = wordIndex[i][word].partOfSpeech;
			partOfSpeech = partOfSpeech.indexOf('verb') !== -1 ? 'verb' : partOfSpeech;
			partOfSpeech = partOfSpeech.indexOf('n') !== -1 ? 'noun' : partOfSpeech;
			if(groupIndexs.hasOwnProperty(partOfSpeech)){
				groupIndexs[partOfSpeech].push(wordIndex[i]);
			}
			else{
				groupIndexs[partOfSpeech] = [wordIndex[i]];
			}
		}
		for(var part in groupIndexs){
			if(groupIndexs.hasOwnProperty(part)){
				groupIndexs[part].sort(compareWordsByPosition);
				maxElement = groupIndexs[part][groupIndexs[part].length - 1];
				word = Object.keys(maxElement)[0];
				groupMax[part] = maxElement[word].groupNum;
			}
		}
	}
}

function getWordIndexInArray(path, callback){
	var data = {indexLoaded: wordIndexProcessed};
	var vocabularyIndexFileName = 'vocabularyWordIndex.json';
	var message =  util.format(errorMessegas.readIndex, ' ' + vocabularyIndexFileName + ' path ', path);
	var status = config.businessFunctionStatus.error;
	if (wordIndexProcessed) {
		wordIndexProcessed = false;
		data.indexLoaded = wordIndexProcessed;
		fs.open(path + '/' + vocabularyIndexFileName, 'r', function(err, repFile) {
			if (err) {
				wordIndexProcessed = true;
				data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
				callback(data);
			}
			fs.readFile(path + '/' + vocabularyIndexFileName, 'utf8', function(err,resp) {
				if (err) {
					wordIndexProcessed = true;
					data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
					callback(data);
				}
				else{
					fs.close(repFile, function(err) {
						if (err) {
							data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
							callback(data);
						}
						wordIndexProcessed = true;
						currentWordIndex = JSON.parse(resp);
						if(currentWordIndex.length !== 0){
							data = currentWordIndex;
							status = config.businessFunctionStatus.ok;
							callback({status: status, data: data});
						}
						else{
							data = '';
							message =  util.format(errorMessegas.json, vocabularyIndexFileName);
							data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
							callback(data);
						}
					});
				}
			});
		});
	}
	else{
		data = utils.addSeverityResponse(errorMessegas.loadIndex, config.businessFunctionStatus.error, data);
		callback(data);
	}
}

var getIndex = function(path, callback) {
	var data = {indexLoaded: indexProcessed};
	var indexFileName = 'index.json';
	var message =  util.format(errorMessegas.readIndex, ' ' + indexFileName + ' path ', path);
	if (indexProcessed) {
		indexProcessed = false;
		data.indexLoaded = indexProcessed;
		fs.open(path + '/' + indexFileName, 'r', function(err, repFile) {
			if (err) {
				indexProcessed = true;
				data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
				callback(data);
			}
			fs.readFile(path + '/' + indexFileName, 'utf8', function(err, indexData) {
				if (err) {
					indexProcessed = true;
					data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
					callback(data);
				}
				else {
					fs.close(repFile, function(err) {
						if (err) {
							data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
							callback(data);
						}
						indexProcessed = true;
						vacIndex = JSON.parse(indexData);
						if(vacIndex.length !== 0){
							currentVacIndex = vacIndex;
							getWordIndexInArray(path, function(response) {
								if (response.status === config.businessFunctionStatus.ok) {
									wordIndex = response.data;
								}
								delete response.data;
								callback(response);
							});
						}
						else{
							data = '';
							message =  util.format(errorMessegas.json, indexFileName);
							data = utils.addSeverityResponse(message, config.businessFunctionStatus.error, data);
							callback(data);
						}
					});
				}
			});
		});
	}
	else{
		vacIndex = currentVacIndex;
		callback(true);
	}
};

function getRandomIndex(number, max, alreadyInUseIndex,incorrectGroupLen,uniqueIndex) {
	var indexs = [];
	var index;
	var numIncorrect = 0;
	var tempIndex = [];
	if (Math.floor(number / incorrectGroupLen) <= max) {
		while (indexs.length !== number) {
			index = Math.floor((max - 1) * Math.random());
			if (indexs.indexOf(index) === -1 && alreadyInUseIndex.indexOf(index) === -1 && uniqueIndex) {
				indexs.push(index);
			}
			if (alreadyInUseIndex[numIncorrect] !== index && tempIndex.indexOf(index) === -1 && !uniqueIndex) {
				tempIndex.push(index);
				if(tempIndex.length % incorrectGroupLen === 0){
					indexs = indexs.concat(tempIndex);
					tempIndex = [];
					numIncorrect++;
				}
			}
		}
	}
	else {
		indexs = [];
		logger.log('Problem in rest/vocabularySearch.js in getRandomIndex()');
	}
	return indexs;
}

function getDef(a, b) { return a.concat(b.definition);}

function getWrongDefinition(definition, wordNumber, group, numberWrongAnswer, alreadyInUseIndex, positions) {
	var defer = q.defer();
	var uniqueIndex = false;
	var index = getRandomIndex(wordNumber * numberWrongAnswer,group.length,alreadyInUseIndex,numberWrongAnswer,uniqueIndex);
	var wordsIndexes = [];
	var i, term, vocIndex;
	for(i = 0; i < index.length; i++){
		term = Object.keys(group[index[i]])[0];
		vocIndex = group[index[i]][term].position;
		wordsIndexes.push(vacIndex[vocIndex][term]);
	}
	read(dirPath + '/definition.txt', wordsIndexes).then(function(wrongAnsers) {
		var respObj;
		var possAnswers;
		var resp = [];
		for(i = 0; i < definition.length; i++){
			respObj = {};
			respObj.positionIndex = positions[i].groupNum;
			respObj.createdAt = new Date().getTime();
			respObj.modifiedAt = new Date().getTime();
			respObj.question = definition[i].value;
			respObj.answer = definition[i].definition;
			possAnswers = _.reduceRight(wrongAnsers.slice(i * numberWrongAnswer,i * numberWrongAnswer + numberWrongAnswer),getDef, []);
			respObj.incorrectAnswers = possAnswers;
			resp.push(respObj);
		}
		defer.resolve(resp);
	},defer.reject);
	return defer.promise;
}


function binarySearchIndex(value, maxIndex, group, delta) {
	var i = 0,
		j = group.length - 1,
		k;
	var key, word;
	while (i <= j) {
		k = Math.floor((i + j) / 2);
		word = Object.keys(group[k])[0];
		key = group[k][word].groupNum;
		if (value >= key - delta && value <= key + delta) {
			return k;
		}
		else if (value < key) {
			j = k - 1;
		}
		else {
			i = k + 1;
		}
	}
	delta += 10; //TO DO to config
	if(delta <= maxIndex){
		return binarySearchIndex(value, maxIndex, group, delta);
	}
	else{
		return -1;
	}
}

function getInterval(group, maxIndex, lowerBound, upperBound, vocabularySettings){
	var delta = 0;
	var indexLower = binarySearchIndex(lowerBound, maxIndex, group, delta);
	delta = 0;
	var indexUpper = binarySearchIndex(upperBound, maxIndex, group, delta);
	var interval = group.slice(indexLower, indexUpper);
	if(interval.length > vocabularySettings.wordNumber * vocabularySettings.incorrectNum){
		return {data: interval, status: config.businessFunctionStatus.ok};
	}
	else{
		upperBound += 10;//TO DO to config
		lowerBound -= 10;
		upperBound = upperBound < maxIndex ? upperBound : maxIndex;
		lowerBound = lowerBound >= 0 ? lowerBound : 0;
		return getInterval(group, maxIndex, lowerBound, upperBound, vocabularySettings);
	} // TODO added reject case
}

function getWords(lowerBound, upperBound, response, vocabularySettings, callback){
	var index, i, vocIndex, wordsIndexes = [], term, result = {}, alreadyInUseIndex = [], incorrectGroupLen = 1;
	var groupLen, group, partOfSpeech, uniqueIndex, wordNumber, incorrectNum;
	var status, message;
	var positions = [];
	partOfSpeech = Object.keys(groupIndexs);
	partOfSpeech = partOfSpeech[Math.round((partOfSpeech.length - 1) * Math.random())];
	group = groupIndexs[partOfSpeech];
	var maxIndex = groupMax[partOfSpeech];
	var currentGroup = getInterval(group, maxIndex, lowerBound, upperBound, vocabularySettings);
	var reason = {};
	if(currentGroup.status === config.businessFunctionStatus.ok){
		groupLen = group.length;
		uniqueIndex = true;
		wordNumber = vocabularySettings.wordNumber;
		incorrectNum = vocabularySettings.incorrectNum;
	}
	else{
		groupLen = 0;
	}

	if(groupLen !== 0){
		index = getRandomIndex(wordNumber,groupLen, alreadyInUseIndex, incorrectGroupLen, uniqueIndex);
		alreadyInUseIndex = index;
		for(i = 0; i < index.length; i++){
			term = Object.keys(group[index[i]])[0];
			vocIndex = group[index[i]][term].position;
			positions.push(group[index[i]][term]);
			wordsIndexes.push(vacIndex[vocIndex][term]);
		}
		read(dirPath + '/definition.txt', wordsIndexes).then(function(definitions) {
			getWrongDefinition(definitions, wordNumber, group, incorrectNum, alreadyInUseIndex, positions).then(function(definitions) {
				response = response.concat(definitions);
				result.questions = response;
				status = config.businessFunctionStatus.ok;
				sendResponse(result, message, status, callback);
			}, callback);
		}, callback);
	}
	else{
		reason = utils.addSeverityResponse(message = 'group ' + currentGroup + ' lenght = 0', config.businessFunctionStatus.error);
		callback(reason);
	}
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

function getWordIndex(word){
	var request = new RegExp(('^' + wordProcessing(word) + '$'), 'gi');
	var index = binarySearch(word, wordIndex, request, true);
	var resp = index !== -1 ? wordIndex[index] : {};
	return resp;
}

function getIncorectAnswer(group, incorrectNum) {
	var defer = q.defer();
	var index, term,  i, vocIndex;
	var alreadyInUseIndex = [], incorrectGroupLen = 1, wordsIndexes = [], uniqueIndex = true;
	var groupLen = group.length;
	var reason = {};
	if(groupLen !== 0){
		index = getRandomIndex(incorrectNum,groupLen,alreadyInUseIndex,incorrectGroupLen, uniqueIndex);
		for(i = 0; i < index.length; i++){
			term = Object.keys(group[index[i]])[0];
			vocIndex = group[index[i]][term].position;
			wordsIndexes.push(vacIndex[vocIndex][term]);
		}
		read(dirPath + '/definition.txt', wordsIndexes).then(function(definitions) {
			var response = [];
			for(i = 0; i < definitions.length; i++){
				response.push(definitions[i].definition);
			}
			defer.resolve(response);
		}, defer.reject);
	}
	else{
		setTimeout(function(){
			reason = utils.addSeverityResponse('Error BF getIncorectAnswer groupLen = 0.', config.businessFunctionStatus.error);
			defer.reject(reason);
		});
	}
	return defer.promise;
}

function getAllCorrectDefinition(data, dictionaryFlashcards, currentDefinition){
	var defer = q.defer();
	if(data.length !== 0){
		getCorrectDefinition(data[currentDefinition]).then(function(definition){
			data[currentDefinition].answer = definition;
			dictionaryFlashcards.push(data[currentDefinition]);
			currentDefinition++;
			if(data.length !== currentDefinition){
				defer.resolve(getAllCorrectDefinition(data, dictionaryFlashcards, currentDefinition));
			}
			else{
				defer.resolve({
					data: dictionaryFlashcards,
					status: config.businessFunctionStatus.ok
				});
			}
		});
	}
	else{
		setTimeout(function(){
			defer.resolve({
				data: dictionaryFlashcards,
				status: config.businessFunctionStatus.ok
			});
		});
	}
	return defer.promise;
}

function getCorrectDefinition(data) {
	var defer = q.defer();
	var checkLetter = /\w/;
	var prefix = '';
	var useDicts = [];
	var word = data.termName;
	var reason = {};
	dictSearch.getDictConfig().then(function(dictConfig) {
		if (dictConfig.status === config.businessFunctionStatus.ok) {
			var path = dictConfig.data.path;
			var query = {
				dictionaryTermName: data.termName,
				partOfspeech: data.partOfSpeech,
				dictionaryId: data.dictionaryId
			};
			if (checkLetter.test(word[0])) {
				dictSearch.loadLetterIndexs(path, word[0], prefix, function() {
					dictSearch.getDictionaryDefinition(query, path, useDicts, prefix).then(function(dictionaryResponse) {
						var definition = dictionaryResponse.definition[query.dictionaryId][0][query.dictionaryTermName].definitions[0].text;
						defer.resolve(definition);
					}, function(reason) {
						defer.reject(reason);
					});
				});
			}
		}
		else {
			reason = utils.addSeverityResponse(dictConfig.text, config.businessFunctionStatus.error, reason);
			defer.reject(reason);
		}
	}, defer.reject);
	return defer.promise;
}

function incorectDictionaryTerm(num, data, response, vocabularySettings){
	var defer = q.defer();
	var incorrectNum = vocabularySettings.incorrectNum;
	vocabularySettings.wordNumber = 1;
	var flashCardRange = 200;
	var lowerBound, upperBound;
	var reason = {};
	if(data.length !== 0){
		var word = data[num].termName.toLowerCase();
		var indexResp = getWordIndex(word);
		var partOfSpeech, group, maxIndex, interval;
		if(!indexResp.hasOwnProperty(word)){
			indexResp[word] = {};
			partOfSpeech = Object.keys(groupIndexs);
			indexResp[word].partOfSpeech = partOfSpeech[Math.round((partOfSpeech.length - 1) * Math.random())];
			interval = {data: groupIndexs[indexResp[word].partOfSpeech], status: config.businessFunctionStatus.ok};
		}
		else{
			lowerBound = indexResp[word].groupNum - flashCardRange;
			upperBound = indexResp[word].groupNum + flashCardRange;
			group = groupIndexs[indexResp[word].partOfSpeech];
			maxIndex = groupMax[indexResp[word].partOfSpeech];
			interval = getInterval(group, maxIndex, lowerBound, upperBound, vocabularySettings);
		}
		if(interval.status === config.businessFunctionStatus.ok){
			getIncorectAnswer(interval.data, incorrectNum).then(function(incAnsResponse){
				getCorrectDefinition(data[num]).then(function(definition){
					var responseObj = {
						question: data[num].termName,
						answer: definition,
						incorrectAnswers: incAnsResponse
					};
					responseObj = _.extend(responseObj, data[num]);
					response.push(responseObj);
					if (data.length - 1 !== num) {
						num++;
						defer.resolve(incorectDictionaryTerm(num, data, response, vocabularySettings));
					}
					else {
						defer.resolve({data: response, status: config.businessFunctionStatus.ok});
					}
				}, defer.reject);
			}, function(){
				defer.resolve([]);
			});
		}
		else{
			setTimeout(function(){
				reason = utils.addSeverityResponse(interval.text, config.businessFunctionStatus.error);
				defer.reject(reason);
			});
		}
	}
	else{
		setTimeout(function(){
			reason = utils.addSeverityResponse('Error in BF getIncorectAnswers with creare settings.', config.businessFunctionStatus.error);
			defer.reject(reason);
		});
	}
	return defer.promise;
}

function getVocabularySettings(path){
	var vocabularySettings = '';
	var response = {};
	var message = 'Vocabulary assessment: file does not exist manifest.json ' + path;
	if (fs.existsSync(path)) {
		vocabularySettings = fs.readFileSync(path);
		vocabularySettings = vocabularySettings ? vocabularySettings.toString() : '[]';
		vocabularySettings = JSON.parse(vocabularySettings);
		if(vocabularySettings.length !== 0){
			response.status = config.businessFunctionStatus.ok;
		}
		else{
			message = 'not validate json';
			response.status = config.businessFunctionStatus.error;
			response.text = message;
			logger.log(message);
		}
	}
	else{
		response.status = config.businessFunctionStatus.error;
		response.text = message;
		logger.log(message);
	}
	response.data = vocabularySettings;
	return response;
}

var getIncorectAnswers = function(path, data) {
	var defer = q.defer();
	var responseDict = [];
	var reason = {};
	path = path + '/manifest.json';
	var vocabularySettings = getVocabularySettings(path);
	vocabularySettings.data.incorrectNum = 3;
	if(vocabularySettings.status === config.businessFunctionStatus.ok){
		createGroupIndexs(vocabularySettings.data);
		if(data.length !== 0 && vocabularySettings.data.length !== 0){
			var dictNum = 0;
			incorectDictionaryTerm(dictNum, data, responseDict, vocabularySettings.data).then(defer.resolve, defer.reject);
		}
		else{
			setTimeout(function(){
				reason = utils.addSeverityResponse('Error in BF getIncorectAnswers with creare settings.', config.businessFunctionStatus.error);
				defer.reject(reason);
			});
		}
	}
	else{
		setTimeout(function(){
			reason = utils.addSeverityResponse(vocabularySettings.text, config.businessFunctionStatus.error);
			defer.reject(reason);
		});
	}
	return defer.promise;
};

function creatVocabualrySettings(path, numberQuestion, numberIncorrectAnswers){
	var settings  = getVocabularySettings(path);
	if(settings.status === config.businessFunctionStatus.ok){
		settings.data.incorrectNum = numberIncorrectAnswers;
		settings.data.wordNumber = numberQuestion;
	}
	return settings;
}

exports.loadIndexs = function(path, callback) {
	dirPath = path;
	getIndex(path, callback);
};

exports.createFlashcards = function(dictionaryTerm){
   var defer = q.defer();
   var reason = {};
   vocabulary.getVocabularyPaths().then(function(pathResponse) {
     if (pathResponse.status === config.businessFunctionStatus.ok) {
       dirPath = pathResponse.data[0]; //TO DO add work with many vocabula
       getIndex(dirPath, function(response) {
         if(response.status === config.businessFunctionStatus.ok){
            getIncorectAnswers(dirPath, dictionaryTerm).then(defer.resolve, defer.reject);
         }
         else{
            reason = utils.addSeverityResponse('Problem in BF createFlashcards with indexes.', config.businessFunctionStatus.error);
            defer.reject(reason);
         }
       });
     }
     else {
       reason = utils.addSeverityResponse(pathResponse.text, config.businessFunctionStatus.error);
       defer.reject(reason);
     }
   }, defer.reject);
   return defer.promise;
};

exports.getVocabularyQuestions = function(path, lowerBound, upperBound, numberQuestion, numberIncorrectAnswers, callback){
	var response = [];
	path = path + '/manifest.json';
	var vocabularySettings = creatVocabualrySettings(path, numberQuestion, numberIncorrectAnswers);
	var message = util.format(errorMessegas.json, 'manifest.json');
	if(vocabularySettings.status === config.businessFunctionStatus.ok){
		createGroupIndexs(vocabularySettings.data);
		getWords(lowerBound, upperBound, response, vocabularySettings.data, callback);
	}
	else{
		response = utils.addSeverityResponse(message, config.businessFunctionStatus.error);
		callback(response);
	}
};

exports.getAllCorrectDefinition = function(data){
	var currentDefinition = 0;
	var dictionaryFlashcards = [];
	return getAllCorrectDefinition(data, dictionaryFlashcards,currentDefinition);
};