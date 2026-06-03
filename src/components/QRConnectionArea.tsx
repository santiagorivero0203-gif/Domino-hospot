import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Scan, ArrowLeft, ArrowRight, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { WebRTCManager, type ConnectionState } from '../network/WebRTCManager';

interface QRConnectionAreaProps {
  onConnected: (manager: WebRTCManager) => void;
  onBack: () => void;
}

type Step = 'select' | 'offer-qr' | 'scan-offer' | 'answer-qr' | 'connected';

interface ScannerHandle {
  stop: () => Promise<void>;
}

export default function QRConnectionArea({ onConnected, onBack }: QRConnectionAreaProps) {
  const [step, setStep] = useState<Step>('select');
  const [offerData, setOfferData] = useState<string | null>(null);
  const [answerData, setAnswerData] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scannerMode, setScannerMode] = useState<'offer' | 'answer' | null>(null);
  const managerRef = useRef<WebRTCManager | null>(null);
  const scannerRef = useRef<ScannerHandle | null>(null);
  const isMountedRef = useRef(true);

  const handleStateChange = useCallback((state: ConnectionState) => {
    if (!isMountedRef.current) return;
    setConnectionState(state);
    if (state === 'connected') {
      setStep('connected');
      if (managerRef.current) {
        onConnected(managerRef.current);
      }
    }
  }, [onConnected]);

  const handleData = useCallback((_data: string) => {
  }, []);

  const handleError = useCallback((err: string) => {
    if (!isMountedRef.current) return;
    setError(err);
  }, []);

  const createManager = useCallback(() => {
    managerRef.current?.disconnect();
    const mgr = new WebRTCManager({
      onStateChange: handleStateChange,
      onData: handleData,
      onError: handleError,
    });
    managerRef.current = mgr;
    return mgr;
  }, [handleStateChange, handleData, handleError]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(
    async (mode: 'offer' | 'answer') => {
      setError(null);
      setScannerMode(mode);
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const el = document.getElementById('qr-reader');
        if (!el) return;

        el.innerHTML = '';
        const scanner = new Html5Qrcode('qr-reader');

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (!isMountedRef.current) return;
            await stopScanner();
            if (mode === 'offer') {
              await handleScanResult(decodedText);
            } else {
              await handleHostScanAnswer(decodedText);
            }
          },
          () => {
            // scan failure, ignore
          },
        );

        scannerRef.current = {
          stop: async () => {
            try {
              await scanner.stop();
            } catch {
              // ignore
            }
          },
        };
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(
          `Error de cámara: ${err?.message || 'Permisos denegados o cámara no disponible. Revisa los permisos de tu navegador.'}`
        );
        setScannerMode(null);
      }
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScanner();
      managerRef.current?.disconnect();
    };
  }, [stopScanner]);

  const handleHost = async () => {
    setError(null);
    const mgr = createManager();
    const offer = await mgr.createOffer();
    if (!isMountedRef.current) return;
    if (offer) {
      setOfferData(offer);
      setStep('offer-qr');
    } else {
      setError('No se pudo crear la oferta');
    }
  };

  const handleClient = () => {
    setError(null);
    setStep('scan-offer');
    startScanner('offer');
  };

  const handleScanResult = async (data: string) => {
    const mgr = createManager();
    const answer = await mgr.acceptOffer(data);
    if (!isMountedRef.current) return;
    if (answer) {
      setAnswerData(answer);
      setStep('answer-qr');
    } else {
      setError('No se pudo procesar la oferta del host');
      setStep('select');
    }
  };

  const handleHostScanAnswer = async (data: string) => {
    if (!managerRef.current) {
      setError('No hay conexión activa del host');
      return;
    }
    const ok = await managerRef.current.acceptAnswer(data);
    if (!isMountedRef.current) return;
    if (!ok) {
      setError('No se pudo procesar la respuesta del client');
    }
  };

  const handleCancel = async () => {
    await stopScanner();
    setScannerMode(null);
    setError(null);
    if (step === 'scan-offer' || step === 'answer-qr') {
      setStep('select');
    } else if (step === 'offer-qr') {
      setStep('select');
    }
  };

  const handleSwitchToAnswerScan = () => {
    setStep('scan-offer');
    startScanner('answer');
  };

  const goBack = async () => {
    await stopScanner();
    managerRef.current?.disconnect();
    managerRef.current = null;
    setOfferData(null);
    setAnswerData(null);
    setError(null);
    setScannerMode(null);
    setStep('select');
    onBack();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6">
      <button
        onClick={goBack}
        className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors p-2"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <AnimatePresence mode="wait">
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6 items-center"
          >
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold mb-2">
                Conectar vía QR
              </h2>
              <p className="text-white/50 text-sm max-w-xs">
                Sin internet. Un dispositivo crea la sala y los demás se unen
                escaneando.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleHost}
                className="flex flex-col items-center gap-3 bg-green-700 hover:bg-green-600 text-white font-bold py-6 px-8 rounded-2xl transition-colors"
              >
                <Scan className="w-8 h-8" />
                <span>Soy Host</span>
                <span className="text-xs text-white/60">Crear sala</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleClient}
                className="flex flex-col items-center gap-3 bg-blue-700 hover:bg-blue-600 text-white font-bold py-6 px-8 rounded-2xl transition-colors"
              >
                <ArrowRight className="w-8 h-8" />
                <span>Soy Client</span>
                <span className="text-xs text-white/60">Escanear QR</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'offer-qr' && offerData && (
          <motion.div
            key="offer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <h2 className="text-white text-xl font-bold">Tu código de Host</h2>
            <p className="text-white/50 text-sm text-center max-w-xs">
              El Client escanea este código para unirse
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <QRCodeSVG value={offerData} size={220} level="M" />
            </div>
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Esperando que el Client se conecte...
            </div>
            <button
              onClick={handleSwitchToAnswerScan}
              className="mt-2 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-xl text-sm transition-colors"
            >
              <Scan className="w-4 h-4" />
              Ya escaneó — escanear respuesta
            </button>
          </motion.div>
        )}

        {step === 'scan-offer' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <h2 className="text-white text-xl font-bold">
              {scannerMode === 'answer'
                ? 'Escanea la respuesta del Client'
                : 'Escanea el QR del Host'}
            </h2>
            <div
              id="qr-reader"
              className="w-64 h-64 bg-black rounded-2xl overflow-hidden border-2 border-slate-600"
            />
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          </motion.div>
        )}

        {step === 'answer-qr' && answerData && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <h2 className="text-white text-xl font-bold">Tu respuesta</h2>
            <p className="text-white/50 text-sm text-center max-w-xs">
              El Host debe escanear este QR para establecer la conexión
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <QRCodeSVG value={answerData} size={220} level="M" />
            </div>
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Esperando confirmación del Host...
            </div>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          </motion.div>
        )}

        {step === 'connected' && (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-white text-2xl font-bold">¡Conectado!</h2>
            <p className="text-white/50">Conexión P2P establecida</p>
            <p className="text-white/30 text-xs font-mono">
              {connectionState}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
