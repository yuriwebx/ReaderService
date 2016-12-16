/* jshint ignore:start */
require('jasmine-before-all');
var webdriver = require('selenium-webdriver');
var assert = require('assert');
var Yadda = require('yadda');

module.exports = (function () {

    var dictionary = new Yadda.Dictionary()
            .define('LOCALE', /(fr|es|ie)/)
            .define('NUM', /(\d+)/);

    var applicationArea, maxTimeout = 20000;

    function findCss(driver, data) {
		return driver.findElement(byCss(data));
	}
    function findXpath(driver, data) {
		return driver.findElement(byXpath(data));
	}
    function findId(driver, data) {
		return driver.findElement(byId(data));
	}
    function findName(driver, data) {
		return driver.findElement(byName(data));
	}

	function waitLocator(driver, locator) {
		return driver.wait(webdriver.until.elementLocated(locator), maxTimeout);
	}
	function findLocator(driver, locator) {
		return driver.findElement(locator);
	}
    var InputBlockerLocator = 'webdriver.By.css(this.mappingData.common.InputBlocker)';
    var OverlayLocator = 'webdriver.By.css(this.mappingData.common.Overlay)';

		function preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator) {
			driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
				return driver.findElements(locator).then(function (els) {
					//console.log('111111',els);
					if (!els.length) { 
						return; 
					} 
					var element = els[0]; 
					return driver.findElements(inputBlockerLocator).then(function (bls) {
						//console.log('222222',bls);
						if (!bls.length) {
							//console.log('333333',element);							
							return element; 
						} 
					}) 
				}); 
			}),maxTimeout).then(function (element) {
					//console.log('444444',element);				
					element.click(); 
					
					//console.log('555555','element.click()');
					return false;
					},
				function (arr) {
					//console.log('666666',arr);					
					var blocker = arr[0]; var element = arr[1];
					//console.log('777777',blocker);					
					driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
						element.click();
						//console.log('888888','element.click()');						
					}); 
				});			
		}
		function preventInputBlockerMacroAndInputValue(driver, locator, inputBlockerLocator, value) { 
			driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) { 
				return driver.findElements(locator).then(function (els) { 
					if (!els.length) { 
						return; 
					} 
					var element = els[0]; 
					return driver.findElements(inputBlockerLocator).then(function (bls) { 
						if (!bls.length) { 
							return element; 
						} 
					}) 
				}); 
			}),maxTimeout).then(function (element) {
				element.click(); 
			}, function (arr) { 
				var blocker = arr[0]; var element = arr[1]; 
				driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
					element.clear(); element.sendKeys(value); 
				}); 
			});
		}
		function preventInputBlockerMacro(driver, locator, inputBlockerLocator) {		
			driver.wait(new webdriver.until.Condition('element is located and not blocked', function (driver) {
				return driver.findElements(locator).then(function (els) {
					if (!els.length) {
						return; 
					} 
					var element = els[0]; 
					return driver.findElements(inputBlockerLocator).then(function (bls) {
						if (!bls.length) { 
							return element; 
						} 
					}) 
				}); 
			}),maxTimeout).then(function (element) {
				//element.click(); 
			}, function (arr) { 
				var blocker = arr[0]; var element = arr[1]; 
				driver.wait(webdriver.until.elementIsNotPresent(blocker), maxTimeout).then(function () {
					return element; 
				}); 
			});
		}

	function waitForEnableAndClick(driver, locator) {
		driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) { 
				if (found) { 
					element.click(); 
				} 
			}); 
		});		
	}
	function waitForEnable(driver, locator) {
		var el;
		//driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		waitLocator(driver, locator)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) {
				if (found) {
					el = element;
					//return element; 
				} 
			});
			//return element;
		});
		return el;
	}		
	function waitForEnableAndCompareValue(driver, locator, text) {
		//driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		waitLocator(driver, locator)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) { 
				if (found) { 
					element.getInnerHtml()
					.then(function (value) { 
						assert.equal(text, value); 
					}); 
				} 
			}); 
		});
	}	
	function waitForEnableAndCompareText(driver, locator, text) {
		//driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		waitLocator(driver, locator)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) {
				if (found) { 
					element.getText()
					.then(function (value) { 
						assert.equal(text, value); 
					}); 
				} 
			}); 
		});
	}	
	function waitForEnableAndClearValue(driver, locator) {	
		//driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		waitLocator(driver, locator)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) {
				if (found) {
					element.clear(); 
				} 
			}); 
		});
	}	
	function waitForEnableAndInputValue(driver, locator, value) {	
		//driver.wait(webdriver.until.elementLocated(locator), maxTimeout)
		waitLocator(driver, locator)
		.then(function (element) { 
			driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
			.then(function (found) {
				if (found) {
					element.sendKeys(value); 
				} 
			}); 
		});
	}	

    function byCss(data)
    {
        return webdriver.By.css(data);
    }
    function byXpath(data)
    {
        return webdriver.By.xpath(data);
    }
    function byId(data)
    {
        return webdriver.By.id(data);
    }
    function byName(data)
    {
        return webdriver.By.name(data);
    }

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
				//console.log('33333333333333');
                var driver = this.driver;
                link = (link == 'url' ? this.environmentConfigData[link] + 'reader/#/' : link + 'reader/#/');
				//console.log('444444444444');
                driver.get(link);
                driver.wait(webdriver.until.titleIs(link), maxTimeout);
				//console.log('55555555555555555');
            })
            .when("I click on Reader button $ReaderButton", function (ReaderButton) {
                this.driver.findElement(webdriver.By.css(this.mappingData.reader[ReaderButton])).click();
            })
            .then("Main page should have $titleName title", function (titleName) {
                var driver = this.driver;
                titleName = (titleName == 'url' ? this.environmentConfigData[titleName] + 'reader/#/' : titleName + 'reader/#/');
                /*driver.getTitle().then(function (title) {
                 //console.log('title='+title+' ='+titleName);
                 if (title !== titleName) {
                 throw new Error(
                 'Expected "' + titleName + '", but was "' + title + '"');
                 }
                 });*/
                driver.wait(webdriver.until.titleIs(titleName), maxTimeout);
                /*titleName = (titleName == 'url' ? this.environmentConfigData[titleName]+'reader/#/': titleName+'reader/#/');
                 driver.wait(function() {
                 return driver.getTitle().then(function(title) {
                 return title === titleName;
                 });
                 }, maxTimeout);*/
            })
            .then("And we should see login form $form", function (form) {
                var data = applicationArea[form];
                var driver = this.driver;
                var locator = byCss(data);
				waitForEnable(driver, locator);
            })

            .given("user is on the $link page", function (link) {
                var driver = this.driver;
                /*page = this.environmentConfigData['url'] + 'reader/#/' + link;
                driver.get(page);*/

                var titleName = this.environmentConfigData['url'] + 'reader/#/' + link;
                /*return driver.wait(function () {
                    return driver.getTitle().then(function (title) {
                        assert.equal(title, titleName);
                    });
                }, maxTimeout);*/
				driver.wait(webdriver.until.titleIs(titleName), maxTimeout);
            })			

            .given("Should be input $value into $place", function (value, place) {
                var data = applicationArea[place];
                var locator = byCss(data);//webdriver.By.css(this.mappingData.common[place]);//;
                var driver = this.driver;
				//driver.sleep(1000);
				waitForEnableAndClearValue(driver, locator);
				waitForEnableAndInputValue(driver, locator, value);
            })
            .then("Check $text existing in $place", function (text, place) {
				try {
					var data = applicationArea[place];
					var driver = this.driver;
					var locator = byCss(data);
					waitLocator(driver, locator)
					.then(function (element) { 
						driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
						.then(function (found) { 					
							element
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

            /*.when("I press Enter on $form", function (form) {
             var data = eval(applicationArea + '.' + form);
             eval(findCss).submit();
             })*/
            /*.when("I click on login $LoginButton", function(LoginButton) {
             var data = eval(applicationArea+'.'+LoginButton);
             eval(findCss).click();
             })*/
            .when("I press login button $LoginButton", function (LoginButton) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[LoginButton])).click();
				var data = applicationArea[LoginButton];
				var driver = this.driver;
				var locator = byCss(data);
				//waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
				var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element).click().perform();
				});				
            })
            .then("We should see filter box $filter", function (filter) {
                var data = applicationArea[filter];
                var driver = this.driver;
                var locator = byCss(data);
				waitForEnable(driver, locator);
            })
			.then("We should see list $BookList", function (BookList) {
                var data = applicationArea[BookList];
                var driver = this.driver;
                var locator = byCss(data);
				waitForEnable(driver, locator);
            })
            .then("Reader layout $ReaderLayout is present", function (ReaderLayout) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.reader[ReaderLayout]));
				var driver = this.driver;
				//driver.sleep(1000);
				var data = applicationArea[ReaderLayout];
				var locator = byCss(data);
				//waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })
            .then("we should see assessment $AssessmentsLink", function (AssessmentsLink) {
				var applicationArea = this.mappingData.reader;
                var data = applicationArea[AssessmentsLink];
                var driver = this.driver;
                var locator = byCss(data);
				waitForEnable(driver, locator);
            })			
			

            /*.when("I click out of alert $OutOfAlert", function (OutOfAlert) {
                //this.driver.sleep(1000);
                var data = eval(applicationArea + '.' + OutOfAlert);
                //eval(findCss).click();
				//findCss(this.driver, data).click();
				var driver = this.driver;
				var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
            })
            .then("We should see list $BookList", function (BookList) {
                var data = applicationArea[BookList];
                var driver = this.driver;
                var locator = byCss(data);
				waitForEnable(driver, locator);
            })*/

