const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Customer management
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  saveCustomer: (customer) => ipcRenderer.invoke('save-customer', customer),
  
  // Product management
  getProducts: () => ipcRenderer.invoke('get-products'),
  saveProduct: (product) => ipcRenderer.invoke('save-product', product),
  
  // Invoice management
  saveInvoice: (invoice) => ipcRenderer.invoke('save-invoice', invoice),
  getInvoices: () => ipcRenderer.invoke('get-invoices'),
  
  // Export functions
  exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
  exportExcel: (data) => ipcRenderer.invoke('export-excel', data),
  
  // Print
  printInvoice: (invoiceId) => ipcRenderer.invoke('print-invoice', invoiceId),
  
  // Menu events
  onMenuNewInvoice: (callback) => ipcRenderer.on('menu-new-invoice', callback),
  onMenuExportPDF: (callback) => ipcRenderer.on('menu-export-pdf', callback),
  onMenuExportExcel: (callback) => ipcRenderer.on('menu-export-excel', callback)
});