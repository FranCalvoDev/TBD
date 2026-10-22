import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const COLLECTIONS = new Set(["categories", "blocks", "goals", "tasks", "weeks"]);
const DATABASE_NAME = process.env.MONGODB_DB || "tbd";
const uri = process.env.MONGODB_URI;

export const client = uri ? new MongoClient(uri) : null;
let database;

export const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");

export const isNewer = (incoming, current) => !current ||
  incoming.updatedAt > current.updatedAt ||
  (incoming.updatedAt === current.updatedAt && String(incoming.deviceId ?? "") > String(current.deviceId ?? ""));

export function normalizeChanges(payload) {
  const changes = Array.isArray(payload) ? payload : payload?.changes;
  if (!Array.isArray(changes)) return [];

  const latest = new Map();
  for (const change of changes) {
    const {col, rec} = change || {};
    if (!COLLECTIONS.has(col) || !rec || typeof rec !== "object" || Array.isArray(rec) ||
        typeof rec.id !== "string" || !rec.id || !Number.isSafeInteger(rec.updatedAt)) continue;
    const deviceId = typeof rec.deviceId === "string" ? rec.deviceId : "";
    const record = {...rec, deviceId};
    const key = `${col}\u0000${record.id}`;
    const current = latest.get(key);
    if (!current || isNewer(record, current.rec)) latest.set(key, {col, rec:record});
  }
  return [...latest.values()];
}

function getDatabase() {
  if (!database) throw new Error("MongoDB no está conectado");
  return database;
}

export async function connectDatabase() {
  if (!client) throw new Error("Falta configurar MONGODB_URI");
  await client.connect();
  database = client.db(DATABASE_NAME);
  try {
    await Promise.all([
      database.collection("users").createIndex({name:1}, {unique:true}),
      database.collection("users").createIndex({tokenHash:1}, {unique:true}),
      database.collection("records").createIndex({userId:1, col:1, recordId:1}, {unique:true}),
      database.collection("records").createIndex({userId:1, seq:1})
    ]);
  } catch (error) {
    database = undefined;
    await client.close();
    throw error;
  }
}

export async function closeDatabase() {
  database = undefined;
  if (client) await client.close();
}

export async function findActiveUserByTokenHash(tokenHash) {
  return getDatabase().collection("users").findOne({tokenHash, revoked:false}, {projection:{name:1}});
}

export async function createUser(name, tokenHash) {
  try {
    await getDatabase().collection("users").insertOne({name, tokenHash, createdAt:new Date(), revoked:false});
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

export async function updateUserToken(name, tokenHash) {
  const result = await getDatabase().collection("users").updateOne(
    {name},
    {$set:{tokenHash, revoked:false}}
  );
  return result.matchedCount > 0;
}

export async function revokeUser(name) {
  const result = await getDatabase().collection("users").updateOne({name}, {$set:{revoked:true}});
  return result.matchedCount > 0;
}

export async function deleteUser(name) {
  const db = getDatabase();
  const user = await db.collection("users").findOne({name}, {projection:{_id:1}});
  if (!user) return false;
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection("records").deleteMany({userId:user._id}, {session});
      await db.collection("users").deleteOne({_id:user._id}, {session});
    });
  } finally {
    await session.endSession();
  }
  return true;
}

export async function listUsers() {
  return getDatabase().collection("users").aggregate([
    {$lookup:{
      from:"records",
      let:{userId:"$_id"},
      pipeline:[
        {$match:{$expr:{$and:[{$eq:["$userId","$$userId"]}, {$eq:["$deleted",false]}]}}},
        {$count:"count"}
      ],
      as:"recordCounts"
    }},
    {$project:{
      name:1, revoked:1, createdAt:1,
      records:{$ifNull:[{$arrayElemAt:["$recordCounts.count",0]}, 0]}
    }},
    {$sort:{name:1}}
  ]).toArray();
}

export async function pullChanges(userId, since = 0) {
  const db = getDatabase();
  const counter = await db.collection("counters").findOne({_id:"changes"});
  const changes = await db.collection("records")
    .find({userId, seq:{$gt:since}}, {projection:{_id:0, col:1, data:1, seq:1}})
    .sort({seq:1})
    .toArray();
  const lastChange = changes.length ? changes[changes.length - 1].seq : 0;
  return {
    changes:changes.map(({col, data}) => ({col, rec:data})),
    cursor:Math.max(counter?.value || 0, lastChange)
  };
}

export async function pushChanges(userId, payload) {
  const changes = normalizeChanges(payload);
  if (!changes.length) return;

  const db = getDatabase();
  const session = client.startSession();
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await session.withTransaction(async () => {
          const records = db.collection("records");
          const counters = db.collection("counters");

          for (const {col, rec} of changes) {
            const filter = {userId, col, recordId:rec.id};
            const current = await records.findOne(filter, {session});
            if (current && !isNewer(rec, current.data)) continue;

            await counters.updateOne({_id:"changes"}, {$inc:{value:1}}, {upsert:true, session});
            const counter = await counters.findOne({_id:"changes"}, {session, projection:{value:1}});
            const seq = counter.value;

            await records.updateOne(filter, {$set:{
              data:rec,
              updatedAt:rec.updatedAt,
              deviceId:rec.deviceId,
              deleted:rec.deleted === true,
              seq
            }}, {upsert:true, session});
          }
        }, {readConcern:{level:"snapshot"}, writeConcern:{w:"majority"}, readPreference:"primary"});
        break;
      } catch (error) {
        if (error.code !== 11000 || attempt >= 2) throw error;
      }
    }
  } finally {
    await session.endSession();
  }
}
