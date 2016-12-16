/* jshint ignore:start */
require('jasmine-before-all');

var webdriver = require('selenium-webdriver');
var Yadda = require('yadda');
var assert = require('assert');
var commonUtils = require('./function-set');

module.exports = (function () {

    var dictionary = new Yadda.Dictionary()
            .define('LOCALE', /(fr|es|ie)/)
            .define('NUM', /(\d+)/);
			
	var applicationArea, maxTimeout = 3000;

    var library = new Yadda.localisation.English.library(dictionary)
	
//Scenario: Select data area
            .given("I select data area $area", function (area) {
                applicationArea = this.mappingData[area];
            })	

//Scenario: Test site opening and logon
            .given("set test steps time", function () {
                //this.driver.manage().timeouts().implicitlyWait(maxTimeout);
                //this.driver.manage().window().maximize();
            })
            /*
             .when("I open $link page", function(link) {	
             var driver = this.driver;
             link = (link == 'url' ? this.environmentConfigData[link]+'portal/' : link+'portal/');
             driver.get(link);
             })
             .then("Main page should have $titleName title", function(titleName)  {
             var driver = this.driver;
             titleName = (titleName == 'url' ? this.environmentConfigData[titleName]+'portal/#/': titleName+'portal/#/');
             driver.wait(function() {
             return driver.getTitle().then(function(title) {
             return title === titleName;
             });
             }, 3000);
             })*/
            .given("user is on the $link page", function (link) {
                var driver = this.driver;
                link = this.mappingData.portal[link] ? this.mappingData.portal[link] : link;
                page = (link == 'url' ? this.environmentConfigData[link] + 'portal/index.html' : link + 'portal/index.html');

				var locator = webdriver.By.css('div');

				//driver.sleep(1000).then(function() { 
					return driver.get(page).then(function() {
						//return driver.wait(webdriver.until.elementsLocated(locator), maxTimeout);
						return driver.sleep(1000);
					});
				//});
            })
            .then("$element is on the $link page", function (element, link) {
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.portal[element]);
				//return commonUtils.waitForEnable(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
				//return driver.sleep(1000).then(function(){
					//return commonUtils._findElements(driver, locator);
				//});
            })

            .when("user clicks on sign in $Signin", function (Signin) {
				var driver = this.driver;
				//driver.sleep(500);
				var locator = webdriver.By.css(this.mappingData.portal[Signin]);
				var mappingData = this.mappingData;
				//commonUtils.waitForEnable(this.driver, locator);
				return driver.sleep(2000).then(function() {
					var inputBlockerLocator = webdriver.By.css(mappingData.common.InputBlocker);
					return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
				});
/*
				//return driver.sleep(2000).then(function(){
					//return commonUtils._findAndClick(driver, locator);
					var seq = new webdriver.ActionSequence(driver);
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
					return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator).then(function(elements) {
						var element = elements[0];
						return seq.mouseMove(element).click().perform();
					});
				//});
*/
            })
            .then("$SignInForm form appears on the screen", function (SignInForm) {
				var locator = webdriver.By.css(this.mappingData.portal[SignInForm]);
				//commonUtils.waitForEnable(this.driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return this.driver.sleep(1000).then(function() {
					return commonUtils._preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
				});					
            })
			.then("Link $facebookLink is on the Portal page", function (facebookLink) {
				var driver = this.driver;
				var locator = webdriver.By.id(this.mappingData.portal[facebookLink]);
				return commonUtils.waitForEnable(driver, locator);
            })
            /*.given("Should be input $text into $place", function(text, place) {
             this.driver.findElement(webdriver.By.css(this.mappingData.common[place])).sendKeys(text);
             })
             .then("Check element $text existing in $place", function(text, place)  {	
             //return this.driver.findElement(webdriver.By.css(this.mappingData.common[place])) === text;
             var obj = this.driver.findElement(webdriver.By.css(this.mappingData.common[place]))
             .getAttribute('value')
             .then(function(value) 
             {
             assert.equal(text, value);
             });		
             })*/
            .when("user inputs $text in $place", function (text, place) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[place])).sendKeys(text);
				var driver = this.driver;
				var locator = commonUtils.byCss(this.mappingData.common[place]);
				/*commonUtils.waitForEnableAndClearValue(driver, locator);
				commonUtils.waitForEnableAndInputValue(driver, locator, text);*/
				return commonUtils._findAndInput(driver, locator, text);
            })

            /*    .when("I press Enter on $form",function(form) {
             var driver = this.driver;
             driver.findElement(webdriver.By.css(this.mappingData.portal[form])).submit();
             })	*/
            .when("user press $LoginButton on $SignInForm", function (LoginButton, SignInForm) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.portal[LoginButton])).click();
				var mappingData = this.mappingData;
				var driver = this.driver;
				var locator = webdriver.By.css(mappingData.portal[LoginButton]);
				return commonUtils._findAndClick(driver, locator).then(function() {
					var locator = webdriver.By.css(mappingData.portal[SignInForm]);
					return commonUtils._waitUntilPresent(driver, locator);
				});
            })
            /*
             .then("We should see top menu $menu", function(menu) {
             this.driver.findElement(webdriver.By.css(this.mappingData.portal[place]));
             })
             .then("We should see Reader $button", function(button) {
             this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
             })
             .then("We should not see Admin $button", function(button) {
             return !this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
             })
             .then("We should not see Editor $button", function(button) {
             return !this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
             })
             */
            .then("user should see $buttons", function (buttons) {
				//this.driver.sleep(maxTimeout);
				var driver = this.driver;
				var mappingData =this.mappingData;
                var promises = buttons.split(' ').map(function(button) {
					var locator = webdriver.By.css(mappingData.common[button]);
					return commonUtils._findElements(driver, locator);
				});
				
				return webdriver.promise.all(promises);
            })
            .when("user clicks on link $facebookLink", function (facebookLink) {
                this.driver.findElement(webdriver.By.id(this.mappingData.portal[facebookLink])).click();
            })
            .then("$ReaderButton is present", function (ReaderButton) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.common[ReaderButton]));
            })
			
            .when("I click toggle $ToggleMenuButton", function (ToggleMenu) {
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.common[ToggleMenu]);
				/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return driver.sleep(2000).then(function() {
					return commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);
				});*/
					//return commonUtils._findAndClick(driver, locator);
				//});
				return driver.sleep(2000).then(function() {
					var seq = new webdriver.ActionSequence(driver);
					//return commonUtils.waitLocator(driver, locator).then(function(element) {
					return commonUtils._findElements(driver, locator).then(function(elements) {
						var element = elements[0];
						return seq.mouseMove(element).click().perform();
					});
				});
            })
            .then("the $MainMenu is opened and the $Item is in it", function (MainMenu, Item) {
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.common[MainMenu]);
				var mappingData = this.mappingData;
				return commonUtils._findElements(driver, locator).then(function() {
					locator = webdriver.By.css(mappingData.common[Item]);
					return commonUtils._findElements(driver, locator);
				});
			})			

