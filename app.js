/**
 * app.js — UI glue: reads the form, calls the core calculation (calc.js),
 * and renders the result. Kept separate from the calculation logic so that
 * deliveries which change the formula only touch calc.js.
 */
(function () {
  "use strict";

  var form = document.getElementById("claim-form");
  var resultSection = document.getElementById("result");
  var resultValue = document.getElementById("resultValue");
  var resultSummary = document.getElementById("resultSummary");

  function formatCZK(amount) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(amount) + " CZK";
  }

  function readInput() {
    return {
      customerName: document.getElementById("customerName").value.trim(),
      age: Number(document.getElementById("age").value),
      country: document.getElementById("country").value,
      region: document.getElementById("region").value,
      damage: Number(document.getElementById("damage").value),
      deductible: Number(document.getElementById("deductible").value),
      priorClaims: Number(document.getElementById("priorClaims").value) || 0
    };
  }

  function render(input, payout) {
    var who = input.customerName ? input.customerName : "The policyholder";
    resultSummary.textContent =
      who + " — damage " + formatCZK(input.damage) +
      ", deductible " + formatCZK(input.deductible) +
      " (" + input.region + ", " + input.country + ").";
    resultValue.textContent = formatCZK(payout);
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var input = readInput();
    var payout = window.InsuranceCalc.calculatePayout(input);
    render(input, payout);
  });

  form.addEventListener("reset", function () {
    resultSection.hidden = true;
  });
})();
