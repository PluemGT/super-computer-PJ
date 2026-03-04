# worker.py
import time
from celery import Celery

# เชื่อมต่อกับ Redis (เป็นตัวพักคิวงาน)
celery_app = Celery(
    "sim_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task(bind=True)
def run_heavy_simulation(self, params: dict):
    # จำลองการคำนวณที่ใช้เวลานาน (เช่น การแก้สมการ Navier-Stokes)
    total_steps = 100
    
    for i in range(total_steps):
        # อัปเดตสถานะกลับไปที่ Redis ให้ Frontend รู้ความคืบหน้า
        self.update_state(state='PROGRESS', meta={'current': i, 'total': total_steps})
        
        # สมมติว่าในของจริง ตรงนี้คือการยิงคำสั่งไปหา Cluster nodes
        # subprocess.run(["sbatch", "my_sim.sh", params['temperature']])
        
        time.sleep(0.1) # จำลองเวลาคำนวณ
        
    return {"status": "success", "result_file": "sim_output_001.dat", "final_temp": params.get('temperature')}