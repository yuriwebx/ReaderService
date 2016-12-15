/* global btoa */
define([
   'ngModule',
   'underscore',
   'publication/dom-utils/text-utils',
], function (ngModule, _, TextUtils) {
   'use strict';

   return ngModule.filter('SearchResult', ['$window', 'SearchStemsWrapperService', function ($window, SearchStemsWrapperService) {

      /**
       * Minimizes sentences, leaving maximum N words from each side
       *
       * @param {Array} wordForms array of word forms to search
       * @param {Array} quotes array of quotes forms to search
       * @param {string} text sentence to minimize
       * @param {string} lang
       */ 
      function getWordsFromText(wordForms, quotes, text, lang) {
         var searchTermsRealOffsets = [],
             searchQuotesRealOffsets = [];
         if (wordForms.length !== 0) {
            searchTermsRealOffsets = TextUtils.locateSearchTermsInText(wordForms, text);
         }
         if (quotes.length !== 0) {
            searchQuotesRealOffsets = _.map(quotes, function(quote) {
               return TextUtils.searchQuoteRealOffsets(text, quote, lang);
            });
         }
         var searchRealOffsets = searchTermsRealOffsets.concat(_.flatten(searchQuotesRealOffsets));
         var words = _.map(searchRealOffsets, function(realOffsets) {
            return text.substring(realOffsets[0], realOffsets[1]);
         });
         return words;
      }

      function getTextFromSentence(sentence) {
         var temp = $window.document.createElement('DIV');
         temp.innerHTML = sentence;
         var text = TextUtils.extractContent(temp);
         return text;
      }

      function minimizeSentence(sentence, wordsInText) {
         var wordRe = /#word_\d+#/;
         _.each(wordsInText, function (word, index) {
            sentence = sentence.replace(word.trim(), '#word_' + index + '#');
         });

         var words = _.compact(sentence.split(/\s+/));
         var wordIndex = [],
            sentenceParts = [],
            separator = '...';

         var wordsInTextIndex = 0;
         _.each(words, function (word, index) {
            if (wordRe.test(word)) {
               word = wordsInText[wordsInTextIndex];
               words[index] = word;
               wordIndex.push(index);
               wordsInTextIndex += 1;
            }
         });

         //apply rules for forming minimize sentences
         var maxSymbolsNum = 120;
         var correctionCoefficient = 15;
         var half = Math.round(maxSymbolsNum / 2);
         var parts = [];
         var startIndex = 0;
         _.each(wordIndex, function(wordPosition) {
            parts.push(words.slice(startIndex, wordPosition).join(' '));
            startIndex = wordPosition;
         });
         var wordPosition = wordIndex.pop();
         parts.push(words.slice(wordPosition).join(' '));
         var trimRigthRe = /^\w+\s/g;
         var trimLeftRe = /\s\w+$/g;
         var first = parts.shift() || '';
         var last = parts.pop() || '';
         if (first.length > half) {
           first = separator + first.substring(first.length - half, first.length).replace(trimRigthRe, '');
         }
         if (last.length > half) {
           last = last.substring(0, half).replace(trimLeftRe, '') + separator;
         }
         sentenceParts.push(first);
         _.each(parts, function(part) {
            var left = '',
                right = '',
                middlePart = '';
            if(part.length > maxSymbolsNum){
               left = part.substring(0, half);
               middlePart = part.substring(half, part.length - half);
               right = part.substring(part.length - half,part.length);
               if(middlePart.length < correctionCoefficient){
                  sentenceParts.push(part);
               }
               else {
                  sentenceParts.push(left.replace(trimLeftRe, ''), separator, right.replace(trimRigthRe, ''));
               }
            }
            else{
               sentenceParts.push(part);
            }
         });
         sentenceParts.push(last);
         return sentenceParts.join(' ');
      }

      return function (data, lang) {
         if (!data.rows || data.rows.length === 0) {
            return [];
         }

         data.rows = _.map(data.rows, function (current) {
            var text = getTextFromSentence(current.sentence);
            var wordsInText = getWordsFromText(data.stems, data.quotes, text, lang);

            var title = minimizeSentence(current.sentence, wordsInText);
            title = SearchStemsWrapperService.highlightSearchResultInSentence(title, data.stems, data.quotes, lang);
            title = title.length !== 0 ? title : current.sentence;
            //TODO: one time highlight
            var paragraph = SearchStemsWrapperService.highlightSearchResultInSentence(current.sentence, data.stems, data.quotes, lang);
            var encodedInfo = btoa(encodeURIComponent(JSON.stringify({
               paraId : current.sentenceNumber.replace('para_', ''),
               words : wordsInText
            })));
            while (encodedInfo.length > 2000 && wordsInText.length) {
               wordsInText.pop();
               encodedInfo = btoa(encodeURIComponent(JSON.stringify({
                  paraId : current.sentenceNumber.replace('para_', ''),
                  words : wordsInText
               })));
            }
            return {
               _id : current.bookId,
               title : title,
               paragraph : paragraph,
               paragraphId : current.sentenceNumber,
               fileName : current.fileName,
               stems : data.stems,
               paragraphs : current.paragraphs,
               encodedInfo : encodedInfo,
               mininizeTitle: title,
               moreTextIndex: current.moreTextIndex
            };
         });

         return data;
      };
   }]);
});