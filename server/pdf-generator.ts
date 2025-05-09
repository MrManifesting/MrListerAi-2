import * as pdfMakeType from 'pdfmake/build/pdfmake';
import * as pdfFontsType from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, TDocumentStyles } from 'pdfmake/interfaces';
import { InventoryItem } from '@shared/schema';
import { storage } from './storage';

// Need to handle the imports differently due to the way pdfmake is built
// This allows us to use pdfmake in both browser and Node.js environments
const pdfMake = pdfMakeType as any;
const pdfFonts = pdfFontsType as any;

// Initialize PDF generator - handle potential undefined vfs gracefully
if (pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// Define common styles
const defaultStyles: TDocumentStyles = {
  header: {
    fontSize: 18,
    bold: true,
    margin: [0, 0, 0, 10]
  },
  subheader: {
    fontSize: 16,
    bold: true,
    margin: [0, 10, 0, 5]
  },
  tableHeader: {
    bold: true,
    fontSize: 13,
    color: 'black'
  },
  itemTitle: {
    fontSize: 14,
    bold: true,
    margin: [0, 5, 0, 5]
  }
};

/**
 * Generate a PDF with barcode labels for inventory items
 */
export async function generateBarcodeLabels(itemIds: number[]): Promise<Buffer> {
  try {
    // Fetch inventory items
    const items: InventoryItem[] = [];
    for (const id of itemIds) {
      const item = await storage.getInventoryItem(id);
      if (item) {
        items.push(item);
      }
    }

    if (items.length === 0) {
      throw new Error('No valid inventory items found');
    }

    // Create content for barcode labels
    const content: any[] = [];

    // Add title
    content.push({
      text: 'Inventory Barcode Labels',
      style: 'header',
      alignment: 'center'
    });

    content.push({
      text: `Generated: ${new Date().toLocaleString()}`,
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });

    // Create a table with 2 columns for the barcode labels
    const labelData: any[] = [];
    let row: any[] = [];

    items.forEach((item, index) => {
      const barcode = item.metadata?.barcode;
      const qrCode = item.metadata?.qrCode;
      
      // Skip items without barcodes
      if (!barcode) return;

      // Create a single label
      const label = {
        stack: [
          {
            text: item.title.substring(0, 30) + (item.title.length > 30 ? '...' : ''),
            style: 'itemTitle',
            alignment: 'center'
          },
          {
            text: `SKU: ${item.sku}`,
            alignment: 'center',
            margin: [0, 5, 0, 5]
          },
          {
            // Barcode as SVG placeholder - in a real app, we'd use a barcode library to render
            svg: `<svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
                   <rect x="10" y="10" width="180" height="60" fill="white" stroke="black" />
                   <text x="100" y="50" font-family="Arial" font-size="12" text-anchor="middle">${barcode}</text>
                 </svg>`,
            width: 200,
            alignment: 'center'
          },
          {
            text: barcode,
            alignment: 'center',
            margin: [0, 5, 0, 10]
          }
        ],
        margin: [10, 10, 10, 10],
        border: [true, true, true, true]
      };

      row.push(label);

      // Create rows with 2 columns
      if (row.length === 2 || index === items.length - 1) {
        // If we have an odd number of items, add an empty cell to complete the row
        if (row.length === 1) {
          row.push({});
        }
        labelData.push(row);
        row = [];
      }
    });

    if (labelData.length > 0) {
      content.push({
        table: {
          widths: ['*', '*'],
          body: labelData
        },
        layout: {
          defaultBorder: false
        }
      });
    } else {
      content.push({
        text: 'No barcode data available for the selected items',
        alignment: 'center',
        margin: [0, 20, 0, 0]
      });
    }

    // Create PDF document definition
    const docDefinition: TDocumentDefinitions = {
      content,
      styles: defaultStyles,
      pageSize: 'LETTER',
      pageMargins: [20, 20, 20, 20]
    };

    // Generate PDF as buffer
    return new Promise((resolve, reject) => {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer) => {
        resolve(buffer);
      });
    });
  } catch (error) {
    console.error('Error generating barcode labels PDF:', error);
    throw new Error('Failed to generate barcode labels PDF');
  }
}

/**
 * Generate a packing slip PDF for shipping an inventory item
 */
