// ไฟล์: src/app/worker/page.tsx
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
  
  // 🎯 State สำหรับกราฟ AI
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  
  const isWorkingRef = useRef(false);

  // 🎯 เอากลับมาแล้ว! ล็อค IP เครื่อง Mac ของคุณปลื้ม
  const MASTER_NODE_IP = "172.20.10.13"; 

  useEffect(() => {
    let savedId = localStorage.getItem("cyrus_worker_id");
    
    if (!savedId) {
      const device = getDeviceName();
      const randomHex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase();
      savedId = `${device}-${randomHex}`; 
      localStorage.setItem("cyrus_worker_id", savedId); 
    }
    
    setWorkerName(savedId);

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
      const res = await fetch(`http://${MASTER_NODE_IP}:8000/api/get-task`);
      const data = await res.json();

      if (!data.has_task) {
        addLog("✅ ซิมูเลชันเสร็จสิ้น! รอภารกิจใหม่...");
        setIsWorking(false);
        isWorkingRef.current = false;
        return;
      }

      const task = data.task;
      
      addLog(`[RECV] TARGET: ${task.region || 'Unknown'} | BASE: ${task.start_temp.toFixed(2)}°C`);
      addLog(`🧠 [AI] INITIATING ML TRAINING (GRADIENT DESCENT)...`);

      const baseTemp = task.start_temp;
      const historicalData = [
        { day: 1, temp: baseTemp - 1.5 },
        { day: 2, temp: baseTemp - 0.8 },
        { day: 3, temp: baseTemp + 0.5 },
        { day: 4, temp: baseTemp + 0.1 },
        { day: 5, temp: baseTemp + 1.2 },
      ];

      let weight = 0; 
      let bias = 0;   
      const learningRate = 0.01;
      const epochs = 50000; 

      // ล้างกราฟก่อนเทรนจังหวัดใหม่
      let localLossHistory: number[] = [];
      setLossHistory([]);

      for (let epoch = 0; epoch < epochs; epoch++) {
        let totalErrorW = 0;
        let totalErrorB = 0;
        let epochLoss = 0; // เก็บค่าความคลาดเคลื่อนรวม

        for (let i = 0; i < historicalData.length; i++) {
          const x = historicalData[i].day;
          const y = historicalData[i].temp;
          
          const prediction = (weight * x) + bias;
          const error = y - prediction;

          epochLoss += error * error; // คำนวณ Loss
          totalErrorW += -2 * x * error;
          totalErrorB += -2 * error;
        }

        weight -= (totalErrorW / historicalData.length) * learningRate;
        bias -= (totalErrorB / historicalData.length) * learningRate;

        // 🎯 อัปเดตกราฟโชว์กรรมการทุกๆ 5,000 รอบ
        if (epoch % 5000 === 0) {
          const mse = epochLoss / historicalData.length;
          localLossHistory.push(mse);
          setLossHistory([...localLossHistory]);
          setCurrentEpoch(epoch);
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }
      }

      const predictedTemp = (weight * 6) + bias;

      addLog(`[AI] MODEL OPTIMIZED | W: ${weight.toFixed(3)}, B: ${bias.toFixed(3)}`);

      await fetch(`http://${MASTER_NODE_IP}:8000/api/submit-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          task_id: task.id, 
          worker_id: workerName, 
          final_temp: predictedTemp,
          ai_weight: weight,
          ai_bias: bias
        }),
      });

      addLog(`[DONE] PREDICTED TEMP: ${predictedTemp.toFixed(2)}°C`);

      setTimeout(processNextTask, 1500);

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
          CYRUS // WORKER_NODE <span className="text-[10px] text-white">v5.0 (Edge AI)</span>
        </h2>
        <p className="text-center text-xs font-mono text-[#22c55e]/60 mb-6 uppercase">
          Identity: <span className="text-white font-bold">{workerName}</span>
        </p>
        
        {/* 🎯 แผงกราฟ AI เอามาใส่ไว้เหนือปุ่มเหมือนเดิม */}
        {isWorking && (
          <div className="mb-6 p-4 bg-[#050505] border border-[#064e3b] rounded-xl shadow-inner">
            <div className="flex justify-between items-end mb-2 font-mono text-[10px]">
              <span className="text-cyan-400">AI LEARNING LOSS (MSE)</span>
              <span className="text-[#22c55e]">EPOCH: {currentEpoch}/50000</span>
            </div>
            
            <div className="h-20 w-full flex items-end gap-1 border-b border-[#064e3b] pb-1">
              {lossHistory.map((loss, idx) => {
                const maxLoss = Math.max(...lossHistory, 0.1);
                const heightPercent = Math.max((loss / maxLoss) * 100, 5); 
                return (
                  <div 
                    key={idx} 
                    className="flex-1 bg-gradient-to-t from-[#22c55e] to-[#00f6ff] transition-all duration-300"
                    style={{ height: `${heightPercent}%`, opacity: 0.8 + (idx * 0.02) }}
                  ></div>
                );
              })}
            </div>
            <div className="text-center mt-2 text-[9px] font-mono opacity-50">
              OPTIMIZING WEIGHTS & BIAS...
            </div>
          </div>
        )}

        <button 
          onClick={toggleWork} 
          className={`w-full py-4 text-sm font-bold uppercase tracking-widest rounded-lg transition-all duration-300 border ${
            isWorking 
              ? "bg-[#064e3b] text-[#22c55e] border-[#064e3b] shadow-[inset_0_0_10px_#000]" 
              : "bg-transparent text-[#22c55e] border-[#22c55e] hover:bg-[#22c55e] hover:text-black shadow-[0_0_15px_rgba(34,197,94,0.2)]"
          }`}
        >
          {isWorking ? "⏸️ SUSPEND AI TRAINING" : "▶️ INITIALIZE AI ENGINE"}
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