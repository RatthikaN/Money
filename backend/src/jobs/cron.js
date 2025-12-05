const cron = require('node-cron');
const Recurring = require('../models/Recurring');
const Expense = require('../models/Expense');
const Incoming = require('../models/Incoming');
const { Op } = require('sequelize');

// Run daily at 1:00 AM
cron.schedule('0 1 * * *', async () => {
  console.log('Running Recurring Scheduler...');
  try {
    const today = new Date().toISOString().split('T')[0];
    const jobs = await Recurring.findAll({
      where: {
        status: 'Active',
        nextRunDate: { [Op.lte]: today }
      }
    });

    for (const job of jobs) {
      // 1. Create Transaction
      if (job.type === 'Expense') {
        await Expense.create({
          date: today,
          name: job.name,
          shop: 'Recurring',
          actualAmount: job.amount,
          status: 'Pending'
        });
      } else {
        await Incoming.create({
          date: today,
          client: job.name,
          actualAmount: job.amount,
          paymentType: 'Recurring',
          status: 'Pending'
        });
      }

      // 2. Update Next Run Date
      const nextDate = new Date(job.nextRunDate);
      if (job.frequency === 'Daily') nextDate.setDate(nextDate.getDate() + 1);
      if (job.frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
      if (job.frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      if (job.frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

      await job.update({ nextRunDate: nextDate.toISOString().split('T')[0] });
    }
    console.log(`Processed ${jobs.length} recurring items.`);
  } catch (error) {
    console.error('Cron Job Failed:', error);
  }
});