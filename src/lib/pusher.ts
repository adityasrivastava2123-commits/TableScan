import PusherServer from "pusher";

let pusherServer: PusherServer | null = null;

export function getPusherServer(): PusherServer {
  if (!pusherServer) {
    pusherServer = new PusherServer({
      appId: process.env.PUSHER_APP_ID || "",
      key: process.env.PUSHER_APP_KEY || "",
      secret: process.env.PUSHER_APP_SECRET || "",
      cluster: process.env.PUSHER_CLUSTER || "",
      useTLS: true,
    });
  }
  return pusherServer;
}
