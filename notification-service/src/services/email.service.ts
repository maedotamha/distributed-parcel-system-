
export const sendEmail = (to: string, subject: string, body: string) => {
    console.log(`\n📧 [EMAIL SERVICE] Sending Email`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log(`Status: SENT ✅\n`);
};

export const sendSMS = (to: string, message: string) => {
    console.log(`\n📱 [SMS SERVICE] Sending SMS`);
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    console.log(`Status: SENT ✅\n`);
};
