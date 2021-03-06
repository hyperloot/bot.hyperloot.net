const Discord = require('discord.js');
const debug = require('debug')('bot:adapter:discord');

const merge = require('lodash/merge');
const pick = require('lodash/pick');
const isEmpty = require('lodash/isEmpty');

// const { PREFIX } = require('./../config');
const { discord: discordCfg } = require('../config');

const discordAdapter = () => {};

discordAdapter.__INIT__ = function (ctx) {
    const discordBot = new Discord.Client();

    discordBot.on('ready', () => {
        debug('Discrodjs ready');
    });

    const handler = async (output) => {
        const {
            message, to, reactions, userActions = [],
        } = output;
        const { path, id: msgId } = to;
        const [, channelId] = path;
        let { embed } = output;

        const channel = discordBot.channels.find(ch => ch.id === channelId);

        if (!isEmpty(userActions)) {
            userActions.forEach(({ username, addRole, removeRole }) => {
                // temp solution!
                const user = channel.guild.members.find(usr => usr.user.username === username || usr.nickname === username);

                if (removeRole) {
                    user.removeRole(removeRole);
                }

                if (addRole) {
                    user.addRole(addRole);
                }
            });

            return Promise.resolve();
        }

        if (msgId && reactions) {
            const msg = await channel.fetchMessage(msgId);

            await reactions.reduce(
                (prev, reaction) => prev.then(() => msg.react(reaction).catch((e) => {
                    console.error(e.message);
                })),
                Promise.resolve(),
            );
        }

        if (embed) {
            const {
                title,
                description,
                url,
                fields = [],
            } = embed;

            embed = new Discord.RichEmbed();
            embed.setColor(discordCfg.color);

            if (title) {
                embed.setTitle(title);
            }

            if (description) {
                embed.setDescription(description);
            }

            if (url) {
                embed.setURL(url);
            }

            fields.forEach((field) => {
                embed.addField(...field);
            });

            return channel.send({ embed }).catch((e) => {
                console.error(e.message);
            });
        }

        if (!message) {
            return Promise.resolve();
        }

        return channel.send(message).catch((e) => {
            console.error(e.message);
        });
    };

    discordBot.on('message', (message) => {
        const mentions = message.mentions.members.map(member => member.id);
        const selfId = discordBot.user.id;
        const hasSelfMention = !isEmpty(mentions.find(mention => mention === selfId));

        const {
            content = '',
            author,
            id,
            channel,
            guild,
        } = message;

        // anti-bot + anti-self-loop
        if (author.bot) {
            return;
        }

        ctx.process({
            userData: pick(author, discordCfg.userFields),
            userId: author.id,
            input: content,
            from: {
                adapter: 'discord',
                path: [guild.id, channel.id],
                id,
                name: channel.name,
            },
            mentions,
            hasSelfMention,
            event: 'message',

            _handleDirect: handler,
        });
    });

    discordBot.login(discordCfg.authToken);

    return merge(ctx, {
        _handlers: {
            // handleTo implementation
            discord: handler,
        },
    });
};

module.exports = discordAdapter;
