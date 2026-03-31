"use client";
import { useState, useEffect } from "react";

interface Task {
  id: number;
  grid_x: number;
  grid_y: number;
  start_temp: number;
  final_temp: number | null;
  status: string;
  worker_id: string | null;
}

interface DashboardData {
  progress_percent: number;
  total_workers: number;
  map_data: Task[];
  worker_stats: any[];
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [workerUrl, setWorkerUrl] = useState("");

  // ตอนเปิดหน้าเว็บ ให้มันสร้าง URL สำหรับให้มือถือเข้า (ดึง IP Mac อัตโนมัติ)
  useEffect(() => {
    const ipUrl = `http://${window.location.hostname}:3000/worker`;
    setWorkerUrl(ipUrl);
  }, []);

  // ดึงข้อมูล Real-time ทุก 1 วินาที
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/dashboard`);
        const data = await res.json();
        setDashboardData(data);
      } catch (error) {
        console.error("เชื่อมต่อ Backend ไม่สำเร็จ", error);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 1000);
    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันกดปุ่ม Reset
  const handleReset = async () => {
    const confirmReset = confirm("⚠️ แน่ใจหรือไม่ว่าจะล้างข้อมูลพยากรณ์อากาศทั้งหมดเพื่อเริ่มใหม่?");
    if (confirmReset) {
      await fetch(`http://${window.location.hostname}:8000/api/reset`, { method: "POST" });
      alert("ล้างกระดานเรียบร้อย! พร้อมรับงานใหม่");
    }
  };

  const getGridColor = (task: Task) => {
    if (task.status === "pending") return "#34495e"; // เทา
    if (task.status === "processing") return "#f1c40f"; // เหลือง
    
    const temp = task.final_temp || 0;
    if (temp < 25) return "#3498db"; // ฟ้า
    if (temp < 28) return "#2ecc71"; // เขียว
    if (temp < 32) return "#e67e22"; // ส้ม
    return "#e74c3c"; // แดง
  };

  if (!dashboardData) {
    return <div style={{ color: "white", padding: "50px", textAlign: "center" }}>กำลังโหลดศูนย์บัญชาการ... 📡</div>;
  }

  return (
    <div style={{ backgroundColor: "#1a1a2e", minHeight: "100vh", color: "white", padding: "30px", fontFamily: "sans-serif" }}>
      
      <div style={{ textAlign: "center", marginBottom: "30px", position: "relative" }}>
        <h1 style={{ fontSize: "2.5rem", margin: "0", color: "#0f3460", textShadow: "0 0 10px #4ecca3" }}>
          🌐 Weather Cluster Dashboard
        </h1>
        <p style={{ color: "#a5a5b0", fontSize: "1.2rem" }}>Master Node Control Center</p>
        
        {/* ปุ่มล้างกระดาน (Reset) */}
        <button 
          onClick={handleReset}
          style={{ position: "absolute", right: "20px", top: "10px", padding: "10px 20px", backgroundColor: "#e74c3c", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
        >
          🔄 ล้างข้อมูลเริ่มใหม่
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", justifyContent: "center" }}>
        {/* กล่อง Progress */}
        <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", width: "250px", textAlign: "center", border: "1px solid #0f3460" }}>
          <h3 style={{ margin: 0, color: "#e94560" }}>ความคืบหน้ารวม</h3>
          <p style={{ fontSize: "2.5rem", fontWeight: "bold", margin: "10px 0" }}>{dashboardData.progress_percent.toFixed(1)}%</p>
          <div style={{ width: "100%", backgroundColor: "#0f3460", height: "10px", borderRadius: "5px" }}>
            <div style={{ width: `${dashboardData.progress_percent}%`, backgroundColor: "#e94560", height: "100%", borderRadius: "5px", transition: "width 0.5s ease" }}></div>
          </div>
        </div>

        {/* กล่องจำนวนอุปกรณ์ */}
        <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", width: "250px", textAlign: "center", border: "1px solid #0f3460" }}>
          <h3 style={{ margin: 0, color: "#4ecca3" }}>อุปกรณ์ที่กำลังช่วย</h3>
          <p style={{ fontSize: "2.5rem", fontWeight: "bold", margin: "10px 0", color: "#4ecca3" }}>
            {dashboardData.total_workers} <span style={{ fontSize: "1rem" }}>เครื่อง</span>
          </p>
        </div>

        {/* กล่อง QR Code (ทีเด็ดอยู่ตรงนี้) */}
        <div style={{ backgroundColor: "#16213e", padding: "10px 20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "15px", border: "1px solid #0f3460" }}>
          {workerUrl && (
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(workerUrl)}`} 
              alt="QR Code" 
              style={{ borderRadius: "8px", border: "2px solid white" }}
            />
          )}
          <div>
            <h4 style={{ margin: "0 0 5px 0", color: "white" }}>📱 สแกนเพื่อร่วมคำนวณ</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "#a5a5b0" }}>{workerUrl}</p>
          </div>
        </div>
      </div>

      {/* แผนที่ 100 ช่อง และ รายชื่อ Worker */}
      <div style={{ display: "flex", gap: "30px", justifyContent: "center", alignItems: "flex-start" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 40px)", gap: "4px", backgroundColor: "#0f3460", padding: "10px", borderRadius: "12px" }}>
          {dashboardData.map_data.map((task) => (
            <div 
              key={task.id}
              title={`พิกัด X:${task.grid_x} Y:${task.grid_y} | อุณหภูมิ: ${task.final_temp ? task.final_temp.toFixed(2) : '-'} | ทำโดย: ${task.worker_id || 'ยังไม่มี'}`}
              style={{
                width: "40px", height: "40px", backgroundColor: getGridColor(task), borderRadius: "4px",
                display: "flex", justifyContent: "center", alignItems: "center", fontSize: "10px", fontWeight: "bold", color: "rgba(255,255,255,0.7)", transition: "background-color 0.3s ease"
              }}
            >
              {task.status === "completed" ? Math.round(task.final_temp!) : ""}
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", width: "300px", border: "1px solid #0f3460", maxHeight: "420px", overflowY: "auto" }}>
          <h3 style={{ margin: "0 0 15px 0", borderBottom: "1px solid #0f3460", paddingBottom: "10px" }}>📱 รายชื่อเครื่องลูกข่าย</h3>
          {dashboardData.worker_stats.length === 0 ? (
            <p style={{ color: "#a5a5b0", textAlign: "center" }}>ยังไม่มีอุปกรณ์เชื่อมต่อ...</p>
          ) : (
            dashboardData.worker_stats.map((worker) => (
              <div key={worker.worker_id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", backgroundColor: "#0f3460", padding: "10px", borderRadius: "6px" }}>
                <span style={{ fontWeight: "bold" }}>{worker.worker_id}</span>
                <span style={{ color: "#4ecca3" }}>ทำไป {worker.tasks_completed} งาน</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}