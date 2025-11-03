const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('./src/database');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  mainWindow.loadFile('src/index.html');

  // Create application menu
  createMenu();

  // Initialize database
  db = new Database();
  db.init();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Invoice',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-invoice');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Reports',
          submenu: [
            {
              label: 'Export to PDF',
              click: () => {
                mainWindow.webContents.send('menu-export-pdf');
              }
            },
            {
              label: 'Export to Excel',
              click: () => {
                mainWindow.webContents.send('menu-export-excel');
              }
            }
          ]
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-customers', async () => {
  return await db.getCustomers();
});

ipcMain.handle('get-products', async () => {
  return await db.getProducts();
});

ipcMain.handle('save-customer', async (event, customer) => {
  return await db.saveCustomer(customer);
});

ipcMain.handle('save-product', async (event, product) => {
  return await db.saveProduct(product);
});

ipcMain.handle('save-invoice', async (event, invoice) => {
  return await db.saveInvoice(invoice);
});

ipcMain.handle('get-invoices', async () => {
  return await db.getInvoices();
});

ipcMain.handle('print-invoice', async (event, invoiceId) => {
  // Implementation for printing
  const invoice = await db.getInvoice(invoiceId);
  return invoice;
});

ipcMain.handle('export-pdf', async (event, data) => {
  const PDFGenerator = require('./src/pdf-generator');
  const pdfGenerator = new PDFGenerator();
  return await pdfGenerator.generateInvoicePDF(data);
});

ipcMain.handle('export-excel', async (event, data) => {
  const ExcelExporter = require('./src/excel-export');
  const excelExporter = new ExcelExporter();
  return await excelExporter.exportToExcel(data);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});