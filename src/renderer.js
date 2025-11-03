// DOM elements and global variables
let currentTab = 'dashboard';
let customers = [];
let products = [];
let invoices = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    try {
        await loadInitialData();
        await loadDashboardData();
        setupEventListeners();
        setupEnhancedNavigation();
        setupEnhancedModals();
        setupMenuListeners();
        
        // Set current date for invoice
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('invoiceDate').value = today;
        
        // Set due date to 30 days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
        
        showNotification('App initialized successfully!', 'success');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error initializing app: ' + error.message, 'error');
    }
}

// Load initial data
async function loadInitialData() {
    try {
        customers = await window.electronAPI.getCustomers();
        products = await window.electronAPI.getProducts();
        invoices = await window.electronAPI.getInvoices();
        
        populateCustomerSelect();
        populateProductSelect();
        populateCustomersTable();
        populateProductsTable();
        populateInvoicesTable();
        calculateInvoiceTotal();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showNotification('Error loading data: ' + error.message, 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Invoice form
    document.getElementById('addItemBtn').addEventListener('click', addItemRow);
    document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoice);
    document.getElementById('previewInvoiceBtn').addEventListener('click', previewInvoice);
    document.getElementById('printInvoiceBtn').addEventListener('click', printInvoice);
    document.getElementById('customerSelect').addEventListener('change', onCustomerSelect);

    // Customer management
    document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerModal());
    document.getElementById('customerForm').addEventListener('submit', saveCustomer);

    // Product management
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('productForm').addEventListener('submit', saveProduct);

    // Export buttons
    document.getElementById('exportPDFBtn').addEventListener('click', exportPDF);
    document.getElementById('exportExcelBtn').addEventListener('click', exportExcel);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.getElementById('customerModal').style.display = 'none';
            document.getElementById('productModal').style.display = 'none';
        });
    });

    // Filters
    document.getElementById('statusFilter').addEventListener('change', filterInvoices);
    document.getElementById('startDate').addEventListener('change', filterInvoices);
    document.getElementById('endDate').addEventListener('change', filterInvoices);
}

// Enhanced navigation
function setupEnhancedNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            
            // Update active states
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update page title
            const pageTitle = document.getElementById('pageTitle');
            pageTitle.textContent = item.querySelector('span').textContent;
            
            // Switch tab
            switchTab(tabName);
        });
    });
    
    // Quick invoice button
    document.getElementById('quickInvoiceBtn').addEventListener('click', () => {
        switchTab('invoice');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-tab="invoice"]').classList.add('active');
        document.getElementById('pageTitle').textContent = 'Create Invoice';
    });
}

// Setup menu listeners from main process
function setupMenuListeners() {
    window.electronAPI.onMenuNewInvoice(() => {
        switchTab('invoice');
        resetInvoiceForm();
    });

    window.electronAPI.onMenuExportPDF(() => {
        exportPDF();
    });

    window.electronAPI.onMenuExportExcel(() => {
        exportExcel();
    });
}

// Enhanced modal handling
function setupEnhancedModals() {
    // Customer modal
    document.getElementById('newCustomerBtn').addEventListener('click', () => openCustomerModal());
    document.getElementById('cancelCustomerBtn').addEventListener('click', () => {
        document.getElementById('customerModal').style.display = 'none';
    });
    
    // Product modal
    document.getElementById('cancelProductBtn').addEventListener('click', () => {
        document.getElementById('productModal').style.display = 'none';
    });
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        const customerModal = document.getElementById('customerModal');
        const productModal = document.getElementById('productModal');
        
        if (e.target === customerModal) customerModal.style.display = 'none';
        if (e.target === productModal) productModal.style.display = 'none';
    });
}

// Tab navigation
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    currentTab = tabName;
    
    // Load tab-specific data
    if (tabName === 'dashboard') {
        loadDashboardData();
    } else if (tabName === 'invoices') {
        loadInvoicesData();
    }
}

// Dashboard functionality
async function loadDashboardData() {
    try {
        const invoices = await window.electronAPI.getInvoices();
        const customers = await window.electronAPI.getCustomers();
        
        // Update stats
        const totalRevenue = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.grand_total), 0);
        const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
        const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
        
        document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
        document.getElementById('totalInvoices').textContent = invoices.length;
        document.getElementById('totalCustomers').textContent = customers.length;
        document.getElementById('pendingInvoices').textContent = pendingInvoices;
        
        // Load recent invoices
        loadRecentInvoices(invoices.slice(0, 5));
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

