Feature: Admin

Scenario: Access to library
	Given I select data area admin
	When I click toggle ToggleMenuButton
	Then ToggleMenu is open and Library item is in it
	When I click library item Library
	Then AdminLibraryPage page is open

