declare module 'qrcode' {
  export function toDataURL(text: string, options?: {
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    type?: string;
    rendererOpts?: any;
    quality?: number;
  }): Promise<string>;

  export function toBuffer(text: string, options?: any): Promise<Buffer>;
  export function toString(text: string, options?: any): Promise<string>;
  export function toFile(path: string, text: string, options?: any): Promise<void>;
  export function toFileStream(stream: NodeJS.WritableStream, text: string, options?: any): void;
  
  export function toCanvas(canvas: any, text: string, options?: any): Promise<any>;
  export function toSJIS(text: string, options?: any): string;
}