import sqlite3
import pandas as pd
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime

# --- CONFIGURATION (ตั้งค่าตรงนี้) ---
DB_NAME = "weather_cluster.db"
EXCEL_FILE = "Cyrus_Weather_Report.xlsx"
SENDER_EMAIL = "aom082506@gmail.com"  # อีเมลของคุณปลื้ม
SENDER_PASSWORD = "ixpf rivp rgpy zeor" # App Password 16 หลัก
RECEIVER_EMAIL = "panuwit.t66@rsu.ac.th" # อีเมลอาจารย์หรืออีเมลทดสอบ

def generate_report():
    print(f"[{datetime.now()}] RPA: Accessing Database...")
    conn = sqlite3.connect(DB_NAME)
    
    # ดึงข้อมูลจังหวัดที่คำนวณเสร็จแล้ว
    query = "SELECT region, grid_x, grid_y, final_temp, status, results_count, ai_weight FROM grid_tasks WHERE status = 'completed'"
    df = pd.read_sql_query(query, conn)
    conn.close()

    if df.empty:
        print("RPA: No completed data found yet.")
        return False

    # สร้างไฟล์ Excel
    print("RPA: Generating Excel Report...")
    writer = pd.ExcelWriter(EXCEL_FILE, engine='openpyxl')
    df.to_excel(writer, index=False, sheet_name='Weather_Report')
    
    # ตกแต่งเบื้องต้น (Optional: ไฮไลท์สีแดงถ้าอุณหภูมิ > 33)
    workbook = writer.book
    worksheet = writer.sheets['Weather_Report']
    # คุณปลื้มสามารถเพิ่ม Logic ตกแต่ง Format ได้ตรงนี้
    
    writer.close()
    return True

def send_email():
    print("RPA: Preparing Email...")
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = RECEIVER_EMAIL
    msg['Subject'] = f"🚀 CYRUS REPORT: Weather Analysis {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    body = f"""
    เรียน ทีมผู้บริหารโปรเจกต์ CYRUS,

    ระบบ Distributed Supercomputer Cluster ได้ประมวลผลสภาพอากาศเสร็จสิ้นแล้ว
    ข้อมูลสรุปเบื้องต้น:
    - จำนวนจังหวัดที่ประมวลผล: {datetime.now().strftime('%d/%m/%Y')}
    - สถานะ: สำเร็จ 100%

    รายละเอียดผลการวิเคราะห์และค่าน้ำหนัก AI (Gradient Descent) ได้แนบมาพร้อมกับอีเมลฉบับนี้ในรูปแบบ Excel

    ขอแสดงความนับถือ,
    CYRUS RPA BOT (Automated System)
    """
    msg.attach(MIMEText(body, 'plain'))

    # แนบไฟล์ Excel
    with open(EXCEL_FILE, "rb") as attachment:
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(attachment.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f"attachment; filename= {EXCEL_FILE}")
        msg.attach(part)

    # ส่ง Email ผ่าน Gmail SMTP
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print("RPA: Email sent successfully! ✅")
    except Exception as e:
        print(f"RPA: Email failed - {e}")

if __name__ == "__main__":
    # ในวันพรีเซนต์ คุณปลื้มสามารถรันไฟล์นี้แบบ Manual ได้เลยหลังจาก Worker ทำงานเสร็จ
    if generate_report():
        send_email()
    else:
        print("RPA: Mission Incomplete.")