----What do you need for running tests----

1. Download ChromeDriver v2.13 and Selenium Server v2.44 for your OS: 
Links for Windows:
http://chromedriver.storage.googleapis.com/index.html?path=2.20/
http://www.seleniumhq.org/download/

----How to run tests----

1. Open console window and input command to run selenium and chrome drivers:
java -jar selenium-server-standalone-2.48.2.jar -Dwebdriver.chrome.driver="chromedriver.exe"
2. Open another console window in this folder 'tests' and input command 'grunt' to run tests.