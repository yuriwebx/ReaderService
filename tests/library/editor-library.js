/* jshint strict: true */
/* jshint unused:false */
/* jshint -W061 */
/* jshint -W083 */
/* jshint -W097 */
/* jshint -W117 */
'use strict';
require('jasmine-before-all');
var webdriver = require('selenium-webdriver');
var assert = require('assert');
var cheerio = require('cheerio');
var Yadda = require('yadda');
var commonUtils = require('./function-set');
//var fs = require('fs');
//console.log('123', commonUtils);

//var toolBox = require('./toolBox');

module.exports = (function () {

    var dictionary = new Yadda.Dictionary()
            .define('LOCALE', /(fr|es|ie)/)
            .define('NUM', /(\d+)/);

    var applicationArea, maxTimeout = 120000;

    var library = new Yadda.localisation.English.library(dictionary)

//Scenario: Select data area
            .given("I select data area $area", function (area) {
                //applicationArea = 'this.mappingData.' + area;
				applicationArea = this.mappingData[area];
            })

//Scenario: Test site opening and login
            .given("Set test steps time", function () {
                //this.driver.manage().timeouts().implicitlyWait(maxTimeout);
                //this.driver.manage().timeouts().pageLoadTimeout(maxTimeout);
                //this.driver.manage().window().maximize();
            })
            .when("I open $link page", function (link) {
                var driver = this.driver;
				link = (link === 'url' ? this.environmentConfigData[link] + 'editor/index.html' : link);
                driver.get(link);
                return driver.wait(webdriver.until.titleIs(link), maxTimeout);
            })
            .when("I click on Editor button $EditorButton", function (EditorButton) {
                this.driver.findElement(webdriver.By.css(this.mappingData.editor[EditorButton])).click();
            })
            .then("Main page should have $titleName title", function (titleName) {
                var driver = this.driver;
                titleName = (titleName === 'url' ? this.environmentConfigData[titleName] + 'editor/index.html' : titleName);
                /*driver.getTitle().then(function (title) {
                 if (title !== titleName) {
                 throw new Error(
                 'Expected "' + titleName + '", but was "' + title + '"');
                 }
                 });*/
                return driver.wait(webdriver.until.titleIs(titleName), maxTimeout);
            })
            .then("And we should see login form $LoginForm", function (LoginForm) {
                //return this.driver.findElement(webdriver.By.css(this.mappingData.common[LoginForm]));
                var data = applicationArea[LoginForm];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				return driver.sleep(2000).then(function() {
					return commonUtils._findElements(driver, locator);
				}); 
            })
			
            .given("Maximize window", function () {
                this.driver.manage().window().maximize();
            })

            .given("Should be input $value into $place", function (value, place) {
                /*this.driver.findElement(webdriver.By.css(this.mappingData.common[place])).clear();
                this.driver.findElement(webdriver.By.css(this.mappingData.common[place])).sendKeys(value);*/
				var data = applicationArea[place];
                var locator = commonUtils.byCss(data);//webdriver.By.css(this.mappingData.common[place]);//;
                var driver = this.driver;
				/*return commonUtils.waitForEnableAndClearValue(driver, locator).then(function(){
					return commonUtils.waitForEnableAndInputValue(driver, locator, value);
				});*/
				return driver.sleep(500).then(function() {
					return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
						return commonUtils.waitForEnableAndInputValue(driver, locator, value);
					});
				});				
            })
			.then("Check $text existing in $place", function (text, place) {
				try {
					var data = applicationArea[place];
					var driver = this.driver;
					//driver.sleep(1000);
					var locator = commonUtils.byCss(data);
					//return driver.sleep(1000).then(function(){
					return commonUtils.waitForEnable(driver, locator)
					.then(function (element) { 
						return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
						.then(function (found) { 					
							element
								.getAttribute('value')
								.then(function (value)
								{
									assert.equal(text, value);
								})
						})
					});
					//});
				}
				catch (err) {
					console.log(err.stack || String(err));
				}
            })			

            /*.when("I press Enter on $form",function(form) {
             var driver = this.driver;
             driver.findElement(webdriver.By.css(this.mappingData.common[form])).submit();
             })*/
            .when("I press login button $LoginButton", function (LoginButton) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[LoginButton])).click();
				var driver = this.driver;
                var data = applicationArea[LoginButton];
                var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnableAndClickOrQuit(driver, locator);
				return commonUtils._findAndClick(driver, locator);					
            })
            /*.then("We should see top menu $menu", function(menu) {
				 this.driver.findElement(webdriver.By.css(this.mappingData.admin[menu]));
				 })
				 .then("We should see $role button $button", function(role, button) {
				 //return this.driver.findElement(webdriver.By.css(this.mappingData.editor[button])) === role;
				 this.driver.findElement(webdriver.By.css(this.mappingData.editor[button]));
             })*/
            .then("We should see label $EditorLabel = $text", function (EditorLabel, text) {
                var data = applicationArea[EditorLabel];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndCompareValue(driver, locator, text);
				return commonUtils._findAndCompareInnerHtml(driver, locator, text);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator)
				.then(function(elements) {
					var element = elements[0];
					return element.getInnerHtml().then(function(value) {
						return assert.equal(text, value);
					});
				});*/				
            })

            .then("We should see list $BookList", function (BookList) {
                var data = applicationArea[BookList];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);					
            })

//Scenario: Test logout
            .when("I toggle menu $menu", function (menu) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[menu])).click();
                var data = applicationArea[menu];
                var driver = this.driver;
				//driver.sleep(1000);
                var locator = commonUtils.byCss(data);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
				return driver.sleep(1000).then(function(){
					//return commonUtils._findAndClick(driver, locator);
					return commonUtils._findElements(driver, locator).then(function(elements){
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						seq.mouseMove(element).click().perform();
					});					
				});
            })
            .then("We should see logout $button", function (button) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
				var data = applicationArea[button];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator);
            })
            .then("We should see dictionary $DictionaryItem", function (DictionaryItem) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[DictionaryItem]));
				var data = applicationArea[DictionaryItem];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })
            .then("We should see extras $ExtrasItem", function (ExtrasItem) {
				var data = applicationArea[ExtrasItem];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator);
            })			

            .when("I click logout $button", function (button) {
                //this.driver.sleep(500);
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[button])).click();
				var data = applicationArea[button];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
            })
            .then("We should see login screen $LoginScreen", function (LoginScreen) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[LoginScreen]));
            })
            .then("We log out", function () {
                //this.driver.sleep(500);
            })

//Scenario: Test logout from portal
            .when("I click on show menu $button", function (button) {
                this.driver.findElement(webdriver.By.css(this.mappingData.portal[button])).click();
            })
            .then("We should see logout item $button", function (button) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
            })


