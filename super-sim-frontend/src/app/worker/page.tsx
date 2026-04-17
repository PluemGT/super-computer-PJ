"use client";
import { useState, useEffect, useRef } from "react";

// ฟังก์ชันแกะรอยอุปกรณ์ (Device Detection)
const getDeviceName = () => {
  if (typeof window === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  
  if (/iPad|Macintosh.*(?=Mac OS X.*Mobile)/.test(ua)) return "iPad"; 
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Node";
};

export default function WorkerPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [workerName, setWorkerName] = useState("");
  
  const isWorkingRef = useRef(false);

  // 🎯 กำหนด IP เครื่อง Mac ของคุณตรงนี้ (ถ้าวันหลังเปลี่ยนเน็ต ค่อยมาแก้เลขตรงนี้นะครับ)
  const MASTER_NODE_IP = "172.20.10.6"; 

  useEffect(() => {
    let savedId = localStorage.getItem("cyrus_worker_id");
    
    if (!savedId) {
      const device = getDeviceName();
      const randomHex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase();
      savedId = `${device}-${randomHex}`; 
      localStorage.setItem("cyrus_worker_id", savedId); 
    }
    
    setWorkerName(savedId);

    // 🎯 ยิงตรงไปที่ IP Mac เลย ไม่ต้องพึ่ง hostname
    fetch(`http://${MASTER_NODE_IP}:8000/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_id: savedId }),
    }).catch(err => console.error("Register failed", err));
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 8)); 
  };

  const processNextTask = async () => {
    if (!isWorkingRef.current) {
      addLog("🛑 หยุดการทำงานชั่วคราว...");
      return;
    }

    try {
      // 🎯 ยิงตรงไปที่ IP Mac
      const res = await fetch(`http://${MASTER_NODE_IP}:8000/api/get-task`);
      const data = await res.json();

      if (!data.has_task) {
        addLog("✅ ซิมูเลชันเสร็จสิ้น! รอภารกิจใหม่...");
        setIsWorking(false);
        isWorkingRef.current = false;
        return;
      }

      const task = data.task;
      addLog(`[RECV] GRID(X:${task.grid_x}, Y:${task.grid_y}) | BASE_TEMP: ${task.start_temp.toFixed(2)}°C`);

      let currentTemp = task.start_temp;
      
      // แบ่งงานเป็น 10 ก้อนย่อย ให้มือถือได้พักหายใจ กันเว็บค้างและโดนบังคับรีเฟรช
      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < 10000; i++) {
          currentTemp += (Math.random() * 0.02) - 0.01; 
        }
        await new Promise(resolve => setTimeout(resolve, 100)); 
      }

      // 🎯 ยิงตรงไปที่ IP Mac
      await fetch(`http://${MASTER_NODE_IP}:8000/api/submit-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          task_id: task.id, 
          worker_id: workerName, 
          final_temp: currentTemp 
        }),
      });

      addLog(`[DONE] GRID(X:${task.grid_x}, Y:${task.grid_y}) | FINAL_TEMP: ${currentTemp.toFixed(2)}°C`);

      setTimeout(processNextTask, 1000);

    } catch (error) {
      addLog("⚠️ สัญญาณขัดข้อง กำลังเชื่อมต่อ Master Node ใหม่...");
      setTimeout(processNextTask, 3000); 
    }
  };

  const toggleWork = () => {
    if (isWorking) {
      setIsWorking(false);
      isWorkingRef.current = false;
    } else {
      setIsWorking(true);
      isWorkingRef.current = true;
      addLog(`🚀 [${workerName}] INITIATING CONNECTION...`);
      processNextTask();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] p-6 font-sans flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#064e3b]/20 via-[#0a0a0a] to-[#0a0a0a]"></div>

      <div className="z-10 w-full max-w-md bg-black/50 border border-[#064e3b] p-6 rounded-2xl shadow-[0_0_20px_rgba(6,78,59,0.3)] backdrop-blur-md">
        <h2 className="text-center text-xl font-black tracking-widest text-[#22c55e] mb-1 drop-shadow-[0_0_5px_#22c55e]">
          CYRUS // WORKER_NODE <span className="text-[10px] text-white">v2.0</span>
        </h2>
        <p className="text-center text-xs font-mono text-[#22c55e]/60 mb-6 uppercase">
          Identity: <span className="text-white font-bold">{workerName}</span>
        </p>
        
        <button 
          onClick={toggleWork} 
          className={`w-full py-4 text-sm font-bold uppercase tracking-widest rounded-lg transition-all duration-300 border ${
            isWorking 
              ? "bg-[#064e3b] text-[#22c55e] border-[#064e3b] shadow-[inset_0_0_10px_#000]" 
              : "bg-transparent text-[#22c55e] border-[#22c55e] hover:bg-[#22c55e] hover:text-black shadow-[0_0_15px_rgba(34,197,94,0.2)]"
          }`}
        >
          {isWorking ? "⏸️ SUSPEND CALCULATION" : "▶️ INITIALIZE CALCULATION"}
        </button>
      </div>

      <div className="z-10 w-full max-w-md mt-6 bg-[#050505] border border-[#064e3b]/50 p-4 rounded-xl shadow-inner h-64 overflow-hidden flex flex-col relative">
        <h3 className="text-[10px] uppercase font-mono text-[#22c55e]/50 border-b border-[#064e3b]/50 pb-2 mb-2">
          Terminal Console Output
        </h3>
        <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1">
          {logs.length === 0 ? (
            <div className="text-[#22c55e]/30 animate-pulse">AWAITING MASTER NODE DIRECTIVES...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="opacity-90">
                <span className="text-[#064e3b] mr-2">{">"}</span>{log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}