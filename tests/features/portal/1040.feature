Feature: Portal

Scenario: Test that users are able to logout

#	Given Set test steps time
#   Given user is on the Portal page
###
	Given I select data area portal
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	Given I select data area common	
    Given the user is LoggedIn
###	
	
	When I click toggle ToggleMenu
	Given It's time to refresh
	When I click toggle ToggleMenu	
    Then the MainMenu is opened and the LogoutItem is in it 
    When user clicks item LogoutItem
	When user clicks item LogoutItem
#   Then SignInButton is present on the Portal page
