/**
 * hooks/f5-minimum-payout.js — F5: minimum payout floor.
 *
 * Guarantees a minimum payout whenever a claim exists:
 *     if payout > 0 then payout = max(payout, 10 000 CZK)
 *     if payout == 0 (no claim) the floor does NOT apply.
 *
 * This is an independent hook. It attaches to the core's single finalization
 * step by replacing `InsuranceCalc.finalize`. Load it AFTER calc.js.
 */
(function (global) {
  "use strict";

  var MINIMUM_PAYOUT = 10000;

  var calc = global.InsuranceCalc;
  if (!calc) {
    throw new Error("f5-minimum-payout.js must be loaded after calc.js");
  }

  calc.finalize = function (payout /*, context */) {
    // F5: a claim that exists is never paid below the minimum.
    if (payout <= 0) {
      return payout;
    }
    return Math.max(payout, MINIMUM_PAYOUT);
  };
})(window);
