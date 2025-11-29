import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Resident } from '../types';
import { QrCode, Scan, CheckCircle, XCircle, Clock, Users, ShieldCheck, User as UserIcon, Calendar, Share2, Camera, AlertTriangle } from 'lucide-react';
import jsQR from 'jsqr';

// Interface for the secure payload inside the QR
interface QRPayload {
  id: string;
  tenantId: string; // Security: Domain lock
  residentName: string;
  residentUnit: string;
  visitorName: string;
  createdBy: {
    name: string;
    role: string;
    id: string;
  };
  expiresAt: string;
  generatedAt: number;
}

// Sub-component for Generation (Role B & X)
export const QRGenerator: React.FC<{ user: User, residents: Resident[] }> = ({ user, residents }) => {
  const [selectedResidentId, setSelectedResidentId] = useState('');
  
  // Options
  const [expirationDate, setExpirationDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSharing, setIsSharing] = useState(false);
  
  // Output
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  // Optimized Filter: Memoize available residents
  const availableResidents = useMemo(() => 
    user.role === 'B' 
      ? residents.filter(r => r.unit === user.unit) 
      : residents
  , [residents, user.role, user.unit]);

  if (user.role !== 'B' && user.role !== 'X') return <div className="p-4 text-red-500">Acceso denegado. Solo Rol X o B.</div>;

  const handleGenerate = () => {
    if (!selectedResidentId) return;

    const selectedResident = residents.find(r => r.id === selectedResidentId);
    if (!selectedResident) return;

    // Default expiration: 24 hours from now if not set
    const finalExpiration = expirationDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const newCodes: string[] = [];

    for (let i = 0; i < quantity; i++) {
      const payload: QRPayload = {
        id: crypto.randomUUID(), // Unique ID per code
        tenantId: user.tenantId, // SECURITY: Domain Lock
        residentName: selectedResident.name,
        residentUnit: selectedResident.unit,
        visitorName: 'Invitado', // Default generic name
        createdBy: {
          name: user.name,
          role: user.role,
          id: user.id
        },
        expiresAt: finalExpiration,
        generatedAt: Date.now()
      };
      
      // We encode the JSON to simulate a dense QR string
      newCodes.push(JSON.stringify(payload));
    }

    setGeneratedCodes(newCodes);
  };

  const handleShare = async (qrData: string, index: number) => {
    setIsSharing(true);
    const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
    
    try {
      // Fetch the image to create a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `invitacion-qr-${index + 1}.png`, { type: "image/png" });

      if (navigator.share) {
        await navigator.share({
          title: 'Invitación de Acceso',
          text: 'Aquí tienes tu código QR para ingresar al condominio.',
          files: [file],
        });
      } else {
        // Fallback for desktop or browsers without share API
        window.open(imageUrl, '_blank');
        alert("Tu dispositivo no soporta la función de compartir nativa. La imagen se ha abierto en una nueva pestaña para que puedas guardarla.");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert("No se pudo compartir la imagen. Intenta guardarla manualmente.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100">
      <div className="text-center mb-6">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
          <QrCode size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Generar Invitación</h2>
        <p className="text-gray-500">Crea accesos seguros para visitas</p>
      </div>

      <div className="space-y-4">
        {/* Resident Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Residente Anfitrión</label>
          <select 
            className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
          >
            <option value="">Seleccionar residente...</option>
            {availableResidents.map(r => (
              <option key={r.id} value={r.id}>{r.name} - {r.unit}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Límite (Caducidad)</label>
            <div className="relative">
              <input 
                type="datetime-local"
                className="w-full border p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
              <Clock className="absolute left-3 top-3.5 text-gray-400" size={16} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Por defecto: 24 horas</p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Códigos</label>
            <div className="relative">
              <input 
                type="number"
                min="1"
                max="20"
                className="w-full border p-3 pl-10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              <Users className="absolute left-3 top-3.5 text-gray-400" size={16} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Opcional para grupos</p>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!selectedResidentId}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          Generar Código{quantity > 1 ? 's' : ''} QR
        </button>
      </div>

      {/* Results Display */}
      {generatedCodes.length > 0 && (
        <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-sm text-yellow-800">
             <ShieldCheck size={20} className="mx-auto mb-1" />
             Estos códigos son válidos únicamente para el condominio: <strong>{user.tenantId}</strong>
          </div>

          <div className="grid grid-cols-1 gap-6 justify-items-center">
            {generatedCodes.map((code, index) => (
              <div key={index} className="flex flex-col items-center p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 w-full max-w-xs relative">
                {quantity > 1 && (
                  <span className="absolute top-2 right-2 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                )}
                <div className="bg-white p-2 mb-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(code)}`} 
                    alt="QR Code" 
                    className="w-40 h-40"
                  />
                </div>
                <div className="mt-2 text-center w-full">
                   <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Creado por {user.name}</p>
                   
                   <button 
                    onClick={() => handleShare(code, index)}
                    disabled={isSharing}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                   >
                     <Share2 size={16} />
                     Compartir QR
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for Validation (Role X, A)
export const QRValidator: React.FC<{ user: User }> = ({ user }) => {
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'valid' | 'invalid'>('idle');
  const [scannedData, setScannedData] = useState<QRPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!['X', 'A'].includes(user.role)) return <div className="p-4 text-red-500">Acceso denegado.</div>;

  const startScan = async () => {
    setScanStatus('scanning');
    setErrorMsg('');
    setScannedData(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Error opening camera:", err);
      setErrorMsg("No se pudo acceder a la cámara. Verifique permisos.");
      setScanStatus('invalid');
    }
  };

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.height = videoRef.current.videoHeight;
      canvas.width = videoRef.current.videoWidth;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR to find code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          // Found a code!
          stopCamera();
          validateQR(code.data);
          return;
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  const validateQR = (rawData: string) => {
    try {
      const payload: QRPayload = JSON.parse(rawData);
      
      // 1. Validate Structure
      if (!payload.tenantId || !payload.expiresAt || !payload.visitorName) {
        throw new Error("Formato de QR inválido o corrupto.");
      }

      // 2. Validate Domain (Tenant Security)
      if (payload.tenantId !== user.tenantId) {
        setErrorMsg(`Este código pertenece a otro condominio (Tenant: ${payload.tenantId}). Acceso prohibido.`);
        setScanStatus('invalid');
        return;
      }

      // 3. Validate Expiration
      if (new Date(payload.expiresAt) < new Date()) {
        setErrorMsg(`El código ha caducado el ${new Date(payload.expiresAt).toLocaleString()}.`);
        setScanStatus('invalid');
        return;
      }

      // 4. Success
      setScannedData(payload);
      setScanStatus('valid');

    } catch (e) {
      setErrorMsg("El código QR escaneado no es compatible con el sistema CondoGuard.");
      setScanStatus('invalid');
    }
  };

  const resetScanner = () => {
    stopCamera();
    setScanStatus('idle');
    setScannedData(null);
    setErrorMsg('');
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Validar Acceso</h2>
        <p className="text-gray-500">Escanear código QR del visitante</p>
      </div>

      <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-6 group shadow-inner">
        {scanStatus === 'scanning' ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                 {/* Video Element for Scanning */}
                 <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                 {/* Hidden Canvas for Processing */}
                 <canvas ref={canvasRef} className="hidden" />
                 
                 {/* Overlay UI */}
                 <div className="w-64 h-64 border-2 border-green-500 rounded-lg opacity-50 z-20 relative">
                    <div className="w-full h-0.5 bg-green-500 absolute top-1/2 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse" />
                 </div>
                 <p className="text-white font-mono mt-4 z-20 bg-black/50 px-3 py-1 rounded">Buscando QR...</p>
             </div>
        ) : (
             <div className="absolute inset-0 flex items-center justify-center">
                 <img 
                    src="https://picsum.photos/seed/camera/600" 
                    className="w-full h-full object-cover opacity-60" 
                    alt="Camera Placeholder"
                 />
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Scan className="text-white/50 w-48 h-48" strokeWidth={1} />
                 </div>
             </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        {scanStatus === 'idle' && (
          <button 
            onClick={startScan}
            className="bg-gray-800 text-white px-8 py-3 rounded-full hover:bg-gray-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Camera size={20} /> Activar Cámara
          </button>
        )}

        {scanStatus === 'scanning' && (
           <button 
             onClick={resetScanner}
             className="bg-red-500/80 text-white px-6 py-2 rounded-full hover:bg-red-600 transition-all flex items-center gap-2"
           >
             Detener
           </button>
        )}

        {scanStatus === 'valid' && scannedData && (
          <div className="w-full animate-in zoom-in duration-300 bg-green-50 rounded-xl p-5 border border-green-200">
            <div className="flex items-center justify-center gap-2 text-green-700 text-xl font-bold mb-4">
                <CheckCircle size={28} /> Acceso Permitido
            </div>
            
            <div className="space-y-3 text-sm text-gray-700">
               <div className="flex justify-between border-b border-green-200 pb-2">
                 <span className="text-gray-500">Visitante:</span>
                 <span className="font-bold">{scannedData.visitorName}</span>
               </div>
               <div className="flex justify-between border-b border-green-200 pb-2">
                 <span className="text-gray-500">A residencia:</span>
                 <span>{scannedData.residentName} ({scannedData.residentUnit})</span>
               </div>
               
               {/* CREATOR INFO */}
               <div className="bg-white p-3 rounded-lg border border-green-100 mt-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <UserIcon size={10} /> Creado por
                  </p>
                  <p className="font-medium text-blue-900">{scannedData.createdBy.name}</p>
                  <p className="text-xs text-gray-500">{scannedData.createdBy.role === 'B' ? 'Propietario' : 'Administrador'}</p>
               </div>

               {/* EXPIRATION INFO */}
               <div className="flex items-center justify-end gap-1 text-xs text-gray-500 pt-1">
                 <Calendar size={12} />
                 Vence: <span className="font-mono text-gray-700">{formatDate(scannedData.expiresAt)}</span>
               </div>
            </div>

            <button onClick={resetScanner} className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm">
              Escanear otro
            </button>
          </div>
        )}

        {scanStatus === 'invalid' && (
           <div className="w-full animate-in shake duration-300 bg-red-50 rounded-xl p-5 border border-red-200 text-center">
             <div className="flex items-center justify-center gap-2 text-red-600 text-xl font-bold mb-2">
                 <XCircle size={28} /> Acceso Rechazado
             </div>
             <div className="flex flex-col items-center gap-2 mb-4">
               <AlertTriangle className="text-orange-500" size={32} />
               <p className="text-sm text-gray-800 font-bold">{errorMsg}</p>
             </div>
             
             <button onClick={resetScanner} className="text-sm underline text-red-500 hover:text-red-700">
               Intentar de nuevo
             </button>
           </div>
        )}
      </div>
    </div>
  );
};