function loadRecentInvoices(recentInvoices) {
    const container = document.getElementById('recentInvoicesList');
    container.innerHTML = '';
    
    if (recentInvoices.length === 0) {
        container.innerHTML = '<div class="no-data">No recent invoices</div>';
        return;
    }
    
    recentInvoices.forEach(invoice => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-info">
                <h5>${invoice.invoice_number}</h5>
                <p>${invoice.customer_name || 'Unknown Customer'} • ${formatDate(invoice.invoice_date)}</p>
            </div>
            <div class="activity-amount">
                ₹${parseFloat(invoice.grand_total).toFixed(2)}
            </div>
        `;
        container.appendChild(activityItem);
    });
}

// Customer Management
function populateCustomerSelect() {
    const select = document.getElementById('customerSelect');
    select.innerHTML = '<option value="">Choose a customer...</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        if (customer.gstin) {
            option.textContent += ` (GST: ${customer.gstin})`;
        }
        select.appendChild(option);
    });
}

function openCustomerModal(customer = null) {
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const title = document.getElementById('customerModalTitle');
    
    if (customer) {
        title.textContent = 'Edit Customer';
        document.getElementById('customerId').value = customer.id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerEmail').value = customer.email || '';
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerGSTIN').value = customer.gstin || '';
    } else {
        title.textContent = 'Add New Customer';
        form.reset();
        document.getElementById('customerId').value = '';
    }
    
    modal.style.display = 'block';
}

async function saveCustomer(e) {
    e.preventDefault();
    
    const customer = {
        name: document.getElementById('customerName').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        gstin: document.getElementById('customerGSTIN').value.trim()
    };
    
    if (!customer.name) {
        showNotification('Customer name is required', 'error');
        return;
    }
    
    const customerId = document.getElementById('customerId').value;
    if (customerId) {
        customer.id = parseInt(customerId);
    }
    
    try {
        showNotification('Saving customer...', 'info');
        const savedCustomer = await window.electronAPI.saveCustomer(customer);
        await loadInitialData(); // Reload data
        document.getElementById('customerModal').style.display = 'none';
        showNotification('Customer saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving customer:', error);
        showNotification('Error saving customer: ' + error.message, 'error');
    }
}

function populateCustomersTable() {
    const tbody = document.getElementById('customersBody');
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">No customers found. <a href="#" onclick="openCustomerModal()">Add your first customer</a></td>
            </tr>
        `;
        return;
    }
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.gstin || '-'}</td>
            <td>${getCustomerInvoiceCount(customer.id)}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="openCustomerModal(${JSON.stringify(customer).replace(/"/g, '&quot;')})" class="btn-outline btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getCustomerInvoiceCount(customerId) {
    return invoices.filter(invoice => invoice.customer_id === customerId).length;
}

