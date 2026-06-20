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
   * @param {string} [input.region]    - Region; drives the region coefficient.
   * @param {number} [input.priorClaims] - Previous claims count; drives the malus.
   * @returns {number} The calculated payout in CZK (never negative).
   */
  function calculatePayout(input) {
    var damage = Number(input.damage) || 0;
    var deductible = Number(input.deductible) || 0;

    // payout = max(0, damage - deductible) * regionCoefficient * historyMalus
    var payout = Math.max(0, damage - deductible)
      * regionCoefficient(input.region)
      * historyMalus(input.priorClaims);

    // Hand the result to the hook extension point before returning. Hooks
    // replace `finalize` to adjust the final payout. The context
    // gives them what they need (e.g. raw damage for a percentage deductible).
    var context = { input: input, damage: damage, deductible: deductible, base: payout };
    return global.InsuranceCalc.finalize(payout, context);
  }

  function regionCoefficient(region) {
    // F1: Prague keeps full value; everywhere else is reduced.
    return region === "Prague" ? 1.0 : 0.95;
  }

  function historyMalus(priorClaims) {
    // F3: reduce the payout by 10% per previous claim.
    // F3.1: fixes the F3 sign bug (`+` -> `-`) so previous claims now
    // correctly REDUCE the payout.
    var n = Number(priorClaims) || 0;
    return 1 - 0.1 * n;
  }

  global.InsuranceCalc = {
    calculatePayout: calculatePayout,
    // Default finalization step: pass-through. Hooks override this slot.
    finalize: function (payout /*, context */) {
      return payout;
    }
  };
})(window);
