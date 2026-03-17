from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Virtual Supercomputer Master Node")

# ==========================================
# 1. การตั้งค่า CORS (สำคัญมาก!)
# อนุญาตให้มือถือ/iPad หรือเว็บเบราว์เซอร์เครื่องอื่น วิ่งเข้ามาขอข้อมูลได้
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # เปิดรับทุก IP ชั่วคราวเพื่อให้เทสต์ง่าย
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. จำลอง "ก้อนข้อมูล (Chunks)" ที่ถูกหั่นรอไว้แล้ว
# สมมติว่างานคือการหา "จำนวนเฉพาะ (Prime Numbers)" ตั้งแต่ 1 ถึง 100,000
# เราหั่นแบ่งเป็น 10 ก้อน ก้อนละ 10,000 ตัวเลข
# ==========================================
TOTAL_CHUNKS = 10
tasks_db = []
for i in range(TOTAL_CHUNKS):
    start_num = (i * 10000) + 1
    end_num = (i + 1) * 10000
    tasks_db.append({
        "task_id": i + 1,
        "start": start_num,
        "end": end_num,
        "status": "pending",  # สถานะ: pending, processing, completed
        "result": None
    })

# กำหนดหน้าตาข้อมูลตอนที่มือถือส่งคำตอบกลับมา
class ResultPayload(BaseModel):
    task_id: int
    primes_found: int  # ส่งกลับมาว่าเจอจำนวนเฉพาะกี่ตัว

# ==========================================
# 3. สร้าง API (Endpoints) สำหรับทำงาน
# ==========================================

@app.get("/")
def read_root():
    return {"message": "Master Node is Running!"}

# API ที่ 1: สำหรับหน้า Dashboard เอาไว้ดูความคืบหน้ารวม
@app.get("/api/status")
def get_system_status():
    completed = sum(1 for task in tasks_db if task["status"] == "completed")
    progress_percent = (completed / TOTAL_CHUNKS) * 100
    return {
        "total_tasks": TOTAL_CHUNKS,
        "completed_tasks": completed,
        "progress_percent": progress_percent,
        "tasks_detail": tasks_db
    }

# API ที่ 2: สำหรับมือถือ (Worker) มาร้องขอรับงานไปทำ
@app.get("/api/get-task")
def get_task():
    # หาคิวงานที่ยังไม่มีคนทำ (pending)
    for task in tasks_db:
        if task["status"] == "pending":
            task["status"] = "processing" # เปลี่ยนสถานะว่ากำลังมีคนเอาไปทำ
            return {"message": "Task assigned", "task": task}
            
    return {"message": "No more tasks available!", "task": None}

# API ที่ 3: สำหรับมือถือ (Worker) ส่งคำตอบที่คำนวณเสร็จแล้วกลับมา
@app.post("/api/submit-result")
def submit_result(payload: ResultPayload):
    # เอาผลลัพธ์ไปอัปเดตในฐานข้อมูลของเรา
    for task in tasks_db:
        if task["task_id"] == payload.task_id:
            task["status"] = "completed"
            task["result"] = payload.primes_found
            return {"message": f"Result for task {payload.task_id} saved successfully!"}
            
    return {"error": "Task ID not found"}