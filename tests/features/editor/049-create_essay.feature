Feature: Editor

Scenario: Create essay

	Given I select data area editor

	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
	
	Given Go top Top

	When user selects snippet from [Point1] to [Point2]
	Then we should see context menu ContextMenu and button AddEssay

	When user clicks note button AddEssay
	Then we should see annotation popup EssayPopup
#	When user inputs [Essay topic] in EssayTopicField
	Given Should be input [Essay topic] into EssayTopicField
	Then Check [Essay topic] existing in EssayTopicField
#	When user inputs [Minimum words in paragraph] in MinimumWordsinParagraphField
	Given Should be input [Minimum words in paragraph] into MinimumWordsinParagraphField
	Then Check [Minimum words in paragraph] existing in MinimumWordsinParagraphField
#	When user inputs [Author's comment if needed] in AuthorCommentifNeededField
	Given Should be input [Author's comment if needed] into AuthorCommentifNeededField
	Then Check [Author's comment if needed] existing in AuthorCommentifNeededField
	When user clicks save FlashcardSaveButton
	When user clicks save FlashcardSaveButton
	Then we should see created essay EssayBlock
###	
	Given I select data area common
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	Given I select data area editor	
###
#	When I click extra button BookExtraButton
#	When I click extra button BookExtraButton

	Given I select data area common
	When I toggle menu ToggleMenu
#	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame

	Given I select data area editor
	When user clicks link ExercisesLink
	Then ExercisesTab tab is opened

	Then we should see essay [Essay topic] in EssayTab
	
	
Where:	
	Essay topic      | Minimum words in paragraph | Author's comment if needed | Point1 | Point2
	TopicOfEssay     |            20              |       Some comment         | Point5 | Point5