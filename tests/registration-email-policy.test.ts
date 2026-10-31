import assert from "node:assert/strict";
import { isRegistrationEmailConfirmationRequired } from "../services/identity/src/domain/registrationEmailPolicy";

assert.equal(isRegistrationEmailConfirmationRequired(true, undefined), true);
assert.equal(isRegistrationEmailConfirmationRequired(undefined, undefined), true);
assert.equal(isRegistrationEmailConfirmationRequired(false, undefined), false);
assert.equal(isRegistrationEmailConfirmationRequired(true, "false"), true);
assert.equal(isRegistrationEmailConfirmationRequired(false, "true"), false);
assert.equal(isRegistrationEmailConfirmationRequired(null, "false"), false);
assert.equal(isRegistrationEmailConfirmationRequired(null, "true"), true);

console.log("registration-email-policy: ok");
