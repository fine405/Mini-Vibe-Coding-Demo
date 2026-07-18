## MODIFIED Requirements

### Requirement: Server-Only Provider Secrets

Provider API keys MUST use server-side configuration by default. The browser MAY accept an explicitly entered DeepSeek demo key only in ephemeral page memory, and neither server-managed nor ephemeral Provider keys may be returned by the API or persisted by the browser.

#### Scenario: Provider status is returned
- **WHEN** the browser requests Provider configuration
- **THEN** the response contains only public IDs, labels, models, server configuration status and disabled reasons
- **AND** it contains no API key, length or reversible key fragment

#### Scenario: User supplies a DeepSeek demo key
- **WHEN** the user explicitly saves a DeepSeek key in the Demo credentials Dialog
- **THEN** the key remains only in current-page memory and future same-origin Chat request bodies
- **AND** it is used only as a request-scoped override for the allowlisted DeepSeek Provider
- **AND** it is not written to `process.env`, browser persistence, messages, URLs, headers, project files or exports

#### Scenario: No DeepSeek demo key is supplied
- **WHEN** a Chat request selects DeepSeek without an ephemeral override
- **THEN** Provider resolution continues to use the server-side environment configuration
- **AND** existing clients remain compatible

#### Scenario: Logs are inspected
- **WHEN** Provider discovery, request validation or a model request is logged
- **THEN** logs contain Provider/model IDs and operational metadata only
- **AND** request bodies, error messages and API keys are not logged

## ADDED Requirements

### Requirement: Ephemeral Demo Credential Settings

The Coding Agent SHALL provide an explicit settings entry for page-scoped DeepSeek and Tavily demo credentials without providing a generic environment editor.

#### Scenario: User opens Demo credentials
- **WHEN** the user activates the settings entry in the Coding Agent header
- **THEN** an accessible Dialog displays masked `DEEPSEEK_API_KEY` and `TAVILY_API_KEY` inputs
- **AND** it explains that server-managed secrets are safer and that browser memory and DevTools can expose BYOK values

#### Scenario: User saves demo credentials
- **WHEN** one or both bounded credential values are saved
- **THEN** the Dialog shows only per-service configured status and never a value, length or fragment
- **AND** no validation or billable third-party request is started until the user explicitly submits a Chat request

#### Scenario: User refreshes or leaves the page
- **WHEN** the page context is reloaded, closed, navigated away from or unmounted
- **THEN** no demo credential is restored
- **AND** no browser persistence, Cookie or service-worker storage contains the value

#### Scenario: User clears demo credentials
- **WHEN** the user clears the Demo credentials while an Agent run may be active
- **THEN** the client first requests cancellation of the active run
- **AND** both credentials are removed from the page-memory holder for all future requests
- **AND** the UI explains that clearing local state does not remotely revoke an already transmitted key

### Requirement: Request-Scoped Demo Provider Override

The server MUST validate and use an ephemeral DeepSeek credential only within the Chat request that supplied it.

#### Scenario: Allowed DeepSeek model is submitted with a demo key
- **WHEN** a Chat request contains a bounded DeepSeek demo key and an allowlisted DeepSeek model selection
- **THEN** the request-scoped key takes precedence over the server environment for that run
- **AND** no global config, cache or long-lived session is mutated

#### Scenario: Another Provider is submitted with a DeepSeek demo key
- **WHEN** a Chat request selects a Provider other than DeepSeek
- **THEN** the DeepSeek demo key is not used for that Provider
- **AND** normal configuration and allowlist validation still applies

#### Scenario: Credential payload is malformed
- **WHEN** the credential object contains an unknown field, an oversized value or an invalid type
- **THEN** the server rejects the request before any paid model or Research call
- **AND** the validation response identifies only the field path and fixed constraint, not the submitted value

### Requirement: Demo Credential Response and Cache Safety

Chat responses and errors MUST NOT expose or cache ephemeral credentials.

#### Scenario: Chat succeeds or fails
- **WHEN** a Chat request containing a canary demo key returns a stream or JSON error
- **THEN** the response includes `Cache-Control: no-store`
- **AND** the response body, metadata and captured application logs do not contain the canary, its length or a reversible fragment
