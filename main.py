import requests
import time
import os
import re
import random
import sys

def load_and_send():
    cookies_raw = os.environ.get("FB_COOKIE")
    convo_id = os.environ.get("CONVO_ID")
    
    # 🔴 एरर चेकिंग: अगर कोई वेरिएबल गायब है तो लॉग्स में प्रिंट करेगा
    if not cookies_raw:
        print("❌ एरर: Render पर 'FB_COOKIE' नाम का Environment Variable नहीं मिला!")
        sys.exit(1)
        
    if not convo_id:
        print("❌ एरर: Render पर 'CONVO_ID' नाम का Environment Variable नहीं मिला!")
        sys.exit(1)

    user_agents = [
        'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/16.0 Chrome/92.0.4515.166 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 10; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    ]

    cookie_dict = {}
    for item in cookies_raw.split(';'):
        if '=' in item:
            k, v = item.split('=', 1)
            cookie_dict[k.strip()] = v.strip()

    try:
        with open("np.txt", "r", encoding="utf-8") as file:
            messages = [line.strip() for line in file if line.strip()]
    except FileNotFoundError:
        print("❌ एरर: आपकी GitHub रिपॉजिटरी में 'np.txt' फ़ाइल नहीं मिली!")
        sys.exit(1)

    if not messages:
        print("❌ एरर: 'np.txt' फ़ाइल खाली है! इसमें कम से कम एक मैसेज ज़रूर लिखें।")
        sys.exit(1)

    session = requests.Session()
    session.cookies.update(cookie_dict)

    print("🛡️ Anti-Block Cookie Loader सफलतापूर्वक चालू हो गया है...")

    while True:
        for msg in messages:
            try:
                current_agent = random.choice(user_agents)
                headers = {'User-Agent': current_agent}

                chat_url = f"https://facebook.com.{convo_id}" if len(convo_id) > 11 else f"https://facebook.com{convo_id}"
                
                response_page = session.get(chat_url, headers=headers)
                html = response_page.text

                fb_dtsg = re.search(r'name="fb_dtsg" value="(.*?)"', html)
                jazoest = re.search(r'name="jazoest" value="(.*?)"', html)
                tids = re.search(r'name="tids" value="(.*?)"', html)

                if fb_dtsg and jazoest:
                    action_url = "https://facebook.com"
                    data = {
                        'fb_dtsg': fb_dtsg.group(1),
                        'jazoest': jazoest.group(1),
                        'tids': tids.group(1) if tids else f"cid.g.{convo_id}",
                        'body': msg,
                        'Send': 'Send'
                    }

                    send_res = session.post(action_url, headers=headers, data=data)
                    
                    if "success" in send_res.url or send_res.status_code == 200:
                        print(f"[सफलता] भेजा गया: {msg}")
                    else:
                        print("[फेल] फेसबुक ने मैसेज सेंड रिक्वेस्ट रिजेक्ट कर दी।")
                else:
                    print("[त्रुटि] फेसबुक सुरक्षा टोकन नहीं मिले! कुकी गलत है या आईडी ब्लॉक हो गई है।")
                    time.sleep(300)
                    continue
                    
            except Exception as e:
                print(f"नेटवर्क गड़बड़: {e}")
            
            random_delay = random.randint(30, 50)
            print(f"⏳ अगले मैसेज के लिए {random_delay} सेकंड का इंतज़ार...")
            time.sleep(random_delay)

if __name__ == "__main__":
    load_and_send()
    
