// ไฟล์: src/app/main/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; // นำเข้า Link ของ Next.js

export default function MainDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [workerUrl, setWorkerUrl] = useState("");

  useEffect(() => {
    setWorkerUrl(`http://${window.location.hostname}:3000/worker`);
    
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/dashboard`);
        const data = await res.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Connection failed", error);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    if (confirm("⚠️ รีเซ็ตข้อมูลทั้งหมด?")) {
      await fetch(`http://${window.location.hostname}:8000/api/reset`, { method: "POST" });
    }
  };

  const getGridColor = (status: string, temp: number | null) => {
    if (status === "pending") return "bg-[#111] border-[#064e3b]";
    if (status === "processing") return "bg-[#eab308] animate-pulse";
    
    const t = temp || 0;
    if (t < 25) return "bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]";
    if (t < 28) return "bg-[#22c55e] shadow-[0_0_10px_#22c55e]";
    if (t < 32) return "bg-[#f97316] shadow-[0_0_10px_#f97316]";
    return "bg-[#ef4444] shadow-[0_0_10px_#ef4444]";
  };

  if (!dashboardData) return <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] flex justify-center items-center font-mono">CONNECTING TO CYRUS CORE...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] p-4 md:p-8 font-sans">
      {/* Navigation */}
      <nav className="flex justify-between items-center mb-8 border-b border-[#064e3b] pb-4">
        <h2 className="text-xl md:text-2xl font-black tracking-widest drop-shadow-[0_0_5px_#22c55e]">CYRUS // MASTER_NODE</h2>
        <div className="flex gap-6 text-sm font-bold tracking-widest">
          {/* 🎯 จุดที่แก้ไข: เปลี่ยนแท็ก a เป็น Link */}
          <Link href="/main" className="border-b-2 border-[#22c55e] text-white">DASHBOARD</Link>
          <Link href="/stats" className="text-[#064e3b] hover:text-[#22c55e] transition-colors">STATISTICS</Link>
          <button onClick={handleReset} className="text-red-500 hover:text-red-400">RESET</button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Management */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          {/* QR Code Zone */}
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-4 font-mono">Worker Connection</h3>
            <div className="bg-white p-2 rounded-lg w-fit mx-auto shadow-[0_0_15px_#22c55e]">
              {workerUrl && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(workerUrl)}`} alt="QR Code" />}
            </div>
            <p className="text-center mt-4 text-[11px] text-[#22c55e] font-mono opacity-80 break-all">{workerUrl}</p>
          </div>

          {/* Progress Zone */}
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-2 font-mono">Processing Status</h3>
            <div className="text-4xl font-black text-white mb-3 drop-shadow-[0_0_8px_#22c55e]">{dashboardData.progress_percent.toFixed(1)}%</div>
            <div className="w-full bg-[#111] h-2 rounded-full overflow-hidden border border-[#064e3b]">
               <div className="bg-[#22c55e] h-full transition-all duration-500 shadow-[0_0_10px_#22c55e]" style={{ width: `${dashboardData.progress_percent}%` }}></div>
            </div>
            <div className="mt-4 flex justify-between text-xs font-mono border-t border-[#064e3b] pt-3">
              <span className="text-[#22c55e]/70">ACTIVE NODES:</span>
              <span className="text-white font-bold">{dashboardData.total_workers} DEVICES</span>
            </div>
          </div>
        </div>

        {/* Right Column: Heatmap */}
        <div className="col-span-1 lg:col-span-8 bg-black/50 border border-[#064e3b] p-6 md:p-8 rounded-xl shadow-[0_0_20px_rgba(6,78,59,0.2)] backdrop-blur-md flex flex-col items-center">
          <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-6 font-mono self-start">Grid Simulation Map</h3>
          
          <div className="grid grid-cols-10 gap-1 md:gap-2 w-full max-w-2xl">
            {dashboardData.map_data.map((task: any) => (
              <div 
                key={task.id}
                title={`Worker: ${task.worker_id || 'None'} | Temp: ${task.final_temp?.toFixed(1) || '-'}`}
                className={`aspect-square rounded-sm md:rounded-md border flex items-center justify-center text-[8px] md:text-xs font-black text-white/90 transition-all duration-300 ${getGridColor(task.status, task.final_temp)}`}
              >
                {task.status === "completed" ? Math.round(task.final_temp) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}