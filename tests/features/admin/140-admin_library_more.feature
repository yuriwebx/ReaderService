Feature: Admin

Scenario: Admin library more
	Given I select data area admin
#	When user sees button MoreButton
###
	When user sees list BookList
	Then items number in BookList = 5
	When user clicks on MoreButton button
	Then user sees items in BookList
	Then items in BookList = 5
###