//Test click on links to apps	
            .when("user clicks on buttons $set", function (set) {
                var driver = this.driver;
                var butarr = set.split(' ');
                var prev = '', app = '';
                var button;
                for (var key in butarr) {
                    button = webdriver.By.css(this.mappingData.common[butarr[key]]);
					/*var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
					commonUtils._preventInputBlockerMacroAndClick2(driver, button, inputBlockerLocator);*/
					//commonUtils._findAndClick(driver, button);
					commonUtils.waitLocator(driver, button).then(function(element) {
						var seq = new webdriver.ActionSequence(driver);
						seq.mouseMove(element).click().perform();
					});					
                    switch (butarr[key]) {
                        case 'ReaderButton':
                            app = 'reader';
                            break;
                        case 'Web-version':
                            app = 'reader';
                            break;
                        case 'EditorButton':
                            app = 'reader';
                            break;
                        case 'AdminButton':
                            app = 'admin';
                            break;
						app = 'portal';
					}
                    //driver.findElement(webdriver.By.css("body.app-" + app));
					var locator = webdriver.By.css("body.app-" + app);
					//commonUtils.waitForEnable(driver, locator);
					//preventInputBlockerMacro(driver, locator, inputBlockerLocator);
					commonUtils._findElements(driver, locator);
                    driver.get(this.mappingData.common.web + 'portal/index.html');
					driver.wait(webdriver.until.titleIs(this.mappingData.common.web + 'portal/index.html'), maxTimeout);/**.then(function(){
						driver.sleep(500);
					});*/
                }
            })
            .then("the applications opens", function () {
				//this.driver.sleep(2000);
            })

