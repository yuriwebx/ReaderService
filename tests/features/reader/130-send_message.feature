Feature: Reader

Scenario: Send message

	When I click on membership MembershipLink
	Then we should see message button MessageButton
	When I click on icon MessageButton
	Then we should see message popup SendMessagePopup
###	
	When I insert message [MessageBody] in MessageArea
	When I insert subject [Subject] in SubjectBox
###
	Given Should be input [Subject] into SubjectBox
	Given Should be input [MessageBody] into MessageArea
	When I click send link SendMessageLink
	Then we should see membership MembershipLink

Where:
	MessageBody                                         | Subject
	AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA____  | This is test subject