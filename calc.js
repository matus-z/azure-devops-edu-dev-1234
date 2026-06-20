/**
 * calc.js — CORE calculation of the insurance claim payout.
 *
 * HOOK EXTENSION POINT: `InsuranceCalc.finalize(payout, context)` is the single
 * finalization step every hook hangs onto. By default it is a pass-through.
 * A hook adjusts the result by replacing this slot, e.g.:
 *     InsuranceCalc.finalize = function (payout, ctx) { ... return payout; };
 * This slot MUST be preserved in every future version of calc.js — a delivery
 * that drops it would silently disable all hooks.
 */
(function (global) {
  "use strict";

  /**
   * Calculate the insurance payout.
   *
   * @param {Object} input
   * @param {number} input.damage      - Damage amount in CZK.
   * @param {number} input.deductible  - Deductible in CZK.
   * @param {string} [input.region]    - Region (unused).
   * @param {number} [input.priorClaims] - Previous claims count (unused).
   * @returns {number} The calculated payout in CZK (never negative).
   */
  function calculatePayout(input) {
    var damage = Number(input.damage) || 0;
    var deductible = Number(input.deductible) || 0;

    // payout = max(0, damage - deductible)
    var payout = Math.max(0, damage - deductible);

    // Hand the result to the hook extension point before returning. Hooks
    // replace `finalize` to adjust the final payout. The context
    // gives them what they need (e.g. raw damage for a percentage deductible).
    var context = { input: input, damage: damage, deductible: deductible, base: payout };
    return global.InsuranceCalc.finalize(payout, context);
  }

  global.InsuranceCalc = {
    calculatePayout: calculatePayout,
    // Default finalization step: pass-through. Hooks override this slot.
    finalize: function (payout /*, context */) {
      return payout;
    }
  };
})(window);
