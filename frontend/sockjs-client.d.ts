declare module 'sockjs-client' {
  class SockJS {
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
    onopen: (() => void) | null;
    onmessage: ((e: { data: string }) => void) | null;
    onclose: ((e: { code: number; reason: string; wasClean: boolean }) => void) | null;
    onerror: ((e: Error) => void) | null;
    readyState: number;

    constructor(url: string, _reserved?: unknown, options?: {
      server?: string;
      transports?: string[];
      timeout?: number;
    });

    send(data: string): void;

    close(code?: number, reason?: string): void;
  }

  export = SockJS;
}
