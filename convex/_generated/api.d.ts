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
import type * as bootstrap from "../bootstrap.js";
import type * as config from "../config.js";
import type * as demands from "../demands.js";
import type * as domain_common from "../domain/common.js";
import type * as domain_config from "../domain/config.js";
import type * as domain_governance from "../domain/governance.js";
import type * as domain_integrations from "../domain/integrations.js";
import type * as domain_internalResources from "../domain/internalResources.js";
import type * as domain_roadmap from "../domain/roadmap.js";
import type * as domain_roadmapImport from "../domain/roadmapImport.js";
import type * as domain_softwareSystems from "../domain/softwareSystems.js";
import type * as domain_systemModules from "../domain/systemModules.js";
import type * as domain_vendors from "../domain/vendors.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as internal_resources from "../internal_resources.js";
import type * as notifications from "../notifications.js";
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
  bootstrap: typeof bootstrap;
  config: typeof config;
  demands: typeof demands;
  "domain/common": typeof domain_common;
  "domain/config": typeof domain_config;
  "domain/governance": typeof domain_governance;
  "domain/integrations": typeof domain_integrations;
  "domain/internalResources": typeof domain_internalResources;
  "domain/roadmap": typeof domain_roadmap;
  "domain/roadmapImport": typeof domain_roadmapImport;
  "domain/softwareSystems": typeof domain_softwareSystems;
  "domain/systemModules": typeof domain_systemModules;
  "domain/vendors": typeof domain_vendors;
  helpers: typeof helpers;
  http: typeof http;
  integrations: typeof integrations;
  internal_resources: typeof internal_resources;
  notifications: typeof notifications;
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
