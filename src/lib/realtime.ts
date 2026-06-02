import { getPusherServer } from "./pusher";

export interface RealtimeEvent {
  type: "ORDER_CREATED" | "ORDER_UPDATED" | "PREPARATION_STARTED" | "PREPARATION_READY" | "TABLE_STATUS_CHANGED" | "QUEUE_UPDATED" | "DELIVERY_ASSIGNED";
  restaurantId: string;
  data: any;
  timestamp: Date;
}

export async function triggerRealtimeEvent(event: RealtimeEvent) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(`restaurant-${event.restaurantId}`, event.type, {
      ...event.data,
      timestamp: event.timestamp,
    });
  } catch (error) {
    console.error("Failed to trigger realtime event:", error);
  }
}

export async function broadcastOrderUpdate(restaurantId: string, orderId: string, status: string) {
  await triggerRealtimeEvent({
    type: "ORDER_UPDATED",
    restaurantId,
    data: { orderId, status },
    timestamp: new Date(),
  });
}

export async function broadcastPreparationUpdate(
  restaurantId: string,
  preparationId: string,
  stage: string
) {
  await triggerRealtimeEvent({
    type: stage === "PREPARING" ? "PREPARATION_STARTED" : "PREPARATION_READY",
    restaurantId,
    data: { preparationId, stage },
    timestamp: new Date(),
  });
}

export async function broadcastTableStatusUpdate(
  restaurantId: string,
  tableId: string,
  status: string
) {
  await triggerRealtimeEvent({
    type: "TABLE_STATUS_CHANGED",
    restaurantId,
    data: { tableId, status },
    timestamp: new Date(),
  });
}

export async function broadcastQueueUpdate(restaurantId: string, queueId: string, status: string) {
  await triggerRealtimeEvent({
    type: "QUEUE_UPDATED",
    restaurantId,
    data: { queueId, status },
    timestamp: new Date(),
  });
}

export async function broadcastDeliveryAssignment(
  restaurantId: string,
  deliveryId: string,
  driverId: string
) {
  await triggerRealtimeEvent({
    type: "DELIVERY_ASSIGNED",
    restaurantId,
    data: { deliveryId, driverId },
    timestamp: new Date(),
  });
}

// Client-side hook for subscribing to realtime events
export function useRealtimeSubscription(restaurantId: string, eventType: string, callback: (data: any) => void) {
  if (typeof window === "undefined") return () => {};

  // This is a placeholder - in production, use the actual Pusher client library
  // import Pusher from 'pusher-js';
  // const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
  //   cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
  // });
  // const channel = pusherClient.subscribe(`restaurant-${restaurantId}`);
  // channel.bind(eventType, callback);
  // return () => {
  //   channel.unbind(eventType, callback);
  //   pusherClient.unsubscribe(`restaurant-${restaurantId}`);
  // };

  return () => {};
}