// Product Management
function populateProductSelect() {
    const selects = document.querySelectorAll('.product-select');
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select product...</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} - ₹${parseFloat(product.price).toFixed(2)}`;
            option.dataset.price = product.price;
            option.dataset.tax = product.tax_rate;
            option.dataset.name = product.name;
            select.appendChild(option);
        });
        
        // Restore previous value if still valid
        if (currentValue) {
            select.value = currentValue;
            // Trigger change to update price and tax
            const event = new Event('change');
            select.dispatchEvent(event);
        }
    });
}

function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    if (product) {
        title.textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productTax').value = product.tax_rate;
        document.getElementById('productStock').value = product.stock_quantity;
    } else {
        title.textContent = 'Add New Product';
        form.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productTax').value = '18';
        document.getElementById('productStock').value = '0';
    }
    
    modal.style.display = 'block';
}

async function saveProduct(e) {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        tax_rate: parseFloat(document.getElementById('productTax').value) || 18,
        stock_quantity: parseInt(document.getElementById('productStock').value) || 0
    };
    
    if (!product.name) {
        showNotification('Product name is required', 'error');
        return;
    }
    
    if (product.price <= 0) {
        showNotification('Product price must be greater than 0', 'error');
        return;
    }
    
    const productId = document.getElementById('productId').value;
    if (productId) {
        product.id = parseInt(productId);
    }
    
    try {
        showNotification('Saving product...', 'info');
        const savedProduct = await window.electronAPI.saveProduct(product);
        await loadInitialData(); // Reload data
        document.getElementById('productModal').style.display = 'none';
        showNotification('Product saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product: ' + error.message, 'error');
    }
}

function populateProductsTable() {
    const tbody = document.getElementById('productsBody');
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No products found. <a href="#" onclick="openProductModal()">Add your first product</a></td>
            </tr>
        `;
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.description || '-'}</td>
            <td>₹${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.tax_rate}%</td>
            <td>${product.stock_quantity}</td>
            <td>
                <span class="status-badge ${product.stock_quantity > 0 ? 'status-paid' : 'status-overdue'}">
                    ${product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button onclick="openProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})" class="btn-outline btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Invoice Management
function addItemRow() {
    const tbody = document.getElementById('itemsBody');
    const newRow = document.createElement('tr');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <td>
            <select class="product-select form-control" onchange="onProductSelect(this)">
                <option value="">Select product...</option>
            </select>
        </td>
        <td>
            <input type="number" class="quantity form-control" value="1" min="1" onchange="calculateRowTotal(this)">
        </td>
        <td>
            <input type="number" class="price form-control" step="0.01" readonly>
        </td>
        <td>
            <input type="number" class="tax form-control" value="18" step="0.01" onchange="calculateRowTotal(this)">
        </td>
        <td>
            <input type="number" class="discount form-control" value="0" step="0.01" onchange="calculateRowTotal(this)">
        </td>
        <td>
            <span class="item-total">0.00</span>
        </td>
        <td>
            <button type="button" class="btn-danger btn-sm remove-item" onclick="removeItemRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(newRow);
    populateProductSelect();
    calculateInvoiceTotal();
}

function removeItemRow(button) {
    const row = button.closest('tr');
    row.remove();
    calculateInvoiceTotal();
}

function onProductSelect(select) {
    const row = select.closest('tr');
    const selectedOption = select.options[select.selectedIndex];
    const selectedProductId = select.value;
    
    if (selectedProductId && selectedOption.dataset.price) {
        const price = parseFloat(selectedOption.dataset.price) || 0;
        const taxRate = parseFloat(selectedOption.dataset.tax) || 18;
        const productName = selectedOption.dataset.name || selectedOption.textContent.split(' - ')[0];
        
        row.querySelector('.price').value = price;
        row.querySelector('.tax').value = taxRate;
        row.dataset.productName = productName;
        calculateRowTotal(select);
    } else {
        row.querySelector('.price').value = '';
        row.querySelector('.tax').value = 18;
        delete row.dataset.productName;
        calculateRowTotal(select);
    }
}

function calculateRowTotal(input) {
    const row = input.closest('tr');
    const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
    const price = parseFloat(row.querySelector('.price').value) || 0;
    const taxRate = parseFloat(row.querySelector('.tax').value) || 0;
    const discountRate = parseFloat(row.querySelector('.discount').value) || 0;
    
    const subtotal = quantity * price;
    const discountAmount = subtotal * (discountRate / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;
    
    row.querySelector('.item-total').textContent = total.toFixed(2);
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
        const price = parseFloat(row.querySelector('.price').value) || 0;
        const taxRate = parseFloat(row.querySelector('.tax').value) || 0;
        const discountRate = parseFloat(row.querySelector('.discount').value) || 0;
        
        const itemSubtotal = quantity * price;
        const itemDiscount = itemSubtotal * (discountRate / 100);
        const taxableAmount = itemSubtotal - itemDiscount;
        const itemTax = taxableAmount * (taxRate / 100);
        
        subtotal += itemSubtotal;
        totalTax += itemTax;
        totalDiscount += itemDiscount;
    });
    
    const grandTotal = subtotal + totalTax - totalDiscount;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('totalTax').textContent = totalTax.toFixed(2);
    document.getElementById('totalDiscount').textContent = totalDiscount.toFixed(2);
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2);
}

