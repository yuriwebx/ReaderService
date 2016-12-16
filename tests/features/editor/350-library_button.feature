Feature: Editor

Scenario: Test Library button
###
	Given I select data area editor
#	When I hover on ToolbarWrapper	
	When I click on library LibraryButton
#	When I click on library LibraryButton
	Then We should see book list BookList
###
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras LibraryItem
	When I choose extras LibraryItem
	
	
