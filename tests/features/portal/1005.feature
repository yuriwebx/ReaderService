Feature: Portal

Scenario:  Test About pop-up

	Given user is on the Portal page
	Then SignInButton is on the Portal page	
	When user clicks on sign in SignInButton
	Then SignInForm form appears on the screen
	When user inputs [login] in LoginBox
	When user inputs [password] in PasswordBox
	When user press SignInSubmit on SignInForm
	Then user should see [buttons]
    Given the user is LoggedIn
	
	When I click toggle ToggleMenu
	Then the MainMenu is opened and the AboutItem is in it
	When user clicks item AboutItem
    Then AboutPopup popup is on the screen
    When user clicks on ok CloseAboutPopup
    Then AboutPopup is closed and user is on the portal page

	When I click toggle ToggleMenu
    Then the MainMenu is opened and the LogoutItem is in it 
    When user clicks item LogoutItem
    Then SignInButton is present on the Portal page

	Where:
	  login 		 | password   | buttons      
	  editor@irls    | password   | ReaderButton