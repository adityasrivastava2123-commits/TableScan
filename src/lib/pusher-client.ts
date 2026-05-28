"use client";

import Pusher from "pusher-js";

let client: any = null;

export function getPusherClient() {
  if (!client) {
    client = new (Pusher as any)(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }

  return client;
}

export const pusherClient = typeof window !== "undefined" ? getPusherClient() : null;
