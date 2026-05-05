const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendMonthlyReportEmail } = require('./email');

exports.generatePDF = async (userId, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    user: userId, date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const earnings = transactions.filter(t => t.type === 'earning');
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalEarnings = earnings.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const balance = totalEarnings - totalExpenses;
  const monthName = startDate.toLocaleString('default', { month: 'long' });

  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Header
    doc.rect(0, 0, 595, 80).fill('#0f172a');
    doc.fillColor('#6366f1').fontSize(24).font('Helvetica-Bold').text('ExpenseTracker', 50, 25);
    doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text(`Monthly Report — ${monthName} ${year}`, 50, 55);

    doc.moveDown(2);

    // Summary boxes
    const drawBox = (x, y, w, h, bg, label, value, color) => {
      doc.rect(x, y, w, h).fill(bg);
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(label, x + 12, y + 10);
      doc.fillColor(color).fontSize(18).font('Helvetica-Bold').text(value, x + 12, y + 26);
    };

    const y0 = 110;
    drawBox(50, y0, 155, 60, '#1e293b', 'TOTAL EARNINGS', `₹${totalEarnings.toLocaleString('en-IN', {minimumFractionDigits:2})}`, '#22c55e');
    drawBox(215, y0, 155, 60, '#1e293b', 'TOTAL EXPENSES', `₹${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits:2})}`, '#ef4444');
    drawBox(380, y0, 165, 60, '#1e293b', balance >= 0 ? 'NET PROFIT' : 'NET LOSS', `₹${Math.abs(balance).toLocaleString('en-IN', {minimumFractionDigits:2})}`, balance >= 0 ? '#22c55e' : '#ef4444');

    // Transactions table
    const tableY = 200;
    doc.fillColor('#6366f1').fontSize(13).font('Helvetica-Bold').text('Transaction Details', 50, tableY);

    // Table header
    const hy = tableY + 20;
    doc.rect(50, hy, 495, 22).fill('#1e293b');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 58, hy + 7);
    doc.text('Type', 130, hy + 7);
    doc.text('Category', 185, hy + 7);
    doc.text('Reason', 265, hy + 7);
    doc.text('Mode', 385, hy + 7);
    doc.text('Amount', 440, hy + 7, { width: 100, align: 'right' });

    let rowY = hy + 22;
    transactions.forEach((t, i) => {
      if (rowY > 750) { doc.addPage(); rowY = 50; }
      const bg = i % 2 === 0 ? '#0f172a' : '#1e293b';
      doc.rect(50, rowY, 495, 20).fill(bg);
      doc.fillColor('#e2e8f0').fontSize(8).font('Helvetica');
      doc.text(new Date(t.date).toLocaleDateString('en-IN'), 58, rowY + 6);
      doc.fillColor(t.type === 'earning' ? '#22c55e' : '#ef4444');
      doc.text(t.type.toUpperCase(), 130, rowY + 6);
      doc.fillColor('#e2e8f0');
      doc.text(t.category.substring(0,16), 185, rowY + 6);
      doc.text(t.reason.substring(0,24), 265, rowY + 6);
      doc.text(t.paymentMode || 'cash', 385, rowY + 6);
      doc.fillColor(t.type === 'earning' ? '#22c55e' : '#ef4444');
      doc.text(`${t.type === 'earning' ? '+' : '-'}₹${t.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}`, 440, rowY + 6, { width: 100, align: 'right' });
      rowY += 20;
    });

    // Footer
    doc.rect(0, 810, 595, 32).fill('#0f172a');
    doc.fillColor('#475569').fontSize(9).font('Helvetica').text(`Generated on ${new Date().toLocaleDateString('en-IN')} | ExpenseTracker`, 50, 820);

    doc.end();
  });
};

exports.generateMonthlyReports = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const users = await User.find({ isVerified: true });
  for (const user of users) {
    try {
      const pdf = await exports.generatePDF(user._id, month, year);
      const monthName = now.toLocaleString('default', { month: 'long' });
      await sendMonthlyReportEmail(user, pdf, monthName, year);
      console.log(`✅ Report sent to ${user.email}`);
    } catch (e) {
      console.error(`❌ Failed for ${user.email}:`, e.message);
    }
  }
};
