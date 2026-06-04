import Peer, { DataConnection } from 'peerjs';
import { WebRTCCallbacks, ConnectionState, PeerRole } from './WebRTCManager';

export class OnlinePeerManager {
  private peer: Peer | null = null;
  /** Conexión activa de datos P2P (pública para que gameStore pueda re-registrar listeners) */
  public conn: DataConnection | null = null;
  /** Callbacks de la conexión (público para re-registrar onData en gameStore) */
  public callbacks: WebRTCCallbacks;
  private _role: PeerRole | null = null;
  private state: ConnectionState = 'idle';

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
    return this._role;
  }

  isConnected(): boolean {
    return this.conn?.open || false;
  }

  async hostGame(roomCode: string): Promise<boolean> {
    if (this._role || this.state !== 'idle') {
      this.callbacks.onError('Ya hay una conexión activa');
      return false;
    }
    this._role = 'host';
    this.setState('creating-offer');

    return new Promise((resolve) => {
      // Usar un prefijo para evitar colisiones globales en el servidor público de PeerJS
      const peerId = `domino-hotspot-room-${roomCode}`;
      
      this.peer = new Peer(peerId);

      this.peer.on('open', () => {
        this.setState('waiting-answer');
        resolve(true);
      });

      this.peer.on('connection', (connection) => {
        if (this.conn) {
          connection.close(); // Rechazar otras conexiones si ya tenemos una
          return;
        }
        this.conn = connection;
        this.setupDataConnection();
        this.setState('connecting');
      });

      this.peer.on('error', (err) => {
        this.setState('error');
        this.callbacks.onError('Error de red: ' + err.message);
        resolve(false);
      });
    });
  }

  async joinGame(roomCode: string): Promise<boolean> {
    if (this._role || this.state !== 'idle') {
      this.callbacks.onError('Ya hay una conexión activa');
      return false;
    }
    this._role = 'client';
    this.setState('scanning-offer');

    return new Promise((resolve) => {
      this.peer = new Peer();

      this.peer.on('open', () => {
        const hostId = `domino-hotspot-room-${roomCode}`;
        this.conn = this.peer!.connect(hostId, { reliable: true });
        
        this.setupDataConnection();
        this.setState('connecting');
        
        this.conn.on('open', () => {
          resolve(true);
        });
      });

      this.peer.on('error', (err) => {
        this.setState('error');
        this.callbacks.onError('No se pudo encontrar la sala o hubo un error: ' + err.message);
        resolve(false);
      });
    });
  }

  private setupDataConnection() {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.setState('connected');
    });

    this.conn.on('close', () => {
      this.setState('idle');
    });

    this.conn.on('data', (data) => {
      try {
        // En PeerJS la data ya viene deserializada si es JSON, pero nuestro onData espera string
        this.callbacks.onData(typeof data === 'string' ? data : JSON.stringify(data));
      } catch (err: any) {
        this.callbacks.onError('Error al procesar mensaje: ' + err.message);
      }
    });

    this.conn.on('error', () => {
      this.callbacks.onError('Error en la conexión P2P');
    });
  }

  send(data: string): boolean {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
      return true;
    }
    return false;
  }

  disconnect() {
    try {
      this.conn?.close();
    } catch {
      // ignore
    }
    try {
      this.peer?.destroy();
    } catch {
      // ignore
    }
    this.conn = null;
    this.peer = null;
    this._role = null;
    this.setState('idle');
  }
}