export async function generatePackingSlip(
  inventoryItemId: number,
  orderInfo: {
    orderNumber: string;
    orderDate: Date;
    customerName: string;
    shippingAddress: string;
    paymentMethod: string;
  }
): Promise<Buffer> {
  try {
    // Get the inventory item
    const item = await storage.getInventoryItem(inventoryItemId);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    // Create content for packing slip
    const content: any[] = [];

    // Add header
    content.push({
      text: 'Packing Slip',
      style: 'header',
      alignment: 'center'
    });

    // Add order information
    content.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Order Information', style: 'subheader' },
            { text: `Order Number: ${orderInfo.orderNumber}` },
            { text: `Order Date: ${orderInfo.orderDate.toLocaleDateString()}` },
            { text: `Payment Method: ${orderInfo.paymentMethod}` }
          ]
        },
        {
          width: '*',
          stack: [
            { text: 'Shipping Information', style: 'subheader' },
            { text: `Customer: ${orderInfo.customerName}` },
            { text: `Shipping Address:`, margin: [0, 5, 0, 0] },
            { text: orderInfo.shippingAddress, margin: [0, 5, 0, 0] }
          ]
        }
      ],
      columnGap: 20,
      margin: [0, 20, 0, 20]
    });

    // Add item information
    content.push({ text: 'Item Details', style: 'subheader' });

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 50, 70],
        body: [
          [
            { text: 'Item Description', style: 'tableHeader' },
            { text: 'Quantity', style: 'tableHeader', alignment: 'center' },
            { text: 'SKU', style: 'tableHeader', alignment: 'center' }
          ],
          [
            { text: item.title, margin: [0, 5, 0, 5] },
            { text: '1', alignment: 'center', margin: [0, 5, 0, 5] },
            { text: item.sku, alignment: 'center', margin: [0, 5, 0, 5] }
          ]
        ]
      },
      margin: [0, 10, 0, 20]
    });

    // Add barcode if available
    if (item.metadata?.barcode) {
      content.push({
        text: 'Barcode',
        style: 'subheader',
        alignment: 'center'
      });

      content.push({
        // Barcode as SVG placeholder - in a real app, we'd use a barcode library to render
        svg: `<svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
               <rect x="10" y="10" width="180" height="60" fill="white" stroke="black" />
               <text x="100" y="50" font-family="Arial" font-size="12" text-anchor="middle">${item.metadata.barcode}</text>
             </svg>`,
        width: 200,
        alignment: 'center',
        margin: [0, 10, 0, 10]
      });

      content.push({
        text: item.metadata.barcode,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });
    }

    // Add footer
    content.push({
      text: 'Thank you for your business!',
      alignment: 'center',
      margin: [0, 20, 0, 10]
    });

    content.push({
      text: `Generated by MrLister on ${new Date().toLocaleString()}`,
      alignment: 'center',
      fontSize: 10,
      color: 'gray'
    });

    // Create PDF document definition
    const docDefinition: TDocumentDefinitions = {
      content,
      styles: defaultStyles,
      pageSize: 'LETTER',
      pageMargins: [40, 40, 40, 40]
    };

    // Generate PDF as buffer
    return new Promise((resolve, reject) => {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer) => {
        resolve(buffer);
      });
    });
  } catch (error) {
    console.error('Error generating packing slip PDF:', error);
    throw new Error('Failed to generate packing slip PDF');
  }
}

/**
 * Generate a QR code label PDF for inventory items
 */
export async function generateQrCodeLabels(itemIds: number[]): Promise<Buffer> {
  try {
    // Fetch inventory items
    const items: InventoryItem[] = [];
    for (const id of itemIds) {
      const item = await storage.getInventoryItem(id);
      if (item) {
        items.push(item);
      }
    }

    if (items.length === 0) {
      throw new Error('No valid inventory items found');
    }

    // Create content for QR code labels
    const content: any[] = [];

    // Add title
    content.push({
      text: 'Inventory QR Code Labels',
      style: 'header',
      alignment: 'center'
    });

    content.push({
      text: `Generated: ${new Date().toLocaleString()}`,
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });

    // Create a table with 2 columns for the QR code labels
    const labelData: any[] = [];
    let row: any[] = [];

    items.forEach((item, index) => {
      const qrCode = item.metadata?.qrCode;
      
      // Skip items without QR codes
      if (!qrCode) return;

      // Create a single label
      const label = {
        stack: [
          {
            text: item.title.substring(0, 30) + (item.title.length > 30 ? '...' : ''),
            style: 'itemTitle',
            alignment: 'center'
          },
          {
            text: `SKU: ${item.sku}`,
            alignment: 'center',
            margin: [0, 5, 0, 5]
          },
          {
            // QR code as image
            image: qrCode,
            width: 150,
            alignment: 'center'
          }
        ],
        margin: [10, 10, 10, 10],
        border: [true, true, true, true]
      };

      row.push(label);

      // Create rows with 2 columns
      if (row.length === 2 || index === items.length - 1) {
        // If we have an odd number of items, add an empty cell to complete the row
        if (row.length === 1) {
          row.push({});
        }
        labelData.push(row);
        row = [];
      }
    });

    if (labelData.length > 0) {
      content.push({
        table: {
          widths: ['*', '*'],
          body: labelData
        },
        layout: {
          defaultBorder: false
        }
      });
    } else {
      content.push({
        text: 'No QR code data available for the selected items',
        alignment: 'center',
        margin: [0, 20, 0, 0]
      });
    }

    // Create PDF document definition
    const docDefinition: TDocumentDefinitions = {
      content,
      styles: defaultStyles,
      pageSize: 'LETTER',
      pageMargins: [20, 20, 20, 20]
    };

    // Generate PDF as buffer
    return new Promise((resolve, reject) => {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer) => {
        resolve(buffer);
      });
    });
  } catch (error) {
    console.error('Error generating QR code labels PDF:', error);
    throw new Error('Failed to generate QR code labels PDF');
  }
}

