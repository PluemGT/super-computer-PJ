# main.py
from fastapi import FastAPI, WebSocket
from worker import run_heavy_simulation, celery_app
import json
import asyncio

app = FastAPI()

# 1. Endpoint สำหรับสั่งเริ่ม Simulation
@app.post("/api/simulate")
async def start_simulation(params: dict):
    # โยนงานไปให้ Celery ทำเบื้องหลังทันที
    task = run_heavy_simulation.delay(params)
    # คืนค่า Task ID ให้ Frontend เอาไว้ติดตามผล
    return {"task_id": task.id, "message": "Simulation queued on cluster"}

# 2. WebSocket สำหรับส่ง % ความคืบหน้าแบบ Real-time กลับไปที่หน้าจอ 3D
@app.websocket("/ws/progress/{task_id}")
async def progress_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    
    while True:
        task = celery_app.AsyncResult(task_id)
        
        if task.state == 'PENDING':
            await websocket.send_text(json.dumps({"state": task.state, "progress": 0}))
        elif task.state == 'PROGRESS':
            progress = (task.info.get('current', 0) / task.info.get('total', 1)) * 100
            await websocket.send_text(json.dumps({"state": task.state, "progress": progress}))
        elif task.state == 'SUCCESS':
            await websocket.send_text(json.dumps({"state": task.state, "progress": 100, "result": task.result}))
            break
        
        await asyncio.sleep(1) # อัปเดตหน้าจอทุกๆ 1 วินาที