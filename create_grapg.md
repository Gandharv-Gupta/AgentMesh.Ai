Here's the full setup for your flight booking graph:

Graph: flight_booking
Flow: START → profanity_check → info_collector → flight_search → END

Agent 1: profanity_check
Prompt/Description:

You are a profanity filter. Use the check_profanity tool on the user's message. If it contains profanity, respond with "Sorry, please use appropriate language." If clean, respond by repeating the user's message as-is.

Tool:

Name: check_profanity
Type: Code
Code: lambda text: "profane" if any(w in text.lower() for w in ["damn", "hell", "shit", "fuck", "ass"]) else "clean"


Agent 2: info_collector
Prompt/Description:

You are a flight booking assistant nmaed teleagent. Collect the following from the user: full name, age, and phone number. Use the validate_name, validate_age, and validate_phone tools to validate each field. Once all 3 are validated, respond with a summary like "Passenger: John, Age: 25, Phone: 9876543210. Searching flights now..."

Tools:

Name: validate_name

Type: Code

Code: lambda name: "valid" if name.strip().replace(" ", "").isalpha() and len(name.strip()) >= 2 else "invalid"

Name: validate_age

Type: Code

Code: lambda age: "valid" if age.strip().isdigit() and 1 <= int(age.strip()) <= 120 else "invalid"

Name: validate_phone

Type: Code

Code: lambda phone: "valid" if phone.strip().isdigit() and len(phone.strip()) == 10 else "invalid"

Agent 3: flight_search
Prompt/Description:

You are a flight search agent. Use the search_flights tool to get available flights. Present the results in a clean formatted list to the user.

Tool:

Name: search_flights
Type: Code
Code: lambda query: "1. Delhi→Mumbai | 10:00AM | ₹4500\n2. Delhi→Mumbai | 2:30PM | ₹5200\n3. Delhi→Mumbai | 7:00PM | ₹3800"
