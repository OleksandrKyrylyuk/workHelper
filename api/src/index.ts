import fastify from 'fastify'
import "dotenv/config";
import { testRoutes } from './routes/test.routes.js';


const server = fastify();

server.register(testRoutes, { prefix: '/api/' })

const run =  () => {
    server.listen({ port: Number(process.env.SERVER_PORT ?? 3001), host: '0.0.0.0' },  (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Server listening at ${address}`)
    })
};

run();