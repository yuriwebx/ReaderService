Feature: Portal

Scenario:  Test login for all users

	Given user is on the Portal page

	Then SignInButton is on the Portal page	
	When user clicks on sign in SignInButton
	Then SignInForm form appears on the screen
	
	When user inputs [login] in LoginBox
	When user inputs [password] in PasswordBox
	When user press SignInSubmit on SignInForm
	Then user should see [buttons]
#    Given the user is LoggedIn
	When I click toggle ToggleMenu
    Then the MainMenu is opened and the LogoutItem is in it 
    When user clicks item LogoutItem
    Then SignInButton is present on the Portal page

	Where:
	  login        | password   | buttons      
	  user@irls    | password   | ReaderButton
	  admin@irls   | password   | ReaderButton EditorButton AdminButton          
	  editor@irls  | password   | ReaderButton EditorButton