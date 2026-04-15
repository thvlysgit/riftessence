// Client bundle shim for packages that import the `client-only` marker.
// Next normally handles this alias internally, but we pin it here to avoid
// resolving to server-oriented compiled modules during production build.
module.exports = {};
