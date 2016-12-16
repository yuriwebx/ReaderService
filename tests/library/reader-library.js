/* jshint ignore:start */
require('jasmine-before-all');
var webdriver = require('selenium-webdriver');
var assert = require('assert');
var Yadda = require('yadda');
var commonUtils = require('./function-set');

module.exports = (function () {

    var dictionary = new Yadda.Dictionary()
            .define('LOCALE', /(fr|es|ie)/)
            .define('NUM', /(\d+)/);

    var applicationArea, maxTimeout = 30000, text2Rem='', handle;

	var inputBlockerLocator = webdriver.By.css("div.longRunningInputBlocker"); 
	
    var library = new Yadda.localisation.English.library(dictionary)

//Scenario: Select data area
            .given("I select data area $area", function (area) {
            //this.driver.sleep(1000);
                applicationArea = this.mappingData[area];
            })

//Scenario: Test site opening and logon
            .given("Set test steps time", function () {
                //this.driver.manage().timeouts().implicitlyWait(maxTimeout);
                //this.driver.manage().window().maximize();
            })
            .when("I open $link page", function (link) {
                var driver = this.driver;
                link = (link == 'url' ? this.environmentConfigData[link] + 'reader/index.html' : (link != 'http://www.yopmail.com/' ? link + 'reader/index.html' : link));
				//console.log(link);
                driver.get(link);
                driver.wait(webdriver.until.titleIs(link), maxTimeout);
            })
            .when("I click on Reader button $ReaderButton", function (ReaderButton) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.reader[ReaderButton])).click();
            })
            .then("Main page should have $titleName title", function (titleName) {
                var driver = this.driver;
                titleName = (titleName == 'url' ? this.environmentConfigData[titleName] + 'reader/index.html' : titleName + 'reader/index.html');
                /*driver.getTitle().then(function (title) {
                 //console.log('title='+title+' ='+titleName);
                 if (title !== titleName) {
                 throw new Error(
                 'Expected "' + titleName + '", but was "' + title + '"');
                 }
                 });*/
				 
                return driver.wait(webdriver.until.titleIs(titleName), maxTimeout);
                /*titleName = (titleName == 'url' ? this.environmentConfigData[titleName]+'reader/#/': titleName+'reader/#/');
                 driver.wait(function() {
                 return driver.getTitle().then(function(title) {
                 return title === titleName;
                 });
                 }, maxTimeout);*/
            })
            .then("And we should see login form $form", function (form) {
                var data = applicationArea[form];
				//var data = "input[placeholder='Login']";
                var driver = this.driver;
                var locator = commonUtils.byCss(data);

				return commonUtils.waitForEnable(driver, locator);
            })

            .given("user is on the $link page", function (link) {
                var driver = this.driver;
                /*page = this.environmentConfigData['url'] + 'reader/index.html' + link;
                driver.get(page);*/

                var titleName = this.environmentConfigData['url'] + 'reader/index.html' + link;
                /*return driver.wait(function () {
                    return driver.getTitle().then(function (title) {
                        assert.equal(title, titleName);
                    });
                }, maxTimeout);*/
				driver.wait(webdriver.until.titleIs(titleName), maxTimeout);
            })       

            .given("Should be input $text into $place", function (text, place) {
                var data = applicationArea[place];
                var locator = commonUtils.byCss(data);//webdriver.By.css(this.mappingData.common[place]);//;
                var driver = this.driver;
				/*return driver.sleep(1000).then(function() {
					return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
						return commonUtils.waitForEnableAndInputValue(driver, locator, text);
					});
				});*/
			
				
				//return commonUtils._findAndInput(driver, locator, text);
				var seq = new webdriver.ActionSequence(driver);
				return driver.sleep(1000).then(function() {
					return commonUtils.waitLocator(driver, locator).then(function(element) {
					   seq.mouseMove(element).perform();
					   return element.clear().then(function() {
							element.sendKeys(text);
					   });
					});
				});				
			})
            .then("Check $text existing in $place", function (text, place) {
            try {
               var data = applicationArea[place];
               var driver = this.driver;
               var locator = commonUtils.byCss(data);
               return commonUtils.waitLocator(driver, locator)
               .then(function (element) { 
                  return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
                  .then(function (found) {               
                     return element
                        .getAttribute('value')
                        .then(function (value)
                        {
                           assert.equal(text, value);
                        })
                  })
               });
            }
            catch (err) {
               console.log(err.stack || String(err));
            }
            })
			
			.then("Validate $text existing in $place", function (text, place) {
               var data = applicationArea[place];
               var driver = this.driver;
               var locator = commonUtils.byCss(data);
               return commonUtils.waitLocator(driver, locator)
               .then(function (element) { 
                  return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
                  .then(function (found) {               
                     return element
                        .getInnerHtml()
                        .then(function (value)
                        {
                           assert.equal(text, value);
                        })
                  })
               });
			   })
			

            .when("I press login button $LoginButton", function (LoginButton) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[LoginButton])).click();
				var data = applicationArea[LoginButton];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				   seq.mouseMove(element).click().perform();
				});            
            })
            .then("We should see filter box $filter", function (filter) {
                var data = applicationArea[filter];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })
			.then("We should see list $BookList", function (BookList) {
                var data = applicationArea[BookList];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })
            .then("Reader layout $ReaderLayout is present", function (ReaderLayout) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.reader[ReaderLayout]));
				var driver = this.driver;
				var data = applicationArea[ReaderLayout];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })
            .then("we should see assessment $AssessmentsLink", function (AssessmentsLink) {
				var applicationArea = this.mappingData.reader;
                var data = applicationArea[AssessmentsLink];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(driver, locator);
				return commonUtils._findElements(driver, locator);
            })       

//Scenario: Open book
            .given("I introduce $bookName in $filter", function (bookName, filter) {
                var data = applicationArea[filter];
                var driver = this.driver;
				//driver.sleep(1000);
                var locator = commonUtils.byCss(data);
                var value = applicationArea[bookName].toString();
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return driver.sleep(500).then(function() {
					return commonUtils._preventInputBlockerAndInput2(driver, locator, inputBlockerLocator, value);
				});
				return commonUtils._findAndInput(driver, locator, value);//
            })
            .then("We should see filter has matching $SeekingBook", function (SeekingBook) {
                var data = applicationArea[SeekingBook];
                var driver = this.driver;
                var locator = commonUtils.byXpath(data);
				//return commonUtils.waitForEnable(driver, locator);//commonUtils._findElements(driver, locator);//
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })
			.then("We should see $SeekingBook in list", function (SeekingBook) {
                var data = applicationArea[SeekingBook];
                var driver = this.driver;
				//driver.sleep(1000);
                var locator = commonUtils.byXpath(data);
				//return commonUtils.waitForEnable(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);*/
				return commonUtils._findElements(driver, locator);
            })			
            .when("I open book $bookName", function (bookName) {
                var data = applicationArea[bookName];
				//console.log('data.............', data);
                var driver = this.driver;
				//driver.sleep(1000);
                var locator = commonUtils.byXpath(data);
				//console.log('locator.............', locator);
				//commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
               //console.log('I open book $bookName');
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
            })
            .then("We should see $book view", function (book) {
                var driver = this.driver;
                var data = applicationArea[book];
                var locator = commonUtils.byCss(data);
				var mappingData = this.mappingData;
				//commonUtils.waitForEnable(driver, locator);
				//return driver.sleep(3000).then(function() {
					var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function() {
						return true;//driver.sleep(2000);
					});
            })
            .then("$BookName is displayed on toolbar $BookToolbar", function (BookName, BookToolbar) {
				var driver = this.driver;
                var data = applicationArea[BookToolbar] + ' > span:nth-child(1)';
				//console.log('data.............', data);
				var locator = commonUtils.byCss(data);
				//console.log('locator.............', locator);
				//return driver.sleep(1000).then(function() {
				//return commonUtils.waitForEnableAndCompareValue(driver, locator, BookName);
				return commonUtils._findAndCompareInnerHtml(driver, locator, BookName);
				//var seq = new webdriver.ActionSequence(driver);
				//return commonUtils._findElements(driver, locator).then(function(elements) {
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator).then(function(elements) {					
					var element = elements[0];
					return seq.mouseMove(element).perform();
				});*/					
				//});
			})
			.then("And $Author is displayed on toolbar $BookToolbar", function (Author, BookToolbar) {
				var driver = this.driver;
                var data = applicationArea[BookToolbar] + ' > span:nth-child(2)';
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndCompareValue(driver, locator, Author);
			})

            .when("I click on read button $button", function (button) {
                var data = applicationArea[button];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);*/
				})
				.then("Book content $content is opening", function (content) {
					var data = applicationArea[content];
					var driver = this.driver;
					var locator = commonUtils.byCss(data);
					//commonUtils.waitLocator(driver, locator);
					//commonUtils.waitForEnable(driver, locator);
					var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
				})
			.then("we should see quiz $Quiz", function (Quiz) {
				var data = applicationArea.Quiz;
				var driver = this.driver;
				var locator = commonUtils.byXpath(data);
				commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })       

         .when("I hover on $ToolbarWrapper", function (ToolbarWrapper) {
                var data = applicationArea[ToolbarWrapper];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);            
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					return seq.mouseMove(element).perform().then(function() {
						return driver.sleep(1000);
					});
				});

				;
            //commonUtils.waitForEnable(driver, locator);
            })
           .then("we should see toolbar $ToolbarWrapper", function (ToolbarWrapper) {
				var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[ToolbarWrapper];
                var locator = commonUtils.byCss(data);
				var mappingData = this.mappingData;
				//commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function() {
					return driver.sleep(1000);
				});
				//return commonUtils._findElements(driver, locator);
				
            })             
           .then("We should see reader mode $ReaderModeLink", function (ReaderModeLink) {
                var data = applicationArea[ReaderModeLink];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
            })    
         
         
