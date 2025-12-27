import Access from './instances/Access';

const client = Access.getClient();

void client.initialize();

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
