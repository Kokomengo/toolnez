/* ============================================================================
   adsense.js - THE ONLY FILE YOU NEED TO EDIT TO TURN ADS ON
   ----------------------------------------------------------------------------
   1. Put your publisher ID in `client` AND in the <script> tag inside index.html (you find it in AdSense under
      Account > Settings > Account information: ca-pub-2170099684772121).
   2. Leave `autoAds: true` to let Google place ads automatically, and/or fill
      in the four slot IDs below once you have created the ad units.
   3. Copy the same publisher ID into ads.txt.

   While `client` is still the placeholder full of zeros, no request is made to
   Google at all and every ad position shows a neutral empty box instead, so
   the site stays clean and the browser console stays quiet.
   ============================================================================ */
window.ADSENSE = {

  /* Your AdSense publisher ID. Replace the zeros. */
  client: 'ca-pub-2170099684772121',

  /* Auto ads: Google decides where to insert extra ads. Needs no slot IDs.
     Turn it off if you only want the four positions designed below. */
  autoAds: true,

  /* Manual ad units. Create them in AdSense > Ads > By ad unit > Display ad,
     and paste the data-ad-slot number (10 digits) of each one here.
     Leave a value empty and that position simply stays blank.

       h    horizontal banner, page header and footer      (responsive)
       m    in-content block, under the tool result        (responsive)
       r    rectangle inside the content                   (responsive)
       side vertical unit in the sidebar                   (300x600)
  */
  slots: {
    h: '',
    m: '',
    r: '',
    side: ''
  }
};

/* ----------------------------------------------------------------------------
   Nothing below needs editing.
   The AdSense library itself is loaded by the static <script> tag in index.html
   (Google's verification crawler reads the raw HTML and does not run JavaScript,
   so that tag must stay there literally). This only flags whether the publisher
   ID is real, which tells core.js if it should output ad units.
---------------------------------------------------------------------------- */
(() => {
  const cfg = window.ADSENSE;
  cfg.live = /^ca-pub-\d{16}$/.test(cfg.client) && !/^ca-pub-0+$/.test(cfg.client);
  if (!cfg.live) console.info('[ToolNez] AdSense is not configured yet: edit adsense.js and add your ca-pub- publisher ID.');
})();
