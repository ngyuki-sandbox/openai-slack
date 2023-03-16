import { App, LogLevel } from '@slack/bolt'
import { Configuration, OpenAIApi } from 'openai'

function env(name: string): string {
    const value = process.env[name];
    if (value === undefined) {
        throw new Error(`must be set environment variable "${name}"`);
    }
    return value;
}

const SLACK_BOT_TOKEN = env('SLACK_BOT_TOKEN');
const SLACK_APP_TOKEN = env('SLACK_APP_TOKEN');
const OPENAI_API_KEY = env('OPENAI_API_KEY');

const app = new App({
    logLevel: LogLevel.DEBUG,
    socketMode: true,
    token: SLACK_BOT_TOKEN,
    appToken: SLACK_APP_TOKEN,
});

const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY }));

async function chatCompletion(content: string): Promise<string> {
    const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: 'あなたは役に立つアシスタントです。' },
            { role: 'user', content: content },
        ],
    });
    console.log({
        status: completion.status,
        statusText: completion.statusText,
        data: completion.data,
    });
    return completion.data.choices[0].message?.content ?? '?';
};

app.event('app_mention', async ({event, context, say, client}) => {
    try {
        const msg = await say('ｶﾝｶﾞｴﾁｭｳ...');
        const content = event.text.replaceAll(`<@${context.botUserId}>`, '');
        const completion = await chatCompletion(content);
        const reply = `<@${event.user}> ${completion}`;
        if (msg.channel && msg.ts) {
            client.chat.update({
                channel: msg.channel,
                ts: msg.ts,
                text: reply,
            });
        } else {
            client.chat.postMessage({
                channel: event.channel,
                text: reply,
            });
        }
    } catch (err: any) {
        console.error(err);
        client.chat.postMessage({
            channel: event.channel,
            text: '' + err,
        });
    }
});

(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
})();
