import { buildApp } from "./app.js";

const HOST = "127.0.0.1";
const PORT = 3000;

const app = buildApp();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: HOST, port: PORT });
