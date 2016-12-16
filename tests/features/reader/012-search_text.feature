Feature: Reader
	
Scenario: Test text search

	When I click on current [CurrentBook]
#	Then We should see result SnippetList contains SearchingText1
	
	Where:
		
		CurrentBook											
			ul.tree-container.books-container > li:nth-child(2) > p
			ul.tree-container.books-container > li:nth-child(3) > p
			ul.tree-container.books-container > li:nth-child(4) > p
			ul.tree-container.books-container > li:nth-child(5) > p
			ul.tree-container.books-container > li:nth-child(6) > p
###			
			ul.tree-container.books-container > li:nth-child(7) > p
			ul.tree-container.books-container > li:nth-child(8) > p
			ul.tree-container.books-container > li:nth-child(9) > p
			ul.tree-container.books-container > li:nth-child(10) > p
			ul.tree-container.books-container > li:nth-child(11) > p
			ul.tree-container.books-container > li:nth-child(12) > p
			ul.tree-container.books-container > li:nth-child(13) > p
			ul.tree-container.books-container > li:nth-child(14) > p
			ul.tree-container.books-container > li:nth-child(15) > p
			ul.tree-container.books-container > li:nth-child(16) > p
			ul.tree-container.books-container > li:nth-child(17) > p
			ul.tree-container.books-container > li:nth-child(155) > p			
###			

