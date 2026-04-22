// ไฟล์: src/app/routing/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("@/app/main/Map"), { ssr: false });

export default function NavigatorPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [startRegion, setStartRegion] = useState("");
  const [endRegion, setEndRegion] = useState("");
  const [aStarLogs, setAStarLogs] = useState<string[]>([]);
  const [isPathfinding, setIsPathfinding] = useState(false);
  
  // State สำหรับเก็บเส้นทาง และ ตำแหน่งปัจจุบันของเครื่องบิน
  const [flightPath, setFlightPath] = useState<any[]>([]);
  const [airplanePos, setAirplanePos] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/dashboard`);
        const data = await res.json();
        setDashboardData(data);
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);

    const savedPath = localStorage.getItem("cyrus_flight_path");
    if (savedPath) {
      const parsedPath = JSON.parse(savedPath);
      setFlightPath(parsedPath);
      setAirplanePos(parsedPath[parsedPath.length - 1]); // ให้เครื่องบินจอดปลายทาง
    }
    return () => clearInterval(interval);
  }, []);

  const runAStar = async () => {
    if (!dashboardData || isPathfinding) return;
    setIsPathfinding(true);
    setAStarLogs([]);
    setFlightPath([]);
    setAirplanePos(null);
    
    const addLog = (m: string) => setAStarLogs(p => [...p, m]);

    const nodes = dashboardData.map_data.filter((t: any) => t.status === 'completed');
    const startNode = nodes.find((n: any) => n.region === startRegion);
    const endNode = nodes.find((n: any) => n.region === endRegion);

    if (!startNode || !endNode) {
      addLog("[ERROR] PLEASE SELECT VERIFIED WAYPOINTS.");
      setIsPathfinding(false);
      return;
    }

    addLog(`[TARGET] ROUTE: ${startNode.region} -> ${endNode.region}`);
    addLog(`[RULE] AVOID TEMP > 33.0°C`);
    await new Promise(r => setTimeout(r, 600));

    let current = startNode;
    let path = [current.region];
    let pathCoords = [[current.grid_x, current.grid_y]];
    
    // 🎯 เริ่มจุด Start บนแผนที่ทันที
    setFlightPath([...pathCoords]);
    setAirplanePos([current.grid_x, current.grid_y]);

    const getDist = (n1: any, n2: any) => Math.sqrt(Math.pow(n1.grid_x - n2.grid_x, 2) + Math.pow(n1.grid_y - n2.grid_y, 2));

    for (let i = 0; i < 20; i++) {
      addLog(`> ANALYZING SECTORS NEAR [${current.region.toUpperCase()}]...`);
      let neighbors = nodes.filter((n: any) => n.id !== current.id && !path.includes(n.region) && getDist(current, n) < 3.5);
      
      neighbors.sort((a: any, b: any) => {
        let costA = getDist(a, endNode) + (a.final_temp > 33 ? 999 : 0);
        let costB = getDist(b, endNode) + (b.final_temp > 33 ? 999 : 0);
        return costA - costB;
      });

      if (neighbors.length === 0 || neighbors[0].final_temp > 33) {
        addLog(`[!] DEAD END: HIGH TEMP OBSTACLE DETECTED.`);
        break;
      }

      // เดินทางไปจุดต่อไป
      current = neighbors[0];
      path.push(current.region);
      pathCoords.push([current.grid_x, current.grid_y]);
      
      // 🎯 อัปเดตเส้นทางและเครื่องบินให้ขยับสดๆ กลางลูปเลย!
      setFlightPath([...pathCoords]);
      setAirplanePos([current.grid_x, current.grid_y]);

      addLog(`   >> ADVANCING TO [${current.region.toUpperCase()}] | ${current.final_temp.toFixed(2)}°C`);
      
      // หน่วงเวลาให้ดูเหมือนกำลังบิน (เปลี่ยนเลข 600 ได้ถ้าอยากให้บินเร็วขึ้นหรือช้าลง)
      await new Promise(r => setTimeout(r, 600));

      if (getDist(current, endNode) < 1.5) {
        path.push(endNode.region);
        pathCoords.push([endNode.grid_x, endNode.grid_y]);
        
        // 🎯 เครื่องบินถึงปลายทาง
        setFlightPath([...pathCoords]);
        setAirplanePos([endNode.grid_x, endNode.grid_y]);
        
        addLog(`[SUCCESS] TARGET ACQUIRED: [${endNode.region.toUpperCase()}]`);
        break;
      }
    }

    localStorage.setItem("cyrus_flight_path", JSON.stringify(pathCoords));
    setIsPathfinding(false);
  };

  if (!dashboardData) return <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] flex justify-center items-center font-mono">LOADING NAVIGATOR...</div>;
  const completedNodes = dashboardData.map_data.filter((t: any) => t.status === 'completed');
  const getMarkerColor = (status: string, temp: number | null) => {
    if (status === "pending") return "#ffffff"; 
    if (status === "processing") return "#eab308"; 
    const t = temp || 0;
    if (t < 25) return "#3b82f6"; 
    if (t < 28) return "#22c55e"; 
    if (t < 32) return "#f97316"; 
    return "#ef4444"; 
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#22c55e] p-4 md:p-8 font-sans flex flex-col">
      <nav className="flex justify-between items-center mb-8 border-b border-[#064e3b] pb-4">
        <h2 className="text-xl md:text-2xl font-black tracking-widest drop-shadow-[0_0_5px_#22c55e]">CYRUS // NAVIGATOR</h2>
        <div className="flex gap-6 text-sm font-bold tracking-widest uppercase">
          <Link href="/main" className="text-[#064e3b] hover:text-[#22c55e]">DASHBOARD</Link>
          <Link href="/stats" className="text-[#064e3b] hover:text-[#22c55e]">STATISTICS</Link>
          <Link href="/routing" className="border-b-2 border-[#22c55e] text-white">NAVIGATOR</Link>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-black/50 border border-[#064e3b] p-6 rounded-xl shadow-[0_0_15px_rgba(6,78,59,0.3)] backdrop-blur-md">
            <h3 className="text-xs uppercase tracking-widest text-[#22c55e]/70 mb-4 font-mono">Mission Control</h3>
            <div className="space-y-4">
              <select value={startRegion} onChange={(e) => setStartRegion(e.target.value)} className="bg-[#050505] border border-[#064e3b] text-[#22c55e] text-xs p-3 rounded w-full outline-none font-mono">
                <option value="">-- ORIGIN --</option>
                {completedNodes.map((n: any) => <option key={n.id} value={n.region}>{n.region}</option>)}
              </select>
              <select value={endRegion} onChange={(e) => setEndRegion(e.target.value)} className="bg-[#050505] border border-[#064e3b] text-[#22c55e] text-xs p-3 rounded w-full outline-none font-mono">
                <option value="">-- DESTINATION --</option>
                {completedNodes.map((n: any) => <option key={n.id} value={n.region}>{n.region}</option>)}
              </select>
              <button onClick={runAStar} disabled={isPathfinding} className="w-full py-3 bg-[#22c55e]/10 border border-[#22c55e] text-[#22c55e] font-bold text-xs uppercase hover:bg-[#22c55e] hover:text-black transition-all disabled:opacity-50">
                {isPathfinding ? "AI CALCULATING..." : "COMPUTE SAFE PATH"}
              </button>
            </div>
          </div>

          <div className="bg-[#050505] border border-[#064e3b] p-4 rounded-xl h-64 overflow-y-auto font-mono text-[10px] shadow-inner">
             {aStarLogs.map((log, i) => <div key={i} className="mb-1 text-cyan-400 drop-shadow-[0_0_3px_#22d3ee]">{log}</div>)}
             {aStarLogs.length === 0 && <div className="opacity-30">AWAITING MISSION START...</div>}
          </div>
        </div>

        <div className="lg:col-span-8 bg-black/50 border border-[#064e3b] p-4 rounded-xl relative overflow-hidden">
          {/* 🎯 ส่งพิกัดเครื่องบินเข้าไปด้วย! */}
          <DynamicMap 
            mapData={dashboardData.map_data} 
            getMarkerColor={getMarkerColor} 
            radius={60000} 
            opacity={0.3} 
            flightPath={flightPath}
            airplanePos={airplanePos} 
          />
        </div>
      </div>
    </div>
  );
}