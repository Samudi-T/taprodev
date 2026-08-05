package com.zerox.csm.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    public void sendOrderConfirmationEmail(String toEmail,
                                           String orderId,
                                           String orderDetails) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("no-reply@zerox.com");
            helper.setTo(toEmail);
            helper.setSubject("Your Order Confirmation - Order #" + orderId);

            String html = """
            <html>
                <body>
                    <h2>Order Confirmation</h2>
                    <p>Thank you for your order! Your order has been successfully placed.</p>
                    <p>Order ID: %s</p>
                    <h3>Order Details:</h3>
                    <p>%s</p>
                    <p>Thank you for shopping with us!</p>
                    <p>Taprodev Computers</p>
                </body>
            </html>
            """.formatted(orderId, orderDetails.replace("\n", "<br/>"));

            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException ex) {
            throw new RuntimeException("Failed to send email", ex);
        }
    }
}