//Scenario: Open book
            .when("I focus on filter $FilterBox", function (FilterBox) {
                var data = applicationArea[FilterBox];
                commonUtils.findCss(this.driver, data).click();
            })
            .then("I can enter some text", function () {

            })

            .given("I introduce $bookName in $filter", function (bookName, filter) {
				var value = applicationArea[bookName];
                var data = applicationArea[filter];
                var driver = this.driver;
				//driver.sleep(1000);
                var locator = commonUtils.byCss(data);
				/*return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
					return commonUtils.waitForEnableAndInputValue(driver, locator, value);
				});*/
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerAndInput2(driver, locator, inputBlockerLocator, value);*/
				return commonUtils._findAndInput(driver, locator, value);
            })
            /*.then("We should see $filter has matching $item", function(filter, item) {
             return this.driver.findElement(webdriver.By.css(this.mappingData.common[filter])) === this.driver.findElement(webdriver.By.xpath(this.mappingData.common[item]));
             })*/
            .then("We should see $filter has matching $item", function (filter, item) {
                var data = applicationArea[item];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return driver.sleep(1000).then(function(){
					//return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
					return commonUtils._findElements(driver, locator);
				});
				//return commonUtils._findAndClick(driver, locator);
				
            })

            .when("I open book $bookName", function (bookName) {
                //this.driver.findElement(webdriver.By.xpath(this.mappingData.common[bookName])).click();
                //this.driver.sleep(maxTimeout);
                var data = applicationArea[bookName];
				var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				driver.sleep(1000).then(function() {
					//return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
					//return commonUtils._findAndClick(driver, locator);
					return commonUtils._findElements(driver, locator).then(function(elements){
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						seq.mouseMove(element).click().perform();
					});
				});
            })
            .then("We should see $book view", function (book) {
                //return this.driver.findElement(webdriver.By.css(this.mappingData.common[popup]));
                var data = applicationArea[book];
                var driver = this.driver;
				//driver.switchTo().frame(0);
				var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);*/
				driver.sleep(1000).then(function() {
					return commonUtils._findElements(driver, locator);
				});
				//driver.switchTo().defaultContent();
            })
            .then("We should see button $CreateStudyGuideButton", function (CreateStudyGuideButton) {
                var data = applicationArea[CreateStudyGuideButton];
                var driver = this.driver;
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })			

            .when("I create study guide $CreateStudyGuideButton", function (CreateStudyGuideButton) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.editor[CreateStudyGuideButton])).click();
				var data = applicationArea[CreateStudyGuideButton];
				var driver = this.driver;
				//driver.sleep(1000);
				//driver.switchTo().defaultContent();
                var locator = commonUtils.byXpath(data);
				/*commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function(found) {
					found.click();
				});*/
				return commonUtils.waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
            })
            .then("we should see popup $BookPopup", function (BookPopup) {
                var data = applicationArea[BookPopup];
				//console.log('++++++++++  ',data);
				var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//console.log('----------  ',locator);
				return commonUtils.waitForEnable(driver, locator);				
            })
            .then("we should see content $BookContent", function (BookContent) {
                var data = applicationArea[BookContent];
				//console.log('++++++++++  ',data);
				var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//console.log('----------  ',locator);
				//return commonUtils.waitForEnable(driver, locator);
				return commonUtils._findElements(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
            })			
/*
            .then("We should see $StudyGuideHeaderText in header $StudyGuideHeader", function (StudyGuideHeaderText, StudyGuideHeader) {
                var driver = this.driver;
				//driver.sleep(1000);
                var text = applicationArea[StudyGuideHeaderText];
                var data = applicationArea[StudyGuideHeader];
                var locator = commonUtils.byXpath(data);
				commonUtils.waitForEnableAndCompareValue(driver, locator, text);
				/*commonUtils.waitLocator(this.driver, locator).then(function(found) {
					found
                        .getInnerHtml()
                        .then(function (innhtml)
                        {
                            assert.equal(text, innhtml);
                        });
				});*/
/*            })
*/			
            .when("user clicks out of study guide $OutOfStudyGuidePopup", function (OutOfStudyGuidePopup) {
                var data = applicationArea[OutOfStudyGuidePopup];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
				var seq = new webdriver.ActionSequence(driver);
				//return driver.sleep(1000).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						return seq.mouseMove(element, -1, -1).click().perform().then(function()
						//return seq.mouseMove(element).click().perform().then(function() 
						{
							return driver.sleep(1000);
						});
					});
					/*return commonUtils._findAndClick(driver, locator).then(function() {
						return driver.sleep(2000);
					});*/
					//return commonUtils._findAndClick(driver, locator);
				//});				
			})
            .then("Content $BookContent is visible", function (BookContent) {
                var data = applicationArea[BookContent];
				//console.log('++++++++++  ',data);
				var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//console.log('----------  ',locator);
				//return commonUtils.waitForEnable(driver, locator);				
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);*/
				//return driver.sleep(1000).then(function() {
					return commonUtils._findElements(driver, locator).then(function() {
						return driver.sleep(1000);
					});
				//});
            })			
			
            .when("I click extra button $BookExtraButton", function (BookExtraButton) {
                var data = applicationArea[BookExtraButton];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				//commonUtils.waitForEnable(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
					return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator)*/
				return commonUtils._findElements(driver, locator)
					.then(function(elements) {
					var element = elements[0];
					//return driver.sleep(1000).then(function() {
						return commonUtils.waitLocator(driver, locator).then(function(element) {
							var seq = new webdriver.ActionSequence(driver);
							return seq.mouseMove(element).click().perform();
						})
					//});
				});
				//return commonUtils._findAndClick(driver, locator);
			})				
            .then("We should see extra frame $ExtraFrame", function (ExtraFrame) {
                var data = applicationArea[ExtraFrame];
				var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);				
            })
			.then("we should see $flashcard $Name in $FlashcardTab", function (flashcard, Name, FlashcardTab) {
				var driver = this.driver;
                var data = applicationArea[FlashcardTab];
				//console.log('data.........',data);
				var locator = commonUtils.byXpath(data);
				//console.log('locator.........',locator);
				//return driver.sleep(1000).then(function() {
					return commonUtils._findAndCompareHtml(driver, locator, Name);
				//});// waitForEnableAndCompareValue(driver, locator, Name);
				//return commonUtils.waitForEnable(driver, locator);
            })
            .then("we should see annotation $Name in $AnnotationComment", function (Name, AnnotationComment) {
				var driver = this.driver;
                var data = applicationArea[AnnotationComment];
				var locator = commonUtils.byXpath(data);
				return commonUtils._findAndCompareHtml(driver, locator, Name);
            })
            .then("bookmark $BookmarkItem is displayed in tab AnnotationsTab", function (BookmarkItem) {
				var driver = this.driver;
                var data = applicationArea[BookmarkItem];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })			
			
            .when("I click on edit button $EditButton", function (EditButton) {
                //this.driver.findElement(webdriver.By.xpath(this.mappingData.editor[EditButton])).click();
                var data = applicationArea[EditButton];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
				//return commonUtils.waitForEnableAndClick(driver, locator);
				return commonUtils._findAndClick(driver, locator);
            })
            .then("We should see area $area", function (area) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.editor[area]));
				var data = applicationArea[area];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })

            .given("In text $area type $text", function (area, text) {
                /*this.driver.findElement(webdriver.By.css(this.mappingData.editor[area])).clear();
                this.driver.findElement(webdriver.By.css(this.mappingData.editor[area])).sendKeys(this.mappingData.editor[text]);*/
				var data = applicationArea[area];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				var value = applicationArea[text];
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform().then(function() {				
					/*return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
						return commonUtils.waitForEnableAndInputValue(driver, locator, value);
					});*/
						return element.clear().then(function() {
							return element.sendKeys(value);
						});
					});
				});
            })
            .then("We should see new text in text areas", function () {
				//this.driver.sleep(1000);
            })

            .when("I click save button $SaveButton", function (SaveButton) {
                //this.driver.findElement(webdriver.By.xpath(this.mappingData.editor[SaveButton])).click();
                //this.driver.sleep(500);
                var data = applicationArea[SaveButton];
                //commonUtils.findCss(this.driver, data).click();
                var driver = this.driver;
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(driver, locator);
            })
            .then("We should see $area contains $text", function (area, text) {
                text = applicationArea[text];
                var data = applicationArea[area];
				var locator = commonUtils.byCss(data);
                //commonUtils.findCss(this.driver, data)
				//commonUtils.waitForEnable(this.driver, locator).then(function(found) {
				return commonUtils.waitLocator(this.driver, locator).then(function(found) {
					found
                        .getInnerHtml()
                        .then(function (innhtml)
                        {
                            assert.equal(text, innhtml);
                        });
				});
            })

            .when("I click on library $LibraryButton", function (LibraryButton) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.editor[LibraryButton])).click();
				var data = applicationArea[LibraryButton];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				/*return driver.sleep(2000).then(function() {
					return commonUtils._findAndClick(driver, locator);
				});*/
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
					var element = elements[0];
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					//})
				});				
            })
            .then("We should see book list $list", function (list) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[list]));
				var data = applicationArea[list];
				var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//return commonUtils._findElements(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })

            .when("I click on seeking $SeekingStudyGuide", function (SeekingStudyGuide) {
                //this.driver.findElement(webdriver.By.xpath(this.mappingData.editor[SeekingStudyGuide])).click();
                //this.driver.sleep(500);
                var data = applicationArea[SeekingStudyGuide];
				var driver = this.driver;
                var locator = commonUtils.byXpath(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })

            .when("I click out of popup $OutOfStudyGuidePopup", function (OutOfStudyGuidePopup) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.editor[OutOfStudyGuidePopup])).click();
                //this.driver.sleep(500);
                var data = applicationArea[OutOfStudyGuidePopup];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					return seq.mouseMove(element, -1, -11).click().perform();
					//return seq.mouseMove(element).click().perform();
				});					
            })
            .then("Popup is closing", function () {

            })
            .then("We should close popup and see $content", function (content) {
                var data = applicationArea[content];
                var locator = commonUtils.byCss(data);//byId(data);
				//waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
            })			
			
            .when("I click edit study guide $EditStudyGuide", function (EditStudyGuide) {
                //this.driver.sleep(500);
                var data = eval(applicationArea + '.' + EditStudyGuide);
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				commonUtils.waitForEnableAndClick(driver, locator);
            })
            .then("Popup is disappeared", function () {

            })			

