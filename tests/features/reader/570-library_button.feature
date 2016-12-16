Feature: Reader

Scenario: Test Library button

	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper

	Given I select data area common
#	When I click button library LibraryButton
#	When I click button library LibraryButton	
#	Then Library list LibraryList is displayed
	When I toggle menu ToggleMenu
	Then We should see item LibraryItem
	When I click item LibraryItem
	Given I select data area reader
#	When user clicks button LibraryLink
	When I click link LibraryLink
	Given I select data area common
	Given Clear filter FilterBox
	
	Given It's time to refresh