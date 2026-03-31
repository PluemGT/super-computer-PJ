"use client";
import { useState, useEffect } from "react";

export default function WorkerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [workerName, setWorkerName] = useState("");

  useEffect(() => {
    const randomName = "Worker-" + Math.floor(Math.random() * 10000);
    setWorkerName(randomName);
    
    // 🎯 แก้จุดที่ 1: ลงทะเบียน (ยิงไปพอร์ต 8000 ตรงๆ)
    fetch(`http://${window.location.hostname}:8000/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_id: randomName }),
    }).catch(err => console.error("Register failed", err));
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 10)); 
  };

  const startWork = async () => {
    setIsWorking(true);
    addLog(`🚀 [${workerName}] เริ่มเชื่อมต่อกับ Master Node...`);

    let hasWork = true;
    while (hasWork) {
      try {
        // 🎯 แก้จุดที่ 2: ขอรับงาน (ยิงไปพอร์ต 8000 ตรงๆ)
        const res = await fetch(`http://${window.location.hostname}:8000/api/get-task`);
        const data = await res.json();

        if (!data.has_task) {
          addLog("✅ ซิมูเลชันเสร็จสิ้น! ไม่มีพื้นที่เหลือให้คำนวณแล้ว");
          hasWork = false;
          break;
        }

        const task = data.task;
        addLog(`📦 รับงาน: แผนที่พิกัด (X:${task.grid_x}, Y:${task.grid_y}) อุณหภูมิเริ่มต้น ${task.start_temp.toFixed(2)}°C`);

        // เริ่มคำนวณ (สมการพยากรณ์อากาศที่กิน CPU)
        let currentTemp = task.start_temp;
        for (let i = 0; i < 5000000; i++) {
            currentTemp += (Math.random() * 0.02) - 0.01; 
        }

        addLog(`🧠 คำนวณเสร็จ! พิกัด (X:${task.grid_x}, Y:${task.grid_y}) อุณหภูมิใหม่คือ ${currentTemp.toFixed(2)}°C`);

        // 🎯 แก้จุดที่ 3: ส่งงานกลับ (ยิงไปพอร์ต 8000 ตรงๆ)
        await fetch(`http://${window.location.hostname}:8000/api/submit-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            task_id: task.id, 
            worker_id: workerName, 
            final_temp: currentTemp 
          }),
        });

        addLog(`📤 ส่งข้อมูลพิกัด (X:${task.grid_x}, Y:${task.grid_y}) กลับศูนย์บัญชาการสำเร็จ!`);
        await new Promise(r => setTimeout(r, 1000));

      } catch (error) {
        addLog("❌ ขาดการเชื่อมต่อกับ Master Node กำลังลองใหม่...");
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    setIsWorking(false);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "500px", margin: "0 auto", backgroundColor: "#f0f4f8", minHeight: "100vh" }}>
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h2 style={{ textAlign: "center", color: "#2c3e50" }}>☁️ Weather Node</h2>
        <p style={{ textAlign: "center", color: "#7f8c8d", fontWeight: "bold" }}>
          ชื่อเครื่องของคุณ: <span style={{ color: "#2980b9" }}>{workerName}</span>
        </p>
        
        <button 
          onClick={startWork} 
          disabled={isWorking}
          style={{ 
            padding: "15px", fontSize: "16px", cursor: "pointer", 
            backgroundColor: isWorking ? "#bdc3c7" : "#27ae60", color: "white", 
            border: "none", borderRadius: "8px", width: "100%", fontWeight: "bold",
            marginTop: "10px", transition: "all 0.3s ease"
          }}
        >
          {isWorking ? "กำลังรันแบบจำลองสภาพอากาศ... ⚙️" : "▶️ สแตนด์บายพร้อมช่วยคำนวณ"}
        </button>
      </div>

      <div style={{ 
        marginTop: "20px", background: "#2c3e50", color: "#ecf0f1", 
        padding: "15px", borderRadius: "8px", height: "350px", 
        overflowY: "auto", fontFamily: "monospace", fontSize: "12px",
        boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)"
      }}>
        {logs.length === 0 ? "รอรับคำสั่งจาก Master Node..." : logs.map((log, index) => (
          <div key={index} style={{ marginBottom: "8px", borderBottom: "1px solid #34495e", paddingBottom: "4px" }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}