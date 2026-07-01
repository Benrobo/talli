import Cloudflare from "cloudflare";
import env from "../env.js";

export const cfClient = new Cloudflare({
  apiToken: env.CLOUDFLARE_API_TOKEN,
});
