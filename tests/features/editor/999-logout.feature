Feature: Editor

Scenario: Test logout
###	
	Given I select data area editor
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
###	
	Given I select data area common
	When I toggle menu ToggleMenu
#	When I toggle menu ToggleMenu
	Then We should see logout Logout
	When I click logout Logout
	Then We log out
