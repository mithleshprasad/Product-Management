    const XLSX = require('xlsx');

class ExcelExporter {
    exportToExcel(data) {
        return new Promise((resolve, reject) => {
            try {
                const workbook = XLSX.utils.book_new();
                
                // Create invoices sheet
                const invoicesData = data.invoices.map(invoice => ({
                    'Invoice Number': invoice.invoice_number,
                    'Customer': invoice.customer_name,
                    'Date': invoice.invoice_date,
                    'Due Date': invoice.due_date,
                    'Subtotal': invoice.subtotal,
                    'Tax': invoice.total_tax,
                    'Discount': invoice.total_discount,
                    'Grand Total': invoice.grand_total,
                    'Status': invoice.status
                }));
                
                const invoicesSheet = XLSX.utils.json_to_sheet(invoicesData);
                XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Invoices');
                
                // Create customers sheet
                const customersData = data.customers.map(customer => ({
                    'Name': customer.name,
                    'Email': customer.email,
                    'Phone': customer.phone,
                    'Address': customer.address,
                    'GSTIN': customer.gstin
                }));
                
                const customersSheet = XLSX.utils.json_to_sheet(customersData);
                XLSX.utils.book_append_sheet(workbook, customersSheet, 'Customers');
                
                // Create products sheet
                const productsData = data.products.map(product => ({
                    'Name': product.name,
                    'Description': product.description,
                    'Price': product.price,
                    'Tax Rate': product.tax_rate,
                    'Stock': product.stock_quantity
                }));
                
                const productsSheet = XLSX.utils.json_to_sheet(productsData);
                XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
                
                // Generate buffer
                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
                resolve(excelBuffer);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = ExcelExporter;