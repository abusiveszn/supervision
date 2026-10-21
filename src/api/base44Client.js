import { createClient } from '@base44/sdk';
import { appParams } from '../lib/app-params.js';
import { localDb } from './localDb.js';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create raw Base44 client
const rawClient = createClient({
  appId: appId || '',
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

function wrapEntity(entityName, rawEntity, localEntity) {
  return new Proxy(rawEntity || {}, {
    get(target, prop) {
      const originalMethod = target[prop];
      const localMethod = localEntity[prop];

      if (prop === 'subscribe') {
        return function (callback) {
          if (!appId) {
            return localEntity.subscribe(callback);
          }
          try {
            if (typeof originalMethod === 'function') {
              return originalMethod.call(target, callback);
            }
          } catch {
            // fallback
          }
          return localEntity.subscribe(callback);
        };
      }

      if (typeof localMethod !== 'function') {
        return originalMethod ? originalMethod.bind(target) : undefined;
      }

      return async function (...args) {
        // If no cloud backend is configured, directly use local storage
        if (!appId) {
          return localMethod.apply(localEntity, args);
        }

        // Try Base44 cloud first; if unavailable, seamlessly fall back to local store
        if (typeof originalMethod === 'function') {
          try {
            return await originalMethod.apply(target, args);
          } catch (err) {
            console.warn(`[Base44] ${entityName}.${String(prop)} unavailable, using local database:`, err?.message || err);
            return localMethod.apply(localEntity, args);
          }
        }

        return localMethod.apply(localEntity, args);
      };
    },
  });
}

const proxiedEntities = new Proxy(rawClient.entities || {}, {
  get(target, entityName) {
    const rawEntity = target[entityName];
    const localEntity = localDb.entities[entityName];
    return wrapEntity(String(entityName), rawEntity, localEntity);
  },
});

const proxiedIntegrations = {
  ...rawClient.integrations,
  Core: {
    ...rawClient.integrations?.Core,
    UploadFile: async function (params) {
      if (!appId) {
        return localDb.uploadFileLocal(params);
      }
      try {
        if (rawClient.integrations?.Core?.UploadFile) {
          return await rawClient.integrations.Core.UploadFile(params);
        }
      } catch (err) {
        console.warn('[Base44] UploadFile cloud unavailable, using local storage:', err?.message || err);
      }
      return localDb.uploadFileLocal(params);
    },
  },
};

export const base44 = new Proxy(rawClient, {
  get(target, prop) {
    if (prop === 'entities') return proxiedEntities;
    if (prop === 'integrations') return proxiedIntegrations;
    return target[prop];
  },
});
