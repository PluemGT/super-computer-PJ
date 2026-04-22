import pandas as pd
import requests
import time

# --- CONFIGURATION ---
# บอทจะอ่านพิกัด 77 จังหวัดจากไฟล์นี้
INPUT_FILE = "thailand_data.csv"
# และจะสร้างไฟล์ใหม่ที่มีอุณหภูมิจริง ณ ปัจจุบัน
OUTPUT_FILE = "real_thailand_data.csv"

def fetch_real_weather():
    print("🤖 RPA Scraper: INITIATING DATA EXTRACTION PROTOCOL...")
    
    try:
        # อ่านไฟล์ CSV เก่าที่เรามีพิกัด (lat, lng) อยู่แล้ว
        df = pd.read_csv(INPUT_FILE)
    except FileNotFoundError:
        print(f"❌ [ERROR] ไม่พบไฟล์ {INPUT_FILE} ในโฟลเดอร์ครับ")
        return

    print(f"✅ โหลดพิกัดเป้าหมายสำเร็จจำนวน {len(df)} จังหวัด")
    print("📡 กำลังเชื่อมต่อดาวเทียมตรวจสภาพอากาศ (Open-Meteo API)...")
    print("-" * 40)

    # วนลูปดึงอุณหภูมิจริงทีละจังหวัด
    for index, row in df.iterrows():
        lat = row['lat']
        lng = row['lng']
        region = row['region']

        # URL สำหรับดึงข้อมูลอากาศฟรีแบบ Real-time
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current_weather=true"

        try:
            response = requests.get(url)
            data = response.json()
            real_temp = data['current_weather']['temperature']

            # อัปเดตค่าอุณหภูมิใหม่ทับของเดิม
            df.at[index, 'temp'] = real_temp
            print(f"📍 [SCANNED] {region:<20} : {real_temp} °C")

        except Exception as e:
            print(f"⚠️ [WARNING] สัญญาณขาดหายที่ {region}: {e}")

        # หน่วงเวลา 0.2 วินาที ป้องกันการโดนแบนจากการยิง Request รัวเกินไป
        time.sleep(0.2) 

    print("-" * 40)
    # บันทึกเป็นไฟล์ CSV ตัวใหม่
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"🎉 [SUCCESS] ดึงข้อมูลครบถ้วน! สร้างไฟล์ '{OUTPUT_FILE}' พร้อมใช้งานแล้วครับ")

if __name__ == "__main__":
    fetch_real_weather()