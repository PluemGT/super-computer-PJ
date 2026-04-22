// ไฟล์: src/app/stats/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#06b6d4", "#a855f7", "#ef4444"];

export default function StatisticsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [activeWorkers, setActiveWorkers] = useState<string[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/dashboard`);
        const data = await res.json();
        setDashboardData(data);

        const now = new Date();
        const timeString = `${now.getSeconds()}s`; 
        const newDataPoint: any = { time: timeString };
        const currentWorkers: string[] = [];

        data.worker_stats.forEach((worker: any) => {
          newDataPoint[worker.worker_id] = worker.tasks_completed;
          currentWorkers.push(worker.worker_id);
        });

        setActiveWorkers(currentWorkers);
        setHistoryData(prev => {
          const newHistory = [...prev, newDataPoint];
          if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
          return newHistory;
        });
      } catch (error) { console.error("Connection failed", error); }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!dashboardData) return <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] flex justify-center items-center font-mono animate-pulse">LOADING ANALYTICS...</div>;

  const aiTasks = dashboardData.map_data.filter((t: any) => t.status === 'completed' && t.ai_weight !== 0);
  const avgWeight = aiTasks.length > 0 ? (aiTasks.reduce((sum: number, t: any) => sum + t.ai_weight, 0) / aiTasks.length).toFixed(4) : "0.0000";
  const avgBias = aiTasks.length > 0 ? (aiTasks.reduce((sum: number, t: any) => sum + t.ai_bias, 0) / aiTasks.length).toFixed(4) : "0.0000";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] p-4 md:p-8 font-sans">
      <nav className="flex justify-between items-center mb-8 border-b border-[#064e3b] pb-4">
        <h2 className="text-xl md:text-2xl font-black tracking-widest drop-shadow-[0_0_5px_#22c55e]">CYRUS // STATISTICS</h2>
        <div className="flex gap-6 text-sm font-bold tracking-widest uppercase">
          <Link href="/main" className="text-[#064e3b] hover:text-[#22c55e]">DASHBOARD</Link>
          <Link href="/stats" className="border-b-2 border-[#22c55e] text-white">STATISTICS</Link>
          <Link href="/routing" className="text-[#064e3b] hover:text-[#22c55e]">NAVIGATOR</Link>
        </div>
      </nav>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)]">
            <h3 className="text-xs uppercase tracking-widest text-white mb-4 font-mono">AI Weights</h3>
            <div className="space-y-4">
               <div className="bg-[#050505] p-4 rounded-lg border border-[#064e3b]/50">
                  <div className="text-[10px] opacity-60">AVG WEIGHT (w)</div>
                  <div className="text-2xl font-mono text-[#3b82f6]">{avgWeight}</div>
               </div>
               <div className="bg-[#050505] p-4 rounded-lg border border-[#064e3b]/50">
                  <div className="text-[10px] opacity-60">AVG BIAS (b)</div>
                  <div className="text-2xl font-mono text-[#f97316]">{avgBias}</div>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-black/50 border border-[#064e3b] p-6 rounded-xl">
          <h3 className="text-xs uppercase tracking-widest text-white mb-6 font-mono">Live Node Performance</h3>
          <div className="h-80 w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" opacity={0.3} />
                <XAxis dataKey="time" stroke="#22c55e" opacity={0.5} />
                <YAxis stroke="#22c55e" opacity={0.5} />
                <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #064e3b' }} />
                <Legend />
                {activeWorkers.map((id, index) => (
                  <Line key={id} type="monotone" dataKey={id} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}