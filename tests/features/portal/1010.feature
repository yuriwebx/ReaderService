Feature: Portal

Scenario: Test login

	Given set test steps time
	Given user is on the Portal page
	Then SignInButton is on the Portal page	
	When user clicks on sign in SignInButton
	Then SignInForm form appears on the screen
	When user inputs [login] in LoginBox
	When user inputs [password] in PasswordBox
	When user press SignInSubmit on SignInForm
	Then user should see [buttons]

	Where:
	  login        | password   | buttons      
	  admin@irls   | password   | ReaderButton EditorButton AdminButton          
		

