import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { signupInputSchema, signupResponseSchema, checkEmailInputSchema, checkEmailResponseSchema } from './schema';
import { signup } from './handlers/signup';
import { checkEmailAvailability } from './handlers/check_email';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User signup endpoint
  signup: publicProcedure
    .input(signupInputSchema)
    .output(signupResponseSchema)
    .mutation(({ input }) => signup(input)),
  
  // Check email availability endpoint
  checkEmailAvailability: publicProcedure
    .input(checkEmailInputSchema)
    .output(checkEmailResponseSchema)
    .query(({ input }) => checkEmailAvailability(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();