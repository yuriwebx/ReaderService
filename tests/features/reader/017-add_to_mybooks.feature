Feature: Reader

Scenario: Test add to my books

	Given I select data area reader
    When user clicks button MyBooksLink
	Then [MyBook] is present in the list MyBooksList
	
Where:
		MyBook
		The Republic
