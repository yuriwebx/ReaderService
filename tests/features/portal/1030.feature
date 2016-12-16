Feature: Portal

Scenario: Test click on links to open applications

#	Given set test steps time
#	Given user is on the Portal page
#	Given the user is LoggedIn
	When user clicks on buttons [buttons]
	Then the applications opens

Where:
    buttons    
    ReaderButton