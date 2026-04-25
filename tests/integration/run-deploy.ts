import env from './env';
import { createHttpAdapter } from './http.adapter';
import { runScenarios } from './scenarios';

(async (): Promise<void> => {
  const http = createHttpAdapter({ baseUrl: env.DEPLOY_BASE_URL });
  await runScenarios(http);
})();
