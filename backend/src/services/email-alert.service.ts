import nodemailer from 'nodemailer';
import prisma from '../config/prisma';
import { RESOURCE_REGISTRY } from '../modules/resource-center/constants/resource-center.constants';

// Initialize Nodemailer with the same configuration as OTP login
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const checkAndSendDailyChargeAlerts = async (): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYearMonth = today.getFullYear() * 100 + (today.getMonth() + 1);
    const missingCharges: string[] = [];

    // Keys to ignore (static tables or client-specific)
    const ignoreKeys = ['region-state', 'discom-list', 'prolt-margin'];

    for (const key of Object.keys(RESOURCE_REGISTRY)) {
      if (ignoreKeys.includes(key)) continue;

      const tableInfo = RESOURCE_REGISTRY[key as keyof typeof RESOURCE_REGISTRY];
      if (!tableInfo || !tableInfo.modelName) continue;

      const delegate = prisma[tableInfo.modelName as keyof typeof prisma];
      if (!delegate) continue;

      let count = 0;

      // Determine how to check based on the resource type
      if (['iex-fees', 'ctu-charges', 'state-tariff', 'fppa-charges'].includes(key)) {
        // These are monthly charges keyed by YYYYMM
        count = await (delegate as any).count({
          where: {
            month: currentYearMonth,
          },
        });
      } else if (key === 'ists-charges') {
        // ISTS charges uses startDate and endDate
        count = await (delegate as any).count({
          where: {
            startDate: { lte: today },
            endDate: { gte: today },
          },
        });
      } else if (key === 'state-charges') {
        // State charges uses fromDate and toDate
        count = await (delegate as any).count({
          where: {
            fromDate: { lte: today },
            toDate: { gte: today },
          },
        });
      }

      if (count === 0) {
        missingCharges.push(tableInfo.displayName);
      }
    }

    if (missingCharges.length > 0) {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #EF4444;">Missing Daily/Monthly Charges Alert</h2>
          <p>Hello,</p>
          <p>The following charges have <strong>not</strong> been added or are missing valid data for the current date/month in the Resource Center:</p>
          <ul>
            ${missingCharges.map((charge) => `<li><strong>${charge}</strong></li>`).join('')}
          </ul>
          <p>Please add this charge / Please update these charges in the system.</p>
          <br/>
          <p>Best regards,<br/>Prolt Resource Center Automated Alert System</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"Prolt Resource Center Alerts" <${process.env.SMTP_USER || 'no-reply@probus.io'}>`,
        to: 'aditya@probus.io',
        subject: `ACTION REQUIRED: Missing Resource Center Charges for ${today.toLocaleDateString()}`,
        html: emailContent,
      });

      console.log(`[Email Alert] Successfully sent missing charges alert for: ${missingCharges.join(', ')}`);
    } else {
      console.log('[Email Alert] All charges are up to date for today. No alert sent.');
    }
  } catch (error) {
    console.error('[Email Alert Error]', error);
  }
};
