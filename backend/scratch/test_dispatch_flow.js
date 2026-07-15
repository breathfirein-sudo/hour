const dispatcher = require('../services/supportDispatcher');

async function testDispatcher() {
  console.log('Testing support dispatcher helper functions...');
  try {
    const isClockedIn = dispatcher.isExecClockedIn({ attendance: JSON.stringify([{ date: new Date().toISOString().slice(0, 10), clockIn: new Date().toISOString(), clockOut: null }]) });
    console.log('Clocked-in test result:', isClockedIn);
    
    const isBusy = await dispatcher.isExecBusy(99999);
    console.log('Is exec 99999 busy:', isBusy);

    console.log('Dispatcher test completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Dispatcher test failed:', err);
    process.exit(1);
  }
}

testDispatcher();