//Scenario: Test full text search
            .when("I click on search icon $SearchIcon", function (SearchIcon) {
                var driver = this.driver;
                var data = eval(applicationArea + '.' + SearchIcon);
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
            .then("We should see search popup $SearchPopup", function (SearchPopup) {
                var data = eval(applicationArea + '.' + SearchPopup);
                //eval(findId);
				//findId(this.driver, data);
				var driver = this.driver;
				var locator = commonUtils.byId(data);
				commonUtils.waitForEnable(driver, locator);
            })

            .given("I input $SearchingText into search box $SearchTextField", function (SearchingText, SearchTextField) {
                var data = applicationArea[SearchTextField];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
                var search = eval(applicationArea + '.' + SearchingText);
                commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function (found) {
                    /*if (!found.isDisplayed()) {
                        driver.sleep(500);
                    }*/
                    found.clear();
                    found.sendKeys(search);
                });
            })
            .when("I click on search text icon $SearchTextIcon", function (SearchTextIcon) {
                var data = applicationArea[SearchTextIcon];
                var driver = this.driver;
				var locator = commonUtils.byCss(data);
				commonUtils.waitForEnableAndClick(driver, locator);
            })
            .then("We should see $some search $result", function (some, result) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[result]));
            })
            .then("We should see searching books list $list", function (list) {
                var data = applicationArea[list];
                var driver = this.driver;
				var locator = commonUtils.byCss(data);
				commonUtils.waitForEnable(driver, locator);
            })
            .then("Search results number = $SearchResultsNumber", function (SearchResultsNumber) {
                var data = applicationArea[SearchResultsNumber];
                //commonUtils.findCss(this.driver, data)
				commonUtils.waitForEnable(driver, locator).then(function(found) {
					found
						.getInnerHtml()
                        .then(function (value) {
                            console.log('SearchResultsNumber = ', value);
                        });
				});
            })
            .then("First book is $FirstBook", function (FirstBook) {
                var data = applicationArea[FirstBook];
                commonUtils.findCss(this.driver, data)
                        .getInnerHtml()
                        .then(function (value)
                        {
                            //console.log(value);
                            assert.ok(value === 'The General Theory of Employment, Interest, and Money Project Gutenberg Australia (1)');
                        });
            })

            .when("I click on current $CurrentBook", function (CurrentBook) {
                //this.driver.findElement(webdriver.By.css(CurrentBook)).click();
				var data = applicationArea[CurrentBook];
                var driver = this.driver;
				var locator = commonUtils.byCss(data);
				commonUtils.waitForEnableAndClick(driver, locator);
            })
            .then("We should see result $SnippetList contains $SearchingText", function (SnippetList, SearchingText) {
                var seartext = this.mappingData.common[SearchingText].toLowerCase();
                var occtext, found = false;
                var i = 1;
                var innHtml = '!empty';
                while (innHtml !== '' && innHtml !== null && innHtml !== undefined) {
                    try {
                        innHtml = '';
                        /* jshint ignore:start */
                        occtext = this.driver.findElement(webdriver.By.css(this.mappingData.common[SnippetList] + ' > li:nth-child(' + i + ') > p > span > strong'))
                                .getInnerHtml()
                                .then(function (text)
                                {
                                    innHtml = text.toLowerCase();
                                    //return assert.equal(innHtml, seartext) ? true : innHtml.indexOf(seartext) !== -1 ? true : false;
                                    found = innHtml.indexOf(seartext) !== -1 ? true : false;

                                    //console.log(i, innHtml);
                                });
                        /* jshint ignore:end */
                    } catch (err) {
                        console.log(err.stack || String(err));
                    }
                    if (!found) {
                        break;
                    }
                    i++;

                }
                return found;
            })

            .when("I click out of search $OutOfSearch", function (OutOfSearch) {
				//this.driver.sleep(maxTimeout);
                //return this.driver.findElement(webdriver.By.css(this.mappingData.common[OutOfSearch])).click();
                //this.driver.close();
				var driver = this.driver;
				var data = applicationArea[OutOfSearch];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
            .then("We can logout", function () {

            })			
            .then("We should see search is closed", function () {

            })

            .given("user is on the $link page", function (link) {
                var driver = this.driver;
                link = this.mappingData.editor[link] ? this.mappingData.editor[link] : link;
                page = (link === 'url' ? this.environmentConfigData[link] + 'editor/#/library' : link + 'editor/#/library');
                driver.get(page);

                var titleName = (link === 'url' ? this.environmentConfigData[link] + 'editor/#/library' : link + 'editor/#/library');
                return driver.wait(function () {
                    return driver.getTitle().then(function (title) {
                        //return title === titleName;
                        assert.equal(title, titleName);
                    });
                }, maxTimeout);
            })

            .when("user clicks link $ExercisesLink", function (ExercisesLink) {
                var driver = this.driver;
                /*if (ExercisesLink === 'AnnotationsLink') {
                 driver.switchTo().defaultContent();
                 }*/
                var data = applicationArea[ExercisesLink];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//return driver.sleep(500).then(function() {
					return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);		
				//});
            })
            .then("$ExercisesTab tab is opened", function (ExercisesTab) {
                var data = applicationArea[ExercisesTab];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })
            .then("We should see $StudyGuideHeaderText in header $StudyGuideHeader", function (StudyGuideHeaderText, StudyGuideHeader) {
                var driver = this.driver;
				//driver.sleep(1000);
                var text = applicationArea[StudyGuideHeaderText];
                var data = applicationArea[StudyGuideHeader];
                var locator = commonUtils.byXpath(data);
				return commonUtils._findAndCompareHtml(driver, locator, text);
				/*commonUtils.waitLocator(this.driver, locator).then(function(found) {
					found
                        .getInnerHtml()
                        .then(function (innhtml)
                        {
                            assert.equal(text, innhtml);
                        });
				});*/
            })
            .then("Paragraph summary button $ParagraphSummaryButton is displayed", function (ParagraphSummaryButton) {
                var data = applicationArea[ParagraphSummaryButton];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })

            .when("user selects snippet from $Point1 to $Point2", function (Point1, Point2) {
				var element1, element2;
				var driver = this.driver;
                var data = applicationArea[Point1];
				var locator = commonUtils.byCss(data);
				console.log("locator1.............",locator);
				//return driver.sleep(1000).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
					//return commonUtils.waitForEnable(driver, locator).then(function(element1) {	
					var element1 = elements[0];
					console.log("element1.............",element1);
					data = applicationArea[Point2];
					locator = commonUtils.byCss(data);
					console.log("locator2.............",locator);
					return commonUtils._findElements(driver, locator).then(function(elements) {
					//return commonUtils.waitForEnable(driver, locator).then(function(element2) {
						var element2 = elements[0];
						console.log("element2.............",element2);
						//driver.sleep(500);
						var seq1 = new webdriver.ActionSequence(driver);
						var seq2 = new webdriver.ActionSequence(driver);
						var seq3 = new webdriver.ActionSequence(driver);
						//if (Point1 != Point2) {
								/////   !!!!!!!!
							//return seq1.mouseMove(element1).click().click().perform()
							//seq1.mouseMove(element1).mouseDown(element1).perform();
							/*seq1.mouseDown(element1).mouseMove(element1).perform();
							//seq1.mouseDown(element1).perform();
							seq2.mouseMove(element2).perform();
							seq3.mouseUp().perform();*/
							//seq1.mouseDown(element1).perform();
							//return seq1.mouseDown(element1).mouseMove(element1).perform().then(function(){
							/*return seq1.mouseDown(element1).perform().then(function(){
								return seq2.mouseMove(element2).perform().then(function(){
									return seq3.mouseUp().perform()
									.then(function() {
										return driver.sleep(1000);
									});
								})
							})*/
							return seq1.mouseDown(element1).mouseMove(element2).mouseUp().perform();
						/*}
						else {
							console.log("content");
							
							seq1.mouseMove(element1).perform();
							seq2.mouseDown(element1).perform();
							seq3.mouseUp().perform();
						}*/
					});/*
					.then(function() {
						return driver.sleep(2000);
					});*/
					});
				//});

            })
            .then("we should see context menu $ContextMenu and button $AddFlashcard", function (ContextMenu, AddFlashcard) {
                var driver = this.driver;
                //driver.switchTo().defaultContent();
                //driver.sleep(1000);
                var data = applicationArea[ContextMenu];
                var locator = commonUtils.byCss(data);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return driver.sleep(1000).then(function() {
					//return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
					//return commonUtils.waitForEnable(driver, locator);
					return commonUtils._findElements(driver, locator);
				});
				//return commonUtils.waitForEnable(driver, locator);
                /*data = applicationArea[AddFlashcard];
                locator = commonUtils.byXpath(data);
				commonUtils.waitForEnable(driver, locator);*/
				/*inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				commonUtils.preventInputBlockerMacro(driver, locator, inputBlockerLocator);*/
            })
			
			.when("user doubleclicks on $Point", function (Point) {
				var driver = this.driver;
                var data = applicationArea[Point];
				var locator = commonUtils.byCss(data);
				console.log("locator.............",locator);
				return commonUtils._findElements(driver, locator).then(function(elements){
					var element = elements[0];
					return element.click().then(function(element){element.click();});
				});
			})
			
            .when("user clicks $flashcard button $AddFlashcard", function (flashcard, AddFlashcard) {
				//try {
					var driver = this.driver;
					//driver.sleep(maxTimeout);
					//driver.switchTo().defaultContent();
					var data = applicationArea[AddFlashcard];
					//console.log("...............  ",data);
					var locator = commonUtils.byXpath(data);
					/*commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function (found) {
						//found.click();
						commonUtils.findLocator(driver, locator).click();
					});*/
					//return commonUtils.waitForEnableAndClick(driver, locator);
					/*return driver.sleep(1000).then(function(){
						return commonUtils._findAndClick(driver, locator);
					});*/
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
					var seq = new webdriver.ActionSequence(driver);
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						return seq.mouseMove(element).click().perform().then(function() {
							//return driver.sleep(1000);
						});
					});					
				/*} catch(err) {
					console.log(err.stack || String(err));
				}*/
            })
            .then("we should see $flashcard popup $FlashcardPopup", function (flashcard, FlashcardPopup) {
				var driver = this.driver;
                /*if (flashcard !== 'annotation') {
                    this.driver.switchTo().defaultContent();
                }*/
                var data = applicationArea[FlashcardPopup];
				var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator);	//waitForEnable(this.driver, locator);
            })
			
			.when("user clicks note button $AddNote", function (AddNote) {
				//try {
					var driver = this.driver;
					//driver.sleep(500);
					//driver.switchTo().defaultContent();
					//console.log("AddNote...............  ",AddNote);
					var data = applicationArea[AddNote];
					//console.log("data...............  ",data);
					var locator = commonUtils.byXpath(data);
					//console.log("locator...............  ",locator);
					//var locator = webdriver.By.xpath(this.mappingData.editor.AddNote);
					//commonUtils.waitForEnableAndClick(driver, locator);
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
					//return commonUtils._findAndClick(driver, locator);					
					var seq = new webdriver.ActionSequence(driver);
					return commonUtils.waitForEnable(driver, locator).then(function(element) {
						return seq.mouseMove(element).click().perform();
					});
				/*} catch(err) {
					console.log(err.stack || String(err));
				}*/
            })
            .then("we should see annotation popup $AnnotationPopup", function (AnnotationPopup) {
                var data = applicationArea[AnnotationPopup];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
            })						
            .then("we should see textbox $AnnotationBox", function (AnnotationBox) {
                //this.driver.sleep(maxTimeout);
                var data = applicationArea[AnnotationBox];
				//console.log("AnnotationBox...............  ",data);
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
            })
            .then("we should see selector $AnnotationTypeSelector", function (AnnotationTypeSelector) {
                var data = applicationArea[AnnotationTypeSelector];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
            })
            .then("bookmark $BookmarkLabel is added to paragraph", function (BookmarkLabel) {
                var data = applicationArea[BookmarkLabel];
                var locator = commonUtils.byCss(data);
				//console.log('data..............',data);
				//console.log('locator..............',locator);
				return commonUtils.waitForEnable(this.driver, locator);
            })			
			
            .when("user clicks quiz button $AddQuiz", function (AddQuiz) {
				try {
					var driver = this.driver;
					driver.switchTo().defaultContent();
					var data = applicationArea.AddQuiz;
					//console.log("...............  ",data);
					var locator = commonUtils.byXpath(data);
					return commonUtils.waitForEnableAndClick(driver, locator);
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
				} catch(err) {
					console.log(err.stack || String(err));
				}
            })
            .then("we should see quiz popup $FlashcardPopup", function (FlashcardPopup) {
                var data = applicationArea[FlashcardPopup];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
            })			

            .when("user inputs text $value in $AnnotationBox", function (value, AnnotationBox) {
                var data = applicationArea[AnnotationBox];
				var locator = commonUtils.byCss(data);
				//this.driver.sleep(1000);
				return commonUtils._findAndInput(this.driver, locator, value);
            })
			
            .when("user selects type $Type in $AnnotationTypeSelector $AnnotationTypeList as $item item", function (Type, AnnotationTypeSelector, AnnotationTypeList, item) {
                var driver = this.driver;
                var data = applicationArea[AnnotationTypeSelector];
                var locator = commonUtils.byCss(data);
                /*commonUtils.waitForEnable(driver, locator).then(function (found) {
                    found.click();
                });*/
				/*return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform()*/
				
				return commonUtils._findAndClick(driver, locator)
					.then(function() {
						data = applicationArea[AnnotationTypeList] + "> li:nth-child(" + item + ")";
						locator = commonUtils.byCss(data);
						/*return commonUtils.waitForEnable(driver, locator).then(function (found) {
							found.click();
						});*/
						return commonUtils._findAndClick(driver, locator);
						//return commonUtils.waitForEnableAndClick(driver, locator);
						/*return commonUtils._findElements(driver, locator).then(function(elements) {
							var element = elements[0];
							var seq1 = new webdriver.ActionSequence(driver);
							return seq1.mouseMove(element).click().perform();
						});*/
					});
				//});
			})

            .when("user inputs $value in $QuestionBox", function (value, QuestionBox) {
				/*if (QuestionBox === "DescriptionBox") { // ?????
					var data = 'quizDescription';
					console.log("...............  ",data);
					var locator = webdriver.By.name(data);
					console.log("...............  ",locator);
				} 
				else {*/
				var driver = this.driver;
				var data = applicationArea[QuestionBox];
				var locator = commonUtils.byName(data);
					/*console.log("--------------  ",data);
					console.log("--------------  ",locator);*/
				//}
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				//commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
				/*return commonUtils.waitForEnableAndClearValue(this.driver, locator).then(function() {
					return commonUtils.waitForEnableAndInputValue(this.driver, locator, value);
				})*/
				//
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils.waitForEnable(driver, locator).then(function(element) {
					seq.mouseMove(element).click().perform();
					return commonUtils._findAndInput(driver, locator, value);
				});
            })
            .then("Well", function () {

            })
            .when("user clicks save $FlashcardSaveButton", function (FlashcardSaveButton) {
                var data = applicationArea[FlashcardSaveButton];
				var locator = commonUtils.byXpath(data);
				var driver = this.driver;
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//return commonUtils._findAndClick(driver, locator);
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform().then(function() {
						return driver.sleep(1000);
					});
				});
            })
            //.then("we should see $flashcard $Name in $FlashcardTab", function (flashcard, Name, FlashcardTab) {
                /*if (flashcard === 'annotation') {
                 this.driver.switchTo().defaultContent();
                 }*/
				//var driver = this.driver;
				/*driver.wait(webdriver.until.ableToSwitchToFrame(0), maxTimeout).
				then(function () { 
					driver.switchTo().frame(0);
				});*/				 
                //var data = applicationArea[FlashcardTab];
				/*console.log("--------------  ",FlashcardTab);
				console.log("--------------  ",data);*/
				//var locator = commonUtils.byXpath(data);
                /*flashcard !== 'annotation' ? commonUtils.findCss(driver, data) : findXpath(driver, data)
                        .getInnerHtml()
                        .then(function (text) {
                            console.log('+++++++++    ',text);
                            assert.equal(text, Name);
                        })*/
				//commonUtils.waitForEnableAndCompareValue(driver, locator, Name);
				//driver.switchTo().defaultContent();
            //})
            /*.then("we should see $Type $Snippet is marked with $Colour", function (Type, Snippet, Colour) {
                //this.driver.sleep(500);
                this.driver.switchTo().frame(0);
                //console.log(eval(applicationArea + '.' + Snippet) + Type);
                var data = applicationArea[Snippet] + Type;
                commonUtils.findCss(this.driver, data)
//				.getAttribute('style.background')
                        .getInnerHtml()
                        .then(function (html) {
                            var $ = cheerio.load(html);
                            console.log('-------    ', html);
                            console.log('*******   ', $('*').css('background.background-color'));
                            //assert.equal(text, Colour);
                        })
                this.driver.switchTo().defaultContent();
            })*/
            .then("we should see created essay $EssayBlock", function (EssayBlock) {
                var driver = this.driver;
                var data = applicationArea[EssayBlock];
                var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator).then(function(){
					return driver.sleep(1000);
				});
			})			

            .when("user clicks out of note block $OutOfNote", function (OutOfNote) {
                //this.driver.switchTo().frame(0);
                //this.driver.sleep(maxTimeout);
                var driver = this.driver;
				//driver.switchTo().defaultContent();
                var data = applicationArea[OutOfNote];
				//console.log('+++++++++    ',data);
				var locator = commonUtils.byCss(data);
				//console.log('*********    ',locator);
				//return commonUtils.waitForEnableAndClick(this.driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				//return commonUtils.waitForEnable(driver, locator).then(function(element) {
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					return seq.mouseMove(element, -20, -20).click().perform().then(function(){
						return driver.sleep(2000);
					});
				});
				//return commonUtils._findAndClick(driver, locator);
            })
            //.then("we should see annotation $Name in $AnnotationComment", function (Name, AnnotationComment) {
				//var driver = this.driver;
                //driver.switchTo().frame(0);
                //var data = applicationArea[AnnotationComment];
				//console.log("AnnotationComment--------------  ",data);
				//var locator = commonUtils.byXpath(data);
				/*commonUtils.waitLocator(this.driver, locator).then(function (found) {
					found
                        .getInnerHtml()
                        .then(function (text) {
                            assert.equal(text, Name);
                        });
				});*/
				//commonUtils.waitForEnableAndCompareValue(driver, locator, Name);
                //this.driver.switchTo().defaultContent();
            //})
			.then("We should see reduced list $MarginNotesListReduced", function (MarginNotesListReduced) {
                var driver = this.driver;
                var data = applicationArea[MarginNotesListReduced];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })			

            .when("I choose $item $menuItem", function (item, menuItem) {
                var driver = this.driver;
                var data = applicationArea[menuItem];
                var locator = commonUtils.byCss(data);
                /*return commonUtils.waitForEnable(driver, locator).then(function (found) {
                    found.click();
                });*/
				//return commonUtils._findAndClick(driver, locator);
				return driver.sleep(1000).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});
				});
            })
            .then("$DictionaryPage occurs on the screen", function (DictionaryPage) {
                var driver = this.driver;
                var link = this.environmentConfigData.url + "editor" + this.mappingData.common[DictionaryPage];
                driver.get(link);
                driver.wait(webdriver.until.titleIs(link), maxTimeout);
            })
			.then("And $SearchBox is available", function (SearchBox) {
                var driver = this.driver;
                var data = applicationArea[SearchBox];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
			})
			.then("We should see $extra popup $ExtraFrame", function (extra, ExtraFrame) {
                var data = applicationArea[ExtraFrame];
				var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);*/
				return commonUtils._findElements(driver, locator);
            })			

            .given("I input $value into $SearchBox", function (value, SearchBox) {
                var driver = this.driver;
                var data = applicationArea[SearchBox];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndInput(driver, locator, value);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndInputValue(driver, locator, inputBlockerLocator, value);*/
            })
            .then("Search result $SearchResult appears", function (SearchResult) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[SearchResult]));
                var driver = this.driver;
                var data = applicationArea[SearchResult];
                var locator = commonUtils.byCss(data);
				/*driver.wait(webdriver.until.ableToSwitchToFrame(0), maxTimeout).
				then(function () { 
					driver.switchTo().frame(0);
				});*/
                return commonUtils.waitForEnable(driver, locator);
				//commonUtils.waitForEnableAndInputValue(driver, locator, value);
				//driver.switchTo().defaultContent();
            })
            
            .when("I click on link $Import", function (Import) {
				var driver = this.driver;
                var data = applicationArea[Import];
				var locator = commonUtils.byCss(data);
				//return commonUtils._findAndClick(this.driver, locator);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				})				
            })
            .then("We should see code textbox $CodeTextBox", function (CodeTextBox) {
				var driver = this.driver;
                var data = applicationArea[CodeTextBox];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					element.getAttribute('value')//.toString()
					//element.getValue.toString()
					.then(function(text) {
						if (text !== '') 
						{
							return true;
						} 
						else 
						{
							return false;
						}
					});
				})
            })
            .then("List is dropped $OtherSourceDropDown", function (OtherSourceDropDown) {
                var driver = this.driver;
                var data = applicationArea[OtherSourceDropDown];
                var locator = commonUtils.byCss(data);
                return commonUtils.waitForEnable(driver, locator);
			})
			.then("Popup is closed", function () {
                //return this.driver.sleep(1000);
			})

            .when("I insert $type value $ImportValue to $CodeTextBox", function (type, ImportValue, CodeTextBox) {
				var driver = this.driver;
                var data = applicationArea[CodeTextBox];
				var locator = commonUtils.byCss(data);
				/*var path = "data/" + ImportValue;
				var quizlet = fs.readFileSync(path);*/
				if (type == 2) {
						commonUtils.waitForEnableAndClearValue(driver, locator);
				}
				return commonUtils.waitForEnableAndInputValue(driver, locator, ImportValue).then(function() {
				//return commonUtils._findAndInput(driver, locator, ImportValue).then(function() {
				//return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
					return commonUtils.waitLocator(driver, locator).then(function(element) {
						//return element.clear().then(function() {
							return element.sendKeys(webdriver.Key.ENTER);
						//});
					});
				})
				/*var seq = new webdriver.ActionSequence(driver);
				seq.sendKeys(Keys.ENTER).perform();*/
			})
            .then("$CodeTextBox value = $ImportValue", function (CodeTextBox, ImportValue) {
                var data = applicationArea[CodeTextBox];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndCompareText(this.driver, locator, ImportValue);
			})

            .when("I click button $ImportButton", function (ImportButton) {
                var data = applicationArea[ImportButton];
				var locator = commonUtils.byCss(data);
				var driver = this.driver;
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element,0,0).click().perform();
				})
				//return commonUtils._findAndClick(driver, locator);
            })
            .then("we should see book content $BookContent", function (BookContent) {
                var data = applicationArea[BookContent];
				var driver = this.driver;
                var locator = commonUtils.byId(data);
				//return commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })			

            .when("I click on cover of book $BookCover", function (BookCover) {
                var driver = this.driver;
                var data = applicationArea[BookCover];
                var locator = commonUtils.byXpath(data);
				commonUtils.waitForEnableAndClick(driver, locator);
				/*var seq = new webdriver.ActionSequence(driver);
				commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function(element) {
					seq.mouseDown(element).mouseMove(element).mouseUp().perform();
				});*/
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
			})
			
			 .when("I click on info of book $Book", function (Book) {
                var driver = this.driver;
				var data = applicationArea[Book];;// "//a[text()='" + Book + "']/../following-sibling::div[1]";
				var locator = commonUtils.byXpath(data);
				//return commonUtils._findAndClick(driver, locator);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
					var element = elements[0];*/
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});
			 })				
			.then("We should see popup $BookInfoPopup", function(BookInfoPopup) {
                var driver = this.driver;
                var data = applicationArea[BookInfoPopup];
                var locator = commonUtils.byCss(data);
				commonUtils.waitForEnable(driver, locator);
			})

            .when("I click button library $LibraryButton", function (LibraryButton) {
                var driver = this.driver;
                var data = applicationArea[LibraryButton];
                var locator = commonUtils.byCss(data);
				commonUtils.waitForEnableAndClick(driver, locator);
			})
			.then("Library list $LibraryList is displayed", function(LibraryList) {
                var driver = this.driver;
                var data = applicationArea[LibraryList];
                var locator = commonUtils.byCss(data);
				commonUtils.waitForEnable(driver, locator);
			})

         .when("I click on $next note mark in $AnnotationMarkList", function (next, AnnotationMarkList) {
                var driver = this.driver;
                var data = applicationArea[AnnotationMarkList];
                var locator = commonUtils.byCss(data + ' > li:nth-of-type(' + next + ')');
				//return driver.sleep(500).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						//return commonUtils.waitForEnable(driver, locator).then(function(element) {
							var seq = new webdriver.ActionSequence(driver);
							return seq.mouseMove(element).click().perform();
						//});
					});
				//});
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//return commonUtils._findAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
         })
         .then("We should see note popup $AnnotationPopup is displayed", function (AnnotationPopup) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[AnnotationPopup];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);*/
				return commonUtils._findElements(driver, locator);
         })
         .when("I click on note category link $NotesCategoryLink", function (NotesCategoryLink) {
                var driver = this.driver;
                var data = applicationArea[NotesCategoryLink];
                var locator = commonUtils.byCss(data);
				//return driver.sleep(1000).then(function() {
					return commonUtils._findAndClick(driver, locator);//waitForEnableAndClick(driver, locator);
				//});
         })
         .then("We should see notes categories menu $NotesCategoryMenu", function (NotesCategoryMenu) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[NotesCategoryMenu];
                var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator);//waitForEnable(driver, locator);
         })
         .when("I choose note category $item in $NotesCategoryMenuList", function (item, NotesCategoryMenuList) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[NotesCategoryMenuList];
				//console.log('data........',data);
                var locator = commonUtils.byCss(data + ' > li:nth-child(' + item + ')');
				//console.log('locator........',locator);
				return commonUtils._findAndClick(driver, locator);//waitForEnableAndClick(driver, locator);
				/*var seq = new webdriver.ActionSequence(driver);
				commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function(element) {
				   return seq.mouseMove(element).click().perform();
				});*/
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
         })
		 
         .when("user clicks on selector $AnnotationTypeSelector", function (AnnotationTypeSelector) {
                var driver = this.driver;
                var data = applicationArea[AnnotationTypeSelector];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);//waitForEnableAndClick(driver, locator);
         })

         .when("user selects new $AddNewMarkLink", function (AddNewMarkLink) {
                var driver = this.driver;
                var data = applicationArea[AddNewMarkLink];
				//console.log('data........',data);
                var locator = commonUtils.byCss(data);
				//console.log('locator........',locator);
				return commonUtils.waitForEnableAndClick(driver, locator);
         })
         .then("We should see mark block $MarkBlock", function (MarkBlock) {
                var driver = this.driver;
                var data = applicationArea[MarkBlock];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })
		 
         .when("I select color in $selectColorCell", function (selectColorCell) {
                var driver = this.driver;
                var data = applicationArea[selectColorCell];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(driver, locator);
         })
		 
         .when("I click on sign $addColorSign", function (addColorSign) {
                var driver = this.driver;
                var data = applicationArea[addColorSign];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(driver, locator);
         })
		 .then("We should see new item $Type in $NotesCategoryMenuList", function (Type, NotesCategoryMenuList) {
                var driver = this.driver;
                var data = applicationArea[NotesCategoryMenuList];
                var locator;// = commonUtils.byCss(data);
                var seartext = Type.toLowerCase();
                var occtext, found = false;
                var i = 1;
                var innHtml = '!empty';
                while (innHtml !== '' && innHtml !== null && innHtml !== undefined) {
                    try {
                        innHtml = '';
                        /* jshint ignore:start */
                        //occtext = this.driver.findElement(webdriver.By.css(this.mappingData.common[SnippetList] + ' > li:nth-child(' + i + ') > p > span > strong'))
						locator = commonUtils.byCss(data + ' > li:nth-child(' + i + ')');
						//console.log('locator........',locator);
						occtext = commonUtils.waitForEnable(driver, locator);
						//console.log('occtext........',occtext);
							var text = occtext.toString();
                                /*.then(function (text)
                                {*/
                                    innHtml = text.toLowerCase();
                                    found = innHtml.indexOf(seartext) !== -1 ? true : false;
                                    //console.log(i, innHtml);
                                //});
                        /* jshint ignore:end */
                    } catch (err) {
                        console.log(err.stack || String(err));
                    }
                    if (!found) {
                        break;
                    }
                    i++;

                }
                return found;
         })

        .when("I click on note mark $AnnotationMark $next time", function (AnnotationMark, next) {
                var driver = this.driver;
				//this.driver.sleep(500);
                var data = applicationArea[AnnotationMark];
				//console.log('data........',data);
                var locator = commonUtils.byCss(data);
				//console.log('locator........',locator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//return commonUtils._findAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
				//return commonUtils._findElements(driver, locator).then(function(){
				//return driver.sleep(500).then(function(){					
					var seq = new webdriver.ActionSequence(driver);
					//return commonUtils.waitForEnable(driver, locator).then(function(element) {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						return seq.mouseMove(element).click().perform();
					});
				//});

         })
         .then("We should see note popup $AnnotationPopup", function (AnnotationPopup) {
                var driver = this.driver;
                var data = applicationArea[AnnotationPopup];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
         })

         .when("I click on delete link $DeleteNoteLink", function (DeleteNoteLink) {
                var driver = this.driver;
                var data = applicationArea[DeleteNoteLink];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils.waitForEnable(driver, locator).then(function(element) {
				   return seq.mouseMove(element).click().perform();
				});
         })
         .then("We should see $BookContent content", function (BookContent) {
                var driver = this.driver;
                var data = applicationArea[BookContent];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })
	
