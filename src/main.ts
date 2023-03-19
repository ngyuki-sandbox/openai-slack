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
    //logLevel: LogLevel.DEBUG,
    socketMode: true,
    token: SLACK_BOT_TOKEN,
    appToken: SLACK_APP_TOKEN,
});

const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_API_KEY }));

async function chatCompletion(messages: Parameters<typeof openai.createChatCompletion>[0]['messages']): Promise<string> {
    const param : Parameters<typeof openai.createChatCompletion>[number] = {
        model: 'gpt-3.5-turbo',
        messages: messages,
    };
    console.dir(param, { depth: null });
    const completion = await openai.createChatCompletion(param);
    console.dir({
        status: completion.status,
        statusText: completion.statusText,
        data: completion.data,
    }, { depth: null });
    return completion.data.choices[0].message?.content ?? '?';
};

async function sleep(t: number){
    return new Promise((r) => {
        setTimeout(r, t);
    });
}

const system = `
あなたは slack bot です。名前はまだありません。
これから質問の先頭には <@Uxxxxxxxx> の形式で「発言者の識別子」を付与します。
あなたはその質問への回答として「発言者の識別子」を含むメッセージで回答してください。
`.trim();

app.event('app_mention', async ({event, context, say, client}) => {
    console.log({event, context});
    try {
        let message: Parameters<typeof chatCompletion>[0] = [{role: 'system', content: system}];

        if (!event.thread_ts) {
            const content = event.text.replaceAll(`<@${context.botUserId}>`, '').replace(/^/, `<@${event.user}>`)
            message.push({ role: 'user', content: content });
        } else {
            const replies = await client.conversations.replies({
                channel: event.channel,
                ts: event.thread_ts,
            });
            if (replies.messages) {
                message = message.concat(
                    replies.messages.map(m => {
                        if (context.botId === m.bot_id) {
                            return { role: 'assistant', content: m.text ?? '' };
                        } else {
                            return {
                                role: 'user',
                                content: (m.text ?? '')
                                    .replaceAll(`<@${context.botUserId}>`, '')
                                    .replace(/^/, `<@${m.user}>`)
                            };
                        }
                    })
                )
            }
        }

        const completion = await chatCompletion(message);
        await say({
            text: completion,
            thread_ts: event.ts,
        })
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
