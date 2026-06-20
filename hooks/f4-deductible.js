/**
 * hooks/f4-deductible.js — F4: percentage deductible.
 *
 * Replaces the fixed deductible with a percentage of the damage:
 *     deductible = 50% of damage
 *     payout     = max(0, damage - 0.5 * damage)
 *
 * This is an independent hook. It attaches to the core's single finalization
 * step by replacing `InsuranceCalc.finalize`, recomputing the payout from the
 * raw damage handed in via the context. Load it AFTER calc.js.
 */
(function (global) {
  "use strict";

  var DEDUCTIBLE_RATE = 0.5; // 50% of the damage

  var calc = global.InsuranceCalc;
  if (!calc) {
    throw new Error("f4-deductible.js must be loaded after calc.js");
  }

  calc.finalize = function (payout /*, context */) {
    // F4: deductible is 50% of the damage, not a fixed amount.
    var deductible = payout * DEDUCTIBLE_RATE;
    return Math.max(0, payout - deductible);
  };
})(window);