//Scenario: Test Book Extra button
            .when("I click button book extra $BookExtra", function (BookExtra) {
				var driver = this.driver;
                var data = applicationArea[BookExtra];
				var locator = commonUtils.byCss(data);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);*/
				//return commonUtils.waitForEnableAndClick(this.driver, locator);
				//return commonUtils._findAndClick(this.driver, locator);
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				//return driver.sleep(2000).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});
				//});				
            })
			.then("Popup $ExtraPopup is displayed", function (ExtraPopup) {
				var data = applicationArea[ExtraPopup];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitLocator(this.driver, locator);
				return commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })       
            .then("And we should see $extraMenuItem button $extraMenuButton", function (extraMenuItem, extraMenuButton) {
                var data = applicationArea[extraMenuButton];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitLocator(this.driver, locator);

				return commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
			
         .when("I hover on $ToolbarWrapper", function (ToolbarWrapper) {
                var data = applicationArea[ToolbarWrapper];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);            
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				   return seq.mouseMove(element).perform();
				});
				//commonUtils.waitForEnable(driver, locator);
            })
           .then("we should see toolbar $ToolbarWrapper", function (ToolbarWrapper) {
				var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[ToolbarWrapper];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
            })
           .then("We should see reader mode $ReaderModeLink", function (ReaderModeLink) {
                var data = applicationArea[ReaderModeLink];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
            })			