//Scenario: Test click on link
            .when("I click on $link link", function (link) {
                link = (link == 'url' ? this.environmentConfigData[link] + 'reader/index.html' : link + 'reader/index.html');
                return this.driver.get(link);
            })
            .then("Page $titleName would be open", function (titleName) {
                titleName = (titleName == 'url' ? this.environmentConfigData[titleName] + 'reader/#/loading' : this.mappingData.common[titleName] + 'reader/#/loading');
                return this.driver.getTitle().then(function (title) {
                    if (title !== titleName) {
                        throw new Error(
                                'Expected "' + titleName + '", but was "' + title + '"');
                    }
                    console.log(title);
                });
                /*var driver = this.driver;
                 driver.wait(function() {
                 return driver.getTitle().then(function(title) {
                 return title === titleName;
                 });
                 }, 3000);*/
            })

//Scenario: Open book
            .given("I introduce $bookName in $filter", function (bookName, filter) {
				this.driver.findElement(webdriver.By.css(this.mappingData.common[filter])).clear();
                this.driver.findElement(webdriver.By.css(this.mappingData.common[filter])).sendKeys(this.mappingData.common[bookName]);
            })
            .then("We should see $filter has matching $item", function (filter, item) {
                return this.driver.findElement(webdriver.By.xpath(this.mappingData.common[item]));
            })

            .when("I open book $bookName", function (bookName) {
                this.driver.findElement(webdriver.By.xpath(this.mappingData.common[bookName])).click();
            })
            .then("We should see $popup view", function (popup) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.common[popup]));
            })

            .when("I click on read button $read", function (read) {
                this.driver.findElement(webdriver.By.css(this.mappingData.reader[read])).click();
               //this.driver.sleep(500);
            })
            .then("Book content $content is opening", function (content) {
                return this.driver.findElement(webdriver.By.id(this.mappingData.reader[content]));
            })

//Scenario: Test reader mode settings
            .when("I click on reader mode $settings", function (settings) {
                this.driver.findElement(webdriver.By.css(this.mappingData.reader[settings])).click();
            })
            .then("We should see settings popup $popup", function (popup) {
                return this.driver.findElement(webdriver.By.id(this.mappingData.reader[popup]));
            })

            .when("Select font $font", function (font) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[font])).click();
            })
            .then("Check style $style contains $font", function (style, font) {
                /*var styleObj = this.driver.findElement(webdriver.By.id(this.mappingData.common[style]));
                 console.log(styleObj);
                 return styleObj.indexOf(webdriver.By.css(this.mappingData.common[font])) !== -1;*/
                //return this.driver.findElement(webdriver.By.xpath(this.mappingData.common[style])) === this.mappingData.common[font];

            })

            .when("I select $fontSizeChange $fontSizeChangeButton", function (fontSizeChange, fontSizeChangeButton) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[fontSizeChangeButton])).click();
            })
            .then("Style $changed has font size $size", function (changed, size) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.common[changed])) === this.mappingData.common[size];
            })

            .when("I click on theme button $theme", function (theme) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[theme])).click();
            })
            .then("The body is affected by $theme", function (theme) {
                this.driver.findElement(webdriver.By.id(this.mappingData.common[theme]));
            })

            .when("I click out of reader mode $outof", function (outof) {
                this.driver.findElement(webdriver.By.css(this.mappingData.reader[outof])).click();
            })
            .then("We should close popup and see $content", function (content) {
                this.driver.findElement(webdriver.By.id(this.mappingData.reader[content]));
            })

