// Minimal module declarations to satisfy TypeScript without relying on local node_modules state
import { FastifyInstance } from 'fastify';

declare module '@fastify/jwt' {
  const jwtPlugin: any;
  export default jwtPlugin;
}

declare module '@fastify/rate-limit' {
  const rateLimitPlugin: any;
  export default rateLimitPlugin;
}

declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign: (payload: any) => string;
      verify: (token: string) => any;
    };
  }
}
