interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
  forget(): Promise<void>;
}

interface Serial extends EventTarget {
  onconnect: ((this: this, ev: Event) => any) | null;
  ondisconnect: ((this: this, ev: Event) => any) | null;
  getPorts(): Promise<SerialPort[]>;
  requestPort(options?: { filters: any[] }): Promise<SerialPort>;
  addEventListener(type: "connect" | "disconnect", listener: (this: this, ev: Event) => any, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: "connect" | "disconnect", listener: (this: this, ev: Event) => any, options?: boolean | EventListenerOptions): void;
}

interface Navigator {
  serial: Serial;
}
