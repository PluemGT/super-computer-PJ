// ไฟล์: src/app/main/Map.tsx
import { MapContainer, TileLayer, Circle, Popup, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🎯 รับ props เพิ่มเติมคือ airplanePos (พิกัดเครื่องบินปัจจุบัน)
export default function Map({ mapData, getMarkerColor, radius, opacity, flightPath, airplanePos }: any) {
  
  // ฟังก์ชันสร้างไอคอนเครื่องบินแบบหมุนตามทิศทาง
  const getPlaneIcon = () => {
    let rotation = 45; // มุมเริ่มต้น
    
    // 🎯 คำนวณหาองศาการหันหัวเครื่องบิน จาก 2 จุดล่าสุด
    if (flightPath && flightPath.length > 1) {
      const p1 = flightPath[flightPath.length - 2];
      const p2 = flightPath[flightPath.length - 1];
      const dy = p2[0] - p1[0]; // ความต่างละติจูด (Y)
      const dx = p2[1] - p1[1]; // ความต่างลองจิจูด (X)
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      rotation = 90 - angle; // ปรับให้เข้ากับหัวเครื่องบินที่ชี้ขึ้น
    }

    // ไอคอนเครื่องบิน SVG สีฟ้าเรืองแสง
    return new L.DivIcon({
      html: `
        <div style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; transform: rotate(${rotation}deg); transition: transform 0.3s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00f6ff" width="24px" height="24px" style="filter: drop-shadow(0px 0px 8px #00f6ff);">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>`,
      className: 'transparent-plane', // ลบคลาสพื้นฐานของ leaflet
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  return (
    <MapContainer 
      center={[13.7367, 100.5231]} 
      zoom={6} 
      style={{ height: '100%', width: '100%', backgroundColor: '#0a0a0a' }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      
      {/* 1. วาดจุดความร้อน */}
      {mapData && mapData.map((task: any) => (
        <Circle 
          key={task.id}
          center={[task.grid_x, task.grid_y]} 
          radius={radius} 
          pathOptions={{ 
            color: 'transparent',
            fillColor: getMarkerColor(task.status, task.final_temp),
            fillOpacity: opacity,
            className: 'blur-[15px] transition-all duration-300'
          }}
        >
          <Popup>
            <div className="font-mono text-xs text-black min-w-[150px]">
              <strong className="text-blue-600 text-sm uppercase">{task.region || 'Unknown'}</strong><br />
              <hr className="my-1 border-gray-300"/>
              <strong>Status:</strong> {task.status === 'completed' ? '✅ Verified' : '⏳ Processing'}<br />
              <strong>Predict Temp:</strong> {task.final_temp ? `${task.final_temp.toFixed(2)}°C` : 'Calculating...'}<br />
            </div>
          </Popup>
        </Circle>
      ))}

      {/* 2. วาดเส้นประสีฟ้า (Flight Path) */}
      {flightPath && flightPath.length > 1 && (
        <Polyline 
          positions={flightPath} 
          pathOptions={{ 
            color: '#00f6ff', 
            weight: 3, 
            opacity: 0.8, 
            dashArray: '10, 10', 
            lineJoin: 'round' 
          }} 
        />
      )}

      {/* 3. ✈️ วาดไอคอนเครื่องบิน (ถ้ามีพิกัด) */}
      {airplanePos && (
        <Marker position={airplanePos} icon={getPlaneIcon()} />
      )}
    </MapContainer>
  );
}