import { createClient } from "tinacms/dist/client";
import { queries } from "./types";
export const client = createClient({ url: 'http://localhost:4001/graphql', token: '17fbce772911ae4430a3f7e24ab7c48a79fc38af', queries,  });
export default client;
  