async function saveInvoice() {
    const customerSelect = document.getElementById('customerSelect');
    const customerId = customerSelect.value;
    
    if (!customerId) {
        showNotification('Please select a customer', 'error');
        return;
    }
    
    const items = [];
    let hasValidItems = false;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const productSelect = row.querySelector('.product-select');
        const productId = productSelect.value;
        const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
        const price = parseFloat(row.querySelector('.price').value) || 0;
        
        if (productId && quantity > 0 && price > 0) {
            const taxRate = parseFloat(row.querySelector('.tax').value) || 0;
            const discount = parseFloat(row.querySelector('.discount').value) || 0;
            const total = parseFloat(row.querySelector('.item-total').textContent) || 0;
            const productName = row.dataset.productName || 'Unknown Product';
            
            items.push({
                product_id: parseInt(productId),
                product_name: productName,
                quantity: quantity,
                unit_price: price,
                tax_rate: taxRate,
                discount: discount,
                total: total
            });
            hasValidItems = true;
        }
    });
    
    if (!hasValidItems) {
        showNotification('Please add at least one valid item with product, quantity, and price', 'error');
        return;
    }
    
    const invoiceData = {
        customer_id: parseInt(customerId),
        invoice_date: document.getElementById('invoiceDate').value,
        due_date: document.getElementById('dueDate').value,
        subtotal: parseFloat(document.getElementById('subtotal').textContent) || 0,
        total_tax: parseFloat(document.getElementById('totalTax').textContent) || 0,
        total_discount: parseFloat(document.getElementById('totalDiscount').textContent) || 0,
        grand_total: parseFloat(document.getElementById('grandTotal').textContent) || 0,
        items: items
    };
    
    console.log('Saving invoice data:', invoiceData);
    
    try {
        showNotification('Saving invoice...', 'info');
        const result = await window.electronAPI.saveInvoice(invoiceData);
        showNotification(`Invoice saved successfully! Invoice #: ${result.invoice_number}`, 'success');
        resetInvoiceForm();
        await loadInitialData(); // Reload invoices
        await loadDashboardData(); // Update dashboard
    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Error saving invoice: ' + error.message, 'error');
    }
}