//Scenario: Test Annotations button
            .when("I click on $Annotations button $AnnotationsButton", function (Annotations, AnnotationsButton) {
				var driver = this.driver;
                var data = applicationArea[AnnotationsButton];
				var locator = commonUtils.byCss(data);
				//return driver.sleep(1000).then(function() {
					return commonUtils._findAndClick(driver, locator);
				//});
			})
			.then("We should see quick filter textbox $filter", function (filter) {
				var data = applicationArea[filter];
				var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
			})
			.then("And we should see categories combobox $combobox", function (combobox) {
				var data = applicationArea[combobox];
				var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
			})
			.then("And we should see $Annotations list $list", function (Annotations, list) {
				var data = applicationArea[list];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);            
            })

//Scenario: Test annotations filter
            .when("I click on categories combobox $combobox", function (combobox) {
                var data = applicationArea[combobox];
                var locator = commonUtils.byCss(data);
                var driver = this.driver;
				commonUtils.waitForEnableAndInputValue(driver, locator, value)
				.then(function (found) {
						found.click();
					});
			})
			.then("We should see $category item", function (category) {
				var data = applicationArea[category];
				var locator = commonUtils.byCss(data);
				var driver = this.driver;
				commonUtils.waitForEnableAndInputValue(driver, locator, value);
            })

            .when("I click $category item", function (category) {
                var data = applicationArea[category];
				var locator = commonUtils.byCss(data);
				commonUtils.waitForEnableAndClick(this.driver, locator);          
            })
            .then("$item $bookmarks are displaying in list", function (item, bookmarks) {
                var data = applicationArea[item];
                var locator = commonUtils.byCss(data);
                var driver = this.driver;
				//commonUtils.waitForEnableAndInputValue(driver, locator, value);
				commonUtils.waitForEnable(driver, locator);
            })

