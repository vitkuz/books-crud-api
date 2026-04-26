import env from '../env';
import { createHttpAdapter, HttpAdapter } from '../http.adapter';
import { runSeed } from './seed';

(async (): Promise<void> => {
  const http: HttpAdapter = createHttpAdapter({ baseUrl: env.DEPLOY_BASE_URL });
  await runSeed(http);
})();
