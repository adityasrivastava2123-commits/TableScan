import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface OrderConfirmationEmailProps {
  restaurantName: string;
  restaurantLogo?: string;
  orderNumber: string;
  tableName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  taxAmount: number;
}

export default function OrderConfirmationEmail({
  restaurantName,
  restaurantLogo,
  orderNumber,
  tableName,
  items,
  totalAmount,
  taxAmount,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Order Confirmation - {restaurantName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {restaurantLogo && (
            <Img
              src={restaurantLogo}
              alt={`${restaurantName} Logo`}
              style={logo}
              height="60"
            />
          )}
          <Heading style={h1}>Order Confirmation</Heading>
          <Text style={text}>Thank you for your order at {restaurantName}!</Text>

          <Section style={orderDetails}>
            <Text style={orderDetailText}>
              <strong>Order Number:</strong> #{orderNumber}
            </Text>
            <Text style={orderDetailText}>
              <strong>Table:</strong> {tableName}
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
              <Text style={itemText}>Subtotal</Text>
              <Text style={itemPrice}>
                ₹{(totalAmount - taxAmount).toFixed(2)}
              </Text>
            </Section>
            <Section style={itemRow}>
              <Text style={itemText}>Tax</Text>
              <Text style={itemPrice}>₹{taxAmount.toFixed(2)}</Text>
            </Section>
            <Section style={itemRow}>
              <Text style={totalText}>Total</Text>
              <Text style={totalPrice}>₹{totalAmount.toFixed(2)}</Text>
            </Section>
          </Section>

          <Section style={messageSection}>
            <Text style={messageText}>
              Your order is being prepared and will be served at your table shortly.
            </Text>
            <Text style={messageText}>
              If you have any questions, please speak to our staff.
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

const logo = {
  margin: "0 auto 30px",
  display: "block",
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
  backgroundColor: "#f8f9fa",
  padding: "20px",
  borderRadius: "6px",
  margin: "20px 0",
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

const messageSection = {
  backgroundColor: "#e8f5e9",
  padding: "20px",
  borderRadius: "6px",
  margin: "30px 0",
  textAlign: "center" as const,
};

const messageText = {
  color: "#2e7d32",
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
