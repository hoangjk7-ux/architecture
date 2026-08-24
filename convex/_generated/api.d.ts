/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as config from "../config.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as http_actions_google from "../http_actions/google.js";
import type * as http_actions_options from "../http_actions/options.js";
import type * as integrations from "../integrations.js";
import type * as internal_resources from "../internal_resources.js";
import type * as roadmap from "../roadmap.js";
import type * as seed from "../seed.js";
import type * as software_systems from "../software_systems.js";
import type * as system_change_logs from "../system_change_logs.js";
import type * as system_modules from "../system_modules.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  config: typeof config;
  helpers: typeof helpers;
  http: typeof http;
  "http_actions/google": typeof http_actions_google;
  "http_actions/options": typeof http_actions_options;
  integrations: typeof integrations;
  internal_resources: typeof internal_resources;
  roadmap: typeof roadmap;
  seed: typeof seed;
  software_systems: typeof software_systems;
  system_change_logs: typeof system_change_logs;
  system_modules: typeof system_modules;
  users: typeof users;
  vendors: typeof vendors;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
