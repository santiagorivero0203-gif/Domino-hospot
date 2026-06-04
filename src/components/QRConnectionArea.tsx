import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, ArrowLeft, ArrowRight, Check, X, Loader2, AlertCircle, Wifi } from 'lucide-react';
import { WebRTCManager, type ConnectionState } from '../network/WebRTCManager';
import { OnlinePeerManager } from '../network/OnlinePeerManager';

interface ConnectionAreaProps {
  onConnected: (manager: any) => void;
  onBack: () => void;
}

type Step = 'select' | 'host-hub' | 'client-hub' | 'scan-offer' | 'answer-qr' | 'connected';

interface ScannerHandle {
  stop: () => Promise<void>;
}

export default function ConnectionArea({ onConnected, onBack }: ConnectionAreaProps) {
  const [step, setStep] = useState<Step>('select');
  const [offerData, setOfferData] = useState<string | null>(null);
  const [answerData, setAnswerData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [roomCode, setRoomCode] = useState<string>('');
  const [clientInputCode, setClientInputCode] = useState<string>('');
  const [isConnectingOnline, setIsConnectingOnline] = useState(false);

  const [scannerMode, setScannerMode] = useState<'offer' | 'answer' | null>(null);
  
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const onlineManagerRef = useRef<OnlinePeerManager | null>(null);
  const scannerRef = useRef<ScannerHandle | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopScanner();
      webrtcManagerRef.current?.disconnect();
      onlineManagerRef.current?.disconnect();
    };
  }, []);

  const handleConnected = useCallback((manager: any) => {
    if (!isMountedRef.current) return;
    setStep('connected');
    
    // Desconectar el gestor que no se usó
    if (manager instanceof WebRTCManager) {
      onlineManagerRef.current?.disconnect();
      onlineManagerRef.current = null;
    } else {
      webrtcManagerRef.current?.disconnect();
      webrtcManagerRef.current = null;
    }
    
    onConnected(manager);
  }, [onConnected]);

  const handleError = useCallback((err: string) => {
    if (!isMountedRef.current) return;
    setError(err);
  }, []);

  // Inicializar ambos managers para el Host
  const handleHost = async () => {
    setError(null);
    setStep('host-hub');

    // 1. Setup Online Manager (4 digit code)
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(newCode);

    const onlineMgr = new OnlinePeerManager({
      onStateChange: (state) => {
        if (state === 'connected') handleConnected(onlineMgr);
      },
      onData: () => {},
      onError: (err) => console.log('Online error:', err)
    });
    onlineManagerRef.current = onlineMgr;
    onlineMgr.hostGame(newCode).catch(() => {});

    // 2. Setup Offline Manager (QR Code)
    const rtcMgr = new WebRTCManager({
      onStateChange: (state) => {
        if (state === 'connected') handleConnected(rtcMgr);
      },
      onData: () => {},
      onError: handleError,
    });
    webrtcManagerRef.current = rtcMgr;
    
    const offer = await rtcMgr.createOffer();
    if (isMountedRef.current && offer) {
      setOfferData(offer);
    }
  };

  const handleClient = () => {
    setError(null);
    setStep('client-hub');
    setClientInputCode('');
  };

  const connectOnlineClient = async () => {
    if (clientInputCode.length !== 4) return;
    setError(null);
    setIsConnectingOnline(true);

    const onlineMgr = new OnlinePeerManager({
      onStateChange: (state) => {
        if (state === 'connected') handleConnected(onlineMgr);
      },
      onData: () => {},
      onError: (err) => {
        handleError(err);
        setIsConnectingOnline(false);
      }
    });
    onlineManagerRef.current = onlineMgr;
    const success = await onlineMgr.joinGame(clientInputCode);
    if (!success && isMountedRef.current) {
      setIsConnectingOnline(false);
    }
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback((mode: 'offer' | 'answer') => {
    setError(null);
    setScannerMode(mode);

    const initScanner = async () => {
      if (!isMountedRef.current) return;
      const el = document.getElementById('qr-reader');
      if (!el) {
        setTimeout(initScanner, 100);
        return;
      }
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
          } catch (err: any) {
            throw new Error('Permiso de cámara denegado: ' + err.message);
          }
        }
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) throw new Error('No se encontraron cámaras.');

        let cameraId = cameras[0].id;
        const backCamera = cameras.find(c => 
          c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('trasera') || c.label.toLowerCase().includes('environment')
        );
        if (backCamera) cameraId = backCamera.id;
        else if (cameras.length > 1) cameraId = cameras[cameras.length - 1].id;

        if (!isMountedRef.current) return;
        el.innerHTML = '';
        const scanner = new Html5Qrcode('qr-reader');

        await scanner.start(
          cameraId,
          { 
            fps: 10, 
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w || 250, h || 250) * 0.8);
              return { width: size, height: size };
            }
          },
          async (decodedText: string) => {
            if (!isMountedRef.current) return;
            await stopScanner();
            if (mode === 'offer') {
              const rtcMgr = new WebRTCManager({
                onStateChange: (state) => {
                  if (state === 'connected') handleConnected(rtcMgr);
                },
                onData: () => {},
                onError: handleError,
              });
              webrtcManagerRef.current = rtcMgr;
              const answer = await rtcMgr.acceptOffer(decodedText);
              if (answer) {
                setAnswerData(answer);
                setStep('answer-qr');
              }
            } else {
              webrtcManagerRef.current?.acceptAnswer(decodedText);
            }
          },
          () => {}
        );
        scannerRef.current = { stop: async () => { try { await scanner.stop(); } catch {} } };
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(`Error cámara: ${err?.message}`);
        setScannerMode(null);
      }
    };
    initScanner();
  }, [stopScanner, handleConnected, handleError]);

  const handleCancel = async () => {
    await stopScanner();
    setScannerMode(null);
    setError(null);
    if (step === 'scan-offer' || step === 'answer-qr') setStep('client-hub');
  };

  const goBack = async () => {
    await stopScanner();
    webrtcManagerRef.current?.disconnect();
    onlineManagerRef.current?.disconnect();
    webrtcManagerRef.current = null;
    onlineManagerRef.current = null;
    setOfferData(null);
    setAnswerData(null);
    setError(null);
    setStep('select');
    onBack();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6">
      <button onClick={goBack} className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors p-2 z-10">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <AnimatePresence mode="wait">
        {step === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 items-center">
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold mb-2">Conectar Dispositivos</h2>
              <p className="text-white/50 text-sm max-w-xs">Usa código de 4 dígitos (con internet) o escanéo QR (offline).</p>
            </div>
            {error && <div className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>}
            <div className="flex gap-4 mt-2">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleHost} className="flex flex-col items-center gap-3 bg-green-700 hover:bg-green-600 text-white font-bold py-6 px-8 rounded-2xl transition-colors">
                <Wifi className="w-8 h-8" />
                <span>Soy Host</span>
                <span className="text-xs text-white/60">Crear sala</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleClient} className="flex flex-col items-center gap-3 bg-blue-700 hover:bg-blue-600 text-white font-bold py-6 px-8 rounded-2xl transition-colors">
                <ArrowRight className="w-8 h-8" />
                <span>Soy Client</span>
                <span className="text-xs text-white/60">Unirse a sala</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'host-hub' && (
          <motion.div key="host-hub" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-4 w-full max-w-sm">
            <h2 className="text-white text-xl font-bold">Código de Sala (Online)</h2>
            <div className="text-6xl font-black text-white tracking-[0.2em] bg-slate-800/80 py-4 px-8 rounded-2xl shadow-inner border border-slate-700">
              {roomCode}
            </div>
            
            <div className="w-full h-px bg-slate-700 my-2 relative">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-3 text-slate-500 text-xs font-semibold">O MODO OFFLINE</span>
            </div>

            <p className="text-white/50 text-sm text-center">El Client puede escanear este QR si no hay internet</p>
            {offerData ? (
              <div className="bg-white p-3 rounded-xl shadow-xl">
                <QRCodeSVG value={offerData} size={180} level="L" />
              </div>
            ) : (
              <div className="h-[180px] w-[180px] bg-slate-800 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}
            
            <button onClick={() => { setStep('scan-offer'); startScanner('answer'); }} className="mt-2 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-xl text-sm transition-colors">
              <Scan className="w-4 h-4" />
              Ya escaneó el QR — escanear respuesta
            </button>
          </motion.div>
        )}

        {step === 'client-hub' && (
          <motion.div key="client-hub" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-6 w-full max-w-sm">
            <div className="text-center">
              <h2 className="text-white text-xl font-bold">Unirse a Sala</h2>
              <p className="text-white/50 text-sm">Introduce el código de 4 dígitos del Host</p>
            </div>
            
            {error && <div className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg text-center">{error}</div>}

            <div className="flex flex-col gap-3 w-full">
              <input
                type="text"
                maxLength={4}
                value={clientInputCode}
                onChange={(e) => setClientInputCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full bg-slate-800 text-white text-5xl font-black tracking-[0.3em] text-center py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700 placeholder:text-slate-700"
              />
              <button
                onClick={connectOnlineClient}
                disabled={clientInputCode.length !== 4 || isConnectingOnline}
                className="w-full bg-blue-600 disabled:bg-blue-800/50 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isConnectingOnline ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                {isConnectingOnline ? 'Conectando...' : 'Conectar Online'}
              </button>
            </div>

            <div className="w-full h-px bg-slate-700 my-2 relative">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-3 text-slate-500 text-xs font-semibold">O MODO OFFLINE</span>
            </div>

            <button onClick={() => { setStep('scan-offer'); startScanner('offer'); }} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Scan className="w-5 h-5" />
              Escanear Código QR
            </button>
          </motion.div>
        )}

        {step === 'scan-offer' && (
          <motion.div key="scan" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-4">
            <h2 className="text-white text-xl font-bold text-center">
              {scannerMode === 'answer' ? 'Escanea la respuesta del Client' : 'Escanea el QR del Host'}
            </h2>
            <div id="qr-reader" className="w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border-2 border-slate-600" />
            {error && <div className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>}
            <button onClick={handleCancel} className="text-white/50 hover:text-white flex items-center gap-2"><X className="w-4 h-4"/> Cancelar</button>
          </motion.div>
        )}

        {step === 'answer-qr' && answerData && (
          <motion.div key="answer" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-4">
            <h2 className="text-white text-xl font-bold">Tu respuesta (Offline)</h2>
            <p className="text-white/50 text-sm text-center max-w-xs">El Host debe escanear este QR para conectar</p>
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <QRCodeSVG value={answerData} size={280} level="L" />
            </div>
            <div className="flex items-center gap-2 text-blue-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Esperando confirmación...</div>
            <button onClick={handleCancel} className="text-white/50 hover:text-white flex items-center gap-2"><X className="w-4 h-4"/> Cancelar</button>
          </motion.div>
        )}

        {step === 'connected' && (
          <motion.div key="connected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 bg-green-500/20 p-8 rounded-3xl border border-green-500/30">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-green-500/20">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-green-400 text-2xl font-bold">¡Conectado!</h2>
            <p className="text-green-200/60 text-sm">Iniciando partida...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
