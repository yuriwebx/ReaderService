Feature: Reader

Scenario: Test Library button
###
	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper

	Given I select data area common
	When I click button library LibraryButton
#	When I click button library LibraryButton	
#	Then Library list LibraryList is displayed
#	Given Clear filter FilterBox
###
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see item LibraryItem
	When I click item LibraryItem
#	Then Library list LibraryList is displayed
	
	Given I select data area reader