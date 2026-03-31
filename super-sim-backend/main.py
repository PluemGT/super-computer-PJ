from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os

app = FastAPI(title="Weather Forecasting Web-Cluster")

# เปิด CORS ให้มือถือเข้าถึงได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "weather_cluster.db"

# ==========================================
# 1. ฟังก์ชันจัดการ Database (SQLite)
# ==========================================
def init_db():
    """สร้างตารางและสร้างข้อมูลแผนที่อากาศ 100 ชิ้น (Grid 10x10) ถังยังไม่มีข้อมูล"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # สร้างตารางเก็บงาน (Tasks)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS grid_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grid_x INTEGER,
            grid_y INTEGER,
            start_temp FLOAT,
            final_temp FLOAT,
            status TEXT DEFAULT 'pending',
            worker_id TEXT
        )
    ''')
    
    # สร้างตารางเก็บรายชื่อคนงาน (Workers)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workers (
            worker_id TEXT PRIMARY KEY,
            tasks_completed INTEGER DEFAULT 0
        )
    ''')
    
    # ถ้าตารางงานยังว่างเปล่า ให้สร้างข้อมูลแผนที่ 100 ชิ้น (10x10)
    cursor.execute("SELECT COUNT(*) FROM grid_tasks")
    if cursor.fetchone()[0] == 0:
        for x in range(10):
            for y in range(10):
                # สมมติอุณหภูมิตั้งต้นแบบสุ่มนิดๆ (เช่น 25 องศา)
                base_temp = 25.0 + (x * 0.5) + (y * 0.2)
                cursor.execute(
                    "INSERT INTO grid_tasks (grid_x, grid_y, start_temp) VALUES (?, ?, ?)",
                    (x, y, base_temp)
                )
    
    conn.commit()
    conn.close()

# รันฟังก์ชันสร้าง DB ทันทีที่เปิดเซิร์ฟเวอร์
init_db()

# ==========================================
# 2. Schema สำหรับรับข้อมูลจาก Frontend
# ==========================================
class WorkerRegister(BaseModel):
    worker_id: str

class TaskResult(BaseModel):
    task_id: int
    worker_id: str
    final_temp: float

# ==========================================
# 3. API สำหรับ Web-based Cluster
# ==========================================

@app.post("/api/register")
def register_worker(data: WorkerRegister):
    """API สำหรับลงทะเบียนมือถือเครื่องใหม่"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO workers (worker_id) VALUES (?)", (data.worker_id,))
    conn.commit()
    conn.close()
    return {"message": f"Worker {data.worker_id} registered!"}

@app.get("/api/get-task")
def get_task():
    """API จ่ายงาน: หาพื้นที่แผนที่ที่ยังไม่มีคนทำไปให้มือถือ"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # ให้คืนค่าเป็นแบบ Dictionary
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM grid_tasks WHERE status = 'pending' LIMIT 1")
    task = cursor.fetchone()
    
    if task:
        # เปลี่ยนสถานะเป็นกำลังทำ เพื่อไม่ให้เครื่องอื่นแย่ง
        cursor.execute("UPDATE grid_tasks SET status = 'processing' WHERE id = ?", (task['id'],))
        conn.commit()
        conn.close()
        return {"has_task": True, "task": dict(task)}
    
    conn.close()
    return {"has_task": False, "message": "Simulation Complete!"}

@app.post("/api/submit-result")
def submit_result(data: TaskResult):
    """API รับงาน: มือถือส่งอุณหภูมิที่คำนวณเสร็จแล้วกลับมา"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # อัปเดตผลลัพธ์ลงแผนที่
    cursor.execute(
        "UPDATE grid_tasks SET status = 'completed', final_temp = ?, worker_id = ? WHERE id = ?",
        (data.final_temp, data.worker_id, data.task_id)
    )
    # เพิ่มแต้มให้ Worker
    cursor.execute(
        "UPDATE workers SET tasks_completed = tasks_completed + 1 WHERE worker_id = ?",
        (data.worker_id,)
    )
    
    conn.commit()
    conn.close()
    return {"message": "Result saved!"}

@app.get("/api/dashboard")
def get_dashboard_data():
    """API สำหรับหน้าจอ Mac (PM Dashboard) ดึงข้อมูลไปวาดแผนที่"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM grid_tasks")
    tasks = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM workers")
    workers = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    completed = sum(1 for t in tasks if t['status'] == 'completed')
    return {
        "progress_percent": (completed / len(tasks)) * 100 if tasks else 0,
        "total_workers": len(workers),
        "map_data": tasks,
        "worker_stats": workers
    }
@app.post("/api/reset")
def reset_simulation():
    """API สำหรับล้างฐานข้อมูล เริ่มซิมูเลชันใหม่ตั้งแต่ 0"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # ลบข้อมูลเก่าทิ้งให้หมด
    cursor.execute("DROP TABLE IF EXISTS grid_tasks")
    cursor.execute("DROP TABLE IF EXISTS workers")
    conn.commit()
    conn.close()
    
    # รันฟังก์ชันสร้างตารางใหม่
    init_db()
    return {"message": "Simulation reset successfully!"}