//Scenario: Test reader mode settings
            .when("I click on reader mode $settings", function (settings) {
                var data = applicationArea[settings];
                var driver = this.driver;
				//driver.sleep(500);
                var locator = commonUtils.byCss(data);
				//return commonUtils._findAndClick(driver, locator);
				/*return commonUtils.waitLocator(driver, locator).then(function(element) {
					element.sendKeys('Enter');
				});*/				
				// var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				// return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
				//return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
					//return driver.sleep(1500).then(function() {
						return commonUtils._findAndClick(driver, locator);
					//});
				//});
	//            return commonUtils.waitLocator(driver, locator).then(function(element) {
				//commonUtils.waitForEnableAndClick(driver, locator);
				/*commonUtils.waitLocator(driver, locator).then(function(element) {
				   element.click();
				});*/
            })
            .then("We should see settings popup $popup", function (popup) {
				var driver = this.driver;
                var data = applicationArea[popup];
                var locator = commonUtils.byId(data);
				//return commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator).then(function() {
					driver.sleep(1000);
				});
            })

            .when("Select font $font", function (font) {
				var driver = this.driver;
                var data = applicationArea[font];
                var locator = commonUtils.byXpath(data);
				return commonUtils._findAndClick(driver, locator);
				/*var seq = new webdriver.ActionSequence(driver);
                return commonUtils.waitLocator(driver, locator).then(function(element) {
					return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
					.then(function () {
						return seq.mouseMove(element).click().perform();
					});
                });*/
            })
            .then("Check style $style contains $font", function (style, font) {
				var driver = this.driver;
                var shr = applicationArea[font];
                var data = applicationArea[style];
				var locator = commonUtils.byXpath(data);
				return commonUtils.waitLocator(driver, locator).then(function(found) {
				   return found
							.getInnerHtml()
							.then(function (value)
							{
								assert.ok(value.indexOf(shr) !== -1);
							});
				});
            })

            .when("I select $fontSizeChange $fontSizeChangeButton", function (fontSizeChange, fontSizeChangeButton) {
                var data = applicationArea[fontSizeChangeButton];
				var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(this.driver, locator);
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
                            return assert.ok(value.indexOf(razm) !== -1);
                        });
				});
            })

            .when("I click on theme button $theme", function (theme) {
                var data = applicationArea[theme];
				var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndClick(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacroAndClick2(this.driver, locator, inputBlockerLocator);				
            })
            .then("The body is affected by $theme", function (theme) {
                var data = applicationArea[theme];
				var locator = commonUtils.byId(data);
				return commonUtils.waitForEnable(this.driver, locator);
            })

            .when("I click out of popup $outof", function (outof) {
                var data = applicationArea[outof];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				/*var seq = new webdriver.ActionSequence(driver);
				var element = findLocator(driver, locator);
				seq.mouseMove(element, -900, -700).click().perform();*/
				//commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
            })
            .then("We should close popup and see $content", function (content) {
                var data = applicationArea[content];
                var locator = commonUtils.byCss(data);//commonUtils.byId(data);
				//commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
            })

         .when("I click out of info $outof", function (outof) {
                //var data = applicationArea[outof];
                var driver = this.driver;
                var locator = webdriver.By.css(this.mappingData.reader[outof]);//commonUtils.byCss(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				//commonUtils.waitForEnable(driver, locator);
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				return commonUtils._findElements(driver, locator).then(function(elements) {
				   var element = elements[0];
				   //var element = findLocator(driver, locator);
				   var seq = new webdriver.ActionSequence(driver);
				   return seq.mouseMove(element, 50, 50).click().perform();
				   //seq.mouseDown(element).mouseMove(element, -750, -100).mouseUp().perform();
				});
				//return commonUtils._findAndClick(driver, locator);
            })
         .then("We should close info and see $BookContent", function (BookContent) {
            var data = applicationArea.BookContent;
            var locator = commonUtils.byCss(data);//webdriver.By.css(this.mappingData.reader[BookContent]);//commonUtils.byId(data);
			var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
            return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
         })       

//Scenario: Test Book Extra button
            .when("I click button book extra $BookExtra", function (BookExtra) {
				var driver = this.driver;
                var data = applicationArea[BookExtra];
				//console.log('data...............',data);
				var locator = commonUtils.byCss(data);
				//console.log('locator...............',locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					//return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
					return commonUtils._findElements(driver, locator).then(function(elements) {
							var element = elements[0];
							var seq = new webdriver.ActionSequence(driver);
							return seq.mouseMove(element).click().perform();
							/*.then(function() {
								return driver.sleep(500);
							});*/
					});
				/*return driver.sleep(1000).then(function() {
					return commonUtils._findAndClick(driver, locator);
				});*/
            })

            .then("Menu $menu is displayed", function (menu) {
                var data = applicationArea[menu];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);
			})
			.then("Popup $ExtraPopup is displayed", function (ExtraPopup) {
					var data = applicationArea[ExtraPopup];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitLocator(this.driver, locator);
				commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })       
            .then("And we should see $extraMenuItem button $extraMenuButton", function (extraMenuItem, extraMenuButton) {
                var data = applicationArea[extraMenuButton];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitLocator(this.driver, locator);

				commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })

