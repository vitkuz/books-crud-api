import env from './env';
import { createHttpAdapter, HttpAdapter } from './http.adapter';
import { runScenarios } from './scenarios';

(async (): Promise<void> => {
  const http: HttpAdapter = createHttpAdapter({ baseUrl: env.LOCAL_BASE_URL });
  await runScenarios(http);
})();
