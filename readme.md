- uvicorn backend_api:app --reload --port 8000
- npm run dev
- npm install reactflow

-lambda----------
- lambda state: "back" if state["messages"][-1].content.strip() == "HI" else "done"

-----conditional edge:

In the Edges tab conditional edge section, enter:

From Node: a1
Router Code: lambda state: "next" if "HI" in state["messages"][-1].content else "end"
Destination Map: next=a2, end=END


- Bot name on telegram: TeleAgent

-Telegram agent link : https://t.me/AgentMeshWindowBot


https://api.telegram.org/bot8312577632:AAHNy35zEMgDBHo3iIjfqH31eNg_vTnwFHw/getUpdates




{"ok":true,"result":[{"update_id":295610255,
"message":{"message_id":3,"from":{"id":5819075965,"is_bot":false,"first_name":"Gg","last_name":"Itis","username":"gandharvgupta","language_code":"en"},"chat":{"id":5819075965,"first_name":"Gg","last_name":"Itis","username":"gandharvgupta","type":"private"},"date":1776970701,"text":"hi"}}]}




https://api.telegram.org/bot8312577632:AAHNy35zEMgDBHo3iIjfqH31eNg_vTnwFHw/sendMessage?chat_id=5819075965&text=AgentMesh%20Connected

{"ok":true,"result":{"message_id":4,"from":{"id":8312577632,"is_bot":true,"first_name":"TeleAgent","username":"AgentMeshWindowBot"},"chat":{"id":5819075965,"first_name":"Gg","last_name":"Itis","username":"gandharvgupta","type":"private"},"date":1776970839,"text":"AgentMesh Connected"}}