/**
 * Generate an inventory report PDF with details about multiple items
 */
export async function generateInventoryReport(storeId?: number): Promise<Buffer> {
  try {
    // Fetch inventory items for the specified store or all items
    let items: InventoryItem[] = [];
    if (storeId) {
      items = await storage.getInventoryItemsByStore(storeId);
    } else {
      // This is simplified - in a real app, you'd need to paginate large collections
      // Get all users and their items
      const users = await storage.getAllUsers();
      for (const user of users) {
        const userItems = await storage.getInventoryItemsByUser(user.id);
        items = [...items, ...userItems];
      }
    }

    if (items.length === 0) {
      throw new Error('No inventory items found');
    }

    // Create content for inventory report
    const content: any[] = [];

    // Add title
    content.push({
      text: 'Inventory Report',
      style: 'header',
      alignment: 'center'
    });

    content.push({
      text: `Generated: ${new Date().toLocaleString()}`,
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });

    // Create a table with item information
    const tableData: any[] = [
      [
        { text: 'SKU', style: 'tableHeader' },
        { text: 'Title', style: 'tableHeader' },
        { text: 'Category', style: 'tableHeader' },
        { text: 'Condition', style: 'tableHeader' },
        { text: 'Price', style: 'tableHeader', alignment: 'right' },
        { text: 'Qty', style: 'tableHeader', alignment: 'center' },
        { text: 'Status', style: 'tableHeader', alignment: 'center' }
      ]
    ];

    items.forEach((item) => {
      tableData.push([
        { text: item.sku },
        { text: item.title.substring(0, 30) + (item.title.length > 30 ? '...' : '') },
        { text: item.category },
        { text: item.condition },
        { text: `$${item.price.toFixed(2)}`, alignment: 'right' },
        { text: item.quantity.toString(), alignment: 'center' },
        { text: item.status, alignment: 'center' }
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [60, '*', 70, 60, 50, 30, 60],
        body: tableData
      },
      margin: [0, 0, 0, 20]
    });

    // Add summary
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    content.push({
      columns: [
        {
          width: '*',
          text: ''
        },
        {
          width: 'auto',
          table: {
            body: [
              [
                { text: 'Total Items:', style: 'tableHeader', alignment: 'right' },
                { text: totalItems.toString(), alignment: 'right' }
              ],
              [
                { text: 'Total Value:', style: 'tableHeader', alignment: 'right' },
                { text: `$${totalValue.toFixed(2)}`, alignment: 'right' }
              ]
            ]
          },
          layout: 'noBorders'
        }
      ]
    });

    // Create PDF document definition
    const docDefinition: TDocumentDefinitions = {
      content,
      styles: defaultStyles,
      pageSize: 'LETTER',
      pageOrientation: 'landscape',
      pageMargins: [40, 40, 40, 40]
    };

    // Generate PDF as buffer
    return new Promise((resolve, reject) => {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer) => {
        resolve(buffer);
      });
    });
  } catch (error) {
    console.error('Error generating inventory report PDF:', error);
    throw new Error('Failed to generate inventory report PDF');
  }
}

// Helper method to fetch all users, needed for inventory report
// This method would need to be added to the storage interface
declare module './storage' {
  interface IStorage {
    getAllUsers(): Promise<User[]>;
  }
}