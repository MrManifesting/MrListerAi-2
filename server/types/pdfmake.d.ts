
declare module 'pdfmake/interfaces.js' {
  export interface TDocumentDefinitions {
    content: any;
    styles?: TDocumentStyles;
    pageSize?: string;
    pageOrientation?: string;
    pageMargins?: number[];
    [key: string]: any;
  }

  export interface TDocumentStyles {
    [key: string]: {
      fontSize?: number;
      bold?: boolean;
      margin?: number[];
      color?: string;
      alignment?: string;
      [key: string]: any;
    };
  }
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const pdfMake: {
    vfs: any;
  };
  export = { pdfMake };
}
