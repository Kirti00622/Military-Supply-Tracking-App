const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

exports.sendEmail = async (to, subject, html) => {
  try {
    if (process.env.NODE_ENV === 'test') return;
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"MST System" <${process.env.SMTP_USER}>`,
      to, subject, html
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email error:', error.message);
  }
};

exports.sendLowStockAlert = async (email, itemName, quantity, threshold, base) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f4f4;border-radius:8px">
      <div style="background:#2d5016;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="margin:0;font-size:20px">Low Stock Alert</h1>
      </div>
      <div style="background:white;padding:20px;border-radius:0 0 8px 8px">
        <p style="font-size:16px;color:#333">The following inventory item has fallen below its minimum threshold:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">Item</td><td style="padding:10px;border-bottom:1px solid #eee">${itemName}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">Current Quantity</td><td style="padding:10px;border-bottom:1px solid #eee;color:#f85149;font-weight:bold">${quantity}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">Minimum Threshold</td><td style="padding:10px;border-bottom:1px solid #eee">${threshold}</td></tr>
          <tr><td style="padding:10px;font-weight:bold">Location</td><td style="padding:10px">${base}</td></tr>
        </table>
        <p style="color:#666;font-size:14px">Please take immediate action to reorder this item.</p>
      </div>
    </div>`;
  await this.sendEmail(email, `Low Stock Alert: ${itemName}`, html);
};

exports.sendShipmentUpdate = async (email, shipmentId, status, origin, destination) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f4f4;border-radius:8px">
      <div style="background:#2d5016;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="margin:0;font-size:20px">Shipment Update</h1>
      </div>
      <div style="background:white;padding:20px;border-radius:0 0 8px 8px">
        <p style="font-size:16px;color:#333">Shipment status has been updated:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">Shipment ID</td><td style="padding:10px;border-bottom:1px solid #eee">${shipmentId}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">Status</td><td style="padding:10px;border-bottom:1px solid #eee;color:#3fb950;font-weight:bold">${status}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">Route</td><td style="padding:10px;border-bottom:1px solid #eee">${origin} → ${destination}</td></tr>
        </table>
      </div>
    </div>`;
  await this.sendEmail(email, `Shipment ${shipmentId}: ${status}`, html);
};
