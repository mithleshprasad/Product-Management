const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', 'billing_app.db');
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const queries = [
                `CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    address TEXT,
                    gstin TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                `CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    tax_rate DECIMAL(5,2) DEFAULT 18,
                    stock_quantity INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,

                `CREATE TABLE IF NOT EXISTS invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoice_number TEXT UNIQUE NOT NULL,
                    customer_id INTEGER,
                    invoice_date DATE NOT NULL,
                    due_date DATE,
                    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
                    total_tax DECIMAL(10,2) NOT NULL DEFAULT 0,
                    total_discount DECIMAL(10,2) NOT NULL DEFAULT 0,
                    grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
                    status TEXT DEFAULT 'pending',
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )`,

                `CREATE TABLE IF NOT EXISTS invoice_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoice_id INTEGER,
                    product_id INTEGER,
                    product_name TEXT NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
                    discount DECIMAL(5,2) DEFAULT 0,
                    total DECIMAL(10,2) NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )`
            ];

            let completed = 0;
            const runQuery = (query) => {
                return new Promise((resolveQuery, rejectQuery) => {
                    this.db.run(query, (err) => {
                        if (err) {
                            console.error('Error creating table:', err);
                            rejectQuery(err);
                        } else {
                            resolveQuery();
                        }
                    });
                });
            };

            const runAllQueries = async () => {
                try {
                    for (const query of queries) {
                        await runQuery(query);
                    }
                    console.log('All tables created successfully');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            runAllQueries();
        });
    }

    // Customer methods
    getCustomers() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM customers ORDER BY name", (err, rows) => {
                if (err) {
                    console.error('Error getting customers:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    saveCustomer(customer) {
        return new Promise((resolve, reject) => {
            if (customer.id) {
                const query = `UPDATE customers SET 
                    name = ?, email = ?, phone = ?, address = ?, gstin = ? 
                    WHERE id = ?`;
                this.db.run(query, [
                    customer.name, 
                    customer.email, 
                    customer.phone, 
                    customer.address, 
                    customer.gstin, 
                    customer.id
                ], function(err) {
                    if (err) {
                        console.error('Error updating customer:', err);
                        reject(err);
                    } else {
                        resolve({ id: customer.id, ...customer });
                    }
                });
            } else {
                const query = `INSERT INTO customers 
                    (name, email, phone, address, gstin) 
                    VALUES (?, ?, ?, ?, ?)`;
                this.db.run(query, [
                    customer.name, 
                    customer.email, 
                    customer.phone, 
                    customer.address, 
                    customer.gstin
                ], function(err) {
                    if (err) {
                        console.error('Error saving customer:', err);
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...customer });
                    }
                });
            }
        });
    }

    // Product methods
    getProducts() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM products ORDER BY name", (err, rows) => {
                if (err) {
                    console.error('Error getting products:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    saveProduct(product) {
        return new Promise((resolve, reject) => {
            if (product.id) {
                const query = `UPDATE products SET 
                    name = ?, description = ?, price = ?, tax_rate = ?, stock_quantity = ? 
                    WHERE id = ?`;
                this.db.run(query, [
                    product.name, 
                    product.description, 
                    product.price,
                    product.tax_rate, 
                    product.stock_quantity, 
                    product.id
                ], function(err) {
                    if (err) {
                        console.error('Error updating product:', err);
                        reject(err);
                    } else {
                        resolve({ id: product.id, ...product });
                    }
                });
            } else {
                const query = `INSERT INTO products 
                    (name, description, price, tax_rate, stock_quantity) 
                    VALUES (?, ?, ?, ?, ?)`;
                this.db.run(query, [
                    product.name, 
                    product.description, 
                    product.price,
                    product.tax_rate, 
                    product.stock_quantity
                ], function(err) {
                    if (err) {
                        console.error('Error saving product:', err);
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...product });
                    }
                });
            }
        });
    }

    // Invoice methods
    generateInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timestamp = date.getTime().toString().slice(-4);
        return `INV-${year}${month}${day}-${timestamp}`;
    }

    saveInvoice(invoiceData) {
        return new Promise((resolve, reject) => {
            const invoiceNumber = this.generateInvoiceNumber();
            const query = `INSERT INTO invoices 
                (invoice_number, customer_id, invoice_date, due_date, 
                 subtotal, total_tax, total_discount, grand_total, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            console.log('Saving invoice:', invoiceData);

            this.db.run(query, [
                invoiceNumber,
                invoiceData.customer_id,
                invoiceData.invoice_date || new Date().toISOString().split('T')[0],
                invoiceData.due_date,
                invoiceData.subtotal || 0,
                invoiceData.total_tax || 0,
                invoiceData.total_discount || 0,
                invoiceData.grand_total || 0,
                invoiceData.notes || ''
            ], function(err) {
                if (err) {
                    console.error('Error saving invoice:', err);
                    reject(err);
                    return;
                }

                const invoiceId = this.lastID;
                console.log('Invoice saved with ID:', invoiceId);
                
                // Save invoice items
                this.saveInvoiceItems(invoiceId, invoiceData.items)
                    .then(() => {
                        console.log('Invoice items saved successfully');
                        resolve({ id: invoiceId, invoice_number: invoiceNumber });
                    })
                    .catch(error => {
                        console.error('Error saving invoice items:', error);
                        reject(error);
                    });
            }.bind(this));
        });
    }

    saveInvoiceItems(invoiceId, items) {
        return new Promise((resolve, reject) => {
            if (!items || items.length === 0) {
                resolve();
                return;
            }

            const query = `INSERT INTO invoice_items 
                (invoice_id, product_id, product_name, quantity, unit_price, tax_rate, discount, total) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

            let completed = 0;
            let hasError = false;

            items.forEach(item => {
                console.log('Saving invoice item:', item);
                
                this.db.run(query, [
                    invoiceId,
                    item.product_id,
                    item.product_name || 'Unknown Product',
                    item.quantity || 1,
                    item.unit_price || 0,
                    item.tax_rate || 0,
                    item.discount || 0,
                    item.total || 0
                ], (err) => {
                    if (err) {
                        console.error('Error saving invoice item:', err);
                        hasError = true;
                        reject(err);
                    }
                    completed++;
                    if (completed === items.length && !hasError) {
                        resolve();
                    }
                });
            });
        });
    }

    getInvoices() {
        return new Promise((resolve, reject) => {
            const query = `SELECT i.*, c.name as customer_name 
                         FROM invoices i 
                         LEFT JOIN customers c ON i.customer_id = c.id 
                         ORDER BY i.created_at DESC`;
            this.db.all(query, (err, rows) => {
                if (err) {
                    console.error('Error getting invoices:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    getInvoice(invoiceId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT i.*, c.* 
                         FROM invoices i 
                         LEFT JOIN customers c ON i.customer_id = c.id 
                         WHERE i.id = ?`;
            this.db.get(query, [invoiceId], (err, invoice) => {
                if (err) {
                    console.error('Error getting invoice:', err);
                    reject(err);
                    return;
                }

                if (!invoice) {
                    reject(new Error('Invoice not found'));
                    return;
                }

                // Get invoice items
                const itemsQuery = `SELECT ii.*, p.name as product_name 
                                  FROM invoice_items ii 
                                  LEFT JOIN products p ON ii.product_id = p.id 
                                  WHERE ii.invoice_id = ?`;
                this.db.all(itemsQuery, [invoiceId], (err, items) => {
                    if (err) {
                        console.error('Error getting invoice items:', err);
                        reject(err);
                    } else {
                        resolve({ ...invoice, items: items || [] });
                    }
                });
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = Database;