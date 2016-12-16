Feature: Reader

Scenario: Test logout

	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see logout Logout
	When I click logout Logout
	Then We log out
