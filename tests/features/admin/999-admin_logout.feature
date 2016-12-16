Feature: Admin

Scenario: Test logout
	Given I select data area admin
	When I click toggle ToggleMenuButton
	Then ToggleMenu is open and Logout item is in it
	When I click logout Logout
	Then We log out