//Scenario: Open book
            .given("I introduce $bookName in $filter", function (bookName, filter) {
				//this.driver.sleep(1000);
                var data = applicationArea[filter];
                var driver = this.driver;
                var locator = byCss(data);
                var value = applicationArea[bookName].toString();
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//preventInputBlockerMacroAndInputValue(driver, locator, inputBlockerLocator, value);
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
				waitForEnableAndInputValue(driver, locator, value);
            })
            .then("We should see filter has matching $SeekingBook", function (SeekingBook) {
                var data = applicationArea[SeekingBook];
                var driver = this.driver;
                var locator = byXpath(data);
				waitForEnable(driver, locator);
				//console.log('We should see filter has matching $SeekingBook');
            })
            .when("I open book $bookName", function (bookName) {
                var data = applicationArea[bookName];
                var driver = this.driver;
                var locator = byXpath(data);
				waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					//console.log('I open book $bookName');
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
            .then("We should see $book view", function (book) {
                var driver = this.driver;
                var data = applicationArea[book];
                var locator = byCss(data);
//				waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })

            .when("I click on read button $button", function (button) {
                var data = applicationArea[button];
				var locator = byCss(data);
				waitForEnableAndClick(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);*/
            })
            .then("Book content $content is opening", function (content) {
                var data = applicationArea[content];
				var driver = this.driver;
				var locator = byCss(data);
				//waitLocator(driver, locator);
				//waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })
            .then("we should see quiz $Quiz", function (Quiz) {
                var data = applicationArea.Quiz;
				var driver = this.driver;
				var locator = byXpath(data);
				waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })			

			.when("I hover on $ToolbarWrapper", function (ToolbarWrapper) {
                var data = applicationArea[ToolbarWrapper];
                var driver = this.driver;
                var locator = byCss(data);				
				var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element).perform();
				});
				//waitForEnable(driver, locator);
            })
	        .then("we should see toolbar $ToolbarWrapper", function (ToolbarWrapper) {
				var driver = this.driver;
				//driver.sleep(500);
                var data = applicationArea[ToolbarWrapper];
                var locator = byCss(data);
				//waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);
				//driver.sleep(500);
            })					
	        .then("We should see reader mode $ReaderModeLink", function (ReaderModeLink) {
                var data = applicationArea[ReaderModeLink];
                var locator = byCss(data);
				waitForEnable(this.driver, locator);
            })		

			
			
//Scenario: Test reader mode settings
            .when("I click on reader mode $settings", function (settings) {
                var data = applicationArea[settings];
                var driver = this.driver;
				//driver.sleep(500);
                var locator = byCss(data);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
				var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element).click().perform();
				});				
				//waitForEnableAndClick(driver, locator);
				/*waitLocator(driver, locator).then(function(element) {
					element.click();
				});*/
            })
            .then("We should see settings popup $popup", function (popup) {
                var data = applicationArea[popup];
                var locator = byId(data);
				waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);*/
            })

            .when("Select font $font", function (font) {
                var data = applicationArea[font];
                var locator = byCss(data);
				waitForEnableAndClick(this.driver, locator);
            })
            .then("Check style $style contains $font", function (style, font) {
                var shr = eval(applicationArea + '.' + font);
                var data = eval(applicationArea + '.' + style);
				var locator = byXpath(data);
				waitLocator(driver, locator).then(function(found) {
					found
                        .getInnerHtml()
                        .then(function (value)
                        {
                            assert.ok(value.indexOf(shr) !== -1);
                        });
				});
            })

            .when("I select $fontSizeChange $fontSizeChangeButton", function (fontSizeChange, fontSizeChangeButton) {
                var data = applicationArea[fontSizeChangeButton];
				var locator = byCss(data);
				waitForEnableAndClick(this.driver, locator);
            })

            .then("Style $changed has font size $size", function (changed, size) {
                var razm = eval(applicationArea + '.' + size);//this.mappingData.common[size];
                var data = eval(applicationArea + '.' + changed);
                var locator = byXpath(data);
				waitLocator(this.driver, locator).then(function(found) {
					found
                        .getInnerHtml()
                        .then(function (value)
                        {
                            assert.ok(value.indexOf(razm) !== -1);
                        });
				});
            })

            .when("I click on theme button $theme", function (theme) {
                var data = applicationArea[theme];
				var locator = byCss(data);
				waitForEnableAndClick(this.driver, locator);
            })
            .then("The body is affected by $theme", function (theme) {
                var data = applicationArea[theme];
				var locator = byId(data);
				waitForEnable(this.driver, locator);
            })

            .when("I click out of popup $outof", function (outof) {
                var data = applicationArea[outof];
                var driver = this.driver;
                var locator = byCss(data);
				/*var seq = new webdriver.ActionSequence(driver);
				var element = findLocator(driver, locator);
				seq.mouseMove(element, -900, -700).click().perform();*/
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
            .then("We should close popup and see $content", function (content) {
                var data = applicationArea[content];
                var locator = byCss(data);//byId(data);
				//waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);
            })

			.when("I click out of info $outof", function (outof) {
                //var data = applicationArea[outof];
                var driver = this.driver;
                var locator = webdriver.By.css(this.mappingData.reader[outof]);//byCss(data);
				//waitForEnableAndClick(driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				waitForEnable(driver, locator);
				waitLocator(driver, locator).then(function(element) {
					//var element = findLocator(driver, locator);
					seq.mouseMove(element, 50, 50).click().perform();
					//seq.mouseDown(element).mouseMove(element, -750, -100).mouseUp().perform();
				});
				//driver.sleep(1000);
            })
			.then("We should close info and see $content", function (content) {
                //var data = applicationArea[content];
                var locator = webdriver.By.css(this.mappingData.reader[content]);//byId(data);
				waitForEnable(this.driver, locator);
            })			

//Scenario: Test Book Extra button
            .when("I click button book extra $BookExtra", function (BookExtra) {
                var data = applicationArea[BookExtra];
				var locator = byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);
				//waitForEnableAndClick(this.driver, locator);
            })
            .then("Menu $menu is displayed", function (menu) {
                var data = applicationArea[menu];
				var locator = byCss(data);
				//waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);
            })
            .then("Popup $ExtraPopup is displayed", function (ExtraPopup) {
                var data = applicationArea[ExtraPopup];
				var locator = byCss(data);
				//waitLocator(this.driver, locator);
				waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })			
            .then("And we should see $extraMenuItem button $extraMenuButton", function (extraMenuItem, extraMenuButton) {
                var data = applicationArea[extraMenuButton];
				var locator = byCss(data);
				//waitLocator(this.driver, locator);
				waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })

//Scenario: Test Info button
            .when("I click on Info button $InfoButton", function (InfoButton) {
                var data = applicationArea[InfoButton];
                var driver = this.driver;
                var locator = byCss(data);
				/*waitLocator(driver, locator)
				.then(function (found) {
                    found.click();
                });*/
				waitForEnableAndClick(driver, locator);
            })
            .then("We should see book cover image $image", function (image) {
                var data = applicationArea[image];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
            .then("And we should see full title $titleClass", function (titleClass) {
                var data = applicationArea[titleClass];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
            .then("And we should see author $author", function (author) {
                var data = applicationArea[author];
                var locator = byCss(data);
				waitForEnable(this.driver, locator);
            })
            .then("We should see table of content $TableOfContent", function (TableOfContent) {
                var data = applicationArea[TableOfContent];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
			})

//Scenario: Test table of content
            .when("I select $item of content", function (item) {
                var data = applicationArea[item];
                var driver = this.driver;
                var locator = byXpath(data);
                waitForEnableAndClick(driver, locator);
            })
            .then("We should see the $name matching selected $item", function (name, item) {
                var obj1;
                var data = applicationArea[name];
				var locator = byXpath(data);
				var driver = this.driver;
				waitLocator(driver, locator)
				.then(function (element) { 
					driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
					.then(function(found) {
						element
							//.getAttribute('text')
							.getText()
							.then(function (text)
							{
								obj1 = text;
							});
					})
				});
                data = applicationArea[item];
                locator = byXpath(data);
				waitLocator(driver, locator)
				.then(function (element) { 
					driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)				
					.then(function(found) {
						element
                        //.getAttribute('text')
						.getText()
                        .then(function (text)
                        {
                            var u = assert.equal(obj1, text);
                        });
					})
				});
            })

//Scenario: Test Bookmarks button
            .when("I click on $Bookmarks button $BookmarksButton", function (Bookmarks, BookmarksButton) {
                var data = applicationArea[BookmarksButton];
				var locator = byCss(data);
				waitForEnableAndClick(this.driver, locator);
            })
            .then("We should see quick filter textbox $filter", function (filter) {
                var data = applicationArea[filter];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
            .then("And we should see categories combobox $combobox", function (combobox) {
                var data = applicationArea[combobox];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);*/
            })
            .then("And we should see $Bookmarks list $list", function (Bookmarks, list) {
                var data = applicationArea[list];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);				
            })

//Scenario: Test bookmark filter
            .when("I click on categories combobox $combobox", function (combobox) {
                var data = applicationArea[combobox];
                var locator = byCss(data);
                var driver = this.driver;
				waitLocator(driver, locator)
				.then(function (found) {
                    found.click();
                });
            })
            .then("We should see $category item", function (category) {
                var data = applicationArea[category];
                var locator = byCss(data);
                var driver = this.driver;
				waitLocator(driver, locator);
            })

            .when("I click $category item", function (category) {
                var data = applicationArea[category];
				var locator = byCss(data);
				waitForEnableAndClick(this.driver, locator);				
            })
            .then("$item $bookmarks are displaying in list", function (item, bookmarks) {
                var data = applicationArea[item];
                var locator = byCss(data);
                var driver = this.driver;
				//waitLocator(driver, locator);
				waitForEnable(driver, locator);
            })

//Scenario: Test bookmark list
            .when("I click on a $type $item", function (type, item) {
                var driver = this.driver;
                var data = applicationArea[item];
                var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
            })
            .then("We should see $bookmarked text on reader page $place", function (bookmarked, place) {
                var marked;
				var driver = this.driver;
                var data = applicationArea[bookmarked];
				var locator = byCss(data);
				waitLocator(driver, locator).then(function(found) {
					found
                        //.getAttribute('text')
						.getText()
                        .then(function (text)
                        {
                            marked = text;
                        });
				});
                var data = applicationArea[place];
				var locator = byXpath(data);
				waitLocator(driver, locator).then(function(found) {
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
				driver.sleep(1000);
                var data = applicationArea[menu];
                var locator = byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
				//waitForEnableAndClick(driver, locator);
            })
            .then("We should see logout $button", function (button) {
                var data = applicationArea[button];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
            })
            .then("We should see item $FlashcardsItem", function (FlashcardsItem) {
                var data = applicationArea[FlashcardsItem];
				//console.log('data.........',data);
				var locator = byCss(data);
				//waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);
            })			
			
            .when("I click logout $button", function (button) {
                var data = applicationArea[button];
				var locator = byCss(data);
				waitForEnableAndClick(this.driver, locator);
            })
            .then("We log out", function () {

            })
			
            .when("I click item $FlashcardsItem", function (FlashcardsItem) {
                var data = applicationArea[FlashcardsItem];
				//console.log('data.........',data);
				var locator = byCss(data);
				//waitForEnableAndClick(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);
				//this.driver.sleep(500);
            })
            .then("We should see test word $TestWord", function (TestWord) {
				//this.driver.sleep(1000);
                var data = applicationArea[TestWord];
				//console.log('data.........',data);
				var locator = byXpath(data);
				//console.log('locator.........',locator);
				waitForEnable(this.driver, locator);/*.then(function(element) {
					element.getInnerHtml().then(function(text) {
						console.log(text);
					});
				});*/
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);
				//this.driver.sleep(500);
            })
            .then("Book content $BookContent is visible", function (BookContent) {
                var data = applicationArea[BookContent];
				var locator = byCss(data);
				waitForEnable(this.driver, locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//preventInputBlockerMacro(this.driver, locator, inputBlockerLocator);
            })			

//Scenario: Test full text search
            .when("I click on search icon $SearchIcon", function (SearchIcon) {
				var driver = this.driver;
                var data = applicationArea[SearchIcon];
                var locator = byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);            
			})
            .then("We should see search popup $SearchPopup", function (SearchPopup) {
                //this.driver.findElement(webdriver.By.id(this.mappingData.common[SearchPopup]));
                var data = applicationArea[SearchPopup];
				var locator = byId(data);
				waitLocator(this.driver, locator);
                //findId(this.driver, data);
            })

            .given("I input $SearchingText into search box $SearchTextField", function (SearchingText, SearchTextField) {
                var data = applicationArea[SearchTextField];
                var driver = this.driver;
                var locator = byCss(data);
                var search = applicationArea[SearchingText];
                //eval(waitLocator)
				waitLocator(driver, locator)
				.then(function (found) {
                    found.clear();
                    found.sendKeys(search);
                });
            })
            .when("I click on search text icon $SearchTextIcon", function (SearchTextIcon) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[SearchTextIcon])).click();
                var data = applicationArea[SearchTextIcon];
                findCss(this.driver, data).click();
            })
            /*	.then("We should see search result $SearchResult1 contains $SearchingText", function(SearchResult1, SearchingText) {
             return (this.driver.findElement(webdriver.By.css(this.mappingData.common[SearchResult1])) === this.mappingData.common[SearchingText]);
             })*/
            .then("We should see $some search $result", function (some, result) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[result]));
				var data = applicationArea[result];
                var driver = this.driver;
                var locator = byCss(data);
				waitForEnable(driver, locator);
            })
            .then("We should see searching books list $list", function (list) {
                var data = applicationArea[list];
				var locator = byCss(data);
				waitLocator(this.driver, locator);
            })
            .then("Search results number = $SearchResultsNumber", function (SearchResultsNumber) {
                var data = applicationArea[SearchResultsNumber];
                /*findCss(this.driver, data).getInnerHtml()
                        .then(function (value) {
                            //console.log('SearchResultsNumber = ', value);
                        });*/
				var locator = byId(data);
				waitForEnable(this.driver, locator);
            })			
            .then("First book is $FirstBook", function (FirstBook) {
                var data = eval(applicationArea + '.' + FirstBook);
                findCss(this.driver, data)
                        .getInnerHtml()
                        .then(function (value)
                        {
                            console.log(value);
                            assert.ok(value == 'The General Theory of Employment, Interest, and Money Project Gutenberg Australia (1)');
                        });
            })
            .then("We should see search result $SearchResult contains $SearchingText", function (SearchResult, SearchingText) {
                var found = true;
                var i = 1;
                while (found) {
					var locator = byCss(this.mappingData.common[SearchResult] + ' > li:nth-child(' + i + ') > p > span > strong:nth-child(1)');
                    //found = this.driver.findElement(webdriver.By.css(this.mappingData.common[SearchResult] + ' > li:nth-child(' + i + ') > p > span > strong:nth-child(1)'));
					//found = waitForEnable(this.driver, locator);
                    //console.log(i + '   ' + found + '   ' + this.mappingData.common[SearchingText]);
					var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
					found = preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);
                    i++;
                }
                return found;
            })
			
            .given("I introduce $SearchingText into search box $SearchTextField", function (SearchingText, SearchTextField) {
                var data = applicationArea[SearchTextField];
                var driver = this.driver;
                var locator = byCss(data);
				waitLocator(driver, locator)
				.then(function (found) {
                    found.clear();
                    found.sendKeys(SearchingText);
                });
            })			
            .then("we should see $ResultBook $Name with $ResultsNumber equals $Number", function (ResultBook, Name, ResultsNumber, Number) {
                var data = applicationArea.ResultBook;
				//console.log('--------------  ',data);
				var locator = byXpath(data);
				//console.log('+++++++++++++  ',locator);
				waitLocator(this.driver, locator).then(function(element) {
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
				locator = byXpath(data);
				//console.log('+++++++++++++  ',locator);
				waitLocator(this.driver, locator).then(function(element) {
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
				var locator = byCss(data);
				//console.log('+++++++++++++  ',locator);
				waitForEnableAndClick(this.driver, locator);
			})
            .then("Focus leaves search box", function() {
				
			})				
			
			.when("I click on result book $ResultBookItem", function (ResultBookItem) {
				var data = applicationArea[ResultBookItem];
				//console.log('--------------  ',data);
				var locator = byXpath(data);
				//console.log('+++++++++++++  ',locator);
				waitForEnableAndClick(this.driver, locator);
			})
            .then("We should see search paragraph $SearchParagraph contains $SearchingText", function (SearchParagraph, SearchingText) {
                var data = applicationArea[SearchParagraph];
				//console.log('--------------  ',data);
				var locator = byCss(data);
				//console.log('+++++++++++++  ',locator);
				waitLocator(this.driver, locator).then(function(element) {
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
				var locator = byCss(data);
				//console.log('+++++++++++++  ',locator);
				waitForEnableAndClick(this.driver, locator);
			})			

			.when("I click out of search $OutOfSearch", function (OutOfSearch) {
				try {
					//return this.driver.findElement(webdriver.By.css(this.mappingData.common[OutOfSearch])).click();
					//this.driver.close();
					var driver = this.driver;
					var data = applicationArea[OutOfSearch];
					var locator = byCss(data);
					//eval(waitForEnableAndClick);
					////waitForEnableAndClick(driver, locator);
					//eval(preventInputBlockerMacroAndClick);
					//preventInputBlockerMacroAndClick(driver, locator, eval(InputBlockerLocator));
					var seq = new webdriver.ActionSequence(driver);
					waitLocator(driver, locator).then(function(element) {
						seq.mouseMove(element, 0, 0).click().perform();
					});
				} catch (err) {
                     console.log(err.stack || String(err));
                }
            })
            .then("We should see search is closed", function () {

            })
			
			.given("$BookHeader $Book is open", function (BookHeader, Book) {
				this.driver.switchTo().frame(0);
                var data = applicationArea.BookHeader;
				//console.log('--------------  ',data);
				var locator = byCss(data);
				//console.log('+++++++++++++  ',locator);
				waitLocator(this.driver, locator).then(function(element) {
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
				var locator = byId(data);
				//console.log('+++++++++++++  ',locator);
				waitLocator(this.driver, locator).then(function(element) {
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
                var locator = byCss(data);
				//console.log('locator ++++++++++     ',locator);				
				waitForEnableAndClick(driver, locator);
            })
            .then("We should see result $SnippetList contains $SearchingText", function (SnippetList, SearchingText) {
                var seartext = this.mappingData.common[SearchingText].toLowerCase();
                var occtext, found = false;
                var i = 1;
                var innHtml = '!empty';
				var driver = this.driver;
				driver.sleep(1000);
                while (innHtml !== '' && innHtml !== null && innHtml !== undefined) {
                    try {
                        innHtml = '';
                        /* jshint ignore:start */
						var data = this.mappingData.common.SnippetList + ' > li:nth-child(' + i + ') > p > span > span > strong';
						var locator = byCss(data);
                        //occtext = this.driver.findElement(webdriver.By.css(this.mappingData.common[SnippetList] + ' > li:nth-child(' + i + ') > p > span > strong'))
						//console.log('locator ++++++++++     ',locator);
						waitLocator(driver, locator).then(function(element) {
								
								//console.log('element ----------     ',element);
								driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
								.then(function (isEnabled) {
									if (isEnabled) { 
										element
										.getText()
										.then(function (text)
										{
											innHtml = text.toLowerCase();
											found = innHtml.indexOf(seartext) !== -1 ? true : false;
											//console.log('text &&&&&&&&&&     ',text);
										})
									} 
								});
							
							/*element
                                .getText()
                                .then(function (text)
                                {
                                    innHtml = text.toLowerCase();
                                    //return assert.equal(innHtml, seartext) ? true : innHtml.indexOf(seartext) !== -1 ? true : false;
                                    found = innHtml.indexOf(seartext) !== -1 ? true : false;
                                    //console.log(i++, innHtml);
                                })*/
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

            .when("user clicks on link $socialLink", function (socialLink) {
                //this.driver.findElement(webdriver.By.id(this.mappingData.reader[socialLink])).click();
				var driver = this.driver;
				//driver.sleep(1000);
				var data = applicationArea[socialLink];
				var locator = byId(data);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				found = preventInputBlockerMacroAndClick(this.driver, locator, inputBlockerLocator);				
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
				var locator = byCss(data);
				waitForEnable(driver, locator);
            })*/
			
            .when("user selects snippet from $Point1 to $Point2", function (Point1, Point2) {
				var driver = this.driver;
                var data = applicationArea[Point1];
				var locator = byCss(data);
				//waitLocator(driver, locator);
				waitForEnable(driver, locator);
				var element1 = findLocator(driver, locator);
                data = applicationArea[Point2];
				locator = byCss(data);
				//waitLocator(driver, locator);
				waitForEnable(driver, locator);
				var element2 = findLocator(driver, locator);
                var seq1 = new webdriver.ActionSequence(driver);
                var seq2 = new webdriver.ActionSequence(driver);
                var seq3 = new webdriver.ActionSequence(driver);
                seq1.mouseDown(element1).mouseMove(element1).perform();
                seq2.mouseMove(element2).perform();
                seq3.mouseUp().perform();
            })
            .then("we should see context menu $ContextMenu", function (ContextMenu) {
                var driver = this.driver;
                var data = applicationArea[ContextMenu];
                var locator = byCss(data);
				waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })		
			
            .when("user clicks note button $NoteButton", function (NoteButton) {
				var driver = this.driver;
				var data = applicationArea.NoteButton;
				//console.log('data...................', data);
				var locator = byCss(data);
				//console.log('locator...................', locator);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
			.then("we should see annotation popup $AnnotationPopup", function (AnnotationPopup) {
                var driver = this.driver;
                var data = applicationArea[AnnotationPopup];
                var locator = byCss(data);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);*/
				waitForEnable(driver, locator);
            })
			
            .when("user inputs text $value in $AnnotationBox", function (value, AnnotationBox) {
                var data = applicationArea[AnnotationBox];
				var locator = byCss(data);
				waitForEnableAndClearValue(this.driver, locator);
				waitForEnableAndInputValue(this.driver, locator, value);
            })
			
            .when("user selects type $Type in $AnnotationTypeSelector $AnnotationTypeList as $item item", function (Type, AnnotationTypeSelector, AnnotationTypeList, item) {
                var driver = this.driver;
                var data = applicationArea[AnnotationTypeSelector];
                var locator = byCss(data);
                waitLocator(driver, locator).then(function (found) {
                    found.click();
                });
                data = applicationArea[AnnotationTypeList] + "> li:nth-child(" + item + ")";
                locator = byCss(data);
                waitLocator(driver, locator).then(function (found) {
                    found.click();
                });
            })

            .when("user clicks out of note block $OutOfAnnotationPopup", function (OutOfAnnotationPopup) {
                var driver = this.driver;
                var data = applicationArea[OutOfAnnotationPopup];
                var locator = byCss(data);
				var seq = new webdriver.ActionSequence(driver);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element, 0 , 0).click().perform();
				});
				//waitForEnableAndClick(driver, locator);
				//var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				//preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
            })
			.then("We should see reduced list $MarginNotesListReduced", function (MarginNotesListReduced) {
                var driver = this.driver;
                var data = applicationArea[MarginNotesListReduced];
                var locator = byCss(data);
				//waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })						
			
            .when("I click on margin notes button $ExpandedMarginNotes", function (ExpandedMarginNotes) {
                var driver = this.driver;
                var data = applicationArea[ExpandedMarginNotes];
                var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
            })
			.then("we should see note $text in $MarginNote", function (text, MarginNote) {
                var driver = this.driver;
                var data = applicationArea[MarginNote];
				//console.log('data..........',data);
                var locator = byXpath(data);
				//console.log('locator..........',locator);
				waitForEnableAndCompareValue(driver, locator, text);
            })

            .when("I click on card $Quiz", function (Quiz) {
                var data = applicationArea[Quiz];
				//console.log('data..........',data);
				var driver = this.driver;
				var locator = byXpath(data);
				//console.log('locator..........',locator);
				waitForEnable(driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element).click().perform();
				});
			})
			.then("we should see answer list $AnswerList", function (AnswerList) {
                var driver = this.driver;
                var data = applicationArea[AnswerList];
                var locator = byCss(data);
				waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);				
            })
			
            .when("I click on correct $CorrectLink in $AnswerList", function (CorrectLink, AnswerList) {
                var data = applicationArea.AnswerList;
				var driver = this.driver;
                var found = false;
                var i = 1;
                while (!found && i < 5) {
					var locator = byCss(data + ' > li:nth-child(' + i + ')');
					//console.log('locator......... ',locator);
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
					preventInputBlockerMacro(driver, locator, inputBlockerLocator);*/					
					waitLocator(driver, locator)
					.then(function(element) {
						driver.wait(webdriver.until.elementIsEnabled(element), maxTimeout)
						.then(function (isEnabled) {
							if (isEnabled) {
								element.getInnerHtml().then(function(text) {
									//console.log('text......... ',text.trim());
									if (text.trim() === CorrectLink) {
										//element.click();
										var seq = new webdriver.ActionSequence(driver);
										seq.mouseMove(element).click().perform();
										found = true;
									}
									//return found;							
								});
							}
						//return found;
						});
					});
                    i++;
                }
                //return found;
			})
			.then("we should see result $ExerciseIsDone", function (ExerciseIsDone) {
                var driver = this.driver;
                var data = applicationArea[ExerciseIsDone];
                var locator = byXpath(data);
				waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
            })

            .when("I click on close $CloseExercise", function (CloseExercise) {
                var driver = this.driver;
                var data = applicationArea[CloseExercise];
                var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
            })
			.then("It is closing", function() {
				
			})

            .when("I click next $NextButton", function (NextButton) {
                var driver = this.driver;
                var data = applicationArea[NextButton];
                var locator = byId(data);
				waitForEnableAndClick(driver, locator);
            })
			.then("Google login screen appears", function() {
				
			})

            .when("I select word $Point", function (Point) {
                var driver = this.driver;
				//driver.sleep(2000);
                var data = applicationArea[Point];
                var locator = byCss(data);
				//waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
				var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseDown(element).mouseMove(element).mouseUp().perform();
				});				
            })
            /*.when("user selects snippet from $Point1 to $Point2", function (Point1, Point2) {
				var driver = this.driver;
                var data = applicationArea[Point1];
				var locator = byCss(data);
				waitLocator(driver, locator);
				var element1 = findLocator(driver, locator);
                data = applicationArea[Point2];
				locator = byCss(data);
				waitLocator(driver, locator);
				var element2 = findLocator(driver, locator);
                var seq1 = new webdriver.ActionSequence(driver);
                var seq2 = new webdriver.ActionSequence(driver);
                var seq3 = new webdriver.ActionSequence(driver);
                seq1.mouseDown(element1).mouseMove(element1).perform();
                seq2.mouseMove(element2).perform();
                seq3.mouseUp().perform();
            })*/			
			.then("we should see button $LookupButton", function(LookupButton) {
                var driver = this.driver;
				//driver.sleep(2000);
                var data = applicationArea[LookupButton];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})

            .when("I click on lookup $LookupButton", function (LookupButton) {
                var driver = this.driver;
                var data = applicationArea[LookupButton];
                var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
			})
			.then("we should see link $AddToFlashcardLink", function(AddToFlashcardLink) {
                var driver = this.driver;
                var data = applicationArea[AddToFlashcardLink];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})

            .when("I click on link $AddToFlashcardLink", function (AddToFlashcardLink) {
                var driver = this.driver;
                var data = applicationArea[AddToFlashcardLink];
                var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
			})
			.then("We should see label $InFlashcard", function(InFlashcard) {
                var driver = this.driver;
                var data = applicationArea[InFlashcard];
                var locator = byXpath(data);
				waitForEnable(driver, locator);
			})

            .when("I click button library $LibraryButton", function (LibraryButton) {
                var driver = this.driver;
                var data = applicationArea[LibraryButton];
                var locator = byCss(data);
				waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
				/*var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element).click().perform();
				});*/
			})
			.then("Library list $LibraryList is displayed", function(LibraryList) {
                var driver = this.driver;
                var data = applicationArea[LibraryList];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})

            .when("I click on cover of book $BookCover", function (BookCover) {
                var driver = this.driver;
                var data = applicationArea[BookCover];
				//console.log('data..........   ',data);
                var locator = byXpath(data);
				//console.log('locator......   ',locator);
				waitForEnableAndClick(driver, locator);
				/*var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseDown(element).mouseMove(element).mouseUp().perform();
				});*/
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
			})
			.then("We should see popup $BookInfoPopup", function(BookInfoPopup) {
                var driver = this.driver;
                var data = applicationArea[BookInfoPopup];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})			

            .when("I click on button $BeginStudyButton", function (BeginStudyButton) {
                var driver = this.driver;
                var data = applicationArea[BeginStudyButton];
                var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
			})
			.then("we should see classroom link $ClassroomLink", function(ClassroomLink) {
                var driver = this.driver;
                var data = applicationArea[ClassroomLink];
                var locator = byXpath(data);
				waitForEnable(driver, locator);
			})
			
            .when("I click on invite button $InviteStudents", function (InviteStudents) {
                var driver = this.driver;
                var data = applicationArea[InviteStudents];
                var locator = byCss(data);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
			})
			.then("we should see invite popup $InvitePopup", function(InvitePopup) {
                var driver = this.driver;
                var data = applicationArea[InvitePopup];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})

            .when("I click on invite $InviteUserButton", function (InviteUserButton) {
                var driver = this.driver;
                var data = applicationArea[InviteUserButton];
                var locator = byXpath(data);
				//waitForEnableAndClick(driver, locator);
				var seq = new webdriver.ActionSequence(driver);
				waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element).click().perform();
				});
			})
			.then("we should see invited $InvitedLink", function(InvitedLink) {
                var driver = this.driver;
                var data = applicationArea[InvitedLink];
                var locator = byXpath(data);
				waitForEnable(driver, locator);
			})

            .when("I click $CloseInvitePopup invite popup", function (CloseInvitePopup) {
                var driver = this.driver;
                var data = applicationArea[CloseInvitePopup];
                var locator = byXpath(data);
				waitForEnableAndClick(driver, locator);
			})

            .when("I click on membership $MembershipLink", function (MembershipLink) {
                var driver = this.driver;
                var data = applicationArea[MembershipLink];
                var locator = byXpath(data);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
			})
			.then("we should see message button $MessageButton", function(MessageButton) {
                var driver = this.driver;
                var data = applicationArea[MessageButton];
                var locator = byXpath(data);
				//waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacro(driver, locator, inputBlockerLocator);
			})

            .when("I click on message button $MessageButton", function (MessageButton) {
                var driver = this.driver;
                var data = applicationArea[MessageButton];
                var locator = byXpath(data);
				waitForEnableAndClick(driver, locator);
			})
			.then("we should see message popup $SendMessagePopup", function(SendMessagePopup) {
                var driver = this.driver;
                var data = applicationArea[SendMessagePopup];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})

            .when("I click send link $SendMessageLink", function (SendMessageLink) {
                var driver = this.driver;
                var data = applicationArea[SendMessageLink];
                var locator = byCss(data);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
			})
			.then("we should see membership $MembershipLink", function(MembershipLink) {
                var driver = this.driver;
                var data = applicationArea[MembershipLink];
                var locator = byXpath(data);
				waitForEnable(driver, locator);
			})

            .when("I click on assessment $AssessmentsLink", function (AssessmentsLink) {
                var driver = this.driver;
                var data = applicationArea[AssessmentsLink];
				//console.log('data..........   ',data);
                var locator = byCss(data);
				//console.log('locator......   ',locator);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
			})
			.then("we should see assessment popup $AssessmentsPopup", function(AssessmentsPopup) {
                var driver = this.driver;
                var data = applicationArea[AssessmentsPopup];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})

            .when("I click on message $MessageItem", function (MessageItem) {
                var driver = this.driver;
                var data = applicationArea[MessageItem];
                var locator = byCss(data);
				//waitForEnableAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
			})
			.then("we should see view popup $SendMessagePopup", function(SendMessagePopup) {
                var driver = this.driver;
                var data = applicationArea[SendMessagePopup];
                var locator = byCss(data);
				waitForEnable(driver, locator);
			})
			.then("we should see $Subject = $value", function(Subject, value) {
                var driver = this.driver;
                var data = applicationArea[Subject];
                var locator = byCss(data);
				waitLocator(driver, locator).then(function(element) {
					element.getInnerHtml()
                                .then(function (text)
                                {
                                    innHtml = text.toLowerCase();
                                    var found = innHtml.indexOf(value .toLowerCase()) !== -1 ? true : false;
									assert.equal(found, true);
                                });
				});
			})

            .when("I click icon $CloseMessageLink", function (CloseMessageLink) {
                var driver = this.driver;
                var data = applicationArea[CloseMessageLink];
                var locator = byCss(data);
				waitForEnableAndClick(driver, locator);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);*/
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
				driver = new webdriver.Builder()
                .withCapabilities(webdriver.Capabilities.chrome())
                .build();
				this.driver = driver;
				this.driver.get(this.environmentConfigData[url] + 'reader/#/');
				console.log(Object.keys(library));
			})				

    return library;

})();
/* jshint ignore:end */