//Scenario: Test note list
            .when("I click on a $type $item", function (type, item) {
                var driver = this.driver;
                var data = applicationArea[item];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//return commonUtils._findAndClick(driver, locator);
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);					
					return seq.mouseMove(element).click().perform().then(function() {
						data = applicationArea.OutOfPopup;
						locator = commonUtils.byCss(data);
						var seq2 = new webdriver.ActionSequence(driver);
						return commonUtils._findElements(driver, locator).then(function(elements) {
							var element = elements[0];
							return seq2.mouseMove(element, 1, 1).click().perform();
						});
					});
				});				
			})
			.then("We should see $annotated text on reader page $place", function (annotated, place) {
					var marked;
					var driver = this.driver;
					var data = applicationArea[annotated];
					var locator = commonUtils.byCss(data);
					commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function(found) {
					   found
						  .getText()
								.then(function (text)
								{
									marked = text;
								});
					});
					var data = applicationArea[place];
					var locator = commonUtils.byXpath(data);
					return commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function(found) {
					   found          
								//.getAttribute('text')
						  .getText()
								.then(function (text)
								{
									assert.equal(marked, text);
								});
					});
            })

//Scenario: Test reader mode settings
            .when("I click on reader mode $settings", function (settings) {
                var data = applicationArea[settings];
                var driver = this.driver;
				//driver.sleep(500);
                var locator = commonUtils.byCss(data);
				//return commonUtils._findAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/

				var seq = new webdriver.ActionSequence(driver);
				//return driver.sleep(1500).then(function() {
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];	
					return seq.mouseMove(element).click().perform();
				});       
				//});
				//commonUtils.waitForEnableAndClick(driver, locator);
				/*commonUtils.waitForEnableAndInputValue(driver, locator, value).then(function(element) {
				   element.click();
				});*/
            })
            .then("We should see settings popup $popup", function (popup) {
				var driver = this.driver;
                var data = applicationArea[popup];
                var locator = commonUtils.byId(data);
				return commonUtils.waitForEnable(this.driver, locator);/*.then(function() {
					return driver.sleep(100);
				});*/
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
			
            .when("Select font $font", function (font) {
				var driver = this.driver;
                var data = applicationArea[font];
                var locator = commonUtils.byXpath(data);
				return commonUtils._findAndClick(driver, locator);
            })
            .then("Check style $style contains $font", function (style, font) {
				var driver = this.driver;
                var shr = applicationArea[font];
                var data = applicationArea[style];
				var locator = commonUtils.byXpath(data);
				/*return commonUtils.waitLocator(driver, locator).then(function(found) {
				   return found
							.getInnerHtml()
							.then(function (value)
							{
								return assert.ok(value.indexOf(shr) !== -1);
							});
				});*/
				return commonUtils._findAndCompareHtml(driver, locator, shr);
            })

            .when("I select $fontSizeChange $fontSizeChangeButton", function (fontSizeChange, fontSizeChangeButton) {
                var data = applicationArea[fontSizeChangeButton];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(this.driver, locator);
            })

            .then("Style $changed has font size $size", function (changed, size) {
                var razm = applicationArea[size];//this.mappingData.common[size];
                var data = applicationArea[changed];
                var locator = commonUtils.byXpath(data);
				return commonUtils.waitLocator(this.driver, locator).then(function(found) {
				return found
                        .getInnerHtml()
                        .then(function (value)
                        {
                            assert.ok(value.indexOf(razm) !== -1);
                        });
				});
            })

            .when("I click on theme button $theme", function (theme) {
                var data = applicationArea[theme];
				var locator = commonUtils.byCss(data);
				//return waitForEnableAndClick(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacroAndClick2(this.driver, locator, inputBlockerLocator);				
            })
            .then("The body is affected by $theme", function (theme) {
                var data = applicationArea[theme];
				var locator = commonUtils.byId(data);
				return commonUtils.waitForEnable(this.driver, locator);
            })			

            .when("I click on margin notes button $ExpandedMarginNotes", function (ExpandedMarginNotes) {
                var driver = this.driver;
                var data = applicationArea[ExpandedMarginNotes];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(driver, locator);
            })
			.then("we should see note $text in $MarginNote", function (text, MarginNote) {
					var driver = this.driver;
					var data = applicationArea[MarginNote];
					//console.log('data..........',data);
					var locator = commonUtils.byXpath(data);
					//console.log('locator..........',locator);
					return commonUtils.waitForEnableAndCompareValue(driver, locator, text);
			})

            .when("user selects comment position $CommentPosition", function (CommentPosition) {
                var driver = this.driver;
                var data = applicationArea[CommentPosition];
                var locator = commonUtils.byXpath(data);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});					
            })
			
            .when("user selects comment $CommentMark", function (CommentMark) {
                var driver = this.driver;
                var data = applicationArea[CommentMark];
                var locator = commonUtils.byCss(data);
				//return commonUtils._findAndClick(driver, locator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				//return driver.sleep(1000).then(function() {	
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});
				//});
            })

            .when("user clicks delete $DeleteComment", function (DeleteComment) {
                var driver = this.driver;
                var data = applicationArea[DeleteComment];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					return seq.mouseMove(element).click().perform();
				});
				//return commonUtils._findAndClick(driver, locator);				
            })

            .when("I select $Flashcard inside content", function (Flashcard) {
                var driver = this.driver;
                var data = applicationArea[Flashcard];
				console.log('data.....................',data);
                var locator = commonUtils.byXpath(data);
				//console.log('locator.....................',locator);
				//return commonUtils._findAndClick(driver, locator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				// return driver.sleep(1000).then(function() {
					//return commonUtils._findAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {*/
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					//});			
				});
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
            })
            .then("we should see $FlashcardPopup popup", function (FlashcardPopup) {
				var driver = this.driver;
                var data = applicationArea[FlashcardPopup];
				var locator = commonUtils.byCss(data);
				//return driver.sleep(1000).then(function() {
					return commonUtils.waitForEnable(driver, locator);
				//});	
            })			

            .when("I click back $BackButton", function (BackButton) {
                var driver = this.driver;
                var data = applicationArea[BackButton];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);				
            })	

            .when("I click on import $ImportButtonEditor", function (ImportButtonEditor) {
                var driver = this.driver;
                var data = applicationArea[ImportButtonEditor];
                var locator = commonUtils.byCss(data);
				//return commonUtils._findAndClick(driver, locator);
				//return commonUtils._findElements(driver, locator).then(function(elements) {
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					//var element = elements[0];
					return seq.mouseMove(element).click().perform();//.then(function(element) {
						//seq.click().perform();
					//});
				});
				//return commonUtils.waitForEnableAndClick(driver, locator);
            })

            .when("I choose source $OtherSourceItem2", function (OtherSourceItem2) {
                var driver = this.driver;
                var data = applicationArea[OtherSourceItem2];
                var locator = commonUtils.byCss(data);
				//return driver.sleep(1000).then(function() {
					return commonUtils._findAndClick(driver, locator);
					/*return commonUtils._findElements(driver, locator).then(function(elements) {
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
						var seq = new webdriver.ActionSequence(driver);
						var element = elements[0];
						return seq.mouseMove(element).click().perform();
					});*/
				//});
            })

            .when("I remove $next flashcard to $RemoveBasket", function (next, RemoveBasket) {
                var driver = this.driver;
                var data = applicationArea[RemoveBasket];
                var locator = commonUtils.byXpath(data);
				//return commonUtils._findAndClick(driver, locator);				
				/*var seq = new webdriver.ActionSequence(driver);
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					return seq.mouseMove(element).click().perform();
				});*/				
            })

            .when("user clicks on bookmark $BookmarkLabel", function (BookmarkLabel) {
                var driver = this.driver;
                var data = applicationArea[BookmarkLabel];
                var locator = commonUtils.byCss(data);
				//return driver.sleep(500).then(function() {
					//return commonUtils._findAndClick(driver, locator);
				//})
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils.waitForEnable(driver, locator).then(function(element) {
					return seq.mouseMove(element).click().perform();
				});				
            })
            .when("user uploads $file through $AddImageInput", function (file, AddImageInput) {
				var driver = this.driver;
				var data = applicationArea[AddImageInput];
				var locator = commonUtils.byCss(data);
				/*return commonUtils._findAndClick(driver, locator).then(function(){
					commonUtils._findAndInput(driver, locator, file);
				});*/
				return commonUtils.waitForEnable(driver, locator).then(function(element) {
					//var seq = new webdriver.ActionSequence(driver);
					//return seq.mouseMove(element).click().perform().then(function() {
						//return element.clear().then(function() {
							return element.sendKeys(file);
						//});							
				    //});
				});
            })			

			 .when("user adds new questions $AddTestQuestion", function (AddTestQuestion) {
					var driver = this.driver;
					var data = applicationArea[AddTestQuestion];
					var locator = commonUtils.byCss(data);
					return commonUtils._findAndClick(driver, locator);
			 })

