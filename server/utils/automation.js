const cron = require('node-cron');
const { Inspection, User } = require('../models_mongo');
const { sendEmail } = require('./mailer');

/**
 * Check for missed inspections and notify inspectors
 */
const checkMissedInspections = async () => {
  console.log('Running automated check for missed inspections...');
  
  try {
    const now = new Date();
    
    // Find inspections that are scheduled in the past but not completed or cancelled
    const missedInspections = await Inspection.find({
      scheduledDate: { $lt: now },
      status: { $nin: ['completed', 'cancelled', 'missed'] }
    });

    console.log(`Found ${missedInspections.length} missed/overdue inspections.`);

    for (const inspection of missedInspections) {
      // Mark as missed in database if it was 'in_progress' or 'scheduled'
      if (inspection.status !== 'missed') {
        inspection.status = 'missed';
        await inspection.save();
      }

      // Notify inspector
      const inspector = await User.findOne({ username: inspection.inspectorName });
      if (inspector && inspector.email) {
        try {
          await sendEmail(
            inspector.email,
            'URGENT: Inspection Overdue',
            `<h3>Inspection Notification</h3>
             <p>Hello ${inspector.username},</p>
             <p><strong>You have missed an inspection.</strong></p>
             <div style="border: 1px solid #ff0000; padding: 15px; background-color: #fff5f5;">
               <ul>
                 <li><strong>Inspection ID:</strong> ${inspection.inspectionId}</li>
                 <li><strong>Track Fitting:</strong> ${inspection.trackFittingId}</li>
               </ul>
             </div>
             <p>Please log in and complete the work immediately.</p>`
          );
          console.log(`Notification sent to ${inspector.username} for missed inspection ${inspection.inspectionId}`);
        } catch (emailErr) {
          console.error(`Failed to send missed notification to ${inspector.username}:`, emailErr);
        }
      }
    }
  } catch (error) {
    console.error('Error during missed inspection check:', error);
  }
};

// Schedule the job to run every day at 9:00 AM
// '0 9 * * *'
// For testing, we can run it every hour: '0 * * * *'
const initAutomation = () => {
  // Run every hour
  cron.schedule('0 * * * *', checkMissedInspections);
  console.log('Automation jobs initialized.');
  
  // Also run once on startup
  checkMissedInspections();
};

module.exports = { initAutomation };
