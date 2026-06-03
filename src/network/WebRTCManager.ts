export type PeerRole = 'host' | 'client';

export type ConnectionState =
  | 'idle'
  | 'creating-offer'
  | 'waiting-answer'
  | 'scanning-offer'
  | 'creating-answer'
  | 'connecting'
  | 'connected'
  | 'error';

export interface WebRTCCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onData: (data: string) => void;
  onError: (error: string) => void;
}

interface IceServerConfig {
  iceServers: RTCIceServer[];
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private callbacks: WebRTCCallbacks;
  private role: PeerRole | null = null;
  private state: ConnectionState = 'idle';
  private offerResolver: ((value: string | null) => void) | null = null;
  private answerResolver: ((value: string | null) => void) | null = null;

  private config: IceServerConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  private setState(state: ConnectionState) {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  getState(): ConnectionState {
    return this.state;
  }

  getRole(): PeerRole | null {
    return this.role;
  }

  isConnected(): boolean {
    return this.dc?.readyState === 'open';
  }

  private waitForIceGathering(pc: RTCPeerConnection): Promise<RTCSessionDescription | null> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(pc.localDescription);
        return;
      }

      const timeout = setTimeout(() => {
        pc.removeEventListener('icecandidate', handler);
        resolve(pc.localDescription);
      }, 5000);

      const handler = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          pc.removeEventListener('icecandidate', handler);
          resolve(pc.localDescription);
        }
      };
      pc.addEventListener('icecandidate', handler);
      pc.addEventListener(
        'icegatheringstatechange',
        handler as EventListener,
      );
    });
  }

  async createOffer(): Promise<string | null> {
    if (this.role || this.state !== 'idle') {
      this.callbacks.onError('Ya hay una conexión activa');
      return null;
    }
    this.role = 'host';
    this.setState('creating-offer');

    try {
      this.pc = new RTCPeerConnection(this.config);
      this.dc = this.pc.createDataChannel('game-channel', { ordered: true });
      this.setupDataChannel();

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const finalSdp = await this.waitForIceGathering(this.pc);

      if (!finalSdp) {
        this.setState('error');
        this.callbacks.onError('No se pudo generar SDP');
        return null;
      }

      this.setState('waiting-answer');
      return btoa(JSON.stringify(finalSdp));
    } catch (err) {
      this.setState('error');
      this.callbacks.onError('Error al crear oferta: ' + (err as Error).message);
      return null;
    }
  }

  async acceptOffer(offerBase64: string): Promise<string | null> {
    if (this.role || this.state !== 'idle') {
      this.callbacks.onError('Ya hay una conexión activa');
      return null;
    }
    this.role = 'client';
    this.setState('scanning-offer');

    try {
      const offerStr = atob(offerBase64);
      const offer = JSON.parse(offerStr) as RTCSessionDescriptionInit;

      this.pc = new RTCPeerConnection(this.config);
      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this.setupDataChannel();
      };

      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      const finalSdp = await this.waitForIceGathering(this.pc);

      if (!finalSdp) {
        this.setState('error');
        this.callbacks.onError('No se pudo generar SDP de respuesta');
        return null;
      }

      this.setState('connecting');
      return btoa(JSON.stringify(finalSdp));
    } catch (err) {
      this.setState('error');
      this.callbacks.onError('Error al aceptar oferta: ' + (err as Error).message);
      return null;
    }
  }

  async acceptAnswer(answerBase64: string): Promise<boolean> {
    if (!this.pc || this.role !== 'host') {
      this.callbacks.onError('No se puede aceptar respuesta sin ser host');
      return false;
    }

    this.setState('connecting');

    try {
      const answerStr = atob(answerBase64);
      const answer = JSON.parse(answerStr) as RTCSessionDescriptionInit;
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      return true;
    } catch (err) {
      this.setState('error');
      this.callbacks.onError('Error al aceptar respuesta: ' + (err as Error).message);
      return false;
    }
  }

  private setupDataChannel() {
    if (!this.dc) return;

    this.dc.onopen = () => {
      this.setState('connected');
    };

    this.dc.onclose = () => {
      this.setState('idle');
    };

    this.dc.onmessage = (e) => {
      try {
        this.callbacks.onData(e.data);
      } catch (err) {
        this.callbacks.onError('Error al procesar mensaje: ' + (err as Error).message);
      }
    };

    this.dc.onerror = () => {
      this.callbacks.onError('Error en DataChannel');
    };
  }

  send(data: string): boolean {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(data);
      return true;
    }
    return false;
  }

  disconnect() {
    try {
      this.dc?.close();
    } catch {
      // ignore
    }
    try {
      this.pc?.close();
    } catch {
      // ignore
    }
    this.dc = null;
    this.pc = null;
    this.role = null;
    this.offerResolver = null;
    this.answerResolver = null;
    this.setState('idle');
  }
}
