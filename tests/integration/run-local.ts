import env from './env';
import { createHttpAdapter } from './http.adapter';
import { runScenarios } from './scenarios';

(async (): Promise<void> => {
  const http = createHttpAdapter({ baseUrl: env.LOCAL_BASE_URL });
  await runScenarios(http);
})();
