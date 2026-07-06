import http from 'node:http';

const port = Number(process.env.SHARE_PROXY_PORT ?? 8080);

const server = http.createServer((clientReq, clientRes) => {
  const isApi = clientReq.url?.startsWith('/api');
  const targetPort = isApi ? 4000 : 3000;

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: `127.0.0.1:${targetPort}`,
      },
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(clientRes);
    },
  );

  proxyReq.on('error', (error) => {
    clientRes.writeHead(502, { 'content-type': 'application/json' });
    clientRes.end(JSON.stringify({ error: 'proxy_error', message: error.message }));
  });

  clientReq.pipe(proxyReq);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Share proxy listening on http://localhost:${port}`);
});
