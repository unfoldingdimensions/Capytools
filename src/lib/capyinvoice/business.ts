/**
 * CapyInvoice — the business profile store.
 *
 * The user's own from-block: name, details, logo, currency and payment
 * instructions, kept once and copied into new drafts. Same shared store
 * machinery as the draft, under its own key — saving a draft never rewrites
 * the profile, and saving the profile never touches the open draft.
 */

import { INVOICE_SCHEMA_VERSION, type BusinessProfile } from './types';
import { emptyBusinessProfile, migrateBusiness } from './schema';
import { BUSINESS_PROFILE_KEY } from './keys';
import { createDocStore } from '../capytools/doc-store';

export { StorageUnavailableError } from '@/lib/capytools/doc-store';

/** The storage key, namespaced by schema version. */
export const BUSINESS_STORAGE_KEY = BUSINESS_PROFILE_KEY;

const store = createDocStore<BusinessProfile>({
  key: BUSINESS_PROFILE_KEY,
  empty: emptyBusinessProfile,
  migrate: migrateBusiness,
  stamp: (doc) => ({ ...doc, version: INVOICE_SCHEMA_VERSION }),
});

export const hasStoredBusiness = store.hasStored;
export const saveBusiness = store.save;
export const clearBusiness = store.clear;
export const getBusinessSnapshot = store.getSnapshot;
export const getBusinessServerSnapshot = store.getServerSnapshot;
export const subscribeBusiness = store.subscribe;
export const useBusiness = store.use;
export const useBusinessWithServerSnapshot = store.useWithServerSnapshot;
export const __resetBusinessCache = store.__resetCacheForTests;
