import emailjs from "@emailjs/nodejs";

export const sendMail = async (
	from_name,
	to_mail,
	from_mail,
	subject,
	message
) => {
	emailjs.init({
		publicKey: process.env.EMAILJS_PUBLIC_KEY,
		privateKey: process.env.EMAILJS_PRIVATE_KEY,
	});
	const response = await emailjs.send(
		process.env.EMAILJS_SERVICE_ID,
		process.env.EMAILJS_TEMPLATE_ID,
		{
			subject: subject,
			message: message,
			to_mail: to_mail,
			from_name: from_name,
			from_mail: from_mail,
		}
	);
	return response;
};

// Email templates
const getSuccessEmailTemplate = (
	userName,
	webinarTitle,
	webinarDate,
	webinarStartTime,
	meetLink
) => {
	return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #28a745;">Payment Successful! 🎉</h2>
      <p>Dear ${userName},</p>
      
      <p>Thank you for registering for our webinar. Your payment has been successfully processed.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333;">Webinar Details:</h3>
          <p><strong>Title:</strong> ${webinarTitle}</p>
          <p><strong>Date:</strong> ${new Date(
						webinarDate
					).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${webinarStartTime}</p>
      </div>

      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2e7d32;">Join Webinar Here:</h3>
          <p><a href="${meetLink}" style="color: #2e7d32; text-decoration: underline;">Click here to join the webinar</a></p>
          <p style="font-size: 0.9em; color: #666;">Please save this link. You'll need it to join the webinar on the scheduled date.</p>
      </div>

      <p>Important Notes:</p>
      <ul>
          <li>Join 5 minutes before the scheduled time</li>
          <li>Ensure stable internet connection</li>
          <li>Keep your microphone muted when not speaking</li>
      </ul>

      <p>If you have any questions, feel free to reply to this email.</p>
      
      <p>Best regards,<br>The CapitalHub Team</p>
  </div>
  `;
};

const getFailureEmailTemplate = (userName, webinarTitle, paymentStatus) => {
	return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc3545;">Payment ${paymentStatus} ⚠️</h2>
      <p>Dear ${userName},</p>
      
      <p>We noticed there was an issue with your payment for the webinar registration:</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333;">Webinar Details:</h3>
          <p><strong>Title:</strong> ${webinarTitle}</p>
          <p><strong>Payment Status:</strong> ${paymentStatus}</p>
      </div>

      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #856404;">Next Steps:</h3>
          <p>To complete your registration:</p>
          <ol>
              <li>Please try making the payment again</li>
              <li>Ensure your payment details are correct</li>
              <li>Check if your bank has blocked the transaction</li>
          </ol>
      </div>

      <p>If you continue to face issues or need assistance, please contact our support team.</p>
      
      <p>Best regards,<br>The CapitalHub Team</p>
  </div>
  `;
};

export { getSuccessEmailTemplate, getFailureEmailTemplate };
