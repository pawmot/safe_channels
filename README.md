Safe Channels
====

###Summary
Serverless (AWS Lambda) app for exchanging pieces of data safely between two parties.
* No storing of messages, just pass-through
* E2E encryption (ECDHE/X25519, AES, shared keys hashing with SHA256)
    * ECDHE/X25519 (no key validation/authentication)
    * AES
    * Shared keys are hashed with SHA256

###Todo

* Fix binary files serving (e.g. favicon)
* Set up HTTP caching (AWS API GW? Or possibly move the static files out of Lambda)
* Fix TSLint in Idea (different tslint.json in frontend than in lambda)
