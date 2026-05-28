import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface OrderReadyEmailProps {
  restaurantName: string;
  orderNumber: string;
  tableName: string;
}

export default function OrderReadyEmail({
  restaurantName,
  orderNumber,
  tableName,
}: OrderReadyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order is ready! - {restaurantName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 Your Order is Ready!</Heading>
          <Text style={text}>
            Great news! Your order at <strong>{restaurantName}</strong> is ready to be served.
          </Text>

          <Section style={orderDetails}>
            <Text style={orderDetailText}>
              <strong>Order Number:</strong> #{orderNumber}
            </Text>
            <Text style={orderDetailText}>
              <strong>Table:</strong> {tableName}
            </Text>
          </Section>

          <Section style={messageSection}>
            <Text style={messageText}>
              Please wait at your table. Our staff will serve your order shortly.
            </Text>
            <Text style={messageText}>
              Thank you for dining with us!
            </Text>
          </Section>

          <Text style={footer}>
            © {new Date().getFullYear()} {restaurantName}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "Arial, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
};

const h1 = {
  color: "#333333",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const text = {
  color: "#555555",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const orderDetails = {
  backgroundColor: "#e8f5e9",
  padding: "20px",
  borderRadius: "6px",
  margin: "20px 0",
};

const orderDetailText = {
  color: "#333333",
  fontSize: "14px",
  margin: "5px 0",
};

const messageSection = {
  backgroundColor: "#fff3cd",
  padding: "20px",
  borderRadius: "6px",
  margin: "30px 0",
  textAlign: "center" as const,
};

const messageText = {
  color: "#856404",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "5px 0",
};

const footer = {
  color: "#999999",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "40px",
};
