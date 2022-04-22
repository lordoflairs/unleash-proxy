import compression from 'compression';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import Client, { IClient } from './client';
import { createProxyConfig, IProxyOption } from './config';

import UnleashProxy from './unleash-proxy';
import { OpenApiService } from './openapi/openapi-service';
import { RegisterRoutes } from './autogenerated/routes';
import { generateHTML, serve } from 'swagger-ui-express';

const corsOptions = {
  exposedHeaders: 'ETag',
  maxAge: 172800,
};

export function createApp(
  options: IProxyOption,
  unleashClient?: IClient,
  app: Application = express(),
): Application {
  const config = createProxyConfig(options);
  const client = unleashClient || new Client(config);

  const openApiService = new OpenApiService(config);

  const proxy = new UnleashProxy(client, config, openApiService);

  openApiService.useDocs(app);

  app.disable('x-powered-by');
  try {
    app.set('trust proxy', config.trustProxy);
  } catch (err) {
    config.logger.error(
      `The provided "trustProxy" option was not valid ("${config.trustProxy}")`,
      err,
    );
  }

  app.use(cors(corsOptions));

  app.use(compression());

  app.use(
    `${config.proxyBasePath}/proxy`,
    cors(corsOptions),
    express.json(),
    proxy.middleware,
  );

  app.use("/docs", serve, async (_: Request, res: Response) => {
    return res.send(
      generateHTML(await import ("./autogenerated/swagger.json"))
    )
  })
  RegisterRoutes(app);

  return app;
}

module.exports = { createApp };