// When user clicks button - universal entry !			 
			 .when("user clicks button $CreateStudyCourseButton", function (CreateStudyCourseButton) {
					var driver = this.driver;
					var data = applicationArea[CreateStudyCourseButton];
					var locator = commonUtils.byCss(data);
					return commonUtils._findAndClick(driver, locator);
					/*return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});*/
			 })
			/*.then("We should see new course $NewStudyCourse", function (NewStudyCourse) {
					var driver = this.driver;
					var data = applicationArea[NewStudyCourse];
					var locator = commonUtils.byCss(data);
					return commonUtils.waitForEnable(driver, locator);
			 })
			.then("$AllCategories category is selected by default in $OptionSelected", function (AllCategories, OptionSelected) {
					var driver = this.driver;
					var data = applicationArea[OptionSelected];
					var locator = commonUtils.byCss(data);
					/*commonUtils.waitForEnable(driver, locator).then(function(element){
						element.getInnerHtml().then(function(text){
							console.log('Category.............', text);
						})
					})*/
					//return commonUtils.waitForEnableAndCompareValue(driver, locator, AllCategories);
	/*				return commonUtils._findAndCompareInnerHtml(driver, locator, AllCategories);
			})*/
			.then("$SectionBlock section is added", function (SectionBlock) {
					var driver = this.driver;
					var data = applicationArea[SectionBlock];
					var locator = commonUtils.byCss(data);
					return commonUtils.waitForEnable(driver, locator);
			 })
			.then("Name of $course $CourseNameBox is changed to $CourseName", function (course, CourseNameBox, CourseName) {
					var driver = this.driver;
					var data = applicationArea[CourseNameBox];
					var locator = commonUtils.byCss(data);
					return commonUtils._findAndCompareValue(driver, locator, CourseName);
			 })
			.then("$StatisticsBox value is $StatisticsValue", function (StatisticsBox, StatisticsValue) {
					var driver = this.driver;
					var data = applicationArea[StatisticsBox];
					var locator = commonUtils.byCss(data);
					/*return commonUtils._findElements.then(function(elements) {
						var seq = new webdriver.ActionSequence(driver);
						var element = elements[0];
						return seq.mouseMove(element).perform().then(function() {*/				
							return commonUtils._findAndCompareHtml(driver, locator, StatisticsValue);
						/*});
					});*/
			 })
			.then("$BookContent is opened for editing in course", function (BookContent) {
					var driver = this.driver;
					var data = applicationArea[BookContent];
					var locator = commonUtils.byCss(data);
					return commonUtils._preventInputBlockerMacro2(driver, locator);
			 })
			.then("$SnippetHighlighted subparagraph is selected", function (SnippetHighlighted) {
					var driver = this.driver;
					var data = applicationArea[SnippetHighlighted];
					var locator = commonUtils.byCss(data);
					var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
			 })
			.then("Button $ParagraphSummaryButtonSwitched is switched", function (ParagraphSummaryButtonSwitched) {
					var driver = this.driver;
					var data = applicationArea[ParagraphSummaryButtonSwitched];
					var locator = commonUtils.byCss(data);
					return commonUtils._findElements(driver, locator);//waitForEnable(driver, locator);
			 })
			.then("field $MinimumParagraphWordsField is displayed", function (MinimumParagraphWordsField) {
					var driver = this.driver;
					var data = applicationArea[MinimumParagraphWordsField];
					var locator = commonUtils.byCss(data);
					return commonUtils._findElements(driver, locator);//waitForEnable(driver, locator);
			 })
			 
			.when("user clicks essay $EssayItem", function (EssayItem) {
					var driver = this.driver;
					var data = applicationArea[EssayItem];
					var locator = commonUtils.byCss(data);
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
					return commonUtils._findAndClick(driver, locator);
			 })			 
			.then("we should see essay popup $EssayPopup", function (EssayPopup) {
					var driver = this.driver;
					var data = applicationArea[EssayPopup];
					var locator = commonUtils.byCss(data);
					return commonUtils._findElements(driver, locator);//waitForEnable(driver, locator);
			 })
			 
			.when("user enters data $FilterData in $FilterBox", function (FilterData, FilterBox) {
				var value = FilterData;
                var data = applicationArea[FilterBox];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				/*return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).perform().then(function(){
						element.clear();
						return element.sendKeys(value);
					});
				});*/				
				/*return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
					return commonUtils.waitForEnableAndInputValue(driver, locator, value);
				});*/
				return commonUtils._findAndInput(driver, locator, value);
            })
			.then("$FilteredBookList is shown according to $filterData", function (FilteredBookList, filterData) {
					var driver = this.driver;
					//driver.sleep(1000);
					var data = applicationArea[FilteredBookList];
					var seartext = filterData.toLowerCase();
					var found = false;
					var i = 2;
					var innHtml = '!empty';
					while (innHtml !== '' && innHtml !== null && innHtml !== undefined) {
					//while (i < 3) {
							//driver.sleep(500);
							innHtml = '';
							/* jshint ignore:start */
							var datai = data + ' > div:nth-child(' + i + ') > span:nth-child(2) > p:nth-child(3)';
							//datai = data + '/div[' + i + ']/span[2]/p[1]';
							var locator = commonUtils.byCss(datai);
							//var locator = commonUtils.byXpath(datai);
							//console.log(i, 'locator....................', locator);
							//driver.sleep(500).then(function() {
								return commonUtils.waitLocator(driver, locator).then(function(element) {
									return element.getInnerHtml().then(function (text) {
										innHtml = text.toLowerCase();
										//console.log(i, '....................', innHtml, ' ________  ', innHtml.indexOf(seartext));
										found = innHtml.indexOf(seartext) !== -1 ? true : false;
										if (found) {
											//console.log(i,' ===========  matching !');
										}
										return found;
									});
								});
							//});
							
							/* jshint ignore:end */
						/*if (!found) {
							console.log('Wrong filtered result !');
							//break;
						}*/
						
						i++;
					}
					return found;
			 })

			.when("user deletes data in $FilterBox", function (FilterBox) {
                var data = applicationArea[FilterBox];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClearValue(driver, locator);
            })			 
			.then("$FilteredBookList is shown not depending on $FilterData", function (FilteredBookList, filterData) {
					var driver = this.driver;
					//driver.sleep(1000);
					var data = applicationArea[FilteredBookList];
					var seartext = filterData.toLowerCase();
					var found = false;
					var i = 2;
					var innHtml = '!empty';
					while (innHtml !== '' && innHtml !== null && innHtml !== undefined) {
					//while (i < 3) {
							innHtml = '';
							/* jshint ignore:start */
							var datai = data + ' > div:nth-child(' + i + ') > span:nth-child(2) > p.ng-binding';
							//datai = data + '/div[' + i + ']/span[2]/p[1]';
							var locator = commonUtils.byCss(datai);
							//var locator = commonUtils.byXpath(datai);
							//console.log(i, 'locator....................', locator);
							//driver.sleep(500).then(function() {
								return commonUtils.waitLocator(driver, locator).then(function(element) {
									return element.getInnerHtml().then(function (text) {
										innHtml = text.toLowerCase();
										//console.log(i, '....................', innHtml, ' ________  ', innHtml.indexOf(seartext));
										found = innHtml.indexOf(seartext) !== -1 ? true : false;
										if (found) {
											//console.log(i,' ===========  matching !');
										}
										return found;
									});
								});
							//});
							/* jshint ignore:end */
						if (!found) {
							console.log('There are some results which not depends on previous filter !');
							break;
						}
						
						i++;
					}
					return found;
			 })
			 
			.when("user selects category $Category in $CategorySelector $CategoryList", function (Category, CategorySelector, CategoryList) {
					var driver = this.driver;
					var res = false;
					var data = applicationArea[CategorySelector];
					var seartext = Category.toLowerCase();
					var locator = commonUtils.byCss(data);
					return commonUtils._findAndClick(driver, locator).then(function() {
						data = applicationArea[CategoryList];
						var found = false;
						var i = 2;
						var innHtml = '!empty';
						//while (innHtml !== '' && innHtml !== null && innHtml !== undefined) {
						while (i < 10) {
								found = false;
								innHtml = '';
								/* jshint ignore:start */
								var datai = data + ' > li:nth-of-type(' + i + ') > div > span';
								console.log(datai, '....................', datai);
								locator = commonUtils.byCss(datai);
								//var locator = commonUtils.byXpath(datai);
								//console.log(i, 'locator....................', locator);
								commonUtils.waitLocator(driver, locator).then(function(element) {
								//commonUtils._findElements(driver, locator).then(function(elements) {
									//var element = elements[0];
										return element.getInnerHtml().then(function (text) {
											innHtml = text.toLowerCase();
											console.log(i, '....................', innHtml, ' ________  ', innHtml.indexOf(seartext));
											found = innHtml.indexOf(seartext) !== -1 ? true : false;
											if (found) {
												element.click();
												console.log(i,' ===========  matching !');
												res = found;
											}
											return found;
										});
								})
								/* jshint ignore:end */
							i++;
						}
						return res;
					});
			 })
				.then("books in $FilteredBookList are filtered by $Category", function (FilteredBookList, Category) {
					var driver = this.driver;
					//driver.sleep(1000);
					var data = applicationArea[FilteredBookList];
					var seartext = Category.toLowerCase();
					var found = false;
					var i = 2;
					var innHtml = '!empty';
					while (innHtml !== '' && innHtml !== null && innHtml !== undefined) {
							//driver.sleep(500);
							innHtml = '';
							/* jshint ignore:start */
							var datai = data + ' > div:nth-child(' + i + ') > span:nth-child(2) > p:nth-child(3) > span:nth-child(1)';
							var locator = commonUtils.byCss(datai);
							//console.log(i, 'locator....................', locator);
							//driver.sleep(1000).then(function() {
								return commonUtils.waitLocator(driver, locator).then(function(element) {
									return element.getInnerHtml().then(function (text) {
										innHtml = text.toLowerCase();
										//console.log(i, '....................', innHtml, ' ________  ', innHtml.indexOf(seartext));
										found = innHtml.indexOf(seartext) !== -1 ? true : false;
										if (found) {
											//console.log(i,' ===========  matching !');
										}
										return found;
									});
								})
							//});

							/* jshint ignore:end */
						i++;
					}
					return found;
				})
				