//Scenario: Test about item
            /*.when("I click about $button", function(button) {
             this.driver.findElement(webdriver.By.css(this.mappingData.common[button])).click(); 
             })*/
            /*.when("user clicks on show menu $button", function (button) {
                this.driver.findElement(webdriver.By.css(this.mappingData.portal[button])).click();
            })
            .then("the $MainMenu is opened and the $item is in it", function (MainMenu, item) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[MainMenu]));
                this.driver.findElement(webdriver.By.css(this.mappingData.common[item]));
            })*/
			
            .when("user clicks item $item", function (item) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[item])).click();
				//this.driver.sleep(500);
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.common[item]);
				/*driver.wait(webdriver.until.elementLocated(locator),maxTimeout)
				.then( function() {
					driver.findElement(locator).click();
				});*/
				//commonUtils.waitForEnableAndClick(driver, locator);
				//return commonUtils._findAndClick(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker); 
				commonUtils._preventInputBlockerMacroAndClick2(driver, locator, inputBlockerLocator);				
            })
            .then("$AboutPopup popup is on the screen", function (AboutPopup) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[AboutPopup]));
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.common[AboutPopup]);
				//driver.wait(webdriver.until.elementLocated(locator),maxTimeout);
				/*.then( function() {
					driver.findElement(locator);
				});*/
				return commonUtils.waitForEnable(driver, locator);
            })
            .then("user is $LoggedOut", function (LoggedOut) {
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[LoggedOut]));
				var locator = webdriver.By.css(this.mappingData.common[LoggedOut]);
				commonUtils.waitForEnable(this.driver, locator);
            })
            .then("$element is present on the Portal page", function (element) {
				var driver = this.driver;
                //this.driver.findElement(webdriver.By.css(this.mappingData.portal[element]));
				var locator = webdriver.By.css(this.mappingData.portal[element]);
				//return commonUtils._findElements(driver, locator);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils._preventInputBlockerMacro2(driver, locator, inputBlockerLocator);
            })

            .when("user clicks on ok $OKAboutButton", function (OKAboutButton) {
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.common[OKAboutButton]);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return commonUtils.preventInputBlockerMacroAndClick(driver, locator, inputBlockerLocator);
				//return commonUtils.waitForEnableAndClick(driver, locator);
				/*var seq = new webdriver.ActionSequence(driver);
				commonUtils.waitLocator(driver, locator).then(function(element) {
					seq.mouseMove(element, 5, 5).click().perform();
				});*/
            })
			/*.when("I press Esc on $form",function(form) {
				 var driver = this.driver;
				 //var locator = webdriver.By.css(this.mappingData.common[form]);
				 driver.findElement(webdriver.By.css(this.mappingData.common[form])).submit();
            })*/			
            .then("AboutPopup is closed and user is on the $portal page", function (portal) {
                //this.driver.findElement(webdriver.By.css("body.app-" + portal));
				var driver = this.driver;
				var locator = webdriver.By.css("body.app-" + portal);
				//driver.wait(webdriver.until.elementLocated(locator),maxTimeout);
				return commonUtils.waitForEnable(driver, locator);
            })

            /*	.when("I click Ok $button button", function(button) {
             this.driver.findElement(webdriver.By.css(this.mappingData.common[button])).click(); 
             })	
             .then("We should see main view $view", function(view) {
             this.driver.findElement(webdriver.By.css(this.mappingData.portal[view])); 
             })*/

//Scenario: Test dictionary
            .when("I choose dictionary item $Dictionary", function (Dictionary) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.reader[Dictionary])).click();
            })
            .then("Dictionary page $page loads", function (page) {
                return this.driver.getTitle() === this.mappingData.reader[page];
            })
            .given("I enter $word in $filter", function (word, filter) {
                this.driver.findElement(webdriver.By.css(this.mappingData.reader[filter])).sendKeys(this.mappingData.reader[word]);
            })
            .then("We should see search $result", function (result) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.reader[result]));
            })
            .then("And search $result is matching $SearchWord", function (result, SearchWord) {
                //return this.driver.findElement(webdriver.By.css(this.mappingData.reader[result])) === this.mappingData.reader[sword];
                var resword;
                /*this.driver.findElement(webdriver.By.css(this.mappingData.reader[SearchBox]))
                 .getAttribute('value')
                 //.getText()
                 .then(function(text) 
                 {
                 resword = text;
                 });*/
                //console.log(resword);
                resword = this.mappingData.reader[SearchWord];
                return this.driver.findElement(webdriver.By.css(this.mappingData.reader[result]))
                        .getAttribute('value')
                        //.getText()
                        .then(function (text)
                        {
                            return assert.equal(resword, text);
                        });
            })

