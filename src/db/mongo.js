const debug = require('debug')('bot:db:mongo');
const lodashGet = require('lodash/get');
const assign = require('lodash/assign');
const isEmpty = require('lodash/isEmpty');
const mongo = require('mongojs');

const { mongoURI } = require('../config');

const USERS = 'users';
const LOGS = 'logs';
const GLOBAL = 'global';

const dbMongo = () => {};

dbMongo.__INIT__ = function (context) {
    const db = mongo(mongoURI, [USERS, LOGS, GLOBAL]);

    db.on('error', (err) => {
        console.log('database error', err);
    });

    db.on('connect', () => {
        debug('db connected');
    });

    // Basic operations
    async function update(collection, selector, query) {
        return new Promise((resolve, reject) => {
            db[collection].update(selector, query, (err, result) => {
                if (err) {
                    reject(err);
                }

                resolve(result);
            });
        });
    }

    async function get(collection, selector) {
        return new Promise((resolve, reject) => {
            db[collection].findOne(selector, (err, result) => {
                if (err) {
                    reject(err);
                }

                resolve(result);
            });
        });
    }

    async function push(collection, selector, query) {
        return update(collection, selector, {
            $push: query,
        });
    }

    async function getAll(collection) {
        return new Promise((resolve, reject) => {
            db[collection].find((err, result) => {
                if (err) {
                    reject(err);
                }

                return resolve(result);
            });
        });
    }

    async function set(collection, selector, query) {
        return update(collection, selector, {
            $set: query,
        });
    }

    // async function inc(collection, selector, query) {
    //     return update(collection, selector, {
    //         $inc: query,
    //     });
    // }

    async function insert(collection, query) {
        return db[collection].insert(query);
    }

    // high lvl methods
    async function getUser(userId, userData) {
        let user = await get(USERS, { discordId: userId });

        if (!user) {
            user = { discordId: userId, ...userData };

            insert(USERS, user);
        }

        return user;
    }

    async function getModuleData(moduleName, { user } = {}) {
        if (!user) {
            const res = await get(GLOBAL, { moduleName });
            return res || {};
        }

        return lodashGet(user, `data.${moduleName}`, {});
    }

    async function updateModuleData(moduleName, query, { user } = {}) {
        // TODO PLEASE STOP PLEASE REWORK IT PLEASE! SORRY, NOPE
        const currentData = await getModuleData(moduleName, { user });
        const actualQuery = assign({}, currentData, query);

        if (!user) {
            if (isEmpty(currentData)) { // $setOrInsert???
                return insert(GLOBAL, {
                    moduleName,
                    ...actualQuery,
                });
            }

            return set(GLOBAL, { moduleName }, actualQuery);
        }

        return set(USERS, {
            discordId: user.discordId,
        }, {
            [`data.${moduleName}`]: actualQuery,
        });
    }

    async function insertLog(query) {
        return insert(LOGS, query);
    }

    return {
        ...context,
        getUser,
        getModuleData,
        updateModuleData,
        insertLog,
        // Unsafe be carefuly!
        get,
        push,
        getAll,
        set,
        update,
        insert,
    };
};

module.exports = dbMongo;
