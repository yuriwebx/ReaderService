Feature: Reader

Scenario: Read message
###
	Given I select data area reader
	When I hover on ToolbarWrapper
#	When I hover on ToolbarWrapper
#	Then we should see toolbar ToolbarWrapper	
	When I click on assessment AssessmentsLink
#	When I click on assessment AssessmentsLink
	Then we should see assessment popup AssessmentsPopup
###
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see item MessagesItem
	When I click item MessagesItem
	Then we should see assessment popup AssessmentsPopup

	Given I select data area reader
	
	When I click on message MessageItem
	Then we should see view popup SendMessagePopup
	Then we should see Subject = [Subject]
	When I click icon CloseMessageLink

#	Then we should see button MenuButton

Where:
	Subject
	This is test subject