//Scenario: Test logout
            .given("the user is $LoggedIn", function (LoggedIn) {
				//this.driver.sleep(maxTimeout);
				var driver = this.driver;
				var locator = webdriver.By.css(this.mappingData.common[LoggedIn]);
				return commonUtils.waitForEnable(driver, locator);
                //this.driver.findElement(webdriver.By.css(this.mappingData.common[LoggedIn]));
            })

            .when("I click on show menu $button", function (button) {
                this.driver.findElement(webdriver.By.css(this.mappingData.portal[button])).click();
            })
            .then("We should see logout item $button", function (button) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
            })
            .then("We should see about item $button", function (button) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
            })

            .when("I click logout $button", function (button) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.common[button])).click();
            })
            .then("We log out", function () {
				//return this.driver.exit();
            })

            .when("I toggle menu $menu", function (menu) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.common[menu])).click();
            })
            .then("We should see dictionary item $item", function (item) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.reader[item]));
            })
            .then("We should see logout $button", function (button) {
                return this.driver.findElement(webdriver.By.css(this.mappingData.common[button]));
            })

//Scenario: Test download books
            .when("I click on download $DownloadButton", function (DownloadButton) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[DownloadButton])).click();
            })
            .then("We should see book list $BookListForDownload for download", function (BookListForDownload) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[BookListForDownload]));
            })
            .when("I choose book for download $DownloadButton", function (DownloadButton) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[DownloadButton])).click();
               //this.driver.sleep(maxTimeout);
            })
            .then("We should see book is downloading $BookIsDownloading", function (BookIsDownloading) {
                this.driver.findElement(webdriver.By.css(this.mappingData.common[BookIsDownloading]));
            })
//Scenario: Test transfer to download page
            .when("I go to $link", function (link) {
                return this.driver.get(this.mappingData.common[link]);
            })
            .then("Download page $titleName would be open", function (titleName) {
                return this.driver.getTitle().then(function (title) {
                    if (title !== titleName) {
                        throw new Error(
                                'Expected "' + titleName + '", but was "' + title + '"');
                    }
                    console.log(title);
                });
            })
            .then("And we should see downloaded book $EpubDownloaded is really $EpubDownloadedId", function (EpubDownloaded, EpubDownloadedId) {
                var epub = this.mappingData.common[EpubDownloadedId];
                return this.driver.findElement(webdriver.By.css(this.mappingData.common[EpubDownloaded]))
                        .getAttribute('text')
                        .then(function (text)
                        {
                            assert.equal(text, epub);
                        });
            })
			
			.when("I hover on $ToolbarWrapper", function (ToolbarWrapper) {
                var data = applicationArea[ToolbarWrapper];
                var driver = this.driver;
                var locator = commonUtils.byCss(data);				
				return commonUtils.waitLocator(driver, locator).then(function(element) {
					var seq = new webdriver.ActionSequence(driver);
					seq.mouseMove(element).perform();
				});
            })
	        .then("we should see toolbar $ToolbarWrapper", function (ToolbarWrapper) {
				var driver = this.driver;
                var data = applicationArea[ToolbarWrapper];
                var locator = commonUtils.byCss(data);
				var inputBlockerLocator = webdriver.By.css(this.mappingData.common.InputBlocker);
				return _preventInputBlockerMacro2(this.driver, locator, inputBlockerLocator);
            })

			.when("user clicks vocabulary assessment $VocabularyAssessmentLink", function (VocabularyAssessmentLink) {
				var driver = this.driver;
                var data = applicationArea[VocabularyAssessmentLink];
                var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);					
            })
	        .then("we should see block $StartBlock", function (StartBlock) {
				var driver = this.driver;
                var data = applicationArea[StartBlock];
                var locator = commonUtils.byCss(data);
				return commonUtils._findElements(driver, locator);					
            })

			 .when("I click on button $AnyButton", function (AnyButton) {
				var driver = this.driver;
				var data = applicationArea[AnyButton];
				var locator = commonUtils.byCss(data);
				return commonUtils._findAndClick(driver, locator);
			 })
			 
			.given("It's time to refresh", function () {
				this.driver.navigate().refresh();
				this.driver.sleep(1000);
			})

    return library;

})();
/* jshint ignore:end */