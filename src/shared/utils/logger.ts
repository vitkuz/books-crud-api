import winston, { Logger } from 'winston';
import env from '../config/env';

const level: string = env.NODE_ENV === 'production' ? 'info' : 'debug';

const logger: Logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'books-crud-api' },
  transports: [new winston.transports.Console()],
});

export default logger;
