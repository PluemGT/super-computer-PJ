"use client";
import { useState } from "react";

export default function WorkerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  const addLog = (msg: string) => {
    // เพิ่มข้อความใหม่ลงไปในหน้าจอ
    setLogs((prev) => [...prev, msg]);
  };

  const startWork = async () => {
    setIsWorking(true);
    addLog("🚀 เริ่มเชื่อมต่อกับ Master Node...");

    let hasWork = true;
    while (hasWork) {
      try {
        // 1. ทักไปขอรับงานจาก Mac ของคุณ
      const res = await fetch("http://172.20.10.5:8000/api/get-task");
        const data = await res.json();

        if (!data.task) {
          addLog("✅ ไม่มีงานเหลือแล้ว! ศูนย์บัญชาการบอกว่างานเสร็จหมดแล้ว");
          hasWork = false;
          break;
        }

        const task = data.task;
        addLog(`📦 ได้รับงาน ID: ${task.task_id} (หาจำนวนเฉพาะตั้งแต่ ${task.start} ถึง ${task.end})`);

        // 2. เริ่มคำนวณ (นี่คือจุดที่ใช้ CPU ของเครื่องที่เปิดเว็บนี้)
        let primesCount = 0;
        for (let i = task.start; i <= task.end; i++) {
          let isPrime = true;
          if (i < 2) isPrime = false;
          for (let j = 2; j <= Math.sqrt(i); j++) {
            if (i % j === 0) {
              isPrime = false;
              break;
            }
          }
          if (isPrime) primesCount++;
        }

        addLog(`🧠 คำนวณเสร็จ! งาน ID: ${task.task_id} เจอจำนวนเฉพาะ ${primesCount} ตัว`);

        // 3. ส่งผลลัพธ์กลับไปที่ Mac
       await fetch(`http://${window.location.hostname}:8000/api/submit-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: task.task_id, primes_found: primesCount }),
        });

        addLog(`📤 ส่งผลลัพธ์ ID: ${task.task_id} คืนให้ Master Node สำเร็จ!`);

      } catch (error) {
        addLog("❌ เกิดข้อผิดพลาด! เชื่อมต่อ Master Node ไม่ได้");
        hasWork = false;
      }
    }
    setIsWorking(false);
  };

  return (
    <div style={{ padding: "30px", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1>📱 Virtual Worker Node</h1>
      <p>เปิดหน้านี้ทิ้งไว้เพื่อยืม CPU ของเครื่องนี้ช่วยประมวลผลให้ Supercomputer</p>
      
      <button 
        onClick={startWork} 
        disabled={isWorking}
        style={{ 
          padding: "15px 30px", fontSize: "18px", cursor: "pointer", 
          backgroundColor: isWorking ? "#ccc" : "#0070f3", color: "white", 
          border: "none", borderRadius: "8px", width: "100%", fontWeight: "bold"
        }}
      >
        {isWorking ? "กำลังประมวลผลอย่างหนัก... ⚙️" : "▶️ กดเพื่อเริ่มช่วยคำนวณ"}
      </button>

      <div style={{ 
        marginTop: "20px", background: "#1e1e1e", color: "#00ff00", 
        padding: "15px", borderRadius: "8px", height: "400px", 
        overflowY: "scroll", fontFamily: "monospace" 
      }}>
        {logs.length === 0 ? "รอรับคำสั่ง..." : logs.map((log, index) => <div key={index} style={{ marginBottom: "8px" }}>{log}</div>)}
      </div>
    </div>
  );
}