Feature: Reader

Scenario: Test book opening

	Given I select data area reader	
	When I click out of info OutOfPopup
###
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
###
###
	Given I select data area common
	When I click button library LibraryButton
#	When I click button library LibraryButton	
	Then Library list LibraryList is displayed
#	Given Clear filter FilterBox	
###
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see item LibraryItem
	When I click item LibraryItem

#	Given I select data area common
    Given I introduce BookName2 in FilterBox
#   Then We should see filter has matching SeekingBook2
#	Then We should see SeekingBook2 in list
	
	Given It's time to refresh

	When I open book SeekingBook2
    Then We should see BookContent view
###
	Given I select data area reader
	When I click on read button ReadButton
	Then Book content BookContent is opening
###