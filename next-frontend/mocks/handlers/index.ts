import { handlers as authHandlers } from "./auth";
import { handlers as channelsHandlers } from "./channels";
import { handlers as reactionsHandlers } from "./reactions";
import { handlers as subscriptionsHandlers } from "./subscriptions";
import { handlers as videosHandlers } from "./videos";
import { handlers as seedHandlers } from "./_seed";

export const handlers = [
  ...authHandlers,
  ...channelsHandlers,
  ...reactionsHandlers,
  ...subscriptionsHandlers,
  ...videosHandlers,
  ...seedHandlers,
];
