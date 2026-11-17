import http from 'node:http';
import { handleApiRequest } from './apiPlugin.js';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  handleApiRequest(req, res, () => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        service: 'Raio-X Financeiro Full-Stack API',
        status: 'online',
        endpoints: ['/api/state', '/api/banks', '/api/transactions', '/api/user/profile']
      })
    );
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Raio-X Financeiro API rodando em http://localhost:${PORT}`);
});
