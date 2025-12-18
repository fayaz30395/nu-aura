declare module 'sockjs-client' {
  class SockJS {
    constructor(url: string, _reserved?: any, options?: {
      server?: string;
      transports?: string[];
      timeout?: number;
    });

    onopen: (() => void) | null;
    onmessage: ((e: { data: string }) => void) | null;
    onclose: ((e: { code: number; reason: string; wasClean: boolean }) => void) | null;
    onerror: ((e: Error) => void) | null;

    send(data: string): void;
    close(code?: number, reason?: string): void;

    readyState: number;

    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
  }

  export = SockJS;
}
