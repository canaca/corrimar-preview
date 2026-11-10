// Core pre-order logic. Pure functions, no DOM, so Node tests can load it.
// Works in the browser (window.PreorderCore) and in Node (module.exports).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PreorderCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_CHARS_RE = /^[+\d\s().-]+$/;

  function digitsOnly(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }

  // Returns "email", "phone", or null if the contact is not valid.
  function classifyContact(raw) {
    var v = String(raw == null ? "" : raw).trim();
    if (!v) return null;
    if (v.indexOf("@") !== -1) return EMAIL_RE.test(v) ? "email" : null;
    if (!PHONE_CHARS_RE.test(v)) return null;
    var d = digitsOnly(v);
    return d.length >= 10 && d.length <= 15 ? "phone" : null;
  }

  function targetOf(config) {
    var t = Math.floor(Number(config && config.TARGET));
    return isFinite(t) && t >= 1 ? t : 1;
  }

  function computeStatus(entries, config) {
    var list = Array.isArray(entries) ? entries : [];
    var target = targetOf(config);
    var byEntries = config && config.COUNT_MODE === "entries";
    var reserved = 0;
    for (var i = 0; i < list.length; i++) {
      reserved += byEntries ? 1 : Math.max(0, Math.floor(Number(list[i].quantity) || 0));
    }
    var remaining = Math.max(0, target - reserved);
    var percent = Math.min(100, Math.round((reserved / target) * 1000) / 10);
    return {
      reserved: reserved,
      target: target,
      remaining: remaining,
      percent: percent,
      full: reserved >= target,
      entries: list.length,
      mode: byEntries ? "entries" : "units"
    };
  }

  function formatCounter(status) {
    return status.reserved + " of " + status.target + " reserved";
  }

  // Validates raw form input against current status. Returns {ok, errors, entry}.
  function validateEntry(input, status, config) {
    input = input || {};
    var errors = {};
    var maxPer = Math.max(1, Math.floor(Number(config && config.MAX_PER_ORDER) || 1));

    var name = String(input.name == null ? "" : input.name).trim().replace(/\s+/g, " ");
    if (name.length < 2) errors.name = "Please enter your name.";
    else if (name.length > 100) errors.name = "Name is too long (100 characters max).";

    var contact = String(input.contact == null ? "" : input.contact).trim();
    var contactType = classifyContact(contact);
    if (!contact) errors.contact = "Please enter an email or phone number.";
    else if (!contactType) errors.contact = "Enter a valid email (name@example.com) or a phone number with 10 to 15 digits.";

    var qRaw = String(input.quantity == null ? "" : input.quantity).trim();
    var quantity = Number(qRaw);
    if (!/^\d+$/.test(qRaw) || quantity < 1) errors.quantity = "Quantity must be a whole number, 1 or more.";
    else if (quantity > maxPer) errors.quantity = "The limit is " + maxPer + " per person.";

    var notes = String(input.notes == null ? "" : input.notes).trim();
    if (notes.length > 500) errors.notes = "Notes are too long (500 characters max).";

    if (input.consent !== true && input.consent !== "true" && input.consent !== "on") {
      errors.consent = "Please check the box to agree before reserving.";
    }

    if (status && status.full) {
      errors.form = "This batch is full. No more reservations can be added.";
    } else if (status && status.mode !== "entries" && !errors.quantity && quantity > status.remaining) {
      errors.quantity = "Only " + status.remaining + " left in this batch.";
    }

    var ok = Object.keys(errors).length === 0;
    return {
      ok: ok,
      errors: errors,
      entry: ok ? {
        name: name,
        contact: contact,
        contactType: contactType,
        quantity: quantity,
        notes: notes,
        consent: true
      } : null
    };
  }

  return {
    classifyContact: classifyContact,
    computeStatus: computeStatus,
    formatCounter: formatCounter,
    validateEntry: validateEntry
  };
});
