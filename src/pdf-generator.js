const jsPDF = require('jspdf');

class PDFGenerator {
    generateInvoicePDF(invoiceData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new jsPDF();
                
                // Add header
                doc.setFontSize(20);
                doc.text('INVOICE', 105, 20, { align: 'center' });
                
                // Company info
                doc.setFontSize(10);
                doc.text('Your Company Name', 20, 40);
                doc.text('123 Business Street', 20, 47);
                doc.text('City, State 12345', 20, 54);
                doc.text('Phone: (123) 456-7890', 20, 61);
                doc.text('Email: info@company.com', 20, 68);
                
                // Invoice info
                doc.text(`Invoice #: ${invoiceData.invoice_number}`, 150, 40);
                doc.text(`Date: ${invoiceData.invoice_date}`, 150, 47);
                doc.text(`Due Date: ${invoiceData.due_date}`, 150, 54);
                
                // Customer info
                doc.text('Bill To:', 20, 90);
                doc.text(invoiceData.customer_name, 20, 97);
                if (invoiceData.address) {
                    doc.text(invoiceData.address, 20, 104);
                }
                if (invoiceData.gstin) {
                    doc.text(`GSTIN: ${invoiceData.gstin}`, 20, 111);
                }
                
                // Table header
                let yPosition = 140;
                doc.setFillColor(200, 200, 200);
                doc.rect(20, yPosition, 170, 10, 'F');
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(8);
                
                doc.text('Item', 22, yPosition + 7);
                doc.text('Qty', 80, yPosition + 7);
                doc.text('Price', 100, yPosition + 7);
                doc.text('Tax %', 120, yPosition + 7);
                doc.text('Discount %', 140, yPosition + 7);
                doc.text('Total', 160, yPosition + 7);
                
                yPosition += 10;
                
                // Items
                invoiceData.items.forEach(item => {
                    doc.text(item.product_name || 'Product', 22, yPosition + 7);
                    doc.text(item.quantity.toString(), 80, yPosition + 7);
                    doc.text(`₹${item.unit_price}`, 100, yPosition + 7);
                    doc.text(`${item.tax_rate}%`, 120, yPosition + 7);
                    doc.text(`${item.discount}%`, 140, yPosition + 7);
                    doc.text(`₹${item.total}`, 160, yPosition + 7);
                    yPosition += 10;
                });
                
                // Summary
                yPosition += 20;
                doc.text(`Subtotal: ₹${invoiceData.subtotal}`, 130, yPosition);
                doc.text(`Tax: ₹${invoiceData.total_tax}`, 130, yPosition + 7);
                doc.text(`Discount: ₹${invoiceData.total_discount}`, 130, yPosition + 14);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`Grand Total: ₹${invoiceData.grand_total}`, 130, yPosition + 25);
                
                // Notes
                if (invoiceData.notes) {
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(10);
                    doc.text('Notes:', 20, yPosition + 40);
                    doc.text(invoiceData.notes, 20, yPosition + 47);
                }
                
                // Save the PDF
                const pdfBuffer = doc.output();
                resolve(pdfBuffer);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PDFGenerator;