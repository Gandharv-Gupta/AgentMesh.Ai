import requests
import time

TOKEN = "8312577632:AAHNy35zEMgDBHo3iIjfqH31eNg_vTnwFHw"
BASE = f"https://api.telegram.org/bot{TOKEN}"

def send_message(chat_id, text):
    requests.post(f"{BASE}/sendMessage", json={"chat_id": chat_id, "text": text})

def handle_message(text):
    """Process incoming message and return a reply. Customize this."""
    return f"You said: {text}"

def poll():
    print("🤖 Bot started polling... Send a message to your bot on Telegram!")
    offset = None
    while True:
        resp = requests.get(f"{BASE}/getUpdates", params={"offset": offset, "timeout": 30}).json()
        for update in resp.get("result", []):
            offset = update["update_id"] + 1
            msg = update.get("message", {})
            text = msg.get("text", "")
            chat_id = msg["chat"]["id"]
            print(f"📩 {msg['from'].get('first_name','')}: {text}")
            reply = handle_message(text)
            send_message(chat_id, reply)
            print(f"📤 Bot: {reply}")
        time.sleep(1)

if __name__ == "__main__":
    poll()