//Scenario: Test Info button
            .when("I click on Info button $InfoButton", function (InfoButton) {
                var data = applicationArea[InfoButton];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitLocator(driver, locator)
				return commonUtils._findElements(driver, locator)
				.then(function (elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform()
				});
				//return commonUtils._findAndClick(driver, locator);
            })
            .then("We should see book cover image $image", function (image) {
                var data = applicationArea[image];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
            .then("And we should see full title $titleClass", function (titleClass) {
                var data = applicationArea[titleClass];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
            .then("And we should see author $author", function (author) {
                var data = applicationArea[author];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
            })
            .then("We should see table of content $TableOfContent", function (TableOfContent) {
                var data = applicationArea[TableOfContent];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
			})
            .then("We should see exercises list $ExercisesList", function (ExercisesList) {
                var data = applicationArea[ExercisesList];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
			})			

//Scenario: Test table of content
            .when("I select $item of content", function (item) {
                var data = applicationArea[item];
                var driver = this.driver;
				//console.log('data............  ', data);
                var locator = commonUtils.byXpath(data);
                return commonUtils._findAndClick(driver, locator);
				////var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				/*return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator)
					.then(function() {
						return driver.sleep(1000);
					});*/
				////return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
		/*		return commonUtils.waitLocator(driver, locator).then(function(element) {
					//return driver.sleep(2000).then(function() {
						//var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					//});
				});*/
            })
            .then("We should see the $name matching selected $item", function (name, item) {
                var obj;
                var data = applicationArea[name];
				var locator = commonUtils.byXpath(data);
				var driver = this.driver;
				return commonUtils.getText(driver, locator).then(function(obj) {
					data = applicationArea[item];
					locator = commonUtils.byXpath(data);
					return commonUtils.getText(driver, locator).then(function(text) {
						return assert.equal(obj, text);
					});
				});
            })
            .then("We should see the matching header $MatchingHeader", function (MatchingHeader) {
                var data = applicationArea[MatchingHeader];
				var locator = commonUtils.byXpath(data);
				var driver = this.driver;
				return commonUtils.waitForEnable(driver, locator);
				////return commonUtils._findElements(driver, locator).then(function(elements) { ////
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {*/
				//return driver.sleep(1000).then(function() {
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
/*						var element = elements[0];
						   var seq = new webdriver.ActionSequence(driver);
						   return seq.mouseMove(element).perform();
				});*/
				//});					
            })

//Scenario: Test Bookmarks button
            .when("I click on $Bookmarks button $BookmarksButton", function (Bookmarks, BookmarksButton) {
                var data = applicationArea[BookmarksButton];
				var locator = commonUtils.byCss(data);
				commonUtils._findAndClick(this.driver, locator);
				})
				.then("We should see quick filter textbox $filter", function (filter) {
					var data = applicationArea[filter];
					var locator = commonUtils.byCss(data);
					//commonUtils.waitForEnable(this.driver, locator);
					var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
				})
				.then("And we should see categories combobox $combobox", function (combobox) {
					var data = applicationArea[combobox];
					var locator = commonUtils.byCss(data);
					//commonUtils.waitForEnable(this.driver, locator);
					var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
				})
				.then("And we should see $Bookmarks list $list", function (Bookmarks, list) {
					var data = applicationArea[list];
					var locator = commonUtils.byCss(data);
					//return commonUtils.waitForEnable(this.driver, locator);            
					var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
				})

//Scenario: Test bookmark filter
            .when("I click on categories combobox $combobox", function (combobox) {
                var data = applicationArea[combobox];
                var locator = commonUtils.byCss(data);
                var driver = this.driver;
				/*return commonUtils.waitLocator(driver, locator)
				.then(function (found) {
						found.click();
					});
				})*/
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacroAndClick2(this.driver, locator, inputBlockerLocator);
			})
			.then("We should see $category item", function (category) {
					var data = applicationArea[category];
					var locator = commonUtils.byCss(data);
					var driver = this.driver;
				return commonUtils.waitLocator(driver, locator);
            })

            .when("I click $category item", function (category) {
                var data = applicationArea[category];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(this.driver, locator);          
            })
            .then("$item $bookmarks are displaying in list", function (item, bookmarks) {
                var data = applicationArea[item];
                var locator = commonUtils.byCss(data);
                var driver = this.driver;
				//commonUtils.waitLocator(driver, locator);
				return commonUtils.waitForEnable(driver, locator);
            })

//Scenario: Test bookmark list
            .when("I click on a $type $item", function (type, item) {
                var driver = this.driver;
                var data = applicationArea[item];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnableAndClick(driver, locator);
			})
			.then("We should see $bookmarked text on reader page $place", function (bookmarked, place) {
				var marked;
				var driver = this.driver;
				var data = applicationArea[bookmarked];
				var locator = commonUtils.byCss(data);
				commonUtils.waitLocator(driver, locator).then(function(found) {
				   found
							//.getAttribute('text')
					  .getText()
							.then(function (text)
							{
								marked = text;
							});
				});
				var data = applicationArea[place];
				var locator = commonUtils.byXpath(data);
				return commonUtils.waitLocator(driver, locator).then(function(found) {
				   found          
							//.getAttribute('text')
					  .getText()
							.then(function (text)
							{
								assert.equal(marked, text);
							});
				});
            })

//Scenario: Test logout
            .when("I toggle menu $menu", function (menu) {
                var driver = this.driver;
                var data = applicationArea[menu];
                var locator = commonUtils.byCss(data);
				var mappingData = this.mappingData;
				return driver.sleep(1000).then(function() {
					//var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker);
					//return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
					//return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
						return commonUtils._findElements(driver, locator).then(function(elements) {
						var seq = new webdriver.ActionSequence(driver);
						var element = elements[0];
						seq.mouseMove(element).click().perform();
					});
					//return commonUtils.waitForEnableAndClick(driver, locator);
					//return commonUtils._findAndClick(driver, locator);
				});
				/*var seq = new webdriver.ActionSequence(driver);
                return commonUtils.waitLocator(driver, locator).then(function(element) {
					return driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
					.then(function () {
						seq.mouseMove(element).click().perform();
					});
                });*/
            })
            .then("We should see logout $button", function (button) {
				var driver = this.driver;
                var data = applicationArea[button];
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);*/
				return commonUtils._findElements(driver, locator);
            })
            .then("We should see item $FlashcardsItem", function (FlashcardsItem) {
                var data = applicationArea[FlashcardsItem];
				//console.log('data.........',data);
				var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);*/
				return commonUtils._findElements(this.driver, locator);
            })
			.then("We should see resume $ResumeStudyButton", function (ResumeStudyButton) {
                var data = applicationArea[ResumeStudyButton];
				var locator = commonUtils.byXpath(data);
				return commonUtils._findElements(this.driver, locator);
            }) 			
         
            .when("I click logout $button", function (button) {
                var data = applicationArea[button];
				var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(this.driver, locator);
            })
            .then("We log out", function () {
				//return this.driver.sleep(1000);
            })
         
            .when("I click item $FlashcardsItem", function (FlashcardsItem) {
				var driver = this.driver;
				var data = applicationArea[FlashcardsItem];
				//console.log('data.........',data);
				var locator = commonUtils.byCss(data);
				//return commonUtils._findAndClick(driver, locator);
				//commonUtils.waitForEnableAndClick(this.driver, locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//return commonUtils._preventInputBlockerMacroAndClick2(this.driver, locator, inputBlockerLocator);
				//return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator).then(function(elements) {
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				return commonUtils._findElements(driver, locator).then(function(elements) { 					
					var seq = new webdriver.ActionSequence(driver);
					var element = elements[0];
					return seq.mouseMove(element).click().perform();
				});
            })
            .then("We should see test word $TestWord", function (TestWord) {
				var driver = this.driver;
                var data = applicationArea[TestWord];
				//console.log('data.........',data);
				var locator = commonUtils.byXpath(data);
				//console.log('locator.........',locator);
				var mappingData = this.mappingData;
				return commonUtils.waitForEnable(driver, locator);/*.then(function(element) {
				   /*element.getInnerHtml().then(function(text) {
					  console.log(text);
				   });
				});*/
				/*return driver.sleep(2000).then(function() {
					var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker); 
					return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator).then(function(elements) {
						var element = elements[0];
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).perform();
					});
				});*/
            })
            .then("Book content $BookContent is visible", function (BookContent) {
				//this.driver.sleep(1000);
                var data = applicationArea[BookContent];
				var locator = commonUtils.byCss(data);
				var mappingData = this.mappingData;
				//if (!commonUtils.waitForEnable(this.driver, locator)) {
				//return this.driver.sleep(1000).then(function() {
				//return commonUtils.waitLocator(this.driver, locator).then(function() {					
				/*	var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker); 
					return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);*/
				return commonUtils._findElements(this.driver, locator);
				//});
            })
			 .then("we should see course template $StudyProjectTemplate", function(StudyProjectTemplate) {
					var driver = this.driver;
					var data = applicationArea[StudyProjectTemplate];
					var locator = commonUtils.byCss(data);
					return commonUtils.waitForEnable(driver, locator);
			 })
			 .then("User profile $UserProfilePopup is opened", function(UserProfilePopup) {
					var driver = this.driver;
					var data = applicationArea[UserProfilePopup];
					var locator = commonUtils.byCss(data);
					return commonUtils._findElements(driver, locator);
			 })
			 .then("Statistics block $StatisticsBlock is present", function(StatisticsBlock) {
					var driver = this.driver;
					var data = applicationArea[StatisticsBlock];
					var locator = commonUtils.byCss(data);
					return commonUtils._findElements(driver, locator);
			 })
			 .then("we should see assessment popup $AssessmentsPopup", function(AssessmentsPopup) {
				var driver = this.driver;
				var data = applicationArea[AssessmentsPopup];
				var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator);
			 })
			.then("Library list $LibraryList is displayed", function(LibraryList) {
                var driver = this.driver;
                var data = applicationArea[LibraryList];
                var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator);
			})		 

//Scenario: Test full text search
            .when("I click on search icon $SearchIcon", function (SearchIcon) {
				var driver = this.driver;
				var data = applicationArea[SearchIcon];
				var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(this.driver, locator, inputBlockerLocator);            
         })
            .then("We should see search popup $SearchPopup", function (SearchPopup) {
                //this.driver.findElement(webdriver.By.id(this.mappingData.common[SearchPopup]));
                var data = applicationArea[SearchPopup];
				var locator = commonUtils.byId(data);
				return commonUtils.waitLocator(this.driver, locator);
            })

            .given("I input $SearchingText into search box $SearchTextField", function (SearchingText, SearchTextField) {
                var data = applicationArea[SearchTextField];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
                var search = applicationArea[SearchingText];
						return commonUtils.waitLocator(driver, locator)
						.then(function (found) {
								return found.clear().then(function() {
									return found.sendKeys(search).then(function() {
										driver.sleep(2000);
									});
								});
							});
			})
            .when("I click on search text icon $SearchTextIcon", function (SearchTextIcon) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[SearchTextIcon])).click();
                var data = applicationArea[SearchTextIcon];
                //commonUtils.findCss(this.driver, data).click();
				return commonUtils._findAndClick(this.driver, data);
				/*.then(function() {
					return driver.sleep(500);
				});*/
            })
            .then("We should see $some search $result", function (some, result) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[result]));
				var data = applicationArea[result];
				var driver = this.driver;
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
            })
            .then("We should see searching books list $list", function (list) {
                var data = applicationArea[list];
				var locator = commonUtils.byCss(data);
				var driver = this.driver;
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);*/
				//return commonUtils.waitForEnable(this.driver, locator);//commonUtils.waitLocator(this.driver, locator);
				return commonUtils._findElements(driver, locator);
            })
            .then("Search results $SearchResultsNumber = $value", function (SearchResultsNumber, value) {
				var driver = this.driver;
                var data = applicationArea[SearchResultsNumber];
				var locator = commonUtils.byCss(data);
				//return commonUtils._findElements(driver, locator).then(function() {
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function() {
				return driver.sleep(1000).then(function() {
					return commonUtils._findAndCompareInnerHtml(driver, locator, value);
				});
            })       
            .then("First book is $FirstBook", function (FirstBook) {
                var data = applicationArea[FirstBook];
                return commonUtils.findCss(this.driver, data)
                        .getInnerHtml()
                        .then(function (value)
                        {
                            //console.log(value);
                            assert.ok(value == 'The General Theory of Employment, Interest, and Money Project Gutenberg Australia (1)');
                        });
            })
            .then("We should see search result $SearchResult contains $SearchingText", function (SearchResult, SearchingText) {
                var found = true;
                var i = 1;
                while (found) {
                var locator = commonUtils.byCss(this.mappingData.common[SearchResult] + ' > li:nth-child(' + i + ') > p > span > strong:nth-child(1)');
                    //found = this.driver.findElement(webdriver.By.css(this.mappingData.common[SearchResult] + ' > li:nth-child(' + i + ') > p > span > strong:nth-child(1)'));
					//found = commonUtils.waitForEnable(this.driver, locator);
					//console.log(i + '   ' + found + '   ' + this.mappingData.common[SearchingText]);
					var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
					found = commonUtils.preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);
                    i++;
                }
                return found;
            })
         
            .given("I introduce $SearchingText into search box $SearchTextField", function (SearchingText, SearchTextField) {
                var data = applicationArea[SearchTextField];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
				commonUtils.waitLocator(driver, locator)
				.then(function (found) {
						found.clear();
						found.sendKeys(SearchingText);
					});
            })       
            .then("we should see $ResultBook $Name with $ResultsNumber equals $Number", function (ResultBook, Name, ResultsNumber, Number) {
                var data = applicationArea.ResultBook;
				//console.log('--------------  ',data);
				var locator = commonUtils.byXpath(data);
				//console.log('+++++++++++++  ',locator);
				commonUtils.waitLocator(this.driver, locator).then(function(element) {
				   element.getInnerHtml()
									.then(function (text)
									{
										innHtml = text.toLowerCase();
							   //console.log('..............    ',innHtml);
										var found = innHtml.indexOf(Name.toLowerCase()) !== -1 ? true : false;
							   assert.equal(found, true);
									});
				});
				data = applicationArea[ResultsNumber];
				//console.log('--------------  ',data);
				locator = commonUtils.byXpath(data);
				//console.log('+++++++++++++  ',locator);
				commonUtils.waitLocator(this.driver, locator).then(function(element) {
				   element.getInnerHtml()
									.then(function (text)
									{
										innHtml = text.toLowerCase();
							   //console.log('..............    ',innHtml);
										var found = innHtml.indexOf(Number) !== -1 ? true : false;
							   assert.equal(found, true);
									});
				});            
            })
         
         .when("I click on search result tree $SearchResultsTree", function (SearchResultsTree) {
            var data = applicationArea.SearchResultsTree;
            //console.log('--------------  ',data);
            var locator = commonUtils.byCss(data);
            //console.log('+++++++++++++  ',locator);
            commonUtils.waitForEnableAndClick(this.driver, locator);
         })
            .then("Focus leaves search box", function() {
            
         })          
         
         .when("I click on result book $ResultBookItem", function (ResultBookItem) {
            var data = applicationArea[ResultBookItem];
            //console.log('--------------  ',data);
            var locator = commonUtils.byXpath(data);
            //console.log('+++++++++++++  ',locator);
            commonUtils.waitForEnableAndClick(this.driver, locator);
         })
            .then("We should see search paragraph $SearchParagraph contains $SearchingText", function (SearchParagraph, SearchingText) {
                var data = applicationArea[SearchParagraph];
            //console.log('--------------  ',data);
            var locator = commonUtils.byCss(data);
            //console.log('+++++++++++++  ',locator);
            commonUtils.waitLocator(this.driver, locator).then(function(element) {
               element.getText()
                                .then(function (text)
                                {
                           //console.log('..............    ',text);
                           assert.equal(text, SearchingText);
                                });
            });
            })

         .when("I click reading icon $ReadingIcon near search result", function (ReadingIcon) {
            var data = applicationArea.ReadingIcon;
            //console.log('--------------  ',data);
            var locator = commonUtils.byCss(data);
            //console.log('+++++++++++++  ',locator);
            commonUtils.waitForEnableAndClick(this.driver, locator);
         })       

         .when("I click out of search $OutOfSearch", function (OutOfSearch) {
            //try {
               //return this.driver.findElement(webdriver.By.css(this.mappingData.common[OutOfSearch])).click();
               //this.driver.close();
               var driver = this.driver;
               var data = applicationArea[OutOfSearch];
               var locator = commonUtils.byCss(data);
			   /*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
               commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
               var seq = new webdriver.ActionSequence(driver);
               commonUtils._findElements(driver, locator).then(function(elements) {
				   var element = elements[0];
					seq.mouseMove(element).click().perform();
               });
            /*} catch (err) {
                     console.log(err.stack || String(err));
                }*/
            })
            .then("We should see search is closed", function () {
				this.driver.sleep(2000);
            })
         
         .given("$BookHeader $Book is open", function (BookHeader, Book) {
            this.driver.switchTo().frame(0);
                var data = applicationArea.BookHeader;
            //console.log('--------------  ',data);
            var locator = commonUtils.byCss(data);
            //console.log('+++++++++++++  ',locator);
            commonUtils.waitLocator(this.driver, locator).then(function(element) {
               element.getText()
                                .then(function (text)
                                {
                           //console.log('..............    ',text);
                           assert.equal(text.toLowerCase().trim().indexOf(Book.toLowerCase().trim()) !== -1, true);
                                });
            });
            this.driver.switchTo().defaultContent();
            })
            .then("we should see $Snippet displaying on $Screen", function (Snippet, Screen) {
				this.driver.switchTo().frame(0);
					var data = applicationArea.Screen;
				//console.log('--------------  ',data);
				var locator = commonUtils.byId(data);
				//console.log('+++++++++++++  ',locator);
				commonUtils.waitLocator(this.driver, locator).then(function(element) {
				   element.getText()
						.then(function (text)
						{
					  //console.log('..............    ',text);
					  assert.equal(text.toLowerCase(),Snippet.toLowerCase());
						});
				});
				this.driver.switchTo().defaultContent();
            })       
         
         .when("I click on current $CurrentBook", function (CurrentBook) {
                //this.driver.findElement(webdriver.By.css(CurrentBook)).click();
                var data = CurrentBook;
                var driver = this.driver;
                var locator = commonUtils.byCss(data);
            //console.log('locator ++++++++++     ',locator);           
				return commonUtils.waitForEnableAndClick(driver, locator).then(function(){
					return driver.sleep(500);
				});
            })
            .then("We should see result $SnippetList contains $SearchingText", function (SnippetList, SearchingText) {
				var driver = this.driver;
                var seartext = this.mappingData.common[SearchingText].toLowerCase();
				var SnippetListLocator = this.mappingData.common.SnippetList;
					return commonUtils._findHtmlInDOM(driver, seartext, _detectQuery, 1);
					function _detectQuery(i) {
						return SnippetListLocator + ' > li:nth-child(' + i + ') > p > span > span > strong';
					}
		    })

            .when("user clicks on link $socialLink", function (socialLink) {
                //this.driver.findElement(webdriver.By.id(this.mappingData.reader[socialLink])).click();
				var driver = this.driver;
				//driver.sleep(1000);
				var data = applicationArea[socialLink];
				var locator = commonUtils.byId(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);          
				})
				.then("Page should have $titleName title", function (titleName) {
					//this.driver.wait(webdriver.until.titleIs(titleName), maxTimeout);
					this.driver.getTitle().then(function (title) {
					if (title.indexOf(titleName) === -1) {
					   throw new Error(
					   'Expected "' + titleName + '", but was "' + title + '"');
					}
					});
            })       
            /*.then("Reader layout $ReaderLayout is present", function (ReaderLayout) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.reader[ReaderLayout]));
            var driver = this.driver;
            var data = applicationArea[ReaderLayout];
            var locator = commonUtils.byCss(data);
            commonUtils.waitForEnable(driver, locator);
            })*/
         
            .when("user selects snippet from $Point1 to $Point2", function (Point1, Point2) {
				var driver = this.driver;
                var data = applicationArea[Point1];
				var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element1 = elements[0];

					data = applicationArea[Point2];
					locator = commonUtils.byCss(data);
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element2 = elements[0];
						//driver.sleep(500);
						var seq1 = new webdriver.ActionSequence(driver);
						var seq2 = new webdriver.ActionSequence(driver);
						var seq3 = new webdriver.ActionSequence(driver);


							seq1.mouseDown(element1).mouseMove(element1).perform();
							seq2.mouseMove(element2).perform();
							seq3.mouseUp().perform();
					});

				});
            })
            .then("we should see context menu $ContextMenu", function (ContextMenu) {
                var driver = this.driver;
                var data = applicationArea[ContextMenu];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
				})    
			 
			.when("user clicks note button $NoteButton", function (NoteButton) {
				var driver = this.driver;
				var data = applicationArea.NoteButton;
				//console.log('data...................', data);
				var locator = commonUtils.byCss(data);
				//console.log('locator...................', locator);
				//commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
            })
			.then("we should see annotation popup $AnnotationPopup", function (AnnotationPopup) {
                var driver = this.driver;
                var data = applicationArea[AnnotationPopup];
                var locator = commonUtils.byCss(data);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				commonUtils.preventInputBlockerMacro(driver, locator, inputBlockerLocator);*/
				return commonUtils._findElements(driver, locator);
            })
			
			.when("user clicks flashcard button $FlashcardItem", function (FlashcardItem) {
				var driver = this.driver;
				var data = applicationArea.FlashcardItem;
				var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
					var element = elements[0];
					//commonUtils.waitLocator(driver, locator).then(function(element) {
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					//});
				});
            })			
            .then("we should see flashcard popup $FlashcardPopup", function (FlashcardPopup) {
                var data = applicationArea[FlashcardPopup];
				var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(this.driver, locator);
            })			
         
            .when("user inputs text $value in $AnnotationBox", function (value, AnnotationBox) {
				var driver = this.driver;
                var data = applicationArea[AnnotationBox];
				var locator = commonUtils.byCss(data);
				console.log('data...................', data);
				console.log('locator...................', locator);
				return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
				   return commonUtils.waitForEnableAndInputValue(driver, locator, value);
				});
            })
         
            .when("user selects type $Type in $AnnotationTypeSelector $AnnotationTypeList as $item item", function (Type, AnnotationTypeSelector, AnnotationTypeList, item) {
                var driver = this.driver;
                var data = applicationArea[AnnotationTypeSelector];
                var locator = commonUtils.byCss(data);
                return commonUtils.waitLocator(driver, locator).then(function (found) {
                    return found.click().then(function() {
						data = applicationArea[AnnotationTypeList] + "> li:nth-child(" + item + ")";
						locator = commonUtils.byCss(data);
						return commonUtils._findElements(driver, locator).then(function(elements) {
							var element = elements[0];
							return element.getAttribute('class').then(function(classes) {
								if (classes.indexOf('active' === -1)) {
									var seq = new webdriver.ActionSequence(driver);
									return seq.mouseMove(element).click().perform();
									//return element.click();
								}
							})
						});
/*
						return commonUtils.waitLocator(driver, locator).then(function (found) {
							return found.click();
						});
*/
					})
				});
			})

            .when("user clicks out of note block $OutOfAnnotationPopup", function (OutOfAnnotationPopup) {
                var driver = this.driver;
                var data = applicationArea[OutOfAnnotationPopup];
				data = 'body';
                var locator = commonUtils.byCss(data);
				var seq = new webdriver.ActionSequence(driver);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
				   return seq.mouseMove(element, 1, 1).click().perform();
	//			}).then(function() {
	//				return _waitUntilPresent(driver, locator);
				});
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
			.then("We should see reduced list $MarginNotesListReduced", function (MarginNotesListReduced) {
                var driver = this.driver;
                var data = applicationArea[MarginNotesListReduced];
                var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })
			 .then("We should see last $BookContent", function (BookContent) {
					var driver = this.driver;
					var data = applicationArea[BookContent];
					var locator = commonUtils.byCss(data);
					var mappingData = this.mappingData;
					//return driver.sleep(2000).then(function(){
						var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker); 
						return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
					//});
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
					var seq = new webdriver.ActionSequence(driver);
					return commonUtils.waitLocator(driver, locator).then(function(element) {
					//return commonUtils._findElements(driver, locator).then(function(elements) {
					   //var element = elements[0];
					   return seq.mouseMove(element).perform().then(function() {
						   return commonUtils._findAndCompareInnerHtml(driver, locator, text);//commonUtils.waitForEnableAndCompareValue(driver, locator, text);
					   });
					});					
			 })

         .when("I click on card $Quiz", function (Quiz) {
                var data = applicationArea[Quiz];
				//console.log('data..........',data);
				var driver = this.driver;
				//driver.sleep(1000);
				var locator = commonUtils.byXpath(data);
				//console.log('locator..........',locator);
				//return commonUtils._findAndClick(driver, locator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator)*/
				return commonUtils._findElements(driver, locator)
					.then(function(elements) {
					   var element = elements[0];
				//commonUtils.waitForEnable(driver, locator);
				//if (!commonUtils.waitForEnableAndClick(driver, locator)) {
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
					//return commonUtils._findElements(driver, locator).then(function(elements) {
					   //var element = elements[0];
					   var seq = new webdriver.ActionSequence(driver);
					   return seq.mouseMove(element).click().perform();
					});
				//}
         })
         .then("we should see answer list $AnswerList", function (AnswerList) {
                var driver = this.driver;
                var data = applicationArea[AnswerList];
                var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);            
            })
         
         .when("I click on correct $CorrectLink in $AnswerList", function (CorrectLink, AnswerList) {
                var data = applicationArea[AnswerList];
				var driver = this.driver;

				return commonUtils._findHtmlInDOM(driver, CorrectLink, _detectDataLocator, 1).then(function(element) {
					return element.click();
				});

				function _detectDataLocator(i) {
					return data + ' > li:nth-child(' + i + ')';
				}
         })
         .then("we should see result $ExerciseIsDone", function (ExerciseIsDone) {
                var driver = this.driver;
                var data = applicationArea[ExerciseIsDone];
                var locator = commonUtils.byXpath(data);
				//commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
         })

         .when("I click on close $CloseExercise", function (CloseExercise) {
                var driver = this.driver;
                var data = applicationArea[CloseExercise];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator)
					.then(function(elements) {
						var seq = new webdriver.ActionSequence(driver);
						var element = elements[0];
						return seq.mouseMove(element).click().perform();
					});
         })
         .then("It is closing", function() {
            
         })
         .then("Book content $BookContent is visible again", function (BookContent) {
                var driver = this.driver;
                var data = applicationArea[BookContent];
                var locator = commonUtils.byCss(data);
				commonUtils.waitForEnable(driver, locator);
         })

            .when("I click next $NextButton", function (NextButton) {
                var driver = this.driver;
                var data = applicationArea[NextButton];
                var locator = commonUtils.byId(data);
				commonUtils.waitForEnableAndClick(driver, locator);
            })
         .then("Google login screen appears", function() {
            
         })

            .when("I select word $Point", function (Point) {
                var driver = this.driver;
            //driver.sleep(2000);
                var data = applicationArea[Point];
				console.log('data...............', data);
                var locator = commonUtils.byCss(data);
            //commonUtils.waitForEnable(driver, locator);
            /*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
            commonUtils.preventInputBlockerMacro(driver, locator, inputBlockerLocator);*/
            var seq = new webdriver.ActionSequence(driver);
            return commonUtils.waitLocator(driver, locator).then(function(element) {
               return seq.mouseDown(element).mouseMove(element, 1, 0).mouseUp().perform();
			   //return seq.mouseMove(element).doubleclick().perform();
			   //return seq.mouseDown(element).mouseUp().perform();
            });            
            })
         .then("we should see button $LookupButton", function(LookupButton) {
                var driver = this.driver;
                var data = applicationArea[LookupButton];
                var locator = commonUtils.byCss(data);
            return commonUtils.waitForEnable(driver, locator);
         })

            .when("I click on lookup $LookupButton", function (LookupButton) {
                var driver = this.driver;
                var data = applicationArea[LookupButton];
                var locator = commonUtils.byCss(data);
				return driver.sleep(1000).then(function() {
					return commonUtils._findAndClick(driver, locator);	//waitForEnableAndClick(driver, locator);
				});
         })
         .then("we should see link $AddToFlashcardLink", function(AddToFlashcardLink) {
                var driver = this.driver;
                var data = applicationArea[AddToFlashcardLink];
                var locator = commonUtils.byCss(data);
            return commonUtils._findElements(driver, locator);	//waitForEnable(driver, locator);
         })

         .when("I click on link $AddToFlashcardLink", function (AddToFlashcardLink) {
                var driver = this.driver;
                var data = applicationArea[AddToFlashcardLink];
				//console.log('******* data   *********       ',data);
                var locator = commonUtils.byCss(data);
				driver.switchTo().defaultContent();
				if (AddToFlashcardLink == 'FinishRegistrationLink') {
					driver.switchTo().frame('ifmail');
					console.log('******* ifmail   *********       ');
					/*return commonUtils._findElements(driver, locator).then(function(elements) {
							var element = elements[0];
							return element.getAttribute('href').then(function(href) {
								console.log('******* href   *********       ',href);
								return driver.get(href);
							});
					});*/
				}
				//else {
					return commonUtils._findAndClick(driver, locator).then(function(){
						//console.log('******* clicked  *********       ');
						driver.switchTo().defaultContent();
					});
				//}
         })
         .then("We should see label $InFlashcard", function(InFlashcard) {
                var driver = this.driver;
                var data = applicationArea[InFlashcard];
                var locator = commonUtils.byXpath(data);
            return commonUtils._findElements(driver, locator);
         })
         .then("we should see students progress $StudentProgressItem", function(StudentProgressItem) {
                var driver = this.driver;
                var data = applicationArea[StudentProgressItem];
                var locator = commonUtils.byCss(data);
            return commonUtils.waitForEnable(driver, locator);
         })		 

            .when("I click button library $LibraryButton", function (LibraryButton) {
                var driver = this.driver;
				//driver.sleep(2000);
                var data = applicationArea[LibraryButton];
                var locator = commonUtils.byCss(data);
				var mappingData = this.mappingData;
				//return commonUtils._findAndClick(driver, locator);
				//return commonUtils.waitForEnable(driver, locator).then(function(){
					var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker);
					return driver.sleep(1000).then(function(){
					return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
						var element = elements[0];
						//return commonUtils.waitLocator(driver, locator).then(function(element) {
							var seq = new webdriver.ActionSequence(driver);
							return seq.mouseMove(element).click().perform();
						//});
					});
					});
				/*var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker); 
				commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});*/
         })
         /*.then("Library list $LibraryList is displayed", function(LibraryList) {
                var driver = this.driver;
                var data = applicationArea[LibraryList];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
         })*/

            .when("I click on cover of book $BookCover", function (BookCover) {
                var driver = this.driver;
				//driver.sleep(1000);
				/*if (cover == 'BookInfoButton') {
					if (BookCover != 'BookName5') {
						var data = "//a[text()='" + BookCover + "']";
					}
					else {
						var data = "//a[text()='" + applicationArea[BookCover] + "']";
					}
					data += applicationArea[cover];
				}
				else {*/
					var data = applicationArea[BookCover];
				//}
				//console.log('data..........   ',data);
				var locator = commonUtils.byXpath(data);
				//console.log('locator......   ',locator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);*/
				//return commonUtils._findAndClick(driver, locator);
			 })
			 
			 .when("I click on $info of book $Book", function (info, Book) {
                var driver = this.driver;
				//if (info == 'BookInfoButton') {
					if (Book != 'BookName5') {
						var data = "//a[text()='" + Book + "']";
					}
					else {
						var data = "//a[text()='" + applicationArea[Book] + "']";
					}
					data += applicationArea[info];
				//}
				var locator = commonUtils.byXpath(data);
				return driver.sleep(1000).then(function() {
					return commonUtils._findAndClick(driver, locator);
				});
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});*/
			 })				
			 .then("We should see $popup $BookInfoPopup", function(popup, BookInfoPopup) {
					var driver = this.driver;
					var data = applicationArea[BookInfoPopup];
					var locator = commonUtils.byCss(data);
					return driver.sleep(1000).then(function() {
						return commonUtils._findElements(driver, locator);
					});
			 })       

         .when("I click on button $BeginStudyButton", function (BeginStudyButton) {
            var driver = this.driver;
            var data = applicationArea[BeginStudyButton];
            var locator = commonUtils.byCss(data);
            //return commonUtils.waitForEnableAndClick(driver, locator);
			return driver.sleep(1000).then(function() {
				return commonUtils._findAndClick(driver, locator);
			});
         })
         .then("we should see new course $NewCoursePopup", function(NewCoursePopup) {
                var driver = this.driver;
                var data = applicationArea[NewCoursePopup];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })		 
         /*.then("we should see course template $StudyProjectTemplate", function(StudyProjectTemplate) {
                var driver = this.driver;
                var data = applicationArea[StudyProjectTemplate];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })*/
         .then("we should see classroom link $ClassroomLink", function(ClassroomLink) {
                var driver = this.driver;
                var data = applicationArea[ClassroomLink];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })
         .then("$Book is absent in the list $MyBooksList", function(Book, MyBooksList) {
			var driver = this.driver;
			var data = applicationArea[MyBooksList];
			var locator = commonUtils.byCss(data);
			var title = Book.toLowerCase();
			//console.log('title', title);
			return driver.sleep(1000).then(function() {
				return commonUtils._compareElements(driver, locator, _comparator, 'Book is not removing from library');
			});
			
			function _comparator(element) {
				return element.getInnerHtml().then(function(text) {
					//console.log('text', text);
					return text.toLowerCase().indexOf(title) !== -1;
				});
			}
         })
		 
         .when("I click on classroom link $ClassroomLink", function(ClassroomLink) {
                var driver = this.driver;
                var data = applicationArea[ClassroomLink];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);
         })
         .then("we should see classroom $ClassroomBlock", function(ClassroomBlock) {
                var driver = this.driver;
                var data = applicationArea[ClassroomBlock];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         }) 
         
         .when("I click on invite button $InviteStudents", function (InviteStudents) {
                var driver = this.driver;
				//driver.sleep(500);
                var data = applicationArea[InviteStudents];
                var locator = commonUtils.byCss(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
         })
         .then("we should see invite popup $InvitePopup", function(InvitePopup) {
                var driver = this.driver;
                var data = applicationArea[InvitePopup];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })

         .when("I click on invite $InviteUserButton", function (InviteUserButton) {
                var driver = this.driver;
                var data = applicationArea[InviteUserButton];
                var locator = commonUtils.byXpath(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils._findAndClick(driver, locator);
/*
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				   return seq.mouseMove(element).click().perform();
				});
*/
         })
         .then("we should see invited $InvitedLink", function(InvitedLink) {
            var driver = this.driver;
            var data = applicationArea[InvitedLink];
            var locator = commonUtils.byXpath(data);
            return commonUtils._findElements(driver, locator);
         })

         .when("I click $CloseInvitePopup invite popup", function (CloseInvitePopup) {
                var driver = this.driver;
                var data = applicationArea[CloseInvitePopup];
                var locator = commonUtils.byXpath(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
         })

         .when("I click on $membership $MembershipLink", function (membership, MembershipLink) {
                var driver = this.driver;
                var data = applicationArea[MembershipLink];
                var locator = commonUtils.byXpath(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
         })
         .then("we should see message button $MessageButton", function(MessageButton) {
            var driver = this.driver;
            var data = applicationArea[MessageButton];
            var locator = commonUtils.byXpath(data);
            //commonUtils.waitForEnable(driver, locator);
            var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
            return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
         })
         .then("we should refresh page", function() {
            var driver = this.driver;
            return driver.reload();
         })		 

         .when("I click on icon $MessageButton", function (MessageButton) {
            var driver = this.driver;
            var data = applicationArea[MessageButton];
            var locator = commonUtils.byXpath(data);
            //return driver.sleep(1000).then(function() {
				//return commonUtils._findAndClick(driver, locator);//commonUtils.waitForEnableAndClick(driver, locator);
			//});
			var seq = new webdriver.ActionSequence(driver);
			return commonUtils._findElements(driver, locator).then(function(elements) {
				var element = elements[0];
				return seq.mouseMove(element).click().perform();
			});
         })
         .then("we should see message popup $SendMessagePopup", function(SendMessagePopup) {
                var driver = this.driver;
                var data = applicationArea[SendMessagePopup];
                var locator = commonUtils.byCss(data);
            return commonUtils.waitForEnable(driver, locator);
         })

         .when("I click send link $SendMessageLink", function (SendMessageLink) {
            var driver = this.driver;
            var data = applicationArea[SendMessageLink];
            var locator = commonUtils.byCss(data);
            //commonUtils.waitForEnableAndClick(driver, locator);
            var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
            return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
         })
         .then("we should see membership $MembershipLink", function(MembershipLink) {
                var driver = this.driver;
                var data = applicationArea[MembershipLink];
                var locator = commonUtils.byXpath(data);
				return commonUtils.waitForEnable(driver, locator).then(function(){
					return driver.sleep(100);
				});
         })

         .when("I click on assessment $AssessmentsLink", function (AssessmentsLink) {
                var driver = this.driver;
                var data = applicationArea[AssessmentsLink];
				//console.log('data..........   ',data);
				var locator = commonUtils.byCss(data);
				//console.log('locator......   ',locator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
				//return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
				return driver.sleep(1000).then(function() {
					/*return commonUtils._findElements(driver, locator).then(function(elements) {					
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});*/
					return commonUtils._findAndClick(driver, locator);
				});
								
         })
         /*.then("we should see assessment popup $AssessmentsPopup", function(AssessmentsPopup) {
            var driver = this.driver;
            var data = applicationArea[AssessmentsPopup];
            var locator = commonUtils.byCss(data);
            return commonUtils.waitForEnable(driver, locator);
         })*/

         .when("I click on message $MessageItem", function (MessageItem) {
                var driver = this.driver;
                var data = applicationArea[MessageItem];
                var locator = commonUtils.byXpath(data);
				//commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(){
					return commonUtils._findElements(driver, locator).then(function(elements) {					
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});
				});
				//return commonUtils.waitLocator(driver, locator).then(function(element) {

				//commonUtils._findAndClick(driver, locator);
         })
         .then("we should see view popup $SendMessagePopup", function(SendMessagePopup) {
                var driver = this.driver;
                var data = applicationArea[SendMessagePopup];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				return commonUtils._findElements(driver, locator);
         })
         .then("we should see $Subject = $value", function(Subject, value) {
                var driver = this.driver;
				//driver.sleep(500);
                var data = applicationArea[Subject];
                var locator = commonUtils.byXpath(data);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				element.getInnerHtml()
                                .then(function (text)
                                {
                                    innHtml = text.toLowerCase();
                                    var found = innHtml.indexOf(value .toLowerCase()) !== -1 ? true : false;
									return assert.equal(found, true);
                                });
            });
         })

         .when("I click icon $CloseMessageLink", function (CloseMessageLink) {
                var driver = this.driver;
                var data = applicationArea[CloseMessageLink];
                var locator = commonUtils.byCss(data);
            return commonUtils.waitForEnableAndClick(driver, locator);
            /*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
            commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
         })
         
         .given("It's time to refresh", function () {
            this.driver.navigate().refresh();
            /*quit().then(function () {
               console.log('bye-bye...');
            });*/
         })
         
         .given("It's time to reload driver with $url", function (url) {
            var driver = this.driver;
            driver.manage().deleteAllCookies();
            driver.quit();
			//driver.navigate().refresh();
            driver = new webdriver.Builder()
                .withCapabilities(webdriver.Capabilities.chrome())
                .build();
            this.driver = driver;
			var locator = url == 'url' ? this.environmentConfigData[url] + 'reader/#/' : url;
			console.log("locator.....     ",locator);			
            this.driver.get(locator);
            //console.log(Object.keys(library));
         })

         .when("I click on note mark $AnnotationMark $next time", function (AnnotationMark, next) {
                var driver = this.driver;
                var data = applicationArea[AnnotationMark];
				//console.log('data........',data);
                var locator = commonUtils.byCss(data);
				//console.log('locator........',locator);
				//return commonUtils._findAndClick(driver, locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
				/*return driver.sleep(500).then(function() {
					//return commonUtils.waitLocator(driver, locator).then(function(element) {*/
					////return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
					return commonUtils._findElements(driver, locator).then(function(elements) {	
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});
				//});
         })
         .then("We should see note popup $AnnotationPopup", function (AnnotationPopup) {
                var driver = this.driver;
                var data = applicationArea[AnnotationPopup];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacro(driver, locator, inputBlockerLocator);*/
         })

         .when("I click on delete link $DeleteNoteLink", function (DeleteNoteLink) {
                var driver = this.driver;
                var data = applicationArea[DeleteNoteLink];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
				//var seq = new webdriver.ActionSequence(driver);
				return commonUtils._findAndClick(driver, locator);
/*
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				   return seq.mouseMove(element).click().perform();
				});
*/
         })
         .then("We should see $BookContent content", function (BookContent) {
                var driver = this.driver;
                var data = applicationArea[BookContent];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
         })

         .when("I click on $next note mark in $AnnotationMarkList", function (next, AnnotationMarkList) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[AnnotationMarkList];
				var seq = new webdriver.ActionSequence(driver);
                var locator = commonUtils.byCss(data + ' > li:nth-child(' + next + ')');
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				   return seq.mouseMove(element).click().perform();
				});
				//return commonUtils.waitForEnableAndClick(driver, locator);
         })
         .then("We should see note popup $AnnotationPopup is displayed", function (AnnotationPopup) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[AnnotationPopup];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })
         .when("I click on note category link $NotesCategoryLink", function (NotesCategoryLink) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[NotesCategoryLink];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);//commonUtils.waitForEnableAndClick();
         })
         .then("We should see notes categories menu $NotesCategoryMenu", function (NotesCategoryMenu) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[NotesCategoryMenu];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })
         .when("I choose note category $item in $NotesCategoryMenuList", function (item, NotesCategoryMenuList) {
                var driver = this.driver;
				//driver.sleep(1000);
                var data = applicationArea[NotesCategoryMenuList];
				//console.log('data........',data);
                var locator = commonUtils.byCss(data + ' > li:nth-child(' + item + ') > i');
				//console.log('locator........',locator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
				   return seq.mouseMove(element).perform();
				});
				//return commonUtils.waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
         })
		 
         .when("I click link $StudyProjectsButton", function (StudyProjectsButton) {
                var driver = this.driver;
                var data = applicationArea[StudyProjectsButton];
                var locator = commonUtils.byXpath(data);
				//return commonUtils._findAndClick(driver, locator);
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				/*return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).perform();
				});*/
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);				
         })

         .when("I edit classroom $PencilButton", function (PencilButton) {
                var driver = this.driver;
                var data = applicationArea[PencilButton];
                var locator = commonUtils.byCss(data);
				//console.log('data...................', data);
				return commonUtils._findAndClick(driver, locator);
         })
         .then("we should see textbox $NameTextbox", function (NameTextbox) {
                var driver = this.driver;
                var data = applicationArea[NameTextbox];
                var locator = commonUtils.byCss(data);
				/*console.log('data...................', data);
				console.log('locator...................', locator);				*/
				return commonUtils._findElements(driver, locator);
         })
		 
            .when("user inputs info $value in $AnnotationBox", function (value, NameTextbox) {
				var driver = this.driver;
                var data = applicationArea[NameTextbox];
				var locator = commonUtils.byCss(data);
				//console.log('data...................', data);
				//console.log('locator...................', locator);
				//return driver.sleep(1000).then(function() {
					/*return commonUtils.waitForEnableAndClearValue(driver, locator).then(function() {
						return commonUtils.waitForEnableAndInputValue(driver, locator, value);
					});*/
					return commonUtils._findAndInput(driver, locator, value);
				//});
				
            })		 

         .when("I click done $DoneButton", function (DoneButton) {
                var driver = this.driver;
                var data = applicationArea[DoneButton];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);
         })
         .then("we should see text $TestText in $Area", function (TestText, Area) {
                var driver = this.driver;
                var data = applicationArea[Area];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndCompareValue(driver, locator, TestText);
				return commonUtils._findAndCompareValue(driver, locator, TestText);
         })
		 
         .when("I click next step $NextStepButton", function (NextStepButton) {
                var driver = this.driver;
                var data = applicationArea[NextStepButton];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);
         })	
         .then("we should see step $Publication", function (Publication) {
                var driver = this.driver;
                var data = applicationArea[Publication];
                var locator = commonUtils.byXpath(data);
				return commonUtils._findElements(driver, locator);
         })

         .when("user selects option $SamplePub", function (SamplePub) {
                var driver = this.driver;
                var data = applicationArea[SamplePub];
                var locator = commonUtils.byXpath(data);
				return commonUtils._findAndClick(driver, locator);
         })
         .then("Selected publication $SelectedPub contains $Name", function (SelectedPub, Name) {
				var driver = this.driver;
                var data = applicationArea[SelectedPub];
				var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnableAndCompareValue(driver, locator, Name);
				return commonUtils._findAndCompareInnerHtml(driver, locator, Name);
		})				
		 
         .when("user clicks button $AnyButton", function (AnyButton) {
                var driver = this.driver;
                var data = applicationArea[AnyButton];
				//console.log('-----data--------    ',data);
				var locator = commonUtils.byXpath(data);
				//driver.sleep(1000);
				/*if (AnyButton != 'NextReadingButton') {*/
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
					commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);*/
				return driver.sleep(1000).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).click().perform();
					});
				})
				/*}
				else {
					//driver.executeScript("window.scrollBy(0,document.body.scrollHeight)");
					return commonUtils.waitLocator(driver, locator).then(function(element) {
					   var seq = new webdriver.ActionSequence(driver);
					   return seq.scrollTo(element).click().perform();
					});
				}*/
				driver.switchTo().defaultContent();
				if (AnyButton == 'ConfirmationLetter') {
					driver.switchTo().frame('ifinbox');
				}
				//return commonUtils._findAndClick(driver, locator);
         })
         .then("Book $BookHeader is opened", function (BookHeader) {
                var driver = this.driver;
                var data = applicationArea[BookHeader];
                var locator = commonUtils.byXpath(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
         })
         .then("Popup $VocabularyAssessmentPopup is appeared", function (VocabularyAssessmentPopup) {
                var driver = this.driver;
                var data = applicationArea[VocabularyAssessmentPopup];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })
         .then("Library page $LibraryList is opened", function(LibraryList) {
                var driver = this.driver;
                var data = applicationArea[LibraryList];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
         })
         .then("Last book content $BookContent is visible", function (BookContent) {
                var data = applicationArea[BookContent];
				var locator = commonUtils.byCss(data);
				var mappingData = this.mappingData;
				var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
         })
 		 .then("$MyBooksLink is present in the list $MyBooksList", function(MyBooksLink, MyBooksList) {
                var driver = this.driver;
                var data = applicationArea[MyBooksList];
                var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator).then(function(elements) {
					data = '//a[text() = "' + MyBooksLink + '"]';
					locator = commonUtils.byXpath(data);
					return commonUtils._findElements(driver, locator);
				});
		 })
 		 .then("Calendar popup $CalendarPopup appears", function (CalendarPopup) {
                var driver = this.driver;
                var data = applicationArea[CalendarPopup];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
         })
 		 .then("Reading position $Position is visible", function (Position) {
                var driver = this.driver;
                var data = "//h2[text()='" + Position + "']";
				var locator = commonUtils.byXpath(data);
				return commonUtils.waitForVisible(driver, locator);
         })
		 
         .when("user selects answer $AnswerOption in $VocabularyAssessmentAnswerList", function (AnswerOption, VocabularyAssessmentAnswerList) {
                var driver = this.driver;
                var data = applicationArea[VocabularyAssessmentAnswerList] + AnswerOption;
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);
         })

         .when("I scroll to $SubParagraph", function (SubParagraph) {
                var driver = this.driver;
                var data = applicationArea[SubParagraph];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitForEnable(driver, locator);
				//return commonUtils._findElements(driver, locator).then(function(elements) {
					//var element = elements[0];
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.scrollTo(element).perform();
				});
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);*/ 				
         })
         .then("We should remember some AnchorText", function (AnchorText) {
                var driver = this.driver;
                var data = applicationArea[AnchorText];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator).then(function(element) {
					return element.getInnerHtml.then(function(text) {
						return text2Rem = text;
					});
				});
         }) 
	
			.when("user selects category $Category in $CategorySelector $CategoryList $strnum", function (Category, CategorySelector, CategoryList, strnum) {
					var driver = this.driver;
					var seartext = Category.toLowerCase();
					var mappingData = this.mappingData;
					var data = applicationArea[CategorySelector];
					var locator = commonUtils.byCss(data);
					//return commonUtils._findAndClick(driver, locator).then(function() {
					return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform().then(function() {						
						var data = applicationArea[CategoryList];
						var locator = commonUtils.byCss(data);
						return commonUtils._findElements(driver, locator).then(function(elements) {
							var datai = applicationArea[CategoryList] + ' > li:nth-of-type(' + strnum + ')';
							locator = commonUtils.byCss(datai);
							return commonUtils._findAndClick(driver, locator).then(function() {
								return true;//driver.sleep(1000);
							});
						});
					});
					});
			 })
				.then("books in $FilteredBookList are filtered by $Category", function (FilteredBookList, Category) {
					var driver = this.driver;
					var data = applicationArea[FilteredBookList] + ' > li';
					var seartext = Category.toLowerCase();
//					var datai = data + ' > li:nth-child(1) > div > div:nth-child(2) > div.clickable-block > ng-switch > p > a';
					var locator = commonUtils.byCss(data);
					return commonUtils._compareElements(driver, locator, _comparator, 'Incorrent filter by category');
					function _comparator(element) {
						return element.getInnerHtml().then(function(text) {
							return text.toLowerCase().indexOf(seartext) !== -1;
						});
					}
				})
				
			.when("user clicks on tab $RelatedTab", function (RelatedTab) {
                var driver = this.driver;
                var data = applicationArea[RelatedTab];
				//console.log('data.................',data);
                var locator = commonUtils.byCss(data);
				//console.log('locator.................',locator);
				//return commonUtils._findAndClick(driver, locator);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});
			})
			.then("related $RelatedStudyGuide are shown in the list", function (RelatedStudyGuide) {
                var driver = this.driver;
                var data = applicationArea[RelatedStudyGuide];
                var locator = commonUtils.byXpath(data);
				return commonUtils._compareElements(driver, locator);	//commonUtils.waitForEnable(driver, locator);
			})
			

			.when("user clicks on toolbar $BookToolbar", function (BookToolbar) {
                var driver = this.driver;
                var data = applicationArea[BookToolbar];
                var locator = commonUtils.byCss(data);
				//return commonUtils._findAndClick(driver, locator);
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					return seq.mouseMove(element).click().perform();
				});
			})
			.then("Popup $RecentlyOpenedPublicationsPopup is opened", function (RecentlyOpenedPublicationsPopup) {
                var driver = this.driver;
                var data = applicationArea[RecentlyOpenedPublicationsPopup];
                var locator = commonUtils.byCss(data);
				return commonUtils.waitForEnable(driver, locator);
			})
			.then("Book $Book is in the list", function (Book) {
                var driver = this.driver;
                var data = "//span[text() = '" + Book + "']";
                var locator = commonUtils.byXpath(data);
				return commonUtils.waitForEnable(driver, locator);
			})

			.given("Clear filter $FilterBox", function (FilterBox) {
                var driver = this.driver;
                var data = applicationArea[FilterBox];
                var locator = commonUtils.byCss(data);
				//return commonUtils.waitLocator(driver, locator).then(function(element) {
				//return driver.sleep(2000).then(function() {
				return commonUtils._findElements(driver, locator).then(function(elements) {
					var element = elements[0];
					return element.clear();
				});
				//});
			})
			
			.given("Go top $Top", function (Top) {
				var data = applicationArea[Top];
				var locator = commonUtils.byId(data);
				var driver = this.driver;
					return commonUtils._findElements(driver, locator).then(function(element) {
						var element = elements[0];
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).perform();
					});
            })
			
			.given("Go to position $Position", function (Position) {
				var data = "//h2[text()='" + Position + "']";
				var locator = commonUtils.byXpath(data);
				var driver = this.driver;
					return commonUtils.waitLocator(driver, locator).then(function(element) {
						var seq = new webdriver.ActionSequence(driver);
						return seq.mouseMove(element).perform();
					});
				//return commonUtils._findElements(driver, locator);
			})			
		

			.given("I click selector $HoursPerDay", function (HoursPerDay) {
                var driver = this.driver;
                var data = applicationArea[HoursPerDay];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);
			})

			.given("Shut down", function () {
				return this.driver.quit();			;
			})
			
			.given("Save window handle", function () {
				handle = this.driver.getWindowHandle();
				console.log('window handle...........         ',handle);
				return handle;
			})
			
			.given("Restore window handle", function () {
				return this.driver.switchTo().window(handle);
			})

			.given("Close current window", function () {
				return this.driver.close();
			})

			.given("Switch to last window", function () {
				var driver = this.driver;
				return driver.switchTo().window(driver.windowHandles.Last());
			})				

    return library;

})();
/* jshint ignore:end */