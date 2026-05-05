const { generatePDF } = require('../utils/reportGenerator');

exports.downloadMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.params;
    const pdfBuffer = await generatePDF(req.user._id, Number(month), Number(year));
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-${monthName}-${year}.pdf"` });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
