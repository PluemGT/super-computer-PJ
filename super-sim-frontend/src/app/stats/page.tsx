// ไฟล์: src/app/stats/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// เซ็ตสีสำหรับแต่ละ Node ให้ดูเป็นสไตล์ Matrix (เขียวหลากหลายเฉด)
const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#06b6d4", "#a855f7", "#ef4444"];

export default function StatisticsPage() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [activeWorkers, setActiveWorkers] = useState<string[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/dashboard`);
        const data = await res.json();
        
        // สร้าง Data Point สำหรับเวลาปัจจุบัน
        const now = new Date();
        const timeString = `${now.getSeconds()}s`; // แกน X เป็นวินาที
        
        const newDataPoint: any = { time: timeString };
        const currentWorkers: string[] = [];

        // เอาข้อมูลของแต่ละเครื่องมาใส่ในจุดเวลาเดียวกัน
        data.worker_stats.forEach((worker: any) => {
          newDataPoint[worker.worker_id] = worker.tasks_completed;
          currentWorkers.push(worker.worker_id);
        });

        setActiveWorkers(currentWorkers);

        // เก็บประวัติย้อนหลัง 20 รอบ (20 วินาที) เพื่อให้กราฟวิ่งเป็นหน้ากระดาน
        setHistoryData(prev => {
          const newHistory = [...prev, newDataPoint];
          if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
          return newHistory;
        });

      } catch (error) {
        console.error("Connection failed", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] p-4 md:p-8 font-sans">
      <nav className="flex justify-between items-center mb-8 border-b border-[#064e3b] pb-4">
        <h2 className="text-xl md:text-2xl font-black tracking-widest drop-shadow-[0_0_5px_#22c55e]">CYRUS // NODE_ANALYTICS</h2>
        <div className="flex gap-6 text-sm font-bold tracking-widest">
          <Link href="/main" className="text-[#064e3b] hover:text-[#22c55e] transition-colors">DASHBOARD</Link>
          <Link href="/stats" className="border-b-2 border-[#22c55e] text-white">STATISTICS</Link>
        </div>
      </nav>
      
      <div className="grid grid-cols-1 gap-8">
        {/* Real-time Control Chart Zone */}
        <div className="bg-black/50 border border-[#064e3b] p-6 md:p-8 rounded-xl shadow-[0_0_20px_rgba(6,78,59,0.2)]">
          <h3 className="text-[#22c55e]/70 mb-6 uppercase text-xs tracking-widest font-mono">
            Node Performance Control Chart (Live)
          </h3>
          
          <div className="h-80 w-full font-mono text-xs">
            {historyData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-[#064e3b] animate-pulse">
                INITIALIZING SENSORS...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#22c55e" opacity={0.7} />
                  <YAxis stroke="#22c55e" opacity={0.7} />
                  
                  {/* Tooltip สวยๆ เวลาเอาเมาส์ชี้ */}
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #064e3b', borderRadius: '8px' }}
                    itemStyle={{ color: '#22c55e' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                  
                  {/* วนลูปสร้างเส้นกราฟให้ครบทุกเครื่องที่เชื่อมต่ออยู่ */}
                  {activeWorkers.map((workerId, index) => (
                    <Line 
                      key={workerId}
                      type="monotone" 
                      dataKey={workerId} 
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false} // ปิดอนิเมชันตอนโหลดเพื่อให้เส้นวิ่งต่อเนื่องสมูทๆ
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI Heuristic Log Simulator (เอาไว้ด้านล่าง) */}
        <div className="bg-black/50 border border-[#064e3b] p-6 md:p-8 rounded-xl shadow-[0_0_20px_rgba(6,78,59,0.2)]">
          <h3 className="text-[#22c55e]/70 mb-4 uppercase text-xs tracking-widest font-mono">Heuristic Search Engine (A*)</h3>
          <div className="bg-[#111] p-4 rounded-md border border-[#064e3b] font-mono text-[10px] md:text-xs text-[#22c55e]/80 h-32 overflow-hidden">
             <div className="text-white mb-2 underline drop-shadow-[0_0_2px_white]">{">>>"} SYSTEM INITIATED</div>
             <div className="opacity-70">[OK] ALGORITHM READY...</div>
             <div className="text-[#eab308] mt-2">[WARN] AWAITING GRID COMPLETION...</div>
             <div className="animate-pulse mt-4 font-bold text-[#22c55e]">{">>>"} READY FOR PATHFINDING_</div>
          </div>
        </div>
      </div>
    </div>
  );
}