//Scenario: Test table of content
            .when("I select $item of content", function (item) {
                var data = applicationArea[item];
                var driver = this.driver;
                var locator = commonUtils.byXpath(data);
                //return commonUtils._findAndClick(driver, locator);
				return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
				});				
            })
            .then("We should see the $name matching selected $item", function (name, item) {
                var obj1;
                var data = applicationArea[name];
				var locator = commonUtils.byXpath(data);
				var driver = this.driver;
				return commonUtils.getText(driver, locator).then(function(obj1) {
					data = applicationArea[item];
					locator = commonUtils.byXpath(data);
					return commonUtils.getText(driver, locator).then(function(text) {
						return assert.equal(obj1, text);
					});
				});
            })
            .then("We should see the matching header $MatchingHeader", function (MatchingHeader) {
                var data = applicationArea[MatchingHeader];
				var locator = commonUtils.byXpath(data);
				var driver = this.driver;
				return commonUtils.waitForEnable(driver, locator).then(function(){
					//return driver.sleep(500);
				});
				//return _findElements(driver, locator);
            })

			.given("Go top $Top", function (Top) {
				var data = applicationArea[Top];
				var locator = commonUtils.byId(data);
				var driver = this.driver;
				//return driver.sleep(1000).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).perform();
						/*.then(function() {
							return driver.sleep(1000);
						});*/
					});
				//});
            })

            .when("I click item $MenuItem", function (MenuItem) {
				var driver = this.driver;
				var data = applicationArea[MenuItem];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitLocator(driver, locator).then(function(element) { 	
					var seq = new webdriver.ActionSequence(driver);
					seq.mouseMove(element).click().perform();
				});
            })
			.then("We should see new course $NewStudyCourse", function (NewStudyCourse) {
					var driver = this.driver;
					var data = applicationArea[NewStudyCourse];
					var locator = commonUtils.byCss(data);
					return commonUtils.waitForEnable(driver, locator);
			 })
			.then("$AllCategories category is selected by default in $FilterBox", function (AllCategories, FilterBox) {
					var driver = this.driver;
					var data = applicationArea[FilterBox];
					var locator = commonUtils.byCss(data);
					return commonUtils._findAndCompareInnerHtml(driver, locator, AllCategories);
			})

			.given("Check number of $SearchingClass in $AnnotationList and compare with $NotesNumberInfo in info tab $InfoLink", function (SearchingClass, AnnotationList, NotesNumberInfo, InfoLink) {
					var driver = this.driver;
					var data = applicationArea[AnnotationList];
					//console.log('AnnotationList =  ',data);
					var locator = commonUtils.byCss(data);
					return commonUtils._findElements(driver, locator).then(function (elements) {
						var element = elements[0];
						//console.log('element ----------    ',element);
						return element.getInnerHtml().then(function (html) {
                            var $ = cheerio.load(html);
							//console.log('cheerio ..........    ',$);
							data = applicationArea[SearchingClass];
							var size = $(data).length;
							/*data = applicationArea[SearchingClass2];
							size += $(data).length;*/
							console.log('length =  ',size);
								data = applicationArea[InfoLink];
								locator = commonUtils.byCss(data);
								return commonUtils._findAndClick(driver, locator).then(function () {
									data = applicationArea[NotesNumberInfo];
									locator = commonUtils.byCss(data);
									return commonUtils._findAndCompareText(driver, locator, size.toString());
								});
						});
					});
			})

         .given("It's time to refresh", function () {
            this.driver.navigate().refresh();
         })			

    return library;

})();
