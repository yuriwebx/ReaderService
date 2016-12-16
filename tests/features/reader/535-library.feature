Feature: Reader

Scenario: Test Library item

	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	
	Given I select data area common
	When I toggle menu ToggleMenu
	When I click item Library

