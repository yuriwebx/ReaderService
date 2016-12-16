Feature: Editor

Scenario: Test login

	Given I select data area common
#	Given Set test steps time
	When I open url page
	Then Main page should have url title
	Then And we should see login form LoginForm
	Given Should be input [login] into LoginBox
	Then Check [login] existing in LoginBox
	Given Should be input [password] into PasswordBox
	Then Check [password] existing in PasswordBox
	When I press login button LoginButton
#	Then We should see label EditorLabel = Editor

Where:
	    login       | password
	    editor@irls	| password

