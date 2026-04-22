// ไฟล์: src/app/main/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("./Map"), { ssr: false });

export default function MainDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [workerUrl, setWorkerUrl] = useState("");
  
  // 🎯 State สำหรับควบคุมแผนที่
  const [mapRadius, setMapRadius] = useState(50000); 
  const [mapOpacity, setMapOpacity] = useState(0.4); 

  // 🚀 State สำหรับ Loading Bar ของบอท
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [isReporting, setIsReporting] = useState(false);

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
    const interval = setInterval(fetchDashboard, 1000); // ดึงข้อมูลทุก 1 วินาที
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    if (confirm("⚠️ รีเซ็ตข้อมูลทั้งหมด?")) {
      localStorage.removeItem("cyrus_flight_path"); 
      await fetch(`http://${window.location.hostname}:8000/api/reset`, { method: "POST" });
    }
  };

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/upload-csv`, {
        method: "POST",
        body: formData,
      });
      const responseData = await res.json();
      if (res.ok) alert(`📥 ระบบแจ้งว่า: ${responseData.message}`); 
      else alert("❌ อัปโหลดไม่สำเร็จ");
    } catch (error) { console.error("Upload failed", error); }
  };

  // 🚀 ฟังก์ชันเรียกบอท Scraper (พร้อม Progress Bar)
  const handleRunScraper = async () => {
    setIsScraping(true);
    setScrapeProgress(0);

    // จำลองหลอดโหลด (เพิ่มขึ้น 5% ทุกๆ 1 วินาที)
    const interval = setInterval(() => {
      setScrapeProgress((prev) => {
        if (prev >= 95) return 95; // ค้างไว้ที่ 95% รอ Backend ส่งสัญญาณ
        return prev + 5;
      });
    }, 1000);

    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/trigger-scraper`, { method: "POST" });
      const data = await res.json();
      
      clearInterval(interval);
      setScrapeProgress(100); 
      
      setTimeout(() => {
        alert(`📡 ระบบแจ้งว่า: ${data.message || data.error}`);
        setIsScraping(false);
        setScrapeProgress(0);
      }, 500);

    } catch (error) {
      clearInterval(interval);
      console.error("Scraper Error:", error);
      alert("❌ ไม่สามารถติดต่อบอทได้ กรุณาตรวจสอบ Backend");
      setIsScraping(false);
      setScrapeProgress(0);
    }
  };

  // 🚀 ฟังก์ชันเรียกบอทสร้าง Excel
  const handleSendReport = async () => {
    setIsReporting(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/trigger-report`, { method: "POST" });
      const data = await res.json();
      alert(`✅ ระบบแจ้งว่า: ${data.message || data.error}`);
    } catch (error) {
      console.error("Report Error:", error);
      alert("❌ ไม่สามารถส่ง Email ได้ กรุณาตรวจสอบ Backend");
    }
    setIsReporting(false);
  };

  const getMarkerColor = (status: string, temp: number | null) => {
    if (status === "pending") return "#6b7280"; 
    if (status === "processing") return "#eab308"; 
    const t = temp || 0;
    if (t < 25) return "#3b82f6"; 
    if (t < 28) return "#22c55e"; 
    if (t < 32) return "#f97316"; 
    return "#ef4444"; 
  };

  if (!dashboardData) return <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] flex justify-center items-center font-mono animate-pulse">CONNECTING TO CYRUS CORE...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] p-4 md:p-8 font-sans">
      <nav className="flex justify-between items-center mb-8 border-b border-[#064e3b] pb-4">
        <h2 className="text-xl md:text-2xl font-black tracking-widest drop-shadow-[0_0_5px_#22c55e]">CYRUS // MASTER_NODE</h2>
        <div className="flex gap-6 text-sm font-bold tracking-widest uppercase">
          <Link href="/main" className="border-b-2 border-[#22c55e] text-white">DASHBOARD</Link>
          <Link href="/stats" className="text-[#064e3b] hover:text-[#22c55e] transition-colors">STATISTICS</Link>
          <Link href="/routing" className="text-[#064e3b] hover:text-[#22c55e] transition-colors">NAVIGATOR</Link>
          <button onClick={handleReset} className="text-red-500 hover:text-red-400">RESET</button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ================= เลนซ้าย ================= */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          
          {/* 1. Map Tuning Engine */}
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-4 font-mono">Map Tuning Engine</h3>
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-xs font-mono text-[#22c55e] mb-1">
                  <span>Spread Radius:</span><span className="text-white">{(mapRadius / 1000).toFixed(0)} KM</span>
                </label>
                <input type="range" min="10000" max="150000" step="5000" value={mapRadius} onChange={(e) => setMapRadius(Number(e.target.value))} className="w-full accent-[#22c55e]"/>
              </div>
              <div>
                <label className="flex justify-between text-xs font-mono text-[#22c55e] mb-1">
                  <span>Layer Opacity:</span><span className="text-white">{(mapOpacity * 100).toFixed(0)}%</span>
                </label>
                <input type="range" min="0.1" max="0.9" step="0.05" value={mapOpacity} onChange={(e) => setMapOpacity(Number(e.target.value))} className="w-full accent-[#22c55e]"/>
              </div>
            </div>
          </div>

          {/* 2. Dataset Injector (RPA Scraper) */}
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-4 font-mono">Dataset Injector</h3>
            <div className="space-y-3">
              <button 
                onClick={handleRunScraper} 
                disabled={isScraping}
                className={`w-full py-2 border font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                  isScraping ? "bg-[#3b82f6]/20 border-[#3b82f6] text-white cursor-not-allowed" : "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white"
                }`}
              >
                {isScraping && (
                  <div className="absolute left-0 top-0 h-full bg-[#3b82f6]/40 transition-all duration-500 ease-out" style={{ width: `${scrapeProgress}%` }}></div>
                )}
                <span className="relative z-10 flex items-center gap-2 drop-shadow-md">
                  {isScraping ? (
                    <>
                      <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      EXTRACTING DATA... {scrapeProgress}%
                    </>
                  ) : "🤖 AUTO-SCRAPE LIVE WEATHER"}
                </span>
              </button>
              
              <div className="text-center text-[10px] text-gray-500 font-mono">-- OR --</div>

              <label className="flex flex-col items-center justify-center w-full h-10 border-2 border-[#064e3b] border-dashed rounded-lg cursor-pointer hover:bg-[#064e3b]/30 transition-all">
                <span className="text-[10px] font-mono text-[#22c55e] opacity-80">UPLOAD .CSV MANUAL</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {/* 3. RPA Executive Report */}
          <div className="bg-black/50 border border-[#eab308]/50 p-6 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.1)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#eab308]/80 mb-2 font-mono">RPA Executive Report</h3>
            <p className="text-[9px] text-gray-400 mb-4 font-mono leading-tight">Generate Excel analytics and send automated alerts to management via Email.</p>
            <button 
              onClick={handleSendReport} 
              disabled={isReporting}
              className={`w-full py-3 border font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)] flex items-center justify-center gap-2 ${
                isReporting ? "bg-[#eab308]/30 border-[#eab308] text-white cursor-not-allowed" : "bg-[#eab308]/10 border-[#eab308] text-[#eab308] hover:bg-[#eab308] hover:text-black"
              }`}
            >
              {isReporting ? (
                <><svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> COMPILING...</>
              ) : "📧 COMPILE & SEND REPORT"}
            </button>
          </div>

          {/* 4. 👑 Worker Connection (QR Code เอากลับมาแล้ว!) */}
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-4 font-mono">Worker Connection</h3>
            <div className="bg-white p-2 rounded-lg w-fit mx-auto shadow-[0_0_15px_#22c55e]">
              {workerUrl && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(workerUrl)}`} alt="QR Code" />}
            </div>
            <p className="text-center mt-4 text-[10px] text-[#22c55e] font-mono opacity-60 break-all">{workerUrl}</p>
          </div>

          {/* 5. Processing Status */}
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-2 font-mono">Processing Status</h3>
            <div className="text-4xl font-black text-white mb-3 drop-shadow-[0_0_8px_#22c55e]">{dashboardData.progress_percent.toFixed(1)}%</div>
            <div className="w-full bg-[#111] h-2 rounded-full overflow-hidden border border-[#064e3b]">
               <div className="bg-[#22c55e] h-full transition-all duration-500 shadow-[0_0_10px_#22c55e]" style={{ width: `${dashboardData.progress_percent}%` }}></div>
            </div>
          </div>

        </div>

        {/* ================= เลนขวา ================= */}
        <div className="col-span-1 lg:col-span-8 bg-black/50 border border-[#064e3b] p-4 md:p-6 rounded-xl shadow-[0_0_20px_rgba(6,78,59,0.2)] backdrop-blur-md flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 font-mono">Geospatial Map</h3>
             <span className="text-[10px] text-white font-mono bg-[#064e3b] px-2 py-1 rounded">ACTIVE NODES: {dashboardData.total_workers}</span>
          </div>
          
          <div className="w-full h-[450px] rounded-lg border border-[#064e3b] overflow-hidden relative z-0">
            <DynamicMap mapData={dashboardData.map_data} getMarkerColor={getMarkerColor} radius={mapRadius} opacity={mapOpacity} />
          </div>

          <div className="mt-4 w-full overflow-hidden border border-[#064e3b]/50 rounded-lg bg-[#050505]">
            <table className="w-full text-[10px] font-mono text-left">
              <thead className="bg-[#064e3b]/20 text-[#22c55e]/70 uppercase tracking-tighter">
                <tr>
                  <th className="p-2 border-b border-[#064e3b]/50">Location</th>
                  <th className="p-2 border-b border-[#064e3b]/50 text-center">Consensus</th>
                  <th className="p-2 border-b border-[#064e3b]/50">AI Weight(w)</th>
                  <th className="p-2 border-b border-[#064e3b]/50">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#064e3b]/20">
                {dashboardData.map_data.filter((t: any) => t.results_count > 0).slice(-4).reverse().map((task: any) => (
                  <tr key={task.id} className="hover:bg-[#22c55e]/5">
                    <td className="p-2 font-bold text-white">{task.region}</td>
                    <td className="p-2 text-center text-[#eab308] font-bold">{task.results_count}/2</td>
                    <td className="p-2 text-[#22c55e]">{task.ai_weight ? task.ai_weight.toFixed(4) : '-'}</td>
                    <td className="p-2 italic text-[9px] opacity-80">
                      {task.status === 'completed' ? <span className="text-[#22c55e]">🟢 VERIFIED</span> : <span className="text-[#eab308]">🟡 PEER WAIT</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}