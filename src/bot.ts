import { Bot } from 'grammy';

if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is not set');
}

const bot = new Bot(process.env.BOT_TOKEN, {
    client: {
        baseFetchConfig: {
            proxy: process.env.PROXY_URL,
        },
    },
});

bot.on('message', (ctx) => {
    ctx.reply('Hello, world!');
});

bot.catch((err) => {
    console.error(err);
});

await bot.start();
