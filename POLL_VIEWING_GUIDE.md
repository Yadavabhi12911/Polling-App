# Poll Viewing via ChatBot - User Guide

## Overview
Both users and admins can now view specific poll results via the chatbot using either poll ID or poll question text.

## Features Added

### 1. View Specific Poll Results
- **For Users**: Can view results for any active poll
- **For Admins**: Can view results for any poll (active or inactive)

### 2. Search Methods
- **By Poll ID**: Use the exact poll ID to get results
- **By Poll Question**: Use partial or full question text to find and view results

## How to Use

### For Regular Users
1. Open the chatbot
2. Ask questions like:
   - "Show me results for poll ID [poll_id]"
   - "Show results for the poll about [question_text]"
   - "What are the results for [partial_question_text]?"

### For Admins
1. Open the chatbot
2. Ask questions like:
   - "Show me results for poll ID [poll_id]"
   - "Show results for the poll about [question_text]"
   - "What are the results for [partial_question_text]?"
   - Can also view inactive polls

## Example Commands

### By Poll ID
```
"Show me results for poll ID abc123"
"Get results for poll abc123"
```

### By Question Text
```
"Show results for the poll about favorite programming language"
"What are the results for the breakfast poll?"
"Show me the poll results for 'What is your favorite color?'"
```

## Response Format
The chatbot will return:
- Poll question and description
- All options with vote counts and percentages
- Total votes
- Creation date
- Visual charts (pie chart and bar chart)
- Detailed breakdown

## Error Handling
- If poll ID doesn't exist: "Poll not found"
- If poll question matches multiple polls: Lists all matching polls with IDs
- If poll question doesn't match any polls: "No active poll found matching..."
- If poll is inactive: "This poll is no longer active"

## Technical Implementation
- New function: `getSpecificPollResult`
- Supports both poll_id and poll_question parameters
- Returns same format as `getPollResult` but for single poll
- Integrated with existing chatbot UI and display components
