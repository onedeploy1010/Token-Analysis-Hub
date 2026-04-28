import { createYoga } from "graphql-yoga";
import { builder } from "./builder";
// Importing the resolver modules registers their fields on the shared builder.
import "./resolvers/queries";

const schema = builder.toSchema();

/**
 * GraphQL Yoga handler. Mount at `/graphql` (under the `/api` router, so
 * the effective URL is `/api/graphql` — same origin as the REST routes).
 *
 * Graphiql is left on in development for quick exploration, off in prod.
 */
export const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  landingPage: false,
  graphiql: process.env.NODE_ENV !== "production",
  cors: false, // CORS is already set at the express level
});

export { schema };