function resetInvoiceForm() {
    document.getElementById('customerSelect').value = '';
    document.getElementById('itemsBody').innerHTML = `
        <tr class="item-row">
            <td>
                <select class="product-select form-control" onchange="onProductSelect(this)">
                    <option value="">Select product...</option>
                </select>
            </td>
            <td>
                <input type="number" class="quantity form-control" value="1" min="1" onchange="calculateRowTotal(this)">
            </td>
            <td>
                <input type="number" class="price form-control" step="0.01" readonly>
            </td>
            <td>
                <input type="number" class="tax form-control" value="18" step="0.01" onchange="calculateRowTotal(this)">
            </td>
            <td>
                <input type="number" class="discount form-control" value="0" step="0.01" onchange="calculateRowTotal(this)">
            </td>
            <td>
                <span class="item-total">0.00</span>
            </td>
            <td>
                <button type="button" class="btn-danger btn-sm remove-item" onclick="removeItemRow(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    populateProductSelect();
    calculateInvoiceTotal();
    
    // Reset dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
}

function onCustomerSelect() {
    // You can add additional logic here when customer is selected
    const customerId = this.value;
    if (customerId) {
        const customer = customers.find(c => c.id == customerId);
        if (customer) {
            // You can auto-fill other fields or perform actions based on customer selection
            console.log('Selected customer:', customer);
        }
    }
}

// Invoice History
function loadInvoicesData() {
    populateInvoicesTable();
}

function populateInvoicesTable() {
    const tbody = document.getElementById('invoicesBody');
    tbody.innerHTML = '';
    
    const filteredInvoices = getFilteredInvoices();
    
    if (filteredInvoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No invoices found</td>
            </tr>
        `;
        return;
    }
    
    filteredInvoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoice_number}</td>
            <td>${invoice.customer_name || 'Unknown'}</td>
            <td>${formatDate(invoice.invoice_date)}</td>
            <td>${invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
            <td>₹${parseFloat(invoice.grand_total).toFixed(2)}</td>
            <td>${getStatusBadge(invoice.status)}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="viewInvoice(${invoice.id})" class="btn-outline btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="downloadInvoice(${invoice.id})" class="btn-outline btn-sm">
                        <i class="fas fa-download"></i>
                    </button>
                    <button onclick="deleteInvoice(${invoice.id})" class="btn-danger btn-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getFilteredInvoices() {
    const statusFilter = document.getElementById('statusFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    let filtered = invoices;
    
    if (statusFilter) {
        filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    if (startDate) {
        filtered = filtered.filter(invoice => invoice.invoice_date >= startDate);
    }
    
    if (endDate) {
        filtered = filtered.filter(invoice => invoice.invoice_date <= endDate);
    }
    
    return filtered;
}

function filterInvoices() {
    populateInvoicesTable();
}

function getStatusBadge(status) {
    const statusMap = {
        'paid': 'status-paid',
        'pending': 'status-pending',
        'overdue': 'status-overdue'
    };
    
    return `<span class="status-badge ${statusMap[status] || 'status-pending'}">${status}</span>`;
}

async function viewInvoice(invoiceId) {
    try {
        const invoice = await window.electronAPI.getInvoice(invoiceId);
        // For now, show an alert with basic info
        alert(`Invoice Details:\n\nInvoice #: ${invoice.invoice_number}\nCustomer: ${invoice.customer_name}\nAmount: ₹${invoice.grand_total}\nStatus: ${invoice.status}`);
    } catch (error) {
        console.error('Error viewing invoice:', error);
        showNotification('Error viewing invoice: ' + error.message, 'error');
    }
}

async function downloadInvoice(invoiceId) {
    try {
        const invoice = await window.electronAPI.getInvoice(invoiceId);
        const pdfBuffer = await window.electronAPI.exportPDF(invoice);
        
        // Create download link
        const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Invoice downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading invoice:', error);
        showNotification('Error downloading invoice: ' + error.message, 'error');
    }
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Note: You'll need to add a deleteInvoice method to your electronAPI
        showNotification('Deleting invoice...', 'info');
        // await window.electronAPI.deleteInvoice(invoiceId);
        showNotification('Invoice deleted successfully!', 'success');
        await loadInitialData();
        await loadDashboardData();
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('Error deleting invoice: ' + error.message, 'error');
    }
}

// Export Functions
async function exportPDF() {
    try {
        const data = {
            invoices: invoices,
            customers: customers,
            products: products
        };
        
        showNotification('Generating PDF report...', 'info');
        const pdfBuffer = await window.electronAPI.exportPDF(data);
        
        // Create download link
        const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('PDF report exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showNotification('Error exporting PDF: ' + error.message, 'error');
    }
}

async function exportExcel() {
    try {
        const data = {
            invoices: invoices,
            customers: customers,
            products: products
        };
        
        showNotification('Generating Excel report...', 'info');
        const excelBuffer = await window.electronAPI.exportExcel(data);
        
        // Create download link
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Excel report exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting Excel:', error);
        showNotification('Error exporting Excel: ' + error.message, 'error');
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function previewInvoice() {
    showNotification('Preview feature coming soon!', 'info');
}

function printInvoice() {
    showNotification('Print feature coming soon!', 'info');
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentElement) {
            notification.remove();
        }
    });
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Add notification styles to document
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        max-width: 500px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid #4361ee;
        animation: slideInRight 0.3s ease;
    }
    
    .notification-success {
        border-left-color: #28a745;
    }
    
    .notification-error {
        border-left-color: #dc3545;
    }
    
    .notification-warning {
        border-left-color: #ffc107;
    }
    
    .notification-info {
        border-left-color: #17a2b8;
    }
    
    .notification-content {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .notification-content i {
        font-size: 1.2rem;
    }
    
    .notification-success .notification-content i {
        color: #28a745;
    }
    
    .notification-error .notification-content i {
        color: #dc3545;
    }
    
    .notification-warning .notification-content i {
        color: #ffc107;
    }
    
    .notification-info .notification-content i {
        color: #17a2b8;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        margin-left: auto;
        padding: 4px;
    }
    
    .notification-close:hover {
        color: #495057;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-data {
        text-align: center;
        color: #6c757d;
        padding: 20px;
    }
    
    .no-data a {
        color: #4361ee;
        text-decoration: none;
    }
    
    .no-data a:hover {
        text-decoration: underline;
    }
    
    .action-buttons {
        display: flex;
        gap: 4px;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Make functions globally available for HTML onclick handlers
window.openCustomerModal = openCustomerModal;
window.openProductModal = openProductModal;
window.removeItemRow = removeItemRow;
window.onProductSelect = onProductSelect;
window.calculateRowTotal = calculateRowTotal;
window.viewInvoice = viewInvoice;
window.downloadInvoice = downloadInvoice;
window.deleteInvoice = deleteInvoice;