Feature: Admin

Scenario: Filter users
	Given I select data area admin
###
	When I click on filter box FilterBox
	Then Something happens
###
	Given Clear filter FilterBox
	Given I input [LastName] in FilterBox
	#Then We should see user where UserFound = [LastName] [FirstName]
	Then We should see user where UserFound = [Email]
#	Then Results counter ResultsCounter = 1
#	Given Clear filter FilterBox
	Given I input email [Email] in FilterBox
	Then We should see user where EmailFound = [Email]
#	Then Results number ResultsCounter = 1
	Given Clear filter FilterBox
	
	Where:
	  FirstName   | LastName | Email   
	  Flow   	  | Hydro	 | hydroflow@yopmail.com
