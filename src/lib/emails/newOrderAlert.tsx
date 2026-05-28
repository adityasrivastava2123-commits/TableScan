import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface NewOrderAlertEmailProps {
  restaurantName: string;
  orderNumber: string;
  tableName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  orderTime: string;
  dashboardUrl: string;
}

export default function NewOrderAlertEmail({
  restaurantName,
  orderNumber,
  tableName,
  items,
  totalAmount,
  orderTime,
  dashboardUrl,
}: NewOrderAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New Order Received - {restaurantName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔔 New Order Received!</Heading>
          <Text style={text}>
            A new order has been placed at <strong>{restaurantName}</strong>.
          </Text>

          <Section style={orderDetails}>
            <Text style={orderDetailText}>
              <strong>Order Number:</strong> #{orderNumber}
            </Text>
            <Text style={orderDetailText}>
              <strong>Table:</strong> {tableName}
            </Text>
            <Text style={orderDetailText}>
              <strong>Time:</strong> {orderTime}
            </Text>
          </Section>

          <Section style={itemsSection}>
            <Heading style={h2}>Order Items</Heading>
            {items.map((item, index) => (
              <Section key={index} style={itemRow}>
                <Text style={itemText}>
                  {item.name} x {item.quantity}
                </Text>
                <Text style={itemPrice}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </Text>
              </Section>
            ))}
            <Section style={divider} />
            <Section style={itemRow}>
              <Text style={totalText}>Total Amount</Text>
              <Text style={totalPrice}>₹{totalAmount.toFixed(2)}</Text>
            </Section>
          </Section>

          <Section style={ctaSection}>
            <Link href={dashboardUrl} style={button}>
              View Order in Dashboard
            </Link>
          </Section>

          <Text style={footer}>
            This is an automated notification from TableScan.
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

const h2 = {
  color: "#333333",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 15px",
};

const text = {
  color: "#555555",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const orderDetails = {
  backgroundColor: "#fff3cd",
  padding: "20px",
  borderRadius: "6px",
  margin: "20px 0",
  border: "1px solid #ffc107",
};

const orderDetailText = {
  color: "#333333",
  fontSize: "14px",
  margin: "5px 0",
};

const itemsSection = {
  margin: "30px 0",
};

const itemRow = {
  display: "flex",
  justifyContent: "space-between",
  margin: "10px 0",
};

const itemText = {
  color: "#555555",
  fontSize: "14px",
  margin: "0",
};

const itemPrice = {
  color: "#333333",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "15px 0",
};

const totalText = {
  color: "#333333",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0",
};

const totalPrice = {
  color: "#333333",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#007bff",
  color: "#ffffff",
  padding: "12px 24px",
  textDecoration: "none",
  borderRadius: "6px",
  fontSize: "16px",
  fontWeight: "bold",
  display: "inline-block",
};

const footer = {
  color: "#999999",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "40px",
};
