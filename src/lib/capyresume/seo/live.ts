/*
 * Its own module so the client tool can read it without bundling the guide copy.
 */
/**
 * The guide pages are held back for the paid tier. While false, every route under
 * `src/app/capyresume/(guides)` answers 404, the sitemap leaves them out, and the
 * tool links to none of them. Flip it to publish them all at once.
 */
export const CAPYRESUME_GUIDES_